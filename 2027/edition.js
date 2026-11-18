const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const portrait = document.querySelector(".portrait-stage");
const toggle = document.querySelector(".motion");
const wave = document.querySelector(".sound-wave");
const audit = document.querySelector("#audit-scope");
let paused = false;
let ripple;
const syncPortrait = setupCameraShot();

function syncMotion() {
  const active = !paused && !reduced.matches;
  root.toggleAttribute("data-moving", active);
  root.toggleAttribute("data-still", !active);
  if (!active) ripple?.cancel();
  toggle.hidden = reduced.matches;
  toggle.setAttribute("aria-pressed", String(active));
  syncPortrait();
}

toggle.addEventListener("click", () => {
  paused = !paused;
  syncMotion();
});
reduced.addEventListener("change", syncMotion);
syncMotion();

function setupCameraShot() {
  const video = portrait.querySelector("video");
  const trigger = document.querySelector(".take-photo");
  if (!video || !("IntersectionObserver" in window)) return () => {};

  // Safari supports alpha via HEVC; Chromium/Firefox use the VP9 alpha track.
  const clip = matchMedia("(max-width: 580px)").matches ? "assets/camera-gesture-compact" : "assets/camera-gesture";
  const sources = [
    ["video/quicktime; codecs=hvc1", clip + ".mov"],
    ["video/webm; codecs=vp9", clip + ".webm"]
  ].filter(([type]) => video.canPlayType(type));
  let source = 0, verified = false, onScreen = false, pending = false;
  let attempted = false, requested = false, generation = 0, timer;
  const allowed = () => root.hasAttribute("data-moving") && source < sources.length;
  const visible = () => allowed() && onScreen && !document.hidden;

  function reset() {
    ++generation;
    clearTimeout(timer);
    video.pause();
    portrait.removeAttribute("data-shooting");
    trigger.removeAttribute("aria-disabled");
    pending = false;
  }

  function hasAlpha() {
    // Some decoders advertise the codec but display its transparent area black.
    // Check one background pixel on first playback, never in the animation loop.
    try {
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return true;
      ctx.drawImage(video, 0, 0, 16, 16, 0, 0, 1, 1);
      return ctx.getImageData(0, 0, 1, 1).data[3] < 32;
    } catch {
      // Local file previews may play normally but forbid pixel reads.
      return true;
    }
  }

  async function shoot() {
    if (!visible() || pending) return;
    clearTimeout(timer);
    attempted = pending = true;
    const run = ++generation;
    trigger.setAttribute("aria-disabled", "true");
    while (run === generation && visible()) {
      if (video.getAttribute("src") !== sources[source][1]) video.src = sources[source][1];
      else if (video.readyState && video.currentTime) video.currentTime = 0;
      try {
        await video.play();
        if (run !== generation) return;
        if (verified || hasAlpha()) {
          verified = true;
          portrait.setAttribute("data-shooting", "");
          return;
        }
      } catch (error) {
        if (run !== generation) return;
        if (error.name === "NotAllowedError" || error.name === "AbortError") {
          reset(); // Leave the manual action available when autoplay is blocked.
          return;
        }
      }
      video.pause();
      verified = false;
      ++source;
    }
    if (run === generation) {
      reset();
      trigger.hidden = !allowed();
    }
  }

  function sync() {
    trigger.hidden = !allowed();
    if (!allowed() || document.hidden) requested = false;
    if (!visible()) { reset(); return; }
    clearTimeout(timer);
    if (requested) {
      requested = false;
      shoot();
    } else if (!attempted && !pending && !navigator.connection?.saveData) {
      timer = setTimeout(shoot, 550);
    }
  }
  video.addEventListener("ended", reset);
  video.addEventListener("error", () => {
    // Errors during startup are handled by play(); a late decode failure must
    // also restore the accessible portrait rather than leave a frozen frame.
    if (portrait.hasAttribute("data-shooting")) {
      ++source;
      verified = false;
      reset();
      sync();
    }
  });
  trigger.addEventListener("click", () => {
    if (!allowed() || pending) return;
    if (onScreen) shoot();
    else {
      requested = true;
      portrait.scrollIntoView({block: "center", behavior: "instant"});
    }
  });
  document.addEventListener("visibilitychange", sync);
  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting && entry.intersectionRatio >= .3;
    sync();
  }, {threshold: [0, .3]});
  observer.observe(portrait);
  return sync;
}

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
