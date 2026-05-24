/* ============================================================
   js/render.js — Pure DOM builder functions
   ============================================================
   Responsibilities:
   - Build every DOM element the page needs
   - Accept data as function arguments (no direct API calls)
   - Return DOM nodes — never append directly to document
   - Read display config from window.KALASHALA_CONFIG

   Functions exported to global scope (used by main.js & ui.js):
   - renderNav()
   - renderHero(exhibitions)
   - renderCard(exhibition)
   - renderFilterBar()
   - renderExhibitionsSection()
   - renderArtistStrip()
   - renderArtistCard(artist)
   - renderNewsletter()
   - renderFooter()
   - renderL1Modal()
   - populateL1(exhibition)
   ============================================================ */

/* ====================================================
   render.js — DOM builders
==================================================== */
const statusLabel = s => ({ ongoing:'Ongoing', upcoming:'Upcoming', past:'Past' }[s] || s);

const PIN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;

function renderNav() {
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="container nav__inner">
      <a href="#" class="nav__logo">
        <div class="nav__logo-name">KalaShala</div>
        <div class="nav__logo-tag">Fine Art Exhibitions</div>
      </a>
      <ul class="nav__links">
        <li><a href="#exhibitions" class="nav__link nav__link--active">Exhibitions</a></li>
        <li><a href="#artists" class="nav__link">Artists</a></li>
        <li><a href="#" class="nav__link">Shop</a></li>
        <li><a href="#" class="nav__link">About</a></li>
      </ul>
      <div style="display:flex;align-items:center;gap:1.25rem">
        <button class="nav__icon" aria-label="Search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>
        </button>
        <button class="nav__burger" aria-label="Menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <div class="nav__drawer" id="nav-drawer">
      <a href="#exhibitions" class="nav__link">Exhibitions</a>
      <a href="#artists" class="nav__link">Artists</a>
      <a href="#" class="nav__link">Shop</a>
      <a href="#" class="nav__link">About</a>
    </div>`;
  return nav;
}

function renderHero() {
  const f = EXHIBITIONS.find(e => e.status === 'ongoing') || EXHIBITIONS[0];
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
            <span class="hero__loc">${f.venue}, ${f.city.split(',')[0]}</span>
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

function renderCard(ex) {
  const a = document.createElement('article');
  a.className = 'card reveal';
  a.setAttribute('tabindex','0');
  a.setAttribute('role','button');
  a.setAttribute('aria-label', `${ex.title} — click for details`);
  a.dataset.id = ex.id;
  a.innerHTML = `
    <div class="card__img-wrap">
      <img class="card__img" src="${ex.imageUrlTall}" alt="${ex.title}" loading="lazy">
      <span class="card__badge card__badge--${ex.status}">${statusLabel(ex.status)}</span>
      <span class="card__hover-action"><span></span>View Details</span>
    </div>
    <div class="card__body">
      <p class="card__medium">${ex.medium}</p>
      <h2 class="card__title">${ex.title}</h2>
      <p class="card__artist">${ex.artists.map(a=>a.name).join(', ')}</p>
      <p class="card__location">${PIN_SVG}${ex.venue}, ${(ex.city||'').split(',')[0]}</p>
      <div class="card__footer">
        <time class="card__date">${ex.startDate} – ${ex.endDate}</time>
        <span class="card__view-link">View</span>
      </div>
    </div>`;
  return a;
}

function renderFilterBar() {
  const bar = document.createElement('div');
  bar.className = 'filter-bar';
  const sg = document.createElement('div'); sg.style.display='flex'; sg.style.gap='.5rem'; sg.style.flexWrap='wrap';
  STATUSES.forEach(s => { const b=document.createElement('button'); b.className='pill pill--status'; b.dataset.filter=s; b.dataset.type='status'; b.textContent=statusLabel(s); sg.append(b); });
  const div = document.createElement('span'); div.className='filter-bar__div';
  const mg = document.createElement('div'); mg.style.display='flex'; mg.style.gap='.5rem'; mg.style.flexWrap='wrap';
  MEDIUMS.forEach(m => { const b=document.createElement('button'); b.className='pill'; b.dataset.filter=m; b.dataset.type='medium'; b.textContent=m; mg.append(b); });
  bar.append(sg, div, mg);
  return bar;
}

function renderExhibitionsSection() {
  const s = document.createElement('section');
  s.className = 'exhibitions'; s.id = 'exhibitions';
  s.innerHTML = `
    <div class="container">
      <div class="exhibitions__header">
        <h2 class="exhibitions__heading">Current &amp; Upcoming</h2>
        <span class="exhibitions__count" id="exh-count">${EXHIBITIONS.length} exhibitions</span>
      </div>
    </div>
    <div class="container" id="filter-wrap"></div>
    <div class="container">
      <div class="exh-grid" id="exh-grid" aria-live="polite"></div>
      <div class="exh-empty" id="exh-empty"><p style="font-family:var(--serif);font-style:italic;font-size:1.2rem">No exhibitions match this filter.</p></div>
      <div class="load-more-wrap"><button class="btn-ghost" id="load-more-btn">Load more</button></div>
    </div>`;
  return s;
}

function renderArtistStrip() {
  const s = document.createElement('section');
  s.className = 'artists'; s.id = 'artists';
  s.innerHTML = `
    <div class="container">
      <div class="eyebrow reveal"><span class="eyebrow__line"></span><span class="eyebrow__text">Featured Artists</span></div>
    </div>
    <div class="artists__wrap">
      <div class="artists__track" id="artists-track"></div>
    </div>`;
  return s;
}

function renderArtistCard(a) {
  const d = document.createElement('div'); d.className='a-card'; d.setAttribute('tabindex','0');
  d.innerHTML = `<div class="a-card__av"><img src="${a.imageUrl}" alt="${a.name}" loading="lazy"></div><p class="a-card__name">${a.name}</p><p class="a-card__count">${a.shows} show${a.shows!==1?'s':''}</p>`;
  return d;
}

function renderNewsletter() {
  const s = document.createElement('section'); s.className='newsletter';
  s.innerHTML = `<div class="container"><div class="reveal">
    <h2 class="newsletter__h">Stay close to the art world</h2>
    <p class="newsletter__sub">Private views, new arrivals, and curatorial essays.</p>
    <form class="newsletter__form" id="nl-form" novalidate>
      <input class="newsletter__input" type="email" placeholder="Your email address" aria-label="Email">
      <button class="newsletter__btn" type="submit" aria-label="Subscribe">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </form>
    <p class="newsletter__note">No clutter. Unsubscribe at any time.</p>
  </div></div>`;
  return s;
}

function renderFooter() {
  const f = document.createElement('footer'); f.className='footer';
  f.innerHTML = `<div class="container">
    <div class="footer__inner">
      <div>
        <p class="footer__logo">Kalashala</p>
        <p class="footer__tagline">A gallery dedicated to the most vital voices in contemporary fine art.</p>
        <div class="footer__social">
          <a href="#" class="footer__slink" aria-label="Instagram">In</a>
          <a href="#" class="footer__slink" aria-label="Twitter">Tw</a>
          <a href="#" class="footer__slink" aria-label="Facebook">Fb</a>
        </div>
      </div>
      <div>
        <h3 class="footer__col-h">Exhibitions</h3>
        <ul class="footer__links">
          <li><a href="#" class="footer__link">Current</a></li>
          <li><a href="#" class="footer__link">Upcoming</a></li>
          <li><a href="#" class="footer__link">Archive</a></li>
          <li><a href="#" class="footer__link">Art Fairs</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__col-h">Gallery</h3>
        <ul class="footer__links">
          <li><a href="#" class="footer__link">About</a></li>
          <li><a href="#" class="footer__link">Artists</a></li>
          <li><a href="#" class="footer__link">Publications</a></li>
          <li><a href="#" class="footer__link">Contact</a></li>
        </ul>
      </div>
      <div>
        <h3 class="footer__col-h">Visit</h3>
        <ul class="footer__links">
          <li><a href="#" class="footer__link">Opening Hours</a></li>
          <li><a href="#" class="footer__link">Location</a></li>
          <li><a href="#" class="footer__link">Admission</a></li>
          <li><a href="#" class="footer__link">Accessibility</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <p class="footer__copy">© 2026 KalaShala. All rights reserved.</p>
      <nav class="footer__legal">
        <a href="#" class="footer__llink">Privacy Policy</a>
        <a href="#" class="footer__llink">Terms of Use</a>
        <a href="#" class="footer__llink">Cookie Settings</a>
      </nav>
    </div>
  </div>`;
  return f;
}

/* ── Level 1 Modal HTML ── */
function renderL1Modal() {
  const ov = document.createElement('div');
  ov.className = 'overlay'; ov.id = 'l1-overlay';
  ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
  ov.innerHTML = `
    <div class="l1" id="l1-panel">
      <button class="l1__close" id="l1-close" aria-label="Close">✕</button>
      <div id="l1-content"></div>
    </div>`;
  return ov;
}

function populateL1(ex) {
  const artistChips = ex.artists.map(a => `
    <div class="l1__a-chip">
      <img src="${a.imageUrl}" alt="${a.name}">
      <span>${a.name}${ex.artists.length > 1 ? `<span style="color:var(--ink-muted);font-size:.7rem;margin-left:4px">· ${a.role}</span>` : ''}</span>
    </div>`).join('');

  return `
    <div class="l1__hero">
      <img src="${ex.imageUrl}" alt="${ex.title}" loading="lazy">
      <div class="l1__hero-overlay"></div>
      <span class="card__badge card__badge--${ex.status} l1__hero-badge">${statusLabel(ex.status)}</span>
      <div class="l1__hero-title">
        <h2>${ex.title}</h2>
        <p>${ex.medium}</p>
      </div>
    </div>
    <div class="l1__body">

      <!-- ── Quick facts grid ── -->
      <div class="l1__info-grid">
        <div class="l1__info-item">
          <p class="l1__info-label">Dates</p>
          <p class="l1__info-value">${ex.startDate} – ${ex.endDate}</p>
        </div>
        <div class="l1__info-item">
          <p class="l1__info-label">Works on Show</p>
          <p class="l1__info-value">${ex.works} works</p>
        </div>
        <div class="l1__info-item">
          <p class="l1__info-label">Admission</p>
          <p class="l1__info-value" style="font-size:.82rem">${ex.admissionNote}</p>
        </div>
        <div class="l1__info-item">
          <p class="l1__info-label">Medium</p>
          <p class="l1__info-value">${ex.medium}</p>
        </div>
      </div>

      <!-- ── Location ── -->
      <div class="l1__location-row">
        <div class="l1__location-icon">${PIN_SVG}</div>
        <div class="l1__location-text">
          <p class="l1__venue">${ex.venue}</p>
          <p class="l1__address">${ex.address}, ${ex.city}, ${ex.country}</p>
          <a href="${ex.mapUrl}" target="_blank" rel="noopener" class="l1__map-link">
            View on map
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </a>
        </div>
      </div>

      <!-- ── Artists ── -->
      <p class="l1__artists-label">Artists</p>
      <div class="l1__artists-row">${artistChips}</div>

      <!-- ── Artworks carousel ── -->
      <div class="l2-hdr" style="margin-bottom:1rem;">
        <span class="l2-hdr__label">Works on Display</span>
        <span class="l2-hdr__rule"></span>
        <span style="font-size:.7rem;color:var(--ink-muted);white-space:nowrap;padding-left:.5rem">${ex.artworks?.length || 0} of ${ex.works} shown</span>
      </div>
      <div id="l1-carousel-mount" style="margin-bottom:1.75rem;"></div>

      <!-- ── Actions ── -->
      <div class="l1__actions">
        <button class="btn-primary" id="l1-know-more" data-id="${ex.id}">
          Know More
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
        <button class="btn-pdf" id="l1-pdf-btn" data-id="${ex.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          Download PDF
        </button>
        ${ex.instagramUrl ? `<a href="${ex.instagramUrl}" target="_blank" rel="noopener" class="btn-insta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="15" height="15"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
          Watch on Instagram
        </a>` : ''}
      </div>
    </div>`;
}
