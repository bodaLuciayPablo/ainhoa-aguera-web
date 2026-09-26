document.addEventListener('DOMContentLoaded', () => {

  /* Mobile burger menu */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    siteNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Lightbox — only present on gallery pages */
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  if (lightbox && lightboxImage && lightboxClose) {
    let currentImages = [];
    let currentIndex = 0;

    const showAt = (index) => {
      if (currentImages.length === 0) return;
      currentIndex = (index + currentImages.length) % currentImages.length;
      lightboxImage.src = currentImages[currentIndex];
      const hasMultiple = currentImages.length > 1;
      if (lightboxPrev) lightboxPrev.hidden = !hasMultiple;
      if (lightboxNext) lightboxNext.hidden = !hasMultiple;
    };

    /* On mobile a tap goes straight from thumbnail to lightbox — there's
       no hover to reveal the on-photo caption first. So the credit (and
       the "Asistencia a ..." text) gets copied into the lightbox itself,
       where everyone, touch or mouse, can actually read it. */
    const openLightbox = (thumb) => {
      currentImages = (thumb.dataset.full || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      lightboxImage.alt = thumb.querySelector('img')?.alt || '';

      if (lightboxCaption) {
        const figcaption = thumb.closest('figure')?.querySelector('figcaption');
        const hasText = figcaption && figcaption.textContent.trim().length > 0;
        lightboxCaption.innerHTML = hasText ? figcaption.innerHTML : '';
        lightboxCaption.hidden = !hasText;
      }

      showAt(0);
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      lightboxImage.src = '';
      document.body.style.overflow = '';
    };

    document.querySelectorAll('.thumb').forEach(thumb => {
      thumb.addEventListener('click', () => openLightbox(thumb));
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev?.addEventListener('click', () => showAt(currentIndex - 1));
    lightboxNext?.addEventListener('click', () => showAt(currentIndex + 1));

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (event) => {
      if (lightbox.hidden) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') showAt(currentIndex - 1);
      if (event.key === 'ArrowRight') showAt(currentIndex + 1);
    });
  }

});

/* Order-preserving masonry: distributes tiles into balanced columns
   while keeping their original document order as the guide */
let lastColumnCount = null;

function getColumnCount() {
  return window.innerWidth <= 480 ? 2
    : window.innerWidth <= 900 ? 3
    : 4;
}

function initMasonry(force) {
  const grid = document.querySelector('.tile-grid');
  if (!grid) return;

  const columnCount = getColumnCount();
  if (!force && columnCount === lastColumnCount) return; // breakpoint didn't change — do nothing
  lastColumnCount = columnCount;

  const tiles = Array.from(grid.children).filter(el => !el.classList.contains('tile-grid-col'))
    .concat(Array.from(grid.querySelectorAll('.tile-grid-col > *')));
  if (tiles.length === 0) return;
  // Remember the original HTML order the first time, and always rebuild from
  // it — otherwise every re-pass reads tiles column by column and shuffles them.
  tiles.forEach((t, i) => { if (t.dataset.order === undefined) t.dataset.order = i; });
  tiles.sort((a, b) => a.dataset.order - b.dataset.order);

  grid.innerHTML = '';
  const columns = [];
  for (let i = 0; i < columnCount; i++) {
    const col = document.createElement('div');
    col.className = 'tile-grid-col';
    grid.appendChild(col);
    columns.push(col);
  }

  // Videos (.video-embed) shouldn't end up next to each other: when placing
  // a video, skip columns that already hold one or sit beside one that does,
  // as long as there's another column to use.
  const isVideo = el => !!el.querySelector('.video-embed');
  const hasVideo = col => col && Array.from(col.children).some(isVideo);
  tiles.forEach(tile => {
    let candidates = columns;
    if (isVideo(tile)) {
      const free = columns.filter((col, i) =>
        !hasVideo(col) && !hasVideo(columns[i - 1]) && !hasVideo(columns[i + 1]));
      const noSameCol = columns.filter(col => !hasVideo(col));
      candidates = free.length ? free : (noSameCol.length ? noSameCol : columns);
    }
    let shortest = candidates[0];
    candidates.forEach(col => {
      if (col.offsetHeight < shortest.offsetHeight) shortest = col;
    });
    shortest.appendChild(tile);
  });
}

/* Run immediately — this script tag sits at the end of <body>, so the
   gallery markup already exists by the time it executes. Waiting for
   window's "load" event (as before) meant sitting with big, unboxed
   images until every photo AND the video had finished downloading —
   that's the ugly flash on pages with lots of images, like estilismo.
   We still do one forced re-pass on "load" to rebalance column heights
   once the real image sizes are known. */
initMasonry();
window.addEventListener('load', () => initMasonry(true));
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  // Unforced: initMasonry() itself bails out if the column count hasn't
  // actually changed, so harmless resize noise (mobile address bar
  // showing/hiding, opening the burger menu, the on-screen keyboard...)
  // doesn't tear down and rebuild the whole grid for nothing. Forcing a
  // rebuild here was what made things flicker oddly on mobile.
  resizeTimer = setTimeout(() => initMasonry(), 200);
});
