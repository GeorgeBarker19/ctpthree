// Fade effect on scroll
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const windowHeight = window.innerHeight;

  // Select all background sections
  const sections = document.querySelectorAll('.bg-image-1, .bg-image-2, .bg-image-3, .bg-image-4, .bg-image-5');

  sections.forEach((section, index) => {
    // Each section takes up exactly one viewport height
    const sectionTop = index * windowHeight;
    const sectionCenter = sectionTop + windowHeight / 2;

    // Distance of viewport center from this section's center
    const distance = Math.abs(scrollY + windowHeight / 2 - sectionCenter);

    // Opacity goes from 1 (when centered) to 0 (one screen away)
    let opacity = 1 - distance / windowHeight;
    opacity = Math.max(0, Math.min(1, opacity));

    section.style.opacity = opacity;
  });
});
