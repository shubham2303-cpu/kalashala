 /* ============================================================
   js/pdf.js — In-browser PDF generation
   ============================================================
   Responsibilities:
   - Generate and download a styled A4 exhibition PDF
   - Uses jsPDF (loaded via CDN in index.html)
   - Reads gallery identity from window.KALASHALA_CONFIG
   - No DOM manipulation — pure data-in, file-out

   Functions exported to global scope:
   - generatePDF(exhibition)  → triggers browser download
   ============================================================ */

/* ====================================================
   pdf.js — In-browser PDF generation with jsPDF
==================================================== */
async function loadJsPDF() {
  if (window.jspdf) return;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load PDF library'));
    document.head.appendChild(s);
  });
}

async function generatePDF(ex) {
  await loadJsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, H = 297;

  // ── Helpers ──
  const clr = (r,g,b) => doc.setTextColor(r,g,b);
  const fill = (r,g,b) => doc.setFillColor(r,g,b);
  const drw  = (r,g,b) => doc.setDrawColor(r,g,b);
  const font = (f,s,sz) => { doc.setFont(f,s); doc.setFontSize(sz); };

  // ── Header band ──
  fill(14,14,14); doc.rect(0,0,W,52,'F');

  // Gallery name top-left
  font('helvetica','bold',8);
  clr(255,255,255);
  doc.setCharSpace(2);
  doc.text('KalaShala',14,13);
  doc.setCharSpace(0);
  font('helvetica','normal',7);
  clr(180,150,110);
  doc.text('FINE ART EXHIBITIONS',14,19);

  // Exhibition title
  font('helvetica','bold',20);
  clr(255,255,255);
  const titleLines = doc.splitTextToSize(ex.title, 130);
  doc.text(titleLines,14,33);

  // Status badge
  const badgeX = W - 14;
  const bLabel = statusLabel(ex.status);
  font('helvetica','bold',6.5);
  const bW = doc.getStringUnitWidth(bLabel) * 6.5 / (72/25.6) + 8;
  fill(184,150,110); doc.roundedRect(badgeX - bW, 10, bW, 8, 1.5, 1.5, 'F');
  clr(255,255,255);
  doc.setCharSpace(1);
  doc.text(bLabel, badgeX - bW/2, 15.2, {align:'center'});
  doc.setCharSpace(0);

  let y = 64;

  // ── Section: Key Info ──
  const infoItems = [
    { label:'Dates',          value:`${ex.startDate} – ${ex.endDate}` },
    { label:'Medium',         value: ex.medium },
    { label:'Works on show',  value:`${ex.works} works` },
    { label:'Admission',      value: ex.admissionNote },
  ];

  // 2-column info grid
  infoItems.forEach((item, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix = col === 0 ? 14 : 109;
    const iy = y + row * 18;

    // Label
    font('helvetica','bold', 6.5);
    clr(155,155,155);
    doc.setCharSpace(1.5);
    doc.text(item.label.toUpperCase(), ix, iy);
    doc.setCharSpace(0);

    // Value
    font('helvetica','normal', 9);
    clr(14,14,14);
    const lines = doc.splitTextToSize(item.value, 88);
    doc.text(lines, ix, iy + 5.5);
  });

  y += 44;

  // Rule
  drw(222,218,212); doc.setLineWidth(0.3); doc.line(14, y, W-14, y);
  y += 10;

  // ── Section: Location ──
  font('helvetica','bold', 6.5); clr(155,155,155); doc.setCharSpace(1.5);
  doc.text('LOCATION', 14, y); doc.setCharSpace(0);
  y += 6;

  fill(184,150,110); doc.circle(18.5, y+1.5, 3, 'F');
  font('helvetica','bold', 10); clr(14,14,14);
  doc.text(ex.venue, 25, y+2.5);
  y += 7;
  font('helvetica','normal', 8.5); clr(100,100,100);
  doc.text(`${ex.address}, ${ex.city}`, 25, y);
  y += 5;
  doc.text(ex.country, 25, y);
  y += 12;

  // Rule
  drw(222,218,212); doc.line(14, y, W-14, y);
  y += 10;

  // ── Section: Artists ──
  font('helvetica','bold', 6.5); clr(155,155,155); doc.setCharSpace(1.5);
  doc.text(`ARTIST${ex.artists.length > 1 ? 'S' : ''}`, 14, y); doc.setCharSpace(0);
  y += 8;

  ex.artists.forEach(artist => {
    // Name + role
    font('helvetica','bold', 10); clr(14,14,14);
    doc.text(artist.name, 14, y);
    font('helvetica','italic', 8); clr(184,150,110);
    doc.text(artist.role, 14, y+5);

    // Bio
    font('helvetica','normal', 8); clr(74,74,74);
    const bioLines = doc.splitTextToSize(artist.bio, W - 28);
    doc.text(bioLines, 14, y + 12);
    y += 12 + bioLines.length * 4.5 + 8;

    // thin rule between artists
    if (ex.artists.length > 1) {
      drw(222,218,212); doc.setLineWidth(0.15); doc.line(14, y-4, W-14, y-4);
    }
  });

  y += 2;

  // Rule
  drw(222,218,212); doc.setLineWidth(0.3); doc.line(14, y, W-14, y);
  y += 10;

  // ── Section: Description ──
  font('helvetica','bold', 6.5); clr(155,155,155); doc.setCharSpace(1.5);
  doc.text('ABOUT THE EXHIBITION', 14, y); doc.setCharSpace(0);
  y += 8;

  font('helvetica','normal', 9); clr(74,74,74);
  const descLines = doc.splitTextToSize(ex.description, W - 28);
  doc.text(descLines, 14, y);
  y += descLines.length * 4.8 + 8;

  // Curator note
  font('helvetica','italic', 8.5); clr(100,100,100);
  const noteLines = doc.splitTextToSize(ex.curatorNote, W - 28);
  doc.text(noteLines, 14, y);
  y += noteLines.length * 4.5 + 12;

  // ── Section: Artworks ──
  if (ex.artworks?.length) {
    // Check if we need a new page
    if (y > H - 60) { doc.addPage(); y = 20; }

    drw(222,218,212); doc.setLineWidth(0.3); doc.line(14, y, W-14, y);
    y += 10;

    font('helvetica','bold', 6.5); clr(155,155,155); doc.setCharSpace(1.5);
    doc.text('WORKS ON DISPLAY', 14, y); doc.setCharSpace(0);
    y += 8;

    ex.artworks.forEach((aw, i) => {
      if (y > H - 40) { doc.addPage(); y = 20; }

      // Number bubble
      fill(184,150,110); doc.circle(17.5, y+1, 3.5, 'F');
      font('helvetica','bold', 6.5); clr(255,255,255);
      doc.text(String(i+1), 17.5, y+2.2, {align:'center'});

      // Title
      font('helvetica','bold', 9); clr(14,14,14);
      doc.text(aw.title, 25, y+2);

      // Meta
      font('helvetica','normal', 7.5); clr(100,100,100);
      doc.text(`${aw.medium}  ·  ${aw.dimensions}  ·  ${aw.year}`, 25, y+7.5);

      y += 16;
    });

    y += 4;
  }

  // ── Footer ──
  const footerY = H - 16;
  fill(14,14,14); doc.rect(0, footerY - 6, W, 22, 'F');
  font('helvetica','normal', 7); clr(120,120,120);
  doc.text('kalashala.com  ·  info@kalashala.com', W/2, footerY+2, {align:'center'});
  font('helvetica','bold', 6.5); clr(184,150,110); doc.setCharSpace(1);
  doc.text('KALASHALA', W/2, footerY+7.5, {align:'center'}); doc.setCharSpace(0);

  // Save
  const filename = `${ex.title.replace(/\s+/g,'_')}_Kalashala.pdf`;
  doc.save(filename);
}