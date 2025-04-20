// Keep track of the current conversation ID
let currentConversationId = null;
let inputField = null;
let lastSavedText = "";
let typingTimer = null;
const DEBOUNCE_TIME = 500; // Save draft after 500ms of no typing

// Extract conversation ID from URL
function getConversationIdFromUrl(url) {
  const regex = /\/messages\/([0-9-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Save draft to Chrome storage
function saveDraft(text) {
  if (!currentConversationId || text === lastSavedText) return;
  
  lastSavedText = text;
  
  // Get username of the person you're messaging with
  let username = "";
  try {
    // Try to get the username from the header
    const headerElement = document.querySelector("main div[role='heading']");
    if (headerElement) {
      username = headerElement.textContent.trim();
    }
  } catch (e) {
    console.log("Couldn't get username:", e);
  }
  
  const draft = {
    text: text,
    timestamp: Date.now(),
    username: username,
    url: window.location.href
  };
  
  chrome.storage.local.get("drafts", (result) => {
    const drafts = result.drafts || {};
    drafts[currentConversationId] = draft;
    
    chrome.storage.local.set({ drafts: drafts }, () => {
      console.log("Draft saved:", draft);
    });
  });
}

// Handle input changes with debounce
function handleInputChange() {
  clearTimeout(typingTimer);
  
  typingTimer = setTimeout(() => {
    if (inputField && inputField.textContent) {
      saveDraft(inputField.textContent);
    }
  }, DEBOUNCE_TIME);
}

// Handle sending the message (clear draft)
function handleSendMessage() {
  setTimeout(() => {
    if (inputField && !inputField.textContent.trim()) {
      // Input is empty, probably sent. Clear draft.
      chrome.storage.local.get("drafts", (result) => {
        const drafts = result.drafts || {};
        if (drafts[currentConversationId]) {
          delete drafts[currentConversationId];
          chrome.storage.local.set({ drafts: drafts }, () => {
            console.log("Draft deleted after sending message");
            lastSavedText = "";
          });
        }
      });
    }
  }, 500); // Small delay to ensure the input is cleared after sending
}

// Initialize the input field listener
function initializeDraftSaver() {
  // Try different selectors for input field
  const selectors = [
    // The selector you provided
    "#react-root > div > div > div.css-175oi2r.r-1f2l425.r-13qz1uu.r-417010.r-18u37iz > main > div > div > div > section:nth-child(2) > div > div > div.css-175oi2r.r-16y2uox.r-f8sm7e.r-13qz1uu.r-1ye8kvj > div > div > aside > div.css-175oi2r.r-1awozwy.r-z32n2g.r-1867qdf.r-18u37iz.r-l00any.r-jusfrs.r-tuq35u.r-1h0ofqe > div.css-175oi2r.r-1kihuf0.r-16y2uox.r-1wbh5a2 > div > div > div > div > div > div > div.css-175oi2r.r-1wbh5a2.r-16y2uox > div > div > div > div > div > div > div > div > div > div > span > span",
    // More general selectors as fallbacks
    "div[role='textbox'][data-testid='dmComposerTextInput']",
    "div[contenteditable='true']",
    "div[role='textbox']"
  ];
  
  // Try each selector until we find a match
  for (const selector of selectors) {
    inputField = document.querySelector(selector);
    if (inputField) break;
  }
  
  if (!inputField) {
    console.log("Could not find DM input field. Retrying in 1 second...");
    setTimeout(initializeDraftSaver, 1000);
    return;
  }
  
  console.log("DM input field found:", inputField);
  
  // Add input listeners
  inputField.addEventListener("input", handleInputChange);
  
  // Look for the send button
  const sendButton = document.querySelector("div[data-testid='dmComposerSendButton']");
  if (sendButton) {
    sendButton.addEventListener("click", handleSendMessage);
  }
  
  // Try to prefill with existing draft
  prefillExistingDraft();
}

// Load and prefill existing draft if exists
function prefillExistingDraft() {
  chrome.storage.local.get("drafts", (result) => {
    const drafts = result.drafts || {};
    const draft = drafts[currentConversationId];
    
    if (draft && draft.text && inputField && !inputField.textContent.trim()) {
      inputField.textContent = draft.text;
      // Create and dispatch an input event to trigger any Twitter listeners
      const event = new Event('input', {
        bubbles: true,
        cancelable: true,
      });
      inputField.dispatchEvent(event);
      
      console.log("Prefilled draft:", draft.text);
    }
  });
}

// Main initialization
function initialize() {
  // Get conversation ID from current URL
  const newConversationId = getConversationIdFromUrl(window.location.href);
  
  if (newConversationId !== currentConversationId) {
    currentConversationId = newConversationId;
    console.log("DM conversation detected:", currentConversationId);
    
    // Reset variables for new conversation
    inputField = null;
    lastSavedText = "";
    
    if (currentConversationId) {
      initializeDraftSaver();
    }
  }
}

// Run initialization and set up URL change detection
initialize();

// Monitor for URL changes (SPA navigation)
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });

// Re-check for input field if DOM changes (helps with delayed loading)
new MutationObserver((mutations) => {
  if (!inputField) {
    initialize();
  }
}).observe(document.body, { childList: true, subtree: true });