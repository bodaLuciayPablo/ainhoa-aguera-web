document.addEventListener('DOMContentLoaded', () => {

  /* Mobile burger menu */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('menu-open', isOpen);
    });

    siteNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
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

  // .tile-grid--pair (obra personal): siempre dos columnas, una imagen al lado de la otra
  const columnCount = grid.classList.contains('tile-grid--pair') ? 2 : getColumnCount();
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
  const isPair = grid.classList.contains('tile-grid--pair');
  tiles.forEach((tile, i) => {
    if (isPair) { columns[i % 2].appendChild(tile); return; } // izquierda, derecha, izquierda...
    let candidates = columns;
    if (isVideo(tile)) {
      const free = columns.filter((col, i) =>
        !hasVideo(col) && !hasVideo(columns[i - 1]) && !hasVideo(columns[i + 1]));
      const noSameCol = columns.filter(col => !hasVideo(col));
      candidates = free.length ? free : (noSameCol.length ? noSameCol : columns);
    }
    let shortest = candidates[0];
    candidates.forEach(col => {
      // Empate de alturas (p. ej. fotos aún sin cargar): gana la columna con menos piezas
      if (col.offsetHeight < shortest.offsetHeight ||
          (col.offsetHeight === shortest.offsetHeight && col.children.length < shortest.children.length)) shortest = col;
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

/* ---------- Vídeos de YouTube en móvil ----------
   En iPhone/Android YouTube no se reproduce solo dentro de la web: enseña su
   portada con título y botón rojo, y al tocarlo salta a la app de YouTube.
   En pantallas táctiles cambiamos cada vídeo por su imagen de portada (sin
   marca de YouTube) y, al tocarla, lo abrimos grande aquí mismo, con sonido. */
(function () {
  if (!window.matchMedia('(hover: none)').matches) return; // ordenador: se queda en bucle como está

  const frames = document.querySelectorAll('.video-embed iframe[src*="youtube.com/embed/"]');
  if (!frames.length) return;

  const box = document.createElement('div');
  box.className = 'video-lightbox';
  box.hidden = true;
  box.innerHTML = '<button class="video-lightbox-close" aria-label="Cerrar">×</button><div class="video-lightbox-frame"></div>';
  document.body.appendChild(box);
  const holder = box.querySelector('.video-lightbox-frame');
  const close = () => { holder.innerHTML = ''; box.hidden = true; document.body.classList.remove('menu-open'); };
  box.querySelector('.video-lightbox-close').addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box) close(); });

  frames.forEach(frame => {
    const id = (frame.src.match(/embed\/([\w-]{11})/) || [])[1];
    if (!id) return;
    const poster = document.createElement('button');
    poster.className = 'video-poster';
    poster.setAttribute('aria-label', 'Reproducir vídeo' + (frame.title ? ' — ' + frame.title : ''));
    poster.innerHTML = '<img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">';
    poster.addEventListener('click', () => {
      holder.innerHTML = '<iframe src="https://www.youtube.com/embed/' + id +
        '?autoplay=1&playsinline=1&rel=0&modestbranding=1" title="' + (frame.title || 'Vídeo') +
        '" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
      box.hidden = false;
      document.body.classList.add('menu-open'); // bloquea el scroll de detrás
    });
    frame.replaceWith(poster);
  });
})();
