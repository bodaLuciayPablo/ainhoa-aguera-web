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

    const openLightbox = (thumb) => {
      currentImages = (thumb.dataset.full || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      lightboxImage.alt = thumb.querySelector('img')?.alt || '';
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
function initMasonry() {
  const grid = document.querySelector('.tile-grid');
  if (!grid) return;

  const tiles = Array.from(grid.children);
  if (tiles.length === 0) return;

  const columnCount = window.innerWidth <= 480 ? 2
    : window.innerWidth <= 900 ? 3
    : 4;

  grid.innerHTML = '';
  const columns = [];
  for (let i = 0; i < columnCount; i++) {
    const col = document.createElement('div');
    col.className = 'tile-grid-col';
    grid.appendChild(col);
    columns.push(col);
  }

  tiles.forEach(tile => {
    let shortest = columns[0];
    columns.forEach(col => {
      if (col.offsetHeight < shortest.offsetHeight) shortest = col;
    });
    shortest.appendChild(tile);
  });
}

window.addEventListener('load', initMasonry);
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(initMasonry, 200);
});
