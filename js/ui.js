/* ============================================================
   js/ui.js — All interactive behaviour
   ============================================================
   Responsibilities:
   - Wire all event listeners AFTER DOM is built
   - Manage filter state (activeStatus, activeMedium)
   - Control modal open/close lifecycle
   - Scroll reveal via IntersectionObserver
   - Artist strip drag-scroll (mouse + touch)
   - Newsletter form submission
   - Level-2 "Know More" expansion inside L1 modal
   - Artwork carousel (prev/next/thumb/swipe/keyboard)

   Depends on:
   - render.js  (populateL1, buildCarousel)
   - pdf.js     (generatePDF)
   - window.EXHIBITIONS  (set by main.js after data fetch)

   Functions exported to global scope (called by main.js):
   - initScrollReveal()
   - initNav()
   - initFilters()
   - initL1Modal()
   - initArtistDrag()
   - initNewsletter()
   - getFiltered()        → returns filtered EXHIBITIONS array
   - buildCarousel(artworks) → returns carousel DOM node
   - showL2(exhibition)   → expands detail section in L1 panel
   ============================================================ */

/* ====================================================
   ui.js — Behaviour
==================================================== */
function initScrollReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const delay = e.target.classList.contains('card') ? (parseInt(e.target.dataset.idx||0)%3)*80 : 0;
      setTimeout(() => { e.target.classList.add('visible'); obs.unobserve(e.target); }, delay);
    });
  }, { threshold:0.08, rootMargin:'0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el,i) => { el.dataset.idx=i; obs.observe(el); });
}

function initNav() {
  const nav = document.querySelector('.nav');
  const burger = document.querySelector('.nav__burger');
  const drawer = document.querySelector('#nav-drawer');
  window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', window.scrollY>40), {passive:true});
  nav?.classList.toggle('scrolled', window.scrollY>40);
  burger?.addEventListener('click', () => {
    const o = burger.classList.toggle('open');
    drawer?.classList.toggle('open', o);
    burger.setAttribute('aria-expanded', String(o));
  });
  drawer?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger?.classList.remove('open'); drawer?.classList.remove('open');
    burger?.setAttribute('aria-expanded','false');
  }));
}

let activeStatus=null, activeMedium=null;
function getFiltered() {
  return EXHIBITIONS.filter(e => (!activeStatus||e.status===activeStatus) && (!activeMedium||e.medium===activeMedium));
}

function initFilters() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    const { type, filter } = btn.dataset;
    const wasActive = btn.classList.contains('active');
    if (type==='status') { document.querySelectorAll('.pill--status').forEach(p=>p.classList.remove('active')); activeStatus = wasActive?null:filter; }
    else { document.querySelectorAll('.pill:not(.pill--status)').forEach(p=>p.classList.remove('active')); activeMedium = wasActive?null:filter; }
    if (!wasActive) btn.classList.add('active');
    populateGrid(getFiltered());
  });
}

function initL1Modal() {
  const overlay = document.getElementById('l1-overlay');
  const content = document.getElementById('l1-content');
  const closeBtn = document.getElementById('l1-close');

  function open(id) {
    const ex = EXHIBITIONS.find(e => e.id === parseInt(id,10));
    if (!ex) return;
    content.innerHTML = populateL1(ex);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    closeBtn?.focus();

    // Mount artwork carousel into Level 1
    const l1CarouselMount = document.getElementById('l1-carousel-mount');
    if (l1CarouselMount) {
      if (ex.artworks?.length) {
        l1CarouselMount.append(buildCarousel(ex.artworks));
      } else {
        l1CarouselMount.innerHTML = `<p style="font-size:.875rem;color:var(--ink-muted);padding:.5rem 0;font-style:italic;">Artwork preview images coming soon.</p>`;
      }
    }

    // Wire "Know More" → open Level 2 (detail section expands in place)
    document.getElementById('l1-know-more')?.addEventListener('click', () => showL2(ex));

    // Wire PDF button
    const pdfBtn = document.getElementById('l1-pdf-btn');
    pdfBtn?.addEventListener('click', async () => {
      pdfBtn.classList.add('loading');
      pdfBtn.textContent = 'Generating…';
      try { await generatePDF(ex); } finally {
        pdfBtn.classList.remove('loading');
        pdfBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download PDF`;
      }
    });
  }

  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Open on card click
  document.addEventListener('click', e => {
    // Don't open when clicking Know More or PDF btn — they have their own handlers
    if (e.target.closest('#l1-know-more') || e.target.closest('#l1-pdf-btn') || e.target.closest('.l1__map-link')) return;
    const card = e.target.closest('[data-id]');
    if (card?.dataset.id) open(card.dataset.id);
  });

  document.addEventListener('keydown', e => {
    if ((e.key==='Enter'||e.key===' ') && document.activeElement?.dataset?.id && !document.getElementById('l1-overlay')?.classList.contains('open')) {
      e.preventDefault(); open(document.activeElement.dataset.id);
    }
    if (e.key==='Escape' && overlay?.classList.contains('open')) close();
  });

  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', e => { if (e.target===overlay) close(); });
}

/* ── Artwork Carousel ── */
function buildCarousel(artworks) {
  if (!artworks || !artworks.length) return '';
  let idx = 0;

  const imgs = artworks.map(a =>
    `<img src="${a.imageUrl}" alt="${a.title}" loading="lazy">`
  ).join('');

  const thumbs = artworks.map((a, i) =>
    `<div class="aw-thumb ${i===0?'aw-thumb-active':''}" data-aw-thumb="${i}">
       <img src="${a.imageUrl}" alt="${a.title}" loading="lazy">
     </div>`
  ).join('');

  const wrap = document.createElement('div');
  wrap.className = 'aw-carousel';
  wrap.innerHTML = `
    <div class="aw-stage-wrap">
      <div class="aw-stage" id="aw-stage">${imgs}</div>
      <button class="aw-btn aw-btn--prev" id="aw-prev" aria-label="Previous artwork" ${artworks.length < 2 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="aw-btn aw-btn--next" id="aw-next" aria-label="Next artwork" ${artworks.length < 2 ? 'disabled' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
    <div class="aw-caption">
      <div class="aw-caption__left">
        <p class="aw-caption__title" id="aw-title">${artworks[0].title}</p>
        <p class="aw-caption__meta" id="aw-meta">${[artworks[0].medium, artworks[0].dimensions, artworks[0].year].filter(Boolean).join(' · ')}</p>
      </div>
      <span class="aw-caption__counter" id="aw-counter">1 / ${artworks.length}</span>
    </div>
    ${artworks.length > 1 ? `<div class="aw-thumbs">${thumbs}</div>` : ''}`;

  const stage = wrap.querySelector('#aw-stage');

  function updateCaption() {
    const allThumbs = wrap.querySelectorAll('.aw-thumb');
    allThumbs.forEach((t, i) => t.classList.toggle('aw-thumb-active', i === idx));
    allThumbs[idx]?.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
    const aw = artworks[idx];
    wrap.querySelector('#aw-title').textContent   = aw.title || '';
    wrap.querySelector('#aw-meta').textContent    = [aw.medium, aw.dimensions, aw.year].filter(Boolean).join(' · ');
    wrap.querySelector('#aw-counter').textContent = `${idx + 1} / ${artworks.length}`;
  }

  function goTo(newIdx) {
    idx = (newIdx + artworks.length) % artworks.length;
    stage.scrollTo({ left: idx * stage.clientWidth, behavior: 'smooth' });
    updateCaption();
  }

  // Sync state when user swipes natively (mobile scroll-snap)
  let scrollTimer;
  stage.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const snapped = Math.round(stage.scrollLeft / stage.clientWidth);
      if (snapped !== idx) { idx = snapped; updateCaption(); }
    }, 80);
  }, { passive: true });

  wrap.querySelector('#aw-prev')?.addEventListener('click', e => { e.stopPropagation(); goTo(idx - 1); });
  wrap.querySelector('#aw-next')?.addEventListener('click', e => { e.stopPropagation(); goTo(idx + 1); });

  wrap.querySelectorAll('.aw-thumb').forEach(t =>
    t.addEventListener('click', e => { e.stopPropagation(); goTo(parseInt(t.dataset.awThumb)); })
  );

  // Keyboard navigation
  wrap.setAttribute('tabindex', '0');
  wrap.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goTo(idx - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx + 1); }
  });

  return wrap;
}

/* Level 2 — expands full detail inside L1 panel */
function showL2(ex) {
  const panel = document.getElementById('l1-panel');
  const existing = panel.querySelector('.l2-section');
  if (existing) { existing.scrollIntoView({behavior:'smooth', block:'start'}); return; }

  const sec = document.createElement('div');
  sec.className = 'l2-section';
  sec.style.cssText = 'border-top:2px solid var(--rule); padding:2rem; background:var(--paper-off);';

  const artistsDetail = ex.artists.map(a => `
    <div style="display:flex;gap:1rem;align-items:flex-start;margin-bottom:1.5rem;">
      <img src="${a.imageUrl}" alt="${a.name}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;filter:saturate(.8)">
      <div>
        <p style="font-family:var(--serif);font-size:1rem;font-weight:400;margin-bottom:2px;">${a.name}</p>
        <p style="font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:.5rem;">${a.role}</p>
        <p style="font-size:.875rem;line-height:1.7;color:var(--ink-soft);">${a.bio}</p>
      </div>
    </div>`).join('');

  sec.innerHTML = `
    <!-- Section: header -->
    <div class="l2-hdr"><span class="l2-hdr__label">Full Exhibition Details</span><span class="l2-hdr__rule"></span></div>

    <!-- Section: title + description -->
    <p style="font-family:var(--serif);font-size:1.5rem;font-weight:300;line-height:1.2;margin-bottom:.75rem;">${ex.title}</p>
    <p style="font-size:.9375rem;line-height:1.8;color:var(--ink-soft);margin-bottom:1.5rem;">${ex.description}</p>

    <!-- Section: curator note -->
    <div style="padding:1.25rem;background:var(--paper);border-radius:4px;border-left:3px solid var(--accent);margin-bottom:2rem;">
      <p style="font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:.5rem;">Curator's Note</p>
      <p style="font-size:.875rem;line-height:1.75;font-style:italic;color:var(--ink-soft);">${ex.curatorNote}</p>
    </div>

    <!-- Section: artwork carousel placeholder -->
    <div class="l2-hdr"><span class="l2-hdr__label">Works on Display</span><span class="l2-hdr__rule"></span></div>
    <div id="l2-carousel-mount" style="margin-bottom:2rem;"></div>

    <!-- Section: artists -->
    <div class="l2-hdr" style="margin-top:.5rem;"><span class="l2-hdr__label">Artists in This Exhibition</span><span class="l2-hdr__rule"></span></div>
    ${artistsDetail}

    <!-- Section: venue info grid -->
    <div class="l2-hdr"><span class="l2-hdr__label">Venue &amp; Dates</span><span class="l2-hdr__rule"></span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1.25rem;background:var(--paper);border-radius:4px;margin-bottom:1.75rem;">
      <div><p style="font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:.3rem;">Gallery</p><p style="font-size:.875rem;">${ex.venue}</p></div>
      <div><p style="font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:.3rem;">Address</p><p style="font-size:.875rem;">${ex.address}, ${ex.city}</p></div>
      <div><p style="font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:.3rem;">Dates</p><p style="font-size:.875rem;">${ex.startDate} – ${ex.endDate}</p></div>
      <div><p style="font-size:.6rem;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-muted);margin-bottom:.3rem;">Works</p><p style="font-size:.875rem;">${ex.works} works on show</p></div>
    </div>

    <!-- Section: actions -->
    <div style="display:flex;gap:1rem;flex-wrap:wrap;">
      <button class="btn-pdf" id="l2-pdf-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Download Full PDF
      </button>
      <a href="${ex.mapUrl}" target="_blank" rel="noopener" class="btn-outline">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
        View on Map
      </a>
    </div>`;

  panel.append(sec);

  // Mount carousel into placeholder
  const mount = sec.querySelector('#l2-carousel-mount');
  if (mount && ex.artworks?.length) {
    mount.append(buildCarousel(ex.artworks));
  } else if (mount) {
    mount.innerHTML = `<p style="font-size:.875rem;color:var(--ink-muted);padding:.5rem 0;">Artwork images not yet available for this exhibition.</p>`;
  }

  // Wire PDF button
  sec.querySelector('#l2-pdf-btn')?.addEventListener('click', async function() {
    this.classList.add('loading'); this.textContent = 'Generating…';
    try { await generatePDF(ex); } finally {
      this.classList.remove('loading');
      this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Download Full PDF`;
    }
  });

  setTimeout(() => sec.scrollIntoView({behavior:'smooth', block:'start'}), 50);
}

function initArtistDrag() {
  const wrap = document.querySelector('.artists__wrap');
  if (!wrap) return;
  let down=false, sx=0, sl=0;
  wrap.addEventListener('mousedown', e => { down=true; sx=e.pageX-wrap.offsetLeft; sl=wrap.scrollLeft; wrap.classList.add('dragging'); });
  wrap.addEventListener('mouseleave', ()=>{ down=false; wrap.classList.remove('dragging'); });
  wrap.addEventListener('mouseup',    ()=>{ down=false; wrap.classList.remove('dragging'); });
  wrap.addEventListener('mousemove',  e => { if(!down) return; e.preventDefault(); wrap.scrollLeft = sl-(e.pageX-wrap.offsetLeft-sx)*1.4; });
  let tx=0, ts=0;
  wrap.addEventListener('touchstart', e=>{ tx=e.touches[0].pageX; ts=wrap.scrollLeft; }, {passive:true});
  wrap.addEventListener('touchmove',  e=>{ wrap.scrollLeft = ts+(tx-e.touches[0].pageX); }, {passive:true});
}

function initNewsletter() {
  document.getElementById('nl-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const inp = e.target.querySelector('input');
    if (!inp?.value.includes('@')) { inp?.focus(); return; }
    const note = e.target.closest('.reveal')?.querySelector('.newsletter__note');
    if (note) { note.textContent="Thank you — you're on the list."; note.style.color='var(--accent)'; }
    inp.value='';
  });
}