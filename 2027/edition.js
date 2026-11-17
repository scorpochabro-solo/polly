const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const poster = document.querySelector(".poster");
const animal = document.querySelector(".animal");
const toggle = document.querySelector(".motion");
const wave = document.querySelector(".sound-wave");
const audit = document.querySelector("#audit-scope");
let paused = false;
let ripple;

function syncMotion() {
  const active = !paused && !reduced.matches;
  root.toggleAttribute("data-moving", active);
  root.toggleAttribute("data-still", !active);
  if (!active) ripple?.cancel();
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

document.querySelector(".catalog").addEventListener("toggle", (event) => {
  if (!event.target.open || !root.hasAttribute("data-moving") || !wave.animate) return;
  ripple?.cancel();
  ripple = wave.animate([
    { opacity: .2, transform: "translateX(-6px) scale(.78)" },
    { opacity: 1, transform: "translateX(5px) scale(1.12)", offset: .65 },
    { opacity: 1, transform: "none" }
  ], { duration: 420, easing: "ease-out" });
}, true);

// Open the disclosure before the fragment scroll, including on repeat visits.
function openAudit() {
  audit.closest("details").open = true;
}
document.querySelector(".prism-study").addEventListener("click", openAudit);
if (location.hash === "#audit-scope") openAudit();

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
