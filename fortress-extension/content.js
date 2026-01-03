// content.js

// Inject content.css into the page
const style = document.createElement('link');
style.rel = 'stylesheet';
style.type = 'text/css';
style.href = chrome.runtime.getURL('content.css');
(document.head || document.documentElement).appendChild(style);

// API configuration - requests are routed through background script

// Helper function to check if an element is visible
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Helper function to filter visible fields and prioritize by context
function getBestField(fields, preferredContext = null) {
  // Filter to only visible fields
  const visibleFields = Array.from(fields).filter(field => isElementVisible(field));
  
  if (visibleFields.length === 0) {
    console.warn('No visible fields found, using first field anyway');
    return fields[0] || null;
  }
  
  // If we have a preferred context (like "login"), prioritize fields with that in ID/name
  if (preferredContext && visibleFields.length > 1) {
    const contextFields = visibleFields.filter(field => {
      const id = (field.id || '').toLowerCase();
      const name = (field.name || '').toLowerCase();
      return id.includes(preferredContext) || name.includes(preferredContext);
    });
    
    if (contextFields.length > 0) {
      console.log(`Found ${contextFields.length} fields matching context "${preferredContext}"`);
      return contextFields[0];
    }
  }
  
  // Return the first visible field
  return visibleFields[0];
}

// The autoFillForm function is defined globally here so popup.js can execute it.
function autoFillForm(username, password, context = null) {
    console.log('autoFillForm: Attempting to fill with username:', username, 'password:', password ? '***' : 'none', 'context:', context);
    
    // Use the same selectors as icon injection for consistency
    const allEmailInputs = document.querySelectorAll('input[type="email"], input[type="text"][name*="email" i], input[type="text"][id*="email" i], input[type="text"][placeholder*="email" i], input[type="text"][name*="username" i], input[type="text"][id*="username" i], input[type="text"][placeholder*="username" i]');
    const allPasswordInputs = document.querySelectorAll('input[type="password"]');
    
    console.log('autoFillForm: Found', allEmailInputs.length, 'total email/username fields and', allPasswordInputs.length, 'total password fields');
    
    // Get the best visible field, prioritizing by context
    const emailField = getBestField(allEmailInputs, context);
    const passwordField = getBestField(allPasswordInputs, context);
    
    if (emailField) {
      console.log('autoFillForm: Selected email field:', emailField.id || emailField.name || 'unnamed', 'visible:', isElementVisible(emailField));
    }
    if (passwordField) {
      console.log('autoFillForm: Selected password field:', passwordField.id || passwordField.name || 'unnamed', 'visible:', isElementVisible(passwordField));
    }

    // Helper function to set value using native setter (bypasses React/Vue controlled inputs)
    function setNativeValue(element, value) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, value);
      } else {
        element.value = value;
      }
      
      // Trigger input event with proper target
      const inputEvent = new Event('input', { bubbles: true, cancelable: true });
      Object.defineProperty(inputEvent, 'target', { value: element, enumerable: true });
      element.dispatchEvent(inputEvent);
    }
    
    // Helper function to simulate typing (works better with controlled inputs)
    function simulateTyping(element, text) {
      element.focus();
      setNativeValue(element, '');
      
      // Type each character
      for (let i = 0; i < text.length; i++) {
        const currentValue = text.substring(0, i + 1);
        setNativeValue(element, currentValue);
      }
      
      // Final change event
      element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    }

    // Fill email/username field
    if (emailField) {
      console.log('autoFillForm: Filling email field:', emailField);
      
      emailField.focus();
      
      // Use native setter first (bypasses React/Vue)
      setNativeValue(emailField, username);
      
      // Also set attribute
      emailField.setAttribute('value', username);
      
      // Trigger change event
      emailField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      
      // Check if value stuck - if not, try simulated typing
      setTimeout(() => {
        if (emailField.value !== username) {
          console.log('autoFillForm: Direct value setting failed, trying simulated typing...');
          simulateTyping(emailField, username);
        } else {
          console.log('autoFillForm: Email field filled successfully');
        }
      }, 50);
      
      console.log('autoFillForm: Email field value after filling:', emailField.value);
    } else {
      console.warn('autoFillForm: No email/username field found!');
    }

    // Fill password field
    if (passwordField) {
      console.log('autoFillForm: Filling password field:', passwordField);
      
      passwordField.focus();
      
      // Use native setter first (bypasses React/Vue)
      setNativeValue(passwordField, password);
      
      // Also set attribute
      passwordField.setAttribute('value', password);
      
      // Trigger change event
      passwordField.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      
      // Check if value stuck - if not, try simulated typing
      setTimeout(() => {
        if (passwordField.value !== password) {
          console.log('autoFillForm: Direct value setting failed, trying simulated typing...');
          simulateTyping(passwordField, password);
        } else {
          console.log('autoFillForm: Password field filled successfully');
        }
      }, 50);
      
      console.log('autoFillForm: Password field value after filling:', passwordField.value ? '***' : 'empty');
    } else {
      console.warn('autoFillForm: No password field found!');
    }
  }

// Get service name from current URL
function getServiceName() {
  // Handle file:// protocol (local files)
  if (window.location.protocol === 'file:') {
    // Try to get name from page title
    const pageTitle = document.title?.trim();
    if (pageTitle && pageTitle.length > 0 && pageTitle !== 'Untitled Document') {
      // Clean up title - take first word or first few words
      const titleParts = pageTitle.split(/[\s\-_]/);
      return titleParts[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'local-page';
    }
    
    // Fallback to filename from path
    const pathname = window.location.pathname;
    const filename = pathname.split('/').pop() || 'index.html';
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExt || 'local-file';
  }
  
  const hostname = window.location.hostname;
  
  // Handle empty hostname
  if (!hostname || hostname === '') {
    return 'local-page';
  }
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'localhost';
  }
  
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  
  return hostname || 'local-page';
}

// Fill or generate identity and auto-fill
async function generateAndFill() {
  try {
    // Get auth token through background script (more reliable than direct chrome.storage access)
    let authToken = null;
    try {
      const tokenResponse = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      });
      
      if (tokenResponse && tokenResponse.token) {
        authToken = tokenResponse.token;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
      // Fallback to direct storage access if message fails
      try {
        if (chrome.storage && chrome.storage.local) {
          const result = await chrome.storage.local.get(['authToken']);
          authToken = result.authToken;
        }
      } catch (storageError) {
        console.error('Error accessing storage:', storageError);
      }
    }
    
    if (!authToken) {
      alert('Please log in to Fortress first. Click the extension icon to open the dashboard.');
      return;
    }

    const serviceName = getServiceName();
    
    // Validate service name
    if (!serviceName || serviceName.trim() === '') {
      throw new Error('Could not determine service name from page. Please try again.');
    }
    
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'fortress-loading';
    loadingIndicator.textContent = 'Checking...';
    loadingIndicator.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #007bff; color: white; padding: 10px 20px; border-radius: 5px; z-index: 999999; font-family: Arial, sans-serif;';
    document.body.appendChild(loadingIndicator);

    // First, check if an identity already exists for this service
    const checkResponse = await chrome.runtime.sendMessage({
      type: 'CHECK_AND_FILL_IDENTITY',
      serviceName: serviceName,
      authToken: authToken
    });

    if (checkResponse.error) {
      throw new Error(checkResponse.error);
    }

    let alias, password;
    let isNewIdentity = false;

    if (checkResponse.exists && checkResponse.alias && checkResponse.password) {
      // Identity exists, use it
      alias = checkResponse.alias;
      password = checkResponse.password;
      loadingIndicator.textContent = 'Filling...';
    } else {
      // No identity exists, generate a new one
      isNewIdentity = true;
      loadingIndicator.textContent = 'Generating...';
      
      const generateResponse = await chrome.runtime.sendMessage({
        type: 'GENERATE_AND_SAVE_IDENTITY',
        serviceName: serviceName,
        authToken: authToken
      });

      if (generateResponse.error) {
        throw new Error(generateResponse.error);
      }

      alias = generateResponse.alias;
      password = generateResponse.password;
    }

    // Auto-fill the form - add small delay to ensure DOM is ready
    console.log('generateAndFill: About to fill form with alias:', alias, 'password:', password ? '***' : 'none');
    
    // Detect page context (login vs signup) from URL or page content
    let pageContext = null;
    const url = window.location.href.toLowerCase();
    const pageTitle = document.title.toLowerCase();
    const bodyText = document.body.textContent.toLowerCase();
    
    if (url.includes('login') || pageTitle.includes('login') || bodyText.includes('login')) {
      pageContext = 'login';
    } else if (url.includes('signup') || url.includes('sign-up') || url.includes('register') || pageTitle.includes('signup') || pageTitle.includes('register') || bodyText.includes('signup') || bodyText.includes('register')) {
      pageContext = 'signup';
    }
    
    console.log('generateAndFill: Detected page context:', pageContext);
    
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
      autoFillForm(alias, password, pageContext);
      console.log('generateAndFill: Form fill completed');
      
      // Verify the fill worked (with longer delay to account for async operations)
      setTimeout(() => {
        // Re-find the fields to get fresh references
        const emailField = getBestField(
          document.querySelectorAll('input[type="email"], input[type="text"][name*="email" i], input[type="text"][id*="email" i], input[type="text"][placeholder*="email" i], input[type="text"][name*="username" i], input[type="text"][id*="username" i]'),
          context
        );
        const passwordField = getBestField(
          document.querySelectorAll('input[type="password"]'),
          context
        );
        
        if (emailField) {
          if (emailField.value === alias) {
            console.log('generateAndFill: ✓ Email field verified - filled correctly');
          } else {
            console.warn('generateAndFill: Email field verification failed. Expected:', alias, 'Got:', emailField.value);
          }
        }
        
        if (passwordField) {
          if (passwordField.value === password) {
            console.log('generateAndFill: ✓ Password field verified - filled correctly');
          } else {
            console.warn('generateAndFill: Password field verification failed.');
          }
        }
      }, 200);
    }, 50);

    // Update loading indicator to success
    loadingIndicator.textContent = isNewIdentity ? '✓ Generated and filled!' : '✓ Filled!';
    loadingIndicator.style.background = '#28a745';
    
    setTimeout(() => {
      loadingIndicator.remove();
    }, 2000);

  } catch (error) {
    console.error('Error filling/generating identity:', error);
    alert('Failed to fill identity: ' + (error.message || 'Please try again or check your connection.'));
    const loadingIndicator = document.getElementById('fortress-loading');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
  }
}

// Function to inject the Fortress icon into input fields
function injectFortressIcon() {
  // Find email/username and password fields - use same selectors as autoFillForm
  const emailInputs = document.querySelectorAll('input[type="email"], input[type="text"][name*="email" i], input[type="text"][id*="email" i], input[type="text"][placeholder*="email" i], input[type="text"][name*="username" i], input[type="text"][id*="username" i], input[type="text"][placeholder*="username" i]');
  const passwordInputs = document.querySelectorAll('input[type="password"]');

  // Process email fields
  emailInputs.forEach(input => {
    if (input.dataset.fortressIconInjected) {
      return; // Skip if already injected
    }

    // Create wrapper if it doesn't exist
    let wrapper = input.closest('.fortress-input-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'fortress-input-wrapper';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
    }

    // Check if icon already exists in wrapper
    if (wrapper.querySelector('.fortress-icon')) {
      return; // Icon already exists, skip
    }

    // Create the icon element
    const icon = document.createElement('span');
    icon.className = 'fortress-icon fortress-icon-absolute';
    icon.title = 'Click to fill or generate email and password';
    wrapper.appendChild(icon);

    input.dataset.fortressIconInjected = 'true'; // Mark as injected

    // Add event listener to generate and fill when the icon is clicked
    icon.addEventListener('click', async (event) => {
      event.stopPropagation();
      event.preventDefault();
      await generateAndFill();
    });
  });

  // Process password fields
  passwordInputs.forEach(input => {
    if (input.dataset.fortressIconInjected) {
      return; // Skip if already injected
    }

    // Create wrapper if it doesn't exist
    let wrapper = input.closest('.fortress-input-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'fortress-input-wrapper';
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
    }

    // Check if icon already exists in wrapper
    if (wrapper.querySelector('.fortress-icon')) {
      return; // Icon already exists, skip
    }

    // Create the icon element
    const icon = document.createElement('span');
    icon.className = 'fortress-icon fortress-icon-absolute';
    icon.title = 'Click to fill or generate email and password';
    wrapper.appendChild(icon);

    input.dataset.fortressIconInjected = 'true'; // Mark as injected

    // Add event listener to generate and fill when the icon is clicked
    icon.addEventListener('click', async (event) => {
      event.stopPropagation();
      event.preventDefault();
      await generateAndFill();
    });
  });
}

// Run injection when the DOM is ready and also on subsequent DOM changes
injectFortressIcon();
const observer = new MutationObserver(injectFortressIcon);
observer.observe(document.body, { childList: true, subtree: true });

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AUTOFILL_FORM' && message.username && message.password) {
        autoFillForm(message.username, message.password);
        sendResponse({ status: 'success' });
    }
});

// Listen for messages from the web page and forward them to the background script
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
        return;
    }

    // Ensure the message is from our frontend application
    if (event.data && event.data.source === 'fortress-frontend') {
        console.log("Content Script: Received message from webpage:", event.data);
        chrome.runtime.sendMessage(event.data, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Content Script: Error sending message to background:", chrome.runtime.lastError ? chrome.runtime.lastError.message : "Unknown error");
                // Optionally, send error back to webpage
                window.postMessage({ type: 'EXTENSION_RESPONSE_ERROR', error: chrome.runtime.lastError.message }, '*');
            } else {
                console.log("Content Script: Received response from background:", response);
                // Forward response back to the webpage
                window.postMessage({ type: 'EXTENSION_RESPONSE', response: response }, '*');
            }
        });
    }
});

