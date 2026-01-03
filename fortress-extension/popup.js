// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('root');
  const apiUrl = 'http://localhost:5254/api'; // Your backend API URL
  const frontendUrl = 'http://localhost:3000'; // Your frontend dashboard URL

  // Check authentication status
  const token = await chrome.storage.local.get(['authToken']);
  console.log('Popup: Token read from storage:', token.authToken ? 'Token exists (length: ' + token.authToken.length + ')' : 'No token found');

  if (!token.authToken) {
    // Not authenticated, show login/onboarding message
    root.innerHTML = `
      <div class="card text-center">
        <div class="card-header">Welcome to Fortress!</div>
        <p>Please log in or register on the web dashboard to get started.</p>
        <button class="button button-blue" id="loginButton">Go to Dashboard</button>
      </div>
    `;
    document.getElementById('loginButton').addEventListener('click', () => {
      chrome.tabs.create({ url: `${frontendUrl}/login` });
    });
  } else {
    // Authenticated, show main extension UI
    root.innerHTML = `<p>Loading...</p>`;
    renderMainUI(token.authToken);
  }

  async function renderMainUI(authToken) {
    // Get current tab URL
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = new URL(tab.url);
    const hostname = currentUrl.hostname;
    let serviceName;

    if (hostname === 'localhost') {
      serviceName = 'localhost'; // Or a more descriptive name like 'Fortress Dashboard'
    } else {
      // Existing logic for other domains
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        serviceName = parts[parts.length - 2];
      } else {
        serviceName = hostname; // Fallback for single-part hostnames or unusual cases
      }
    }

    // API client setup - route through background script to avoid CORS
    async function makeApiRequest(method, endpoint, data = null) {
      try {
        console.log(`Popup: Sending API request - ${method} ${endpoint}`);
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({
            type: 'API_REQUEST',
            method: method,
            endpoint: endpoint,
            data: data,
            authToken: authToken
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!response) {
              reject(new Error('No response from background script'));
              return;
            }
            resolve(response);
          });
        });

        console.log('Popup: Received response from background:', response);

        if (!response) {
          throw new Error('No response received from background script');
        }

        if (response.error) {
          throw new Error(response.error);
        }

        // Handle different response formats
        if (response.data !== undefined) {
          return response.data;
        } else if (Array.isArray(response)) {
          // Response is already an array
          return response;
        } else if (response && typeof response === 'object') {
          // Response might be the data directly wrapped
          console.warn('Popup: Unexpected response format, returning as-is:', response);
          return response;
        } else {
          console.warn('Popup: Response data is undefined, response object:', response);
          throw new Error('Invalid response format from API');
        }
      } catch (error) {
        console.error('Popup: API request failed:', error);
        throw error;
      }
    }

    // --- Current Site Card Logic ---
    let identityForSite = null;
    let identities = [];
    try {
      console.log('Popup: Fetching identities with token:', authToken ? 'Token exists' : 'No token');
      console.log('Popup: Current site service name:', serviceName);
      const result = await makeApiRequest('GET', '/identities');
      console.log('Popup: Identities fetched from API:', result);
      
      // Ensure identities is an array
      if (Array.isArray(result)) {
        identities = result;
      } else if (result && Array.isArray(result.data)) {
        identities = result.data;
      } else if (result && result.data && Array.isArray(result.data)) {
        identities = result.data;
      } else {
        console.warn('Popup: Unexpected response format, expected array:', result);
        identities = [];
      }
      
      identityForSite = identities.find(id => id.serviceName.toLowerCase() === serviceName.toLowerCase());
    } catch (error) {
      console.error("Popup: Failed to fetch identities or process them:", error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        // Clear invalid token and show login prompt
        await chrome.storage.local.remove(['authToken']);
        root.innerHTML = `
          <div class="card text-center">
            <div class="card-header">Session Expired</div>
            <p>Your session has expired. Please log in again.</p>
            <button class="button button-blue" id="loginButton">Go to Dashboard</button>
          </div>
        `;
        document.getElementById('loginButton')?.addEventListener('click', () => {
          chrome.tabs.create({ url: `${frontendUrl}/login` });
        });
        return; // Exit early, don't render the rest
      }
      
      if (error instanceof Error) {
        console.error("Popup: Error message:", error.message);
        if (error.stack) {
          console.error("Popup: Error stack:", error.stack);
        }
      }
    }

    let currentSiteCard = '';
    if (identityForSite) {
      // Scenario A: Account for this site exists
      try {
        const decrypted = await makeApiRequest('GET', `/identities/${identityForSite.id}/decrypted`);
        currentSiteCard = `
          <div class="card">
            <div class="card-header">${identityForSite.serviceName}</div>
            <p>Username: ${decrypted.username || decrypted.generatedEmail}</p>
            <div style="display:flex; justify-content: space-between; align-items: center;">
              <input type="password" value="${decrypted.decryptedPassword}" id="sitePassword" class="input-field" style="width: 70%;" readonly />
              <button class="button button-blue" id="copyPassword" style="width: 28%;">Copy</button>
            </div>
            <button class="button button-blue" id="autoFillButton" style="width: 100%;">Auto-Fill</button>
          </div>
        `;
      } catch (error) {
        console.error("Failed to decrypt identity:", error);
        currentSiteCard = `<div class="card"><p>Error loading details for ${identityForSite.serviceName}</p></div>`;
      }
    } else {
      // Scenario B: No account for this site (Privacy Gateway)
      currentSiteCard = `
        <div class="card">
          <div class="card-header">No login found for ${serviceName}</div>
          <button class="button button-green" id="generateIdentityButton">Generate Privacy Identity</button>
        </div>
      `;
    }

    // --- Quick Search Bar ---
    const quickSearchBar = `
      <div class="card">
        <div class="card-header">Quick Search</div>
        <input type="text" placeholder="Search vault..." class="input-field" id="searchField">
        <div id="searchResults" style="margin-top: 10px;"></div>
      </div>
    `;

    // --- Sync State & Settings ---
    const bottomBar = `
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #eee;">
        <span style="font-size: 12px; color: #666;">Vault Synced</span>
        <a href="#" id="settingsLink" class="link">Settings</a>
      </div>
    `;

    root.innerHTML = currentSiteCard + quickSearchBar + bottomBar;

    // Add event listeners after rendering
    if (identityForSite) {
      document.getElementById('copyPassword')?.addEventListener('click', () => {
        const passwordField = document.getElementById('sitePassword');
        passwordField.select();
        document.execCommand('copy');
        alert('Password copied to clipboard!');
      });
      document.getElementById('autoFillButton')?.addEventListener('click', async () => {
        const passwordField = document.getElementById('sitePassword');
        const username = identityForSite.username || identityForSite.generatedEmail;
        const password = passwordField.value;

        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: autoFillForm,
          args: [username, password]
        });
      });
    } else {
      document.getElementById('generateIdentityButton')?.addEventListener('click', async () => {
        try {
          const generated = await makeApiRequest('POST', '/identities/generate', { serviceName });
          // Auto-fill on page
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: autoFillForm,
            args: [generated.alias, generated.password]
          });

          // Auto-save to vault
          await makeApiRequest('POST', '/identities/manual', {
            serviceName: serviceName,
            username: generated.alias,
            password: generated.password,
            generatedEmail: generated.alias
          });
          alert('New privacy identity generated and saved!');
          renderMainUI(authToken); // Re-render to show new state
        } catch (error) {
          console.error("Failed to generate and save identity:", error);
          alert('Error generating or saving identity.');
        }
      });
    }

    document.getElementById('settingsLink')?.addEventListener('click', () => {
      chrome.tabs.create({ url: frontendUrl });
    });

    const searchField = document.getElementById('searchField');
    searchField?.addEventListener('input', async (e) => {
      const query = e.target.value.toLowerCase();
      const searchResultsDiv = document.getElementById('searchResults');
      searchResultsDiv.innerHTML = '';

      if (query.length > 0) {
        try {
          const result = await makeApiRequest('GET', '/identities');
          // Ensure we have an array
          let identitiesList = [];
          if (Array.isArray(result)) {
            identitiesList = result;
          } else if (result && Array.isArray(result.data)) {
            identitiesList = result.data;
          } else {
            console.warn('Popup: Search - Unexpected response format:', result);
            identitiesList = [];
          }
          
          const filtered = identitiesList.filter(id => 
            id.serviceName.toLowerCase().includes(query) || 
            id.username?.toLowerCase().includes(query)
          );

          if (filtered.length > 0) {
            filtered.forEach(id => {
              const resultItem = document.createElement('div');
              resultItem.className = 'card-item'; // You might want to define styles for this
              resultItem.style.padding = '8px';
              resultItem.style.borderBottom = '1px solid #eee';
              resultItem.style.display = 'flex';
              resultItem.style.justifyContent = 'space-between';
              resultItem.style.alignItems = 'center';

              const serviceNameSpan = document.createElement('span');
              serviceNameSpan.textContent = id.serviceName;
              resultItem.appendChild(serviceNameSpan);

              const copyButton = document.createElement('button');
              copyButton.className = 'button button-blue';
              copyButton.textContent = 'Copy';
              copyButton.style.width = 'auto';
              copyButton.style.marginTop = '0';
              copyButton.addEventListener('click', async (event) => {
                event.stopPropagation(); // Prevent parent click handler if any
                try {
                  const decrypted = await makeApiRequest('GET', `/identities/${id.id}/decrypted`);
                  navigator.clipboard.writeText(decrypted.decryptedPassword);
                  alert(`Password for ${id.serviceName} copied to clipboard!`);
                } catch (error) {
                  console.error("Error fetching and copying password:", error);
                  alert("Failed to retrieve password details for copying.");
                }
              });
              resultItem.appendChild(copyButton);

              searchResultsDiv.appendChild(resultItem);
            });
          } else {
            searchResultsDiv.innerHTML = '<p style="font-size: 12px; color: #666;">No results found.</p>';
          }
        } catch (error) {
          console.error("Search identities failed:", error);
          searchResultsDiv.innerHTML = '<p style="font-size: 12px; color: #666;">Error searching.</p>';
        }
      }
    });
  }

  // Function to be injected and executed in the content script context
  function autoFillForm(username, password) {
    const emailInputs = document.querySelectorAll('input[type="email"]');
    const passwordInputs = document.querySelectorAll('input[type="password"]');

    if (emailInputs.length > 0) {
      emailInputs[0].value = username;
      emailInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      emailInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (passwordInputs.length > 0) {
      passwordInputs[0].value = password;
      passwordInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      passwordInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
});
