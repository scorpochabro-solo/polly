const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const poster = document.querySelector(".poster");
const animal = document.querySelector(".animal");
const toggle = document.querySelector(".motion");
let paused = false;

function syncMotion() {
  const active = !paused && !reduced.matches;
  root.toggleAttribute("data-moving", active);
  root.toggleAttribute("data-still", !active);
  toggle.hidden = reduced.matches;
  toggle.setAttribute("aria-pressed", String(active));
  resetPointer();
}

function resetPointer() {
  animal.style.removeProperty("--px");
  animal.style.removeProperty("--py");
}

toggle.addEventListener("click", () => {
  paused = !paused;
  syncMotion();
});
reduced.addEventListener("change", syncMotion);
syncMotion();

poster.addEventListener("pointermove", (event) => {
  if (!root.hasAttribute("data-moving") || !finePointer.matches) return;
  const bounds = poster.getBoundingClientRect();
  animal.style.setProperty("--px", ((event.clientX - bounds.left) / bounds.width - .5) * 16 + "px");
  animal.style.setProperty("--py", ((event.clientY - bounds.top) / bounds.height - .5) * 10 + "px");
}, { passive: true });
poster.addEventListener("pointerleave", resetPointer);

if ("IntersectionObserver" in window) {
  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        if (root.hasAttribute("data-moving")) entry.target.classList.add("arrive");
        reveal.unobserve(entry.target);
      }
    }
  }, { threshold: .12 });
  document.querySelectorAll(".block h2, .steps li, .markets article").forEach((item) => reveal.observe(item));
}
