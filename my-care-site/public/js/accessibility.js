// accessibility.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleColorBlindBtn = document.getElementById("toggle-color-blind");
  const increaseFontBtn = document.getElementById("increase-font");
  const decreaseFontBtn = document.getElementById("decrease-font");

  // --- Load preferences from localStorage ---
  const colorBlindMode = localStorage.getItem("colorBlindMode") === "true";
  const largeTextMode = localStorage.getItem("largeTextMode") === "true";

  // Apply stored preferences
  if (colorBlindMode) document.body.classList.add("color-blind-mode");
  if (largeTextMode) document.body.classList.add("large-text-mode");

  // --- Event Handlers ---

  // Toggle Color-Blind Mode
  toggleColorBlindBtn.addEventListener("click", () => {
    const enabled = document.body.classList.toggle("color-blind-mode");
    localStorage.setItem("colorBlindMode", enabled);
  });

  // Toggle Large Text Mode (A+)
  increaseFontBtn.addEventListener("click", () => {
    const enabled = !document.body.classList.contains("large-text-mode");
    document.body.classList.toggle("large-text-mode", enabled);
    localStorage.setItem("largeTextMode", enabled);
  });

  // Reset to normal text (A-)
  increaseFontBtnFontBtn.addEventListener("click", () => {
    document.body.classList.remove("large-text-mode");
    localStorage.setItem("largeTextMode", false);
  });
});
