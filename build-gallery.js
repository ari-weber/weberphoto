#!/usr/bin/env node
// build-gallery.js
// Scans the images/ folder and injects a masonry gallery into index.html.
// Run manually: node build-gallery.js
// Or automatically via Cloudflare Pages build command (see README).

const fs   = require('fs');
const path = require('path');

const IMAGE_DIR   = path.join(__dirname, 'images');
const INDEX_FILE  = path.join(__dirname, 'index.html');
const MARKER_START = '<!-- GALLERY:START -->';
const MARKER_END   = '<!-- GALLERY:END -->';
const VALID_EXT    = new Set(['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG', '.WEBP']);

// ── Recursively collect all image files ──────────────────────────────────────
function collectImages(dir, baseDir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(collectImages(fullPath, baseDir));
    } else if (VALID_EXT.has(path.extname(entry.name))) {
      // Web path: always forward slashes
      const webPath = 'images/' + fullPath.replace(baseDir, '').replace(/\\/g, '/').replace(/^\//, '');
      // Human-readable label from filename
      const label = path.basename(entry.name, path.extname(entry.name))
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      // Category from subfolder name
      const category = path.relative(baseDir, path.dirname(fullPath))
        .replace(/\\/g, '/')
        .replace(/_/g, ' ');
      results.push({ webPath, label, category });
    }
  }
  return results;
}

// ── Build the gallery HTML block ─────────────────────────────────────────────
function buildGalleryHTML(images) {
  if (images.length === 0) {
    return `${MARKER_START}\n<!-- No images found in /images/ -->\n${MARKER_END}`;
  }

  const items = images.map(({ webPath, label, category }) => `
      <div class="gallery-item" data-category="${category}">
        <img
          src="${webPath}"
          alt="${label}"
          loading="lazy"
          onclick="openLightbox('${webPath}', '${label.replace(/'/g, "\\'")}')"
        >
        <div class="gallery-item-caption">
          <span class="gallery-item-label">${label}</span>
          <span class="gallery-item-category">${category}</span>
        </div>
      </div>`).join('');

  return `${MARKER_START}
    <section class="homepage-gallery">
      <div class="section-header">
        <div>
          <p class="section-label">All Work</p>
          <h2 class="section-title">The full collection</h2>
        </div>
      </div>
      <div class="gallery-masonry-grid">
${items}
      </div>
    </section>
${MARKER_END}`;
}

// ── Inject into index.html ────────────────────────────────────────────────────
function inject(html, block) {
  const start = html.indexOf(MARKER_START);
  const end   = html.indexOf(MARKER_END);
  if (start === -1 || end === -1) {
    throw new Error(
      `Markers not found in index.html.\n` +
      `Add these two comments where you want the gallery:\n` +
      `  ${MARKER_START}\n  ${MARKER_END}`
    );
  }
  return html.slice(0, start) + block + html.slice(end + MARKER_END.length);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const images = collectImages(IMAGE_DIR, IMAGE_DIR);
console.log(`Found ${images.length} image(s) in images/`);
images.forEach(i => console.log(`  ${i.webPath}`));

const html    = fs.readFileSync(INDEX_FILE, 'utf8');
const block   = buildGalleryHTML(images);
const updated = inject(html, block);

fs.writeFileSync(INDEX_FILE, updated, 'utf8');
console.log(`\nGallery injected into index.html (${images.length} photos).`);