const sections = document.querySelectorAll('.home-section');
const numSections = sections.length;
const vh = window.innerHeight;

window.addEventListener('scroll', () => {
  const scrollPos = window.scrollY;

  sections.forEach((sec, i) => {
    const start = i * vh;
    const end = (i + 1) * vh;

    if(scrollPos >= start && scrollPos < end) {
      sec.classList.add('active');
    } else {
      sec.classList.remove('active');
    }
  });
});
