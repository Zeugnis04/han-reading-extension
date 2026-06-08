# Han Reading Inspector

Chrome extension for looking up modern Mandarin, Cantonese, Southern Min, Japanese, Korean, Vietnamese, Old Chinese, and Middle Chinese readings for Han characters.

## Use in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder.

## Features

- Extension popup for manual one-character lookup.
- Right-click context menu on selected text: **Show Han readings**.
- In-page panel next to the selected/right-clicked character.
- Options page for toggling and ordering displayed readings.
- Modern readings plus Middle Chinese fields parsed from Wiktionary.
- Live data from English Wiktionary via `https://en.wiktionary.org/w/api.php`.

## Options

Open the popup and click **Options**, or use the extension details page in `chrome://extensions`. Changes are saved with Chrome sync storage.

## Development

This is a plain Manifest V3 extension with no build step. Core lookup code is in `src/lib/hanReadings.js`; both the popup and content script import it.
