# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Artisera is a static art gallery website. There is no build step, no package manager, and no framework. The data layer is a Google Sheet exposed via a Google Apps Script web app.

## Local development

Because `main.js` uses `fetch()` (via JSONP), you must serve the files over HTTP — opening `index.html` directly from the filesystem will fail:

```bash
# Python (built-in)
python3 -m http.server 8080
# then open http://localhost:8080

# or Node
npx serve .
```

There are no tests and no lint commands.

## Configuration

`config.js` is gitignored. Before running locally, create it from the template:

```bash
cp config.example.js config.js
# then fill in SHEET_API_URL with the deployed Apps Script URL
```

`config.js` must set `window.ARTISERA_CONFIG` before any other script runs (it loads first in `index.html`).

## Script load order — do not change

`index.html` loads scripts in this exact order, and each file depends on the ones above it:

1. `config.js` — sets `window.ARTISERA_CONFIG`
2. jsPDF (CDN)
3. `js/render.js` — pure DOM builders, reads `window.ARTISERA_CONFIG`
4. `js/pdf.js` — PDF generation, uses jsPDF and `statusLabel` from render.js
5. `js/ui.js` — event wiring, uses `populateGrid` / `buildCarousel` / `generatePDF`
6. `js/main.js` — entry point, fetches data and calls everything above

## Architecture

### Data flow

```
Google Sheet (3 tabs: Exhibitions, Artworks, Artists)
  → google-apps-script.js (deployed as Apps Script web app)
  → JSONP response (not fetch — avoids CORS)
  → main.js: sets window.EXHIBITIONS, window.ARTISTS_STRIP, window.MEDIUMS, window.STATUSES
  → render.js functions build DOM nodes
  → ui.js wires interactions on that DOM
```

### Module roles

- **`render.js`** — pure DOM builders. Functions accept data as arguments and return `HTMLElement` nodes; they never append to `document` directly. Two versions of some functions exist: the originals in `render.js` (read global `EXHIBITIONS`) and overrides in `main.js` (accept data as params). The `main.js` versions take precedence at runtime.

- **`ui.js`** — all interactivity after the DOM is built. Manages filter state (`activeStatus`, `activeMedium`), the L1 modal lifecycle, Level-2 "Know More" expansion, the artwork carousel (prev/next, thumbnails, swipe, keyboard), artist strip drag-scroll, and newsletter form.

- **`pdf.js`** — in-browser A4 PDF using jsPDF. Pure data-in / file-out; no DOM side effects.

- **`main.js`** — boot sequence: shows loading skeleton → fetches via JSONP → calls `renderPage()` which builds DOM sections and calls `init*()` functions from `ui.js`.

- **`google-apps-script.js`** — paste into Google Apps Script editor (not loaded by the browser). Reads the three Sheet tabs, joins artworks and artists onto their parent exhibition by `exhibitionId`, and returns a JSONP-wrapped payload.

### Global state

`main.js` sets these window globals after a successful fetch; `render.js` and `ui.js` read them:

| Global | Contents |
|---|---|
| `window.EXHIBITIONS` | Full enriched exhibitions array (with nested `artworks` and `artists`) |
| `window.ARTISTS_STRIP` | Deduplicated artists sorted by show count |
| `window.MEDIUMS` | Unique medium strings from exhibitions |
| `window.STATUSES` | `['ongoing', 'upcoming', 'past']` |
| `window.ARTISERA_CONFIG` | Gallery identity and feature flags from `config.js` |

### Modal layers

- **L1** (`#l1-overlay` / `#l1-panel`) — summary view, opened on card click. Contains quick-facts grid, location, artist chips, artwork carousel, "Know More" and "Download PDF" buttons.
- **L2** (`.l2-section`, appended inside `#l1-panel`) — full detail expansion triggered by "Know More". Lazy-rendered; once open it scrolls into view on re-click instead of re-rendering.

## Updating the Apps Script

After editing `google-apps-script.js`, paste the new code into the Apps Script editor and deploy a **new version** (Deploy → Manage Deployments → Edit → New version). The web app URL does not change.
