// services-gallery.js
(function () {
  const viewport = document.getElementById('galleryViewport');
  const track = document.getElementById('galleryTrack');
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');

  const cards = Array.from(document.querySelectorAll('.gallery-card'));

  // Modal refs
  const modal = document.getElementById('serviceModal');
  const modalClose = document.getElementById('modalClose');
  const modalTitle = document.getElementById('serviceModalTitle');
  const modalDesc = document.getElementById('serviceModalDesc');
  const modalImg = document.getElementById('modalImage');
  const modalDownload = document.getElementById('serviceModalDownload');

  // ---- Carousel controls ----
  function getCardWidth() {
    const first = track.querySelector('.gallery-card');
    if (!first) return 0;
    const styles = window.getComputedStyle(first);
    const margin =
      parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
    return first.getBoundingClientRect().width + margin;
  }

  function scrollByCards(direction = 1) {
    const amount = getCardWidth() || viewport.clientWidth * 0.9;
    viewport.scrollBy({ left: amount * direction, behavior: 'smooth' });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => scrollByCards(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => scrollByCards(1));

  // Keyboard: left/right on the viewport
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCards(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByCards(-1); }
  });

  // Basic drag / swipe support
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  viewport.addEventListener('mousedown', (e) => {
    isDown = true;
    startX = e.pageX - viewport.offsetLeft;
    scrollLeft = viewport.scrollLeft;
    viewport.classList.add('dragging');
  });

  viewport.addEventListener('mouseleave', () => { isDown = false; viewport.classList.remove('dragging'); });
  viewport.addEventListener('mouseup', () => { isDown = false; viewport.classList.remove('dragging'); });

  viewport.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - viewport.offsetLeft;
    const walk = (x - startX) * 1; // scroll-fast factor
    viewport.scrollLeft = scrollLeft - walk;
  });

  // Touch
  let touchStartX = 0;
  viewport.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  viewport.addEventListener('touchmove', (e) => {
    const dx = touchStartX - e.touches[0].clientX;
    viewport.scrollLeft += dx;
    touchStartX = e.touches[0].clientX;
  });

  // ---- Modal handling ----
  function openModal({ title, description, image, pdf }) {
    modalTitle.textContent = title || '';
    modalDesc.textContent = description || '';
    modalImg.src = image || '';
    modalImg.alt = title ? `${title} image` : 'Service image';

    // PDF button
    if (pdf) {
      modalDownload.href = pdf;
      modalDownload.style.display = 'inline-block';
    } else {
      modalDownload.removeAttribute('href');
      modalDownload.style.display = 'none';
    }

    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('open');
    // focus close for accessibility
    modalClose.focus();
    // trap focus
    document.addEventListener('focus', trapFocus, true);
    document.addEventListener('keydown', onEscClose);
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('open');
    document.removeEventListener('focus', trapFocus, true);
    document.removeEventListener('keydown', onEscClose);
  }

  function onEscClose(e) {
    if (e.key === 'Escape') closeModal();
  }

  function trapFocus(e) {
    if (!modal.classList.contains('open')) return;
    if (!modal.contains(e.target)) {
      e.stopPropagation();
      modalClose.focus();
    }
  }

  // Open modal on click / enter
  cards.forEach((card) => {
    const open = () => {
      openModal({
        title: card.dataset.title,
        description: card.dataset.description,
        image: card.dataset.image,
        pdf: card.dataset.pdf
      });
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });

  // Close interactions
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
})();
