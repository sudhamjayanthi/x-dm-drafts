// Popup script to display and manage saved Twitter DM drafts

document.addEventListener("DOMContentLoaded", () => {
	const draftsContainer = document.getElementById("draftsContainer");
	const emptyState = document.getElementById("emptyState");
	const clearAllBtn = document.getElementById("clearAllBtn");

	// Format a timestamp to a readable string
	function formatTimestamp(ts) {
		const date = new Date(ts);
		return date.toLocaleString();
	}

	// Remove all existing draft cards, preserve empty state element
	function clearDraftCards() {
		const cards = draftsContainer.querySelectorAll(".draft-card");
		cards.forEach((card) => card.remove());
	}

	// Render the drafts object into the UI
	function renderDrafts(drafts) {
		clearDraftCards();
		const ids = Object.keys(drafts || {});
		if (ids.length === 0) {
			emptyState.style.display = "flex";
			return;
		}
		emptyState.style.display = "none";

		ids.forEach((id) => {
			const draft = drafts[id];
			const card = document.createElement("div");
			card.className = "draft-card";
			card.innerHTML = `
        <div class="draft-header">
          <span class="username">${draft.username || "Unknown"}</span>
          <span class="timestamp">${formatTimestamp(draft.timestamp)}</span>
        </div>
        <div class="draft-content"></div>
        <div class="draft-actions">
          <button class="action-btn open-btn">Open</button>
          <button class="action-btn delete-btn">Delete</button>
        </div>
      `;
			// Safely insert the draft text
			card.querySelector(".draft-content").textContent = draft.text || "";

			// Open the DM thread in a new tab
			card.querySelector(".open-btn").addEventListener("click", () => {
				chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
					const currentTab = tabs[0];
					if (currentTab.url.includes('x.com/messages/')) {
						// Update current DM tab
						chrome.tabs.update(currentTab.id, { url: draft.url });
					} else {
						// Create new tab if not in DMs
						chrome.tabs.create({ url: draft.url });
					}
					window.close();
				});
			});

			// Delete this draft and re-render
			card.querySelector(".delete-btn").addEventListener("click", () => {
				if (window.confirm("Are you sure you want to delete this draft?")) {
					chrome.storage.local.get("drafts", (result) => {
						const updated = result.drafts || {};
						delete updated[id];
						chrome.storage.local.set({ drafts: updated }, () => {
							renderDrafts(updated);
						});
					});
				}
			});

			draftsContainer.appendChild(card);
		});
	}

	// Clear all drafts when clicking the clear button
	clearAllBtn.addEventListener("click", () => {
		if (window.confirm("Are you sure you want to clear all drafts?")) {
			chrome.storage.local.set({ drafts: {} }, () => {
				renderDrafts({});
			});
		}
	});

	// Initial load of drafts
	chrome.storage.local.get("drafts", (result) => {
		renderDrafts(result.drafts || {});
	});
});
