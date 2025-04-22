// content.js - Simplified Twitter DM Draft Saver

let currentConversationId = null;
let inputField = null;
let typingTimer = null;
let isInitialized = false;
let statusIndicator = null; // Add status indicator reference
const DEBOUNCE_TIME = 0; // ms to wait after typing stops before saving
const INPUT_SELECTOR = "div[contenteditable='true'][data-testid='dmComposerTextInput']";
const SEND_BUTTON_SELECTOR = "div[data-testid='dmComposerSendButton']";

// Extract conversation ID (e.g., '12345-67890') from URL
function getConversationIdFromUrl(url) {
	const match = url.match(/\/messages\/([0-9-]+)/);
	return match ? match[1] : null;
}

// Save draft text (as HTML) to chrome.storage.local
function saveDraft(conversationId, htmlContent) {
	if (!conversationId || htmlContent === null || htmlContent === undefined) return; // Check for null/undefined

	if (statusIndicator) statusIndicator.textContent = "Saving...";

	// Attempt to get username for the popup display
	let username = conversationId; // Default to conversationId if username isn't found
	try {
		// More specific selector targeting the username within the conversation header
		const headerElement = document.querySelector(
			'div[data-testid="DmScrollerContainer"] h2[role="heading"] span'
		);
		if (headerElement) {
			const potentialUsername = headerElement.textContent.trim();
			// Basic check to ensure we got something potentially valid
			if (potentialUsername) {
				username = potentialUsername;
			}
		}
	} catch (e) {
		console.error("Error getting username:", e);
		if (statusIndicator) statusIndicator.textContent = "Error while saving draft";
		return;
	}

	const draftData = {
		text: htmlContent, // Store the innerHTML
		timestamp: Date.now(),
		username: username,
		url: window.location.href,
	};

	chrome.storage.local.get("drafts", (result) => {
		// Check if the context is still valid before proceeding
		if (chrome.runtime.lastError) {
			console.warn(
				"Context invalidated before storage.get callback:",
				chrome.runtime.lastError.message
			);
			return; // Stop execution if context is invalid
		}

		const drafts = result.drafts || {};
		// Only update if HTML content actually changed to avoid unnecessary writes
		if (!drafts[conversationId] || drafts[conversationId].text !== htmlContent) {
			drafts[conversationId] = draftData;
			chrome.storage.local.set({ drafts: drafts }, () => {
				// Also check context validity here
				if (chrome.runtime.lastError) {
					console.error(
						"Error saving draft (context might be invalidated):",
						chrome.runtime.lastError.message
					);
					if (statusIndicator) statusIndicator.textContent = "Error while saving draft";
					return; // Stop execution
				} else {
					console.log(`Draft saved for ${conversationId}`);
					if (statusIndicator) {
						statusIndicator.textContent = "Saved";
						// Clear "Saved" message after 2 seconds
						setTimeout(() => {
							// Check lastError *again* before DOM manipulation in setTimeout
							if (chrome.runtime.lastError) {
								console.warn(
									"Context invalidated before status clear timeout:",
									chrome.runtime.lastError.message
								);
								return;
							}
							if (statusIndicator) statusIndicator.textContent = "";
						}, 2000);
					}
				}
			});
		}
	});
}

// Delete draft for a given conversation ID
function deleteDraft(conversationId) {
	if (!conversationId) return;
	chrome.storage.local.get("drafts", (result) => {
		// Check context
		if (chrome.runtime.lastError) {
			console.warn(
				"Context invalidated before delete storage.get callback:",
				chrome.runtime.lastError.message
			);
			return;
		}

		const drafts = result.drafts || {};
		if (drafts[conversationId]) {
			delete drafts[conversationId];
			chrome.storage.local.set({ drafts: drafts }, () => {
				// Check context
				if (chrome.runtime.lastError) {
					console.error(
						"Error deleting draft (context might be invalidated):",
						chrome.runtime.lastError.message
					);
					return;
				}
				console.log(`Draft deleted for ${conversationId}`);
			});
		}
	});
}

// Prefill input field with saved draft text
function prefillDraft(conversationId, inputElement) {
	if (!conversationId || !inputElement) return;

	chrome.storage.local.get("drafts", (result) => {
		// Check context
		if (chrome.runtime.lastError) {
			console.warn(
				"Context invalidated before prefill storage.get callback:",
				chrome.runtime.lastError.message
			);
			return;
		}

		const drafts = result.drafts || {};
		const draft = drafts[conversationId];

		// Check if the draft text exists and if the input field is visually empty
		// Use innerText for checking visual emptiness, as innerHTML might contain <br> etc.
		if (draft && draft.text && !inputElement.innerText.trim()) {
			console.log(`Prefilling draft for ${conversationId}`);
			inputElement.focus();
			// Set the innerHTML directly
			inputElement.innerHTML = draft.text;
			// Move cursor to the end (optional, but good UX)
			const range = document.createRange();
			const sel = window.getSelection();
			range.selectNodeContents(inputElement);
			range.collapse(false); // false collapses to the end
			sel.removeAllRanges();
			sel.addRange(range);

			// Dispatch input event to make React aware of the change
			inputElement.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
		}
	});
}

// --- Event Handlers ---

// Called when text input content changes
function handleInputChange() {
	clearTimeout(typingTimer);
	if (!isInitialized || !inputField || !currentConversationId) return;

	const currentHTML = inputField.innerHTML; // Read current innerHTML

	typingTimer = setTimeout(() => {
		if (isInitialized && currentConversationId) {
			// Pass innerHTML to saveDraft
			saveDraft(currentConversationId, currentHTML);
		}
	}, DEBOUNCE_TIME);
}

// Called when send button is potentially clicked
function handleSendMessage() {
	// Wait briefly to allow Twitter's JS to clear the input after sending
	setTimeout(() => {
		if (
			isInitialized &&
			inputField &&
			// Use innerText to check if the field is visually empty
			!inputField.innerText.trim() &&
			currentConversationId
		) {
			// Input is now empty, assume message was sent successfully
			deleteDraft(currentConversationId);
		}
	}, 500); // Adjust delay if needed
}

// --- Initialization and Observation ---

let observer = null; // To watch for the input field appearing

// Try to find the input field and attach listeners
function initializeForConversation(conversationId) {
	if (!conversationId) {
		isInitialized = false;
		return;
	}

	if (isInitialized && currentConversationId === conversationId) {
		return;
	}

	inputField = document.querySelector(INPUT_SELECTOR);

	if (inputField) {
		console.log("DM Input field found for:", conversationId);
		currentConversationId = conversationId;

		// Create status indicator
		if (!statusIndicator) {
			statusIndicator = document.createElement("div");
			statusIndicator.id = "status-indicator";
			statusIndicator.innerText = "status-indicator";
			statusIndicator.style.position = "fixed";
			statusIndicator.style.bottom = "10px";
			statusIndicator.style.left = "10px";
			statusIndicator.style.padding = "10px";
			statusIndicator.style.fontSize = "32px";
			statusIndicator.style.backgroundColor = "red";

			// Insert status indicator before the input field
			const container = inputField.parentElement;
			// if (container) {
			// 	// container.style.position = "relative";
			// 	// container.insertAdjacentElement(inputField, statusIndicator);
			// }
			document.body.appendChild(statusIndicator);
		}

		// Prefill if draft exists
		prefillDraft(currentConversationId, inputField);

		// Add listeners for typing and sending
		inputField.removeEventListener("input", handleInputChange);
		inputField.addEventListener("input", handleInputChange);

		const sendButton = document.querySelector(SEND_BUTTON_SELECTOR);
		if (sendButton) {
			sendButton.removeEventListener("click", handleSendMessage);
			sendButton.addEventListener("click", handleSendMessage);
		}

		isInitialized = true;

		// Stop observing once we've found the input and initialized
		if (observer) {
			observer.disconnect();
			observer = null;
			console.log("Observer stopped.");
		}
	} else {
		isInitialized = false;
		// If not found immediately, start observing (if not already)
		if (!observer) {
			console.log("Input field not found, observing DOM changes...");
			observer = new MutationObserver(() => {
				const latestConversationId = getConversationIdFromUrl(window.location.href);
				if (
					latestConversationId &&
					(latestConversationId !== currentConversationId || !isInitialized)
				) {
					initializeForConversation(latestConversationId);
				} else if (!latestConversationId) {
					run();
				}
			});
			observer.observe(document.body, { childList: true, subtree: true });
		}
	}
}

// Main function called on load and URL changes
function run() {
	const conversationId = getConversationIdFromUrl(window.location.href);
	console.log("Checking URL, conversation ID:", conversationId);

	if (conversationId && conversationId !== currentConversationId) {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
		inputField = null;
		currentConversationId = null;
		isInitialized = false;
		clearTimeout(typingTimer);
		// Remove old status indicator if it exists
		if (statusIndicator) {
			statusIndicator.remove();
			statusIndicator = null;
		}
		initializeForConversation(conversationId);
	} else if (!conversationId) {
		if (observer) {
			observer.disconnect();
			observer = null;
		}
		inputField = null;
		currentConversationId = null;
		isInitialized = false;
		clearTimeout(typingTimer);
		// Remove status indicator when leaving DM page
		if (statusIndicator) {
			statusIndicator.remove();
			statusIndicator = null;
		}
		console.log("Not on a DM page or invalid URL. State reset.");
	}
}

// Initial run
run();

// Monitor for URL changes in SPA
let lastUrl = window.location.href;
new MutationObserver(() => {
	const currentUrl = window.location.href;
	if (currentUrl !== lastUrl) {
		lastUrl = currentUrl;
		run(); // Re-run initialization logic on URL change
	}
}).observe(document, { subtree: true, childList: true });
