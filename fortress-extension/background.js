// background.js

// This is the service worker for the extension.
// It runs in the background and handles events.

const API_URL = 'http://localhost:5254/api';

// Helper function to make API requests
async function makeApiRequest(method, endpoint, data = null, authToken = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = { method, headers };
    if (data) {
        config.body = JSON.stringify(data);
    }

    console.log(`Background: Making ${method} request to ${API_URL}${endpoint}`);
    
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (!response.ok) {
        let errorText = '';
        try {
            errorText = await response.text();
        } catch (e) {
            errorText = 'Could not read error response';
        }
        
        // Log detailed error for debugging
        console.error(`Background: API error ${response.status} (${response.statusText}):`, errorText);
        
        if (response.status === 401) {
            throw new Error(`Unauthorized: Invalid or expired token. Please log in again.`);
        }
        
        throw new Error(`API error: ${response.statusText} (${response.status}) - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        console.log(`Background: API response received:`, jsonData);
        return jsonData;
    } else {
        const textData = await response.text();
        console.log(`Background: API response (text):`, textData);
        return textData;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Ensure the message is from our content script
    if (sender.tab && sender.url && new URL(sender.url).origin === 'http://localhost:3000') {
      console.log('Background: Received message from content script:', message);
    }

    // Return true to indicate that sendResponse will be called asynchronously
    let handled = false;

    if (message.type === 'SAVE_AUTH_TOKEN' && message.token) {
        chrome.storage.local.set({ authToken: message.token }, () => {
            console.log('Background: Auth token saved to chrome.storage.local.');
            chrome.action.setIcon({ path: "icons/icon48.png" });
            sendResponse({ status: 'success' });
        });
        handled = true;
    } else if (message.type === 'CLEAR_AUTH_TOKEN') {
        chrome.storage.local.remove(['authToken'], () => {
            console.log('Background: Auth token cleared from chrome.storage.local.');
            chrome.action.setIcon({ path: "icons/icon48_grey.png" });
            sendResponse({ status: 'success' });
        });
        handled = true;
    } else if (message.action === "open_popup") {
        console.log('Background: Received open_popup action. Responding.');
        sendResponse({ status: 'popup_opened' });
        handled = true;
    } else if (message.type === 'GET_AUTH_TOKEN') {
        // Handle request for auth token from content scripts
        chrome.storage.local.get(['authToken'], (result) => {
            if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
            } else {
                sendResponse({ token: result.authToken || null });
            }
        });
        handled = true;
        return true; // Keep channel open for async response
    } else if (message.type === 'API_REQUEST') {
        // Handle generic API requests from popup/content scripts
        // Return true immediately to keep the message channel open for async response
        (async () => {
            try {
                if (!message.authToken) {
                    sendResponse({ error: 'No auth token provided. Please log in first.' });
                    return;
                }

                console.log(`Background: Processing API request - ${message.method} ${message.endpoint}`);
                const result = await makeApiRequest(
                    message.method,
                    message.endpoint,
                    message.data,
                    message.authToken
                );

                console.log('Background: API request successful, result type:', typeof result, 'isArray:', Array.isArray(result));
                console.log('Background: API request successful, result:', result);
                sendResponse({ data: result });
            } catch (error) {
                console.error('Background: API request error:', error);
                sendResponse({ error: error.message || 'API request failed' });
            }
        })();
        handled = true;
        return true; // Keep channel open for async response
    } else if (message.type === 'CHECK_AND_FILL_IDENTITY') {
        // Check if identity exists and return it for filling
        (async () => {
            try {
                if (!message.authToken) {
                    sendResponse({ error: 'No auth token provided. Please log in first.' });
                    return;
                }

                if (!message.serviceName) {
                    sendResponse({ error: 'Service name is required' });
                    return;
                }

                console.log('Background: Checking for existing identity for service:', message.serviceName);

                // Get all identities
                const identities = await makeApiRequest(
                    'GET',
                    '/identities',
                    null,
                    message.authToken
                );

                // Find identity matching the service name (case-insensitive)
                const matchingIdentity = Array.isArray(identities) 
                    ? identities.find(id => id.serviceName && id.serviceName.toLowerCase() === message.serviceName.toLowerCase())
                    : null;

                if (matchingIdentity && matchingIdentity.id) {
                    // Identity exists, get decrypted version
                    console.log('Background: Identity found, getting decrypted version...');
                    const decrypted = await makeApiRequest(
                        'GET',
                        `/identities/${matchingIdentity.id}/decrypted`,
                        null,
                        message.authToken
                    );

                    sendResponse({
                        exists: true,
                        alias: decrypted.generatedEmail || decrypted.username,
                        password: decrypted.decryptedPassword
                    });
                } else {
                    // No identity found
                    console.log('Background: No existing identity found for service:', message.serviceName);
                    sendResponse({ exists: false });
                }
            } catch (error) {
                console.error('Background: Error checking identity:', error);
                sendResponse({ error: error.message || 'Failed to check identity' });
            }
        })();
        handled = true;
        return true; // Keep channel open for async response
    } else if (message.type === 'GENERATE_AND_SAVE_IDENTITY') {
        // Handle identity generation and saving
        // Return true immediately to keep the message channel open for async response
        (async () => {
            try {
                if (!message.authToken) {
                    sendResponse({ error: 'No auth token provided. Please log in first.' });
                    return;
                }

                if (!message.serviceName) {
                    sendResponse({ error: 'Service name is required' });
                    return;
                }

                console.log('Background: Generating identity for service:', message.serviceName);

                // Generate identity
                const generateResult = await makeApiRequest(
                    'POST',
                    '/identities/generate',
                    { serviceName: message.serviceName },
                    message.authToken
                );

                console.log('Background: Identity generated, saving to vault...');

                // Save to vault
                await makeApiRequest(
                    'POST',
                    '/identities/manual',
                    {
                        serviceName: message.serviceName,
                        username: generateResult.alias,
                        password: generateResult.password,
                        generatedEmail: generateResult.alias
                    },
                    message.authToken
                );

                console.log('Background: Identity saved successfully');
                sendResponse({
                    alias: generateResult.alias,
                    password: generateResult.password
                });
            } catch (error) {
                console.error('Background: Error generating identity:', error);
                const errorMessage = error.message || 'Failed to generate identity';
                sendResponse({ error: errorMessage });
            }
        })();
        handled = true;
        return true; // Keep channel open for async response
    }

    if (handled) {
        return true; // Keep the message channel open for asynchronous response
    } else {
        console.warn('Background: Unhandled message:', message);
        // Send a response for unhandled messages to prevent runtime.lastError
        sendResponse({ status: 'unhandled', originalMessage: message }); 
        return false; // No async response needed if already handled synchronously or unhandled
    }
});

// On extension startup, check if token exists and set icon
chrome.runtime.onInstalled.addListener(async () => {
    const token = await chrome.storage.local.get(['authToken']);
    if (token.authToken) {
        chrome.action.setIcon({ path: "icons/icon48.png" });
    } else {
        chrome.action.setIcon({ path: "icons/icon48_grey.png" });
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        const token = await chrome.storage.local.get(['authToken']);
        if (token.authToken) {
            // Check if the user is on the login page and authenticated, then potentially redirect
            if (changeInfo.url.includes('http://localhost:3000/login') || changeInfo.url.includes('http://localhost:3000/register')) {
                // Optionally, we could try to close the login tab or redirect to dashboard
                // For now, we'll just log it.
                console.log("User is authenticated and navigated to login/register page. Consider redirecting.");
            }
        }
    }
});

