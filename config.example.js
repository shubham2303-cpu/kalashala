/* ============================================================
   config.example.js — Template for configuration
   ============================================================

   COPY THIS FILE to config.js and fill in your real values.
   This file is safe to commit to git.
   config.js should be in your .gitignore.

   See config.js for full documentation on each field.
   ============================================================ */

const CONFIG = {
  SHEET_API_URL:   'https://script.google.com/macros/s/AKfycbznL7WJOJAzQMxo68vMp_D9wnKSl64COIHixqBSXMZZ5iUf7PVrLORx8QQh9ANsmZGk/exec',
  GALLERY_NAME:    'Your Gallery Name',
  GALLERY_TAGLINE: 'Fine Art Exhibitions',
  GALLERY_EMAIL:   'info@yourgallery.com',
  GALLERY_ADDRESS: 'Your Address',
  GALLERY_SITE:    'yourgallery.com',
  SOCIAL: {
    instagram: null,
    twitter:   null,
    facebook:  null,
  },
  FEATURES: {
    pdfDownload:  true,
    newsletter:   true,
    artworkSales: true,
  },
};

window.ARTISERA_CONFIG = CONFIG;
