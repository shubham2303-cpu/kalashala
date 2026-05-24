# Artisera — Project Structure & Setup Guide

## File structure

```
artisera/
│
├── index.html              ← HTML shell only (no CSS, no JS inline)
├── config.js               ← YOUR SETTINGS — API URL, gallery name, etc. (gitignored)
├── config.example.js       ← Template for config.js — safe to commit
├── .gitignore
│
├── css/
│   └── styles.css          ← All visual styles
│
├── js/
│   ├── render.js           ← DOM builders (pure functions, no side effects)
│   ├── pdf.js              ← In-browser PDF generation (jsPDF)
│   ├── ui.js               ← All event listeners, filters, modals, carousel
│   └── main.js             ← Entry point: fetches data, boots the page
│
├── google-apps-script.js   ← Paste into Google Apps Script (the API layer)
├── sample-data.md          ← Ready-to-paste rows for your Google Sheet
└── README.md               ← This file
```

---

## One-time setup (developer)

### 1. Create the Google Sheet

Create a new Google Sheet called `Artisera CMS` with three tabs:
- `Exhibitions`
- `Artworks`
- `Artists`

Copy the header rows from `sample-data.md` into row 1 of each tab,
then paste in the sample rows to test with.

**Exact column headers — copy these precisely:**

**Exhibitions tab, row 1:**
```
id  title  medium  status  startDate  endDate  imageUrl  imageUrlTall  description  curatorNote  venue  address  city  country  mapUrl  works  admissionNote
```

**Artworks tab, row 1:**
```
exhibitionId  title  year  medium  dimensions  imageUrl  forSale  sold  price
```

**Artists tab, row 1:**
```
exhibitionId  name  role  bio  imageUrl
```

---

### 2. Deploy the Apps Script API

1. In your Google Sheet → **Extensions → Apps Script**
2. Delete all existing code, paste the contents of `google-apps-script.js`
3. Save (Ctrl+S)
4. **Deploy → New Deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Click **Deploy → Authorise → Allow**
6. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/XXXXX/exec`)

---

### 3. Configure the site

```bash
cp config.example.js config.js
```

Open `config.js` and fill in your values:

```js
const CONFIG = {
  SHEET_API_URL: 'https://script.google.com/macros/s/YOUR_ID/exec',  // ← paste here
  GALLERY_NAME:  'Your Gallery Name',
  GALLERY_EMAIL: 'info@yourgallery.com',
  // ...
};
```

---

### 4. Test locally

Because the site fetches data via `fetch()`, you need a local server
(browsers block `fetch()` from `file://` URLs):

```bash
# Option A — Python (no install needed)
python3 -m http.server 8080
# then open http://localhost:8080

# Option B — Node (if installed)
npx serve .
# then open the URL it shows
```

---

### 5. Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Drag the entire `artisera/` folder into the upload area
3. Done — you get a live URL instantly

**To update the site:** drag the folder again (or connect to a GitHub repo for automatic deploys).

> **Note:** `config.js` is gitignored and will NOT be in your repo.
> For Netlify + GitHub, set `SHEET_API_URL` as an environment variable
> in Netlify's dashboard and have a build step inject it.
> For drag-and-drop deploys, include `config.js` manually each time.

---

## Adding content (non-technical staff)

### Add a new exhibition
1. Open the `Exhibitions` tab
2. Add a new row with a unique `id` (next number in sequence)
3. Fill in all columns (see column guide below)
4. Save — the website updates automatically

### Add artworks to an exhibition
1. Open the `Artworks` tab
2. Add one row per artwork
3. Set `exhibitionId` to match the exhibition's `id`
4. Save

### Add artists to an exhibition
1. Open the `Artists` tab
2. Add one row per artist
3. Set `exhibitionId` to match the exhibition's `id`
4. Save

### Mark an artwork as sold or for sale
In the `Artworks` tab:
- Set `forSale` to `yes` or `no`
- Set `sold` to `yes` or `no`
- Set `price` to the price (e.g. `£4,500`) or leave blank

---

## Column reference

### Exhibitions
| Column | Required | Notes |
|--------|----------|-------|
| `id` | ✓ | Unique integer. Use next number in sequence. |
| `title` | ✓ | Exhibition name |
| `medium` | ✓ | e.g. Painting, Photography, Sculpture |
| `status` | ✓ | `ongoing`, `upcoming`, or `past` |
| `startDate` | ✓ | e.g. `14 March` |
| `endDate` | ✓ | e.g. `22 June 2025` |
| `imageUrl` | ✓ | Wide banner image URL (800×500px ideal) |
| `imageUrlTall` | ✓ | Portrait card image URL (600×800px ideal) |
| `description` | ✓ | 2–3 sentence public description |
| `curatorNote` | | Shown in full detail view only |
| `venue` | ✓ | Gallery room name |
| `address` | ✓ | Street address |
| `city` | ✓ | City and postcode |
| `country` | ✓ | Country |
| `mapUrl` | | Google Maps link |
| `works` | ✓ | Total number of works in show |
| `admissionNote` | | e.g. `Free entry. Open Tue–Sun 10am–6pm.` |

### Artworks
| Column | Required | Notes |
|--------|----------|-------|
| `exhibitionId` | ✓ | Must match an exhibition's `id` |
| `title` | ✓ | Artwork title |
| `year` | ✓ | Year made |
| `medium` | ✓ | Materials used |
| `dimensions` | | e.g. `120 × 90 cm` |
| `imageUrl` | ✓ | Artwork image URL |
| `forSale` | | `yes` or `no` |
| `sold` | | `yes` or `no` |
| `price` | | e.g. `£4,500` |

### Artists
| Column | Required | Notes |
|--------|----------|-------|
| `exhibitionId` | ✓ | Must match an exhibition's `id` |
| `name` | ✓ | Full name |
| `role` | ✓ | e.g. `Primary Artist`, `Contributing Artist` |
| `bio` | | 2–3 sentences |
| `imageUrl` | | Portrait photo URL |

---

## Image hosting

Images must be publicly accessible URLs. Recommended free option:

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Upload your image via drag-and-drop
3. Click the image → Copy URL
4. Paste the URL into the relevant column in the Sheet

**Cloudinary resize tip:** Insert transform parameters into the URL:
- Wide banner: `.../upload/w_800,h_500,c_fill/filename.jpg`
- Tall card: `.../upload/w_600,h_800,c_fill/filename.jpg`
- Square avatar: `.../upload/w_160,h_160,c_fill,g_face/filename.jpg`

---

## Updating the Apps Script

If you modify `google-apps-script.js`:

1. Open the Sheet → **Extensions → Apps Script**
2. Paste the updated code and save
3. **Deploy → Manage Deployments → Edit (pencil)**
4. Change version to **New version** → Deploy

The URL stays the same — no change needed to `config.js`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| "SHEET_API_URL not configured" | `config.js` missing or URL not set | Copy `config.example.js` → `config.js`, fill in URL |
| "Unable to load exhibitions" | API call failing | Check URL is correct; redeploy script with "Anyone" access |
| New row not appearing | Wrong status spelling | Must be exactly `ongoing`, `upcoming`, or `past` |
| Images broken | URL not public | Test URL directly in browser; use Cloudinary |
| Changes to script not working | Old version deployed | Deploy → Manage Deployments → New version |
