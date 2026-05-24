/* ============================================================
   js/main.js — Application entry point & orchestration
   ============================================================
   Responsibilities:
   - Read configuration from window.KALASHALA_CONFIG (config.js)
   - Fetch live data from Google Sheets API
   - Show loading / error states
   - Hand data to render.js to build the DOM
   - Call ui.js to wire all interactions
   - Expose data globally (window.EXHIBITIONS etc.) for filters

   Load order in index.html:
     1. config.js          (sets window.KALASHALA_CONFIG)
     2. css/styles.css
     3. jsPDF CDN
     4. js/render.js
     5. js/pdf.js
     6. js/ui.js
     7. js/main.js         ← this file, runs last
   ============================================================ */

/* ====================================================
   main.js — Orchestration (Google Sheets version)
   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
   SHEET_API_URL is the only thing you need to change
   after deploying the Google Apps Script.
==================================================== */

// URL comes from config.js — never hardcode it here
const SHEET_API_URL = window.ARTISERA_CONFIG?.SHEET_API_URL || window.KALASHALA_CONFIG?.SHEET_API_URL || '';

const CACHE_KEY = 'artisera_data_v6';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return (Date.now() - ts < CACHE_TTL) ? data : null;
  } catch { return null; }
}

function setCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function driveToImg(url) {
  if (!url) return url;
  var m = String(url).match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w2000';
  var id = String(url).match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (id) return 'https://lh3.googleusercontent.com/d/' + id[1] + '=w2000';
  return url;
}

const MONTH_MAP = { January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12 };
function parseExhibitionDate(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\s+(\w+)\s+(\d{4})/);
  if (!m) return null;
  return new Date(+m[3], (MONTH_MAP[m[2]] || 1) - 1, +m[1]);
}

function processData(data) {
  data.exhibitions = data.exhibitions.map(ex => {
    const imageUrl     = driveToImg(ex.imageUrl);
    const imageUrlTall = driveToImg(ex.imageUrlTall) || imageUrl; // fall back to imageUrl if tall missing
    return {
      ...ex,
      imageUrl,
      imageUrlTall,
      artworks: (ex.artworks || []).map(aw => ({ ...aw, imageUrl: driveToImg(aw.imageUrl) })),
      artists:  (ex.artists  || []).map(a  => ({ ...a,  imageUrl: driveToImg(a.imageUrl)  })),
    };
  });
  data.artistsStrip = (data.artistsStrip || []).map(a => ({ ...a, imageUrl: driveToImg(a.imageUrl) }));

  // Sort latest first — use endDateSort (set by Apps Script) when available,
  // otherwise parse the formatted endDate string directly
  data.exhibitions.sort((a, b) => {
    if (a.endDateSort && b.endDateSort) return b.endDateSort.localeCompare(a.endDateSort);
    const dA = parseExhibitionDate(a.endDate);
    const dB = parseExhibitionDate(b.endDate);
    if (!dA && !dB) return 0;
    if (!dA) return -1; // no end date = ongoing, float to top
    if (!dB) return 1;
    return dB - dA;
  });

  // TEMP DEBUG
  console.log('[artisera] processData ran. Exhibitions:', data.exhibitions.length);
  if (data.exhibitions[0]) {
    console.log('[artisera] raw imageUrl from sheet:', data.exhibitions[0].imageUrl);
    console.log('[artisera] imageUrlTall after processing:', data.exhibitions[0].imageUrlTall);
  }

  return data;
}

/**
 * Fetches live data from Google Sheets via the Apps Script API.
 * Returns { exhibitions, artistsStrip } or throws on failure.
 */
async function fetchData() {
  return new Promise((resolve, reject) => {
    const callbackName = 'artisera_' + Date.now();
    const script = document.createElement('script');

    window[callbackName] = (data) => {
      delete window[callbackName];
      document.head.removeChild(script);
      if (data.error) reject(new Error(data.error));
      else resolve(data);
    };

    script.onerror = () => reject(new Error('Failed to load data'));
    script.src = `${SHEET_API_URL}?callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

/**
 * Shows a full-page loading skeleton while data is being fetched.
 */
function showLoadingState() {
  const root = document.getElementById('app');

  // Static nav renders immediately — no data needed
  root.append(renderNav());
  initNav();

  // Loading skeleton below nav
  const skeleton = document.createElement('div');
  skeleton.id = 'loading-skeleton';
  skeleton.style.cssText = `
    padding-top: var(--nav-h);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  `;
  skeleton.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:.75rem;">
      <div style="width:40px;height:1px;background:var(--accent);animation:skeletonPulse 1.5s ease-in-out infinite;"></div>
      <p style="font-family:var(--serif);font-size:1.1rem;font-weight:300;color:var(--ink-muted);letter-spacing:.06em;">
        Loading exhibitions…
      </p>
      <p style="font-size:.75rem;color:var(--ink-muted);letter-spacing:.1em;text-transform:uppercase;" id="loading-status">
        Connecting to gallery
      </p>
    </div>`;
  root.append(skeleton);
}

/**
 * Removes the loading skeleton and renders the full page with live data.
 */
function renderPage(data) {
  const root = document.getElementById('app');
  const skeleton = document.getElementById('loading-skeleton');

  // Fade out skeleton
  if (skeleton) {
    skeleton.style.transition = 'opacity .4s ease';
    skeleton.style.opacity = '0';
    setTimeout(() => skeleton.remove(), 400);
  }

  // Expose data globally so render/ui functions can access it
  window.EXHIBITIONS  = data.exhibitions;
  window.ARTISTS_STRIP = data.artistsStrip;
  window.MEDIUMS  = [...new Set(data.exhibitions.map(e => e.medium))];
  window.STATUSES = ['ongoing', 'upcoming', 'past'];

  // Build page sections
  root.append(renderHero(data.exhibitions));
  root.append(renderExhibitionsSection());
  root.append(renderArtistStrip());
  root.append(renderNewsletter());
  root.append(renderFooter());
  document.body.append(renderL1Modal());

  // Populate dynamic content
  document.getElementById('filter-wrap')?.append(renderFilterBar());
  populateGrid(data.exhibitions);

  const track = document.getElementById('artists-track');
  data.artistsStrip.forEach(a => track?.append(renderArtistCard(a)));

  document.getElementById('load-more-btn')?.addEventListener('click', function() {
    this.textContent = 'All exhibitions loaded';
    this.disabled = true;
  });

  // Wire all interactions
  initFilters();
  initL1Modal();
  initArtistDrag();
  initNewsletter();
  initScrollReveal();
}

/**
 * Shows a friendly error state if the API call fails.
 * Still renders with fallback data so the site is never completely broken.
 */
function showErrorState(err) {
  console.error('[KalaShala] Failed to load from Google Sheets:', err);

  const skeleton = document.getElementById('loading-skeleton');
  if (skeleton) {
    skeleton.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;max-width:420px;text-align:center;padding:2rem;">
        <p style="font-family:var(--serif);font-size:1.3rem;font-weight:300;color:var(--ink);">
          Unable to load exhibitions
        </p>
        <p style="font-size:.875rem;color:var(--ink-muted);line-height:1.7;">
          Could not connect to the data source. Please check your
          <code style="font-size:.8rem;background:var(--paper-off);padding:2px 6px;border-radius:2px;">SHEET_API_URL</code>
          in <code style="font-size:.8rem;background:var(--paper-off);padding:2px 6px;border-radius:2px;">index.html</code>
          and ensure the Apps Script is deployed as a public web app.
        </p>
        <button onclick="location.reload()"
          style="font-family:var(--sans);font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;
                 color:var(--paper);background:var(--ink);border:none;padding:12px 24px;
                 border-radius:2px;cursor:pointer;margin-top:.5rem;">
          Try Again
        </button>
        <p style="font-size:.75rem;color:var(--ink-muted);">
          Error: ${err.message}
        </p>
      </div>`;
  }
}

/* ── Updated render functions that accept data params ── */

// renderHero now takes the exhibitions array as a parameter
// (overrides the function defined above that relied on global EXHIBITIONS)
function renderHero(exhibitions) {
  const f = exhibitions.find(e => e.status === 'ongoing') || exhibitions[0];
  if (!f) return document.createElement('div');
  const s = document.createElement('section');
  s.className = 'hero';
  s.innerHTML = `
    <div class="hero__bg">
      <img class="hero__img" src="${f.imageUrl}" alt="${f.title}" loading="eager">
    </div>
    <div class="hero__overlay"></div>
    <div class="hero__content">
      <div class="container">
        <div class="hero__text">
          <div class="hero__eyebrow"><span class="hero__eyebrow-line"></span><span class="hero__eyebrow-txt">Featured Exhibition</span></div>
          <h1 class="hero__title">${f.title}</h1>
          <div class="hero__meta">
            <span class="hero__date">${f.startDate} – ${f.endDate}</span>
            <span class="hero__sep"></span>
            <span class="hero__loc">${f.venue}, ${(f.city||'').split(',')[0]}</span>
          </div>
          <a href="#exhibitions" class="hero__cta">Explore<span class="hero__arr"></span></a>
        </div>
        <div class="hero__aside">
          <div class="hero__scroll">
            <span class="hero__scroll-txt">Scroll</span>
            <span class="hero__scroll-line"></span>
          </div>
        </div>
      </div>
    </div>`;
  s.querySelector('.hero__img').addEventListener('load', e => e.target.classList.add('loaded'), {once:true});
  return s;
}

// renderFilterBar now reads from window.MEDIUMS set by renderPage()
function renderFilterBar() {
  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  const sg = document.createElement('div'); sg.style.cssText='display:flex;gap:.5rem;flex-wrap:wrap';
  (window.STATUSES||[]).forEach(s => {
    const b = document.createElement('button');
    b.className='pill pill--status'; b.dataset.filter=s; b.dataset.type='status';
    b.textContent=statusLabel(s); sg.append(b);
  });
  const divider = document.createElement('span'); divider.className='filter-bar__div';
  const mg = document.createElement('div'); mg.style.cssText='display:flex;gap:.5rem;flex-wrap:wrap';
  (window.MEDIUMS||[]).forEach(m => {
    const b = document.createElement('button');
    b.className='pill'; b.dataset.filter=m; b.dataset.type='medium';
    b.textContent=m; mg.append(b);
  });
  bar.append(sg, divider, mg);
  return bar;
}

// populateGrid reads from global window.EXHIBITIONS when filtering
function populateGrid(exhibitions) {
  const grid    = document.getElementById('exh-grid');
  const empty   = document.getElementById('exh-empty');
  const counter = document.getElementById('exh-count');
  if (!grid) return;
  grid.innerHTML = '';
  empty?.classList.toggle('visible', !exhibitions.length);
  if (counter) counter.textContent = `${exhibitions.length} exhibition${exhibitions.length!==1?'s':''}`;
  exhibitions.forEach(ex => grid.append(renderCard(ex)));
  initScrollReveal();
}

// getFiltered now reads from window.EXHIBITIONS
function getFiltered() {
  return (window.EXHIBITIONS||[]).filter(e =>
    (!activeStatus || e.status === activeStatus) &&
    (!activeMedium || e.medium === activeMedium)
  );
}

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', async () => {
  if (!SHEET_API_URL || SHEET_API_URL === 'YOUR_APPS_SCRIPT_URL_HERE' || SHEET_API_URL === '') {
    showLoadingState();
    showErrorState(new Error('SHEET_API_URL not configured. Open config.js and paste your Apps Script URL.'));
    return;
  }

  const cached = getCached();
  if (cached) {
    // Render instantly from cache, then silently refresh in background
    showLoadingState();
    renderPage(cached);
    fetchData().then(fresh => {
      const processed = processData(fresh);
      const prevJson = JSON.stringify(cached);
      setCache(processed);
      if (JSON.stringify(processed) !== prevJson) {
        // New data arrived — update globals and repopulate grid (preserves active filters)
        window.EXHIBITIONS   = processed.exhibitions;
        window.ARTISTS_STRIP = processed.artistsStrip;
        window.MEDIUMS       = [...new Set(processed.exhibitions.map(e => e.medium))];
        populateGrid(getFiltered());
      }
    }).catch(() => {});
    return;
  }

  showLoadingState();
  const statusEl = document.getElementById('loading-status');
  try {
    if (statusEl) statusEl.textContent = 'Fetching exhibitions…';
    const data = await fetchData();
    const processed = processData(data);
    setCache(processed);
    renderPage(processed);
  } catch (err) {
    showErrorState(err);
  }
});

/* Skeleton pulse animation */
const skeletonStyle = document.createElement('style');
skeletonStyle.textContent = `
  @keyframes skeletonPulse {
    0%, 100% { opacity: .3; transform: scaleX(.6); }
    50%       { opacity: 1;  transform: scaleX(1); }
  }
`;
document.head.append(skeletonStyle);