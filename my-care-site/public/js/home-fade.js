// home-fade.js
document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".home-section");

  // Use Intersection Observer to fade sections in/out
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        } else {
          entry.target.classList.remove("active");
        }
      });
    },
    {
      threshold: 0.4, // section is visible when 40% in view
    }
  );

  sections.forEach((section) => observer.observe(section));
});
