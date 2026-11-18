const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const poster = document.querySelector(".poster");
const portrait = document.querySelector(".portrait-stage");
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
  portrait.style.removeProperty("--px");
  portrait.style.removeProperty("--py");
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
  portrait.style.setProperty("--px", ((event.clientX - bounds.left) / bounds.width - .5) * 16 + "px");
  portrait.style.setProperty("--py", ((event.clientY - bounds.top) / bounds.height - .5) * 10 + "px");
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

// The selected case defines the sequence; the links remain usable without JS.
const viewer = document.querySelector(".viewer");
if (typeof viewer.showModal === "function") {
  const book = document.querySelector(".casebook");
  const image = viewer.querySelector(".viewer-image");
  let shots = [];
  let position = 0;
  let opener;

  function show(index) {
    position = (index + shots.length) % shots.length;
    const shot = shots[position];
    image.src = shot.href;
    image.alt = shot.querySelector("img").alt;
    viewer.querySelector("#viewer-caption").textContent = image.alt;
    viewer.querySelector(".viewer-count").textContent = (position + 1) + " / " + shots.length;
  }

  book.addEventListener("click", (event) => {
    const link = event.target.closest(".shot");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    const story = link.closest(".case");
    shots = [...story.querySelectorAll(".shot")];
    viewer.querySelector("#viewer-title").textContent = story.querySelector("h3").textContent;
    show(shots.indexOf(link));
    viewer.showModal();
  });
  viewer.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button?.hasAttribute("data-step")) show(position + Number(button.dataset.step));
    if (button?.classList.contains("viewer-close")) viewer.close();
    if (event.target === viewer) {
      const rect = viewer.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
    }
  });
  viewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      show(position + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  viewer.addEventListener("close", () => opener?.focus({preventScroll: true}));
}

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
