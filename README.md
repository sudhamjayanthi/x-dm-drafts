# Twitter DM Draft Saver Chrome Extension

    A simple Chrome extension that automatically saves your unsent direct message drafts on Twitter/X. Never lose a draft again when you accidentally close a tab or navigate away from a conversation.

## Features

- **Automatic Draft Saving**: Saves your drafts as you type
- **Automatic Prefill**: Returns your draft when you come back to a conversation
- **Draft Management**: View and manage all your saved drafts
- **Clean UI**: Modern, Twitter-inspired interface
- **User Privacy**: All data is stored locally on your device

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension folder
5. The extension is now installed and active

## Usage

- Simply type in any Twitter DM conversation and your draft will be saved automatically
- When you return to a conversation, your draft will be prefilled
- Click the extension icon to see all your saved drafts
- Use the "Open" button to navigate to a specific conversation
- Delete drafts individually or clear all at once

## Files Included

- `manifest.json`: Extension configuration
- `content.js`: DM detection and draft saving functionality
- `popup.html`, `popup.css`, `popup.js`: UI for viewing and managing drafts
- `images/`: Icons for the extension

## Technical Details

The extension works by:
1. Detecting when you're on a Twitter DM page
2. Finding the input field and monitoring changes
3. Saving drafts to Chrome's local storage
4. Detecting when a message is sent to clear the draft
5. Prefilling the draft when returning to a conversation

## Privacy

This extension:
- Stores all data locally on your device using Chrome's storage API
- Does not send any data to external servers
- Only activates on Twitter/X message pages
- Only requires permissions for storage and access to Twitter/X URLs

## Support

If you encounter any issues or have questions, please file an issue on the repository.

## License

MIT License - Feel free to modify and use as needed.