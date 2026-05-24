/**
 * ============================================================
 * Artisera — Google Apps Script API
 * ============================================================
 *
 * SETUP INSTRUCTIONS (do this once):
 *
 * 1. Open your Google Sheet
 * 2. Click Extensions → Apps Script
 * 3. Delete everything in the editor and paste this entire file
 * 4. Click Save (Ctrl+S)
 * 5. Click Deploy → New Deployment
 * 6. Type: Select type → Web App
 * 7. Description: "Artisera API v1"
 * 8. Execute as: Me
 * 9. Who has access: Anyone
 * 10. Click Deploy → Authorise → Allow
 * 11. Copy the Web App URL — paste it into index.html as SHEET_API_URL
 *
 * Every time you update the script, click:
 * Deploy → Manage Deployments → Edit (pencil) → New Version → Deploy
 * ============================================================
 */

// ── Sheet tab names (must match exactly) ──
const SHEET_EXHIBITIONS = 'Exhibitions';
const SHEET_ARTWORKS    = 'Artworks';
const SHEET_ARTISTS     = 'Artists';

/**
 * GET handler — called by the website on every page load.
 * Returns all data as JSON with CORS headers so any domain can fetch it.
 */
function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;
  try {
    const data = buildPayload();
    return buildResponse(data, callback);
  } catch (err) {
    return buildResponse({ error: err.message }, callback);
  }
}

/**
 * Assembles the full data payload the website needs.
 */
function buildPayload() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const exhibitions = readSheet(ss, SHEET_EXHIBITIONS);
  const artworks    = readSheet(ss, SHEET_ARTWORKS);
  const artists     = readSheet(ss, SHEET_ARTISTS);

  // Group artworks and artists by their exhibitionId
  const artworksByExh = groupBy(artworks, 'exhibitionId');
  const artistsByExh  = groupBy(artists,  'exhibitionId');

  // Attach artworks and artists arrays to each exhibition
  const enriched = exhibitions
    .filter(ex => ex.id && ex.title)           // skip empty rows
    .map(ex => ({
      ...ex,
      id:           parseInt(ex.id, 10),
      works:        parseInt(ex.works, 10) || 0,
      imageUrl:     driveToImg(ex.imageUrl     || ''),
      imageUrlTall: driveToImg(ex.imageUrlTall || ''),
      artworks:     (artworksByExh[ex.id] || []).map(normaliseArtwork),
      artists:      (artistsByExh[ex.id]  || []).map(normaliseArtist),
    }));

  // Sort exhibitions latest-first (most recent endDate descending)
  // Exhibitions without an endDate sort to the top (ongoing/upcoming)
  enriched.sort(function(a, b) {
    var da = a.endDateSort || '9999-12-31';
    var db = b.endDateSort || '9999-12-31';
    return db.localeCompare(da);
  });

  // Artists strip = unique artists sorted by show count
  const artistsStrip = buildArtistsStrip(artists);

  return { exhibitions: enriched, artistsStrip };
}

/**
 * Reads a sheet tab and returns an array of objects keyed by header row.
 * Empty rows (no 'id' or first column) are skipped automatically.
 */
function readSheet(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`Sheet "${sheetName}" not found. Check the tab name.`);

  const [headers, ...rows] = sheet.getDataRange().getValues();
  const tz = Session.getScriptTimeZone();

  return rows
    .filter(row => row.some(cell => cell !== '' && cell !== null))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        const key = String(header).trim().replace(/\s+(.)/g, (_, c) => c.toUpperCase());
        const val = row[i];
        const isDateKey = key === 'startDate' || key === 'endDate';
        if (val instanceof Date) {
          const fmt = key === 'startDate' ? 'd MMMM' : 'd MMMM yyyy';
          obj[key] = Utilities.formatDate(val, tz, fmt);
          if (key === 'endDate') {
            obj['endDateSort'] = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
          }
        } else if (isDateKey && typeof val === 'string' && val.includes('T')) {
          // Sheet cell stored as text ISO string — parse and reformat
          const d = new Date(val);
          if (!isNaN(d)) {
            const fmt = key === 'startDate' ? 'd MMMM' : 'd MMMM yyyy';
            obj[key] = Utilities.formatDate(d, tz, fmt);
            if (key === 'endDate') {
              obj['endDateSort'] = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
            }
          } else {
            obj[key] = val === '' ? null : val;
          }
        } else {
          obj[key] = val === '' ? null : val;
        }
      });
      return obj;
    });
}

/**
 * Converts a Google Drive share link to a direct embeddable image URL.
 * Handles /file/d/ID/view and ?id=ID formats.
 * Non-Drive URLs are returned unchanged.
 */
function driveToImg(url) {
  if (!url) return url;
  var m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w2000';
  var id = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (id) return 'https://lh3.googleusercontent.com/d/' + id[1] + '=w2000';
  return url;
}

/**
 * Groups an array of objects by a given key.
 * Keys are coerced to strings for consistent matching.
 */
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = String(item[key] || '');
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

/**
 * Normalise an artwork row — ensure all expected fields exist.
 */
function normaliseArtwork(aw) {
  return {
    title:      String(aw.title      || ''),
    year:       parseInt(aw.year, 10) || null,
    medium:     String(aw.medium     || ''),
    dimensions: String(aw.dimensions || ''),
    imageUrl:   driveToImg(String(aw.imageUrl || '')),
    forSale:    String(aw.forSale    || 'no').toLowerCase() === 'yes',
    sold:       String(aw.sold       || 'no').toLowerCase() === 'yes',
    price:      aw.price ? String(aw.price) : null,
  };
}

/**
 * Normalise an artist row — ensure all expected fields exist.
 */
function normaliseArtist(a) {
  return {
    name:     String(a.name     || ''),
    role:     String(a.role     || 'Artist'),
    bio:      String(a.bio      || ''),
    imageUrl: driveToImg(String(a.imageUrl || '')),
  };
}

/**
 * Builds the artist strip array from the Artists sheet.
 * Deduplicates by name and counts how many exhibitions each artist appears in.
 */
function buildArtistsStrip(artists) {
  const countMap = {};
  artists.forEach(a => {
    if (!a.name) return;
    if (!countMap[a.name]) {
      countMap[a.name] = { name: a.name, imageUrl: a.imageUrl || '', shows: 0 };
    }
    countMap[a.name].shows += 1;
  });
  return Object.values(countMap).sort((a, b) => b.shows - a.shows);
}

/**
 * Returns a JSONP response when a callback name is provided (browser requests),
 * or plain JSON otherwise (e.g. direct testing in the browser address bar).
 */
function buildResponse(data, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(data) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
