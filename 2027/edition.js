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
  const canvas = portrait.querySelector("canvas");
  const brush = canvas?.getContext("2d");
  const still = portrait.querySelector("img");
  const trigger = document.querySelector(".take-photo");
  if (!brush || !("IntersectionObserver" in window)) return () => {};

  // Sixteen upper-body cels share the unchanged legs in the original portrait.
  const cols = 4, width = 384, height = 448;
  let atlas, loading, timer, raf, pending = false, onScreen = false;
  let played = false, requested = false, failed = false, generation = 0;
  const allowed = () => root.hasAttribute("data-moving") && !failed;
  const visible = () => allowed() && onScreen && !document.hidden;
  const settle = x => x * x * (3 - 2 * x);

  function reset() {
    ++generation;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    portrait.removeAttribute("data-shooting");
    trigger.removeAttribute("aria-disabled");
    pending = false;
  }

  function glint(strength) {
    // A single reflection on the lens, not a screen flash.
    brush.save();
    brush.translate(159,116);
    brush.scale(strength,strength);
    brush.fillStyle = "#fffbe0";
    brush.beginPath();
    for (const [x,y] of [[0,-9],[1.8,-2],[7,0],[1.8,1.6],[0,8],[-1.8,1.6],[-7,0],[-1.8,-2]]) brush.lineTo(x,y);
    brush.closePath();
    brush.fill();
    brush.restore();
  }

  async function shoot() {
    if (!visible() || pending) return;
    clearTimeout(timer);
    const run = ++generation;
    pending = true;
    trigger.setAttribute("aria-disabled","true");
    if (!loading) {
      atlas = new Image();
      atlas.src = "assets/polina-shot.webp";
      loading = Promise.all([atlas.decode(), still.decode()]);
    }
    try {
      await loading;
    } catch {
      failed = true;
      reset();
      trigger.hidden = true;
      return;
    }
    if (run !== generation || !visible()) return;
    played = true;
    brush.clearRect(0,0,canvas.width,canvas.height);
    brush.drawImage(still,0,0,canvas.width,canvas.height);
    let start, last = -1, lastSpark = -1;
    function draw(now) {
      start ??= now;
      const ms = now - start;
      if (ms >= 1800) { reset(); return; }
      const lift = ms < 650 ? settle(ms/650) : ms < 1060 ? 1 : 1-settle((ms-1060)/740);
      const cel = Math.round(lift * 16) - 1;
      const spark = Math.max(0,1-Math.abs(ms-860)/82);
      if (cel !== last || spark !== lastSpark) {
        if (cel < 0) {
          portrait.removeAttribute("data-shooting");
        } else {
          brush.clearRect(0,0,width,height);
          brush.drawImage(atlas,(cel%cols)*width,Math.floor(cel/cols)*height,width,height,0,0,width,height);
          if (spark > 0) glint(spark);
          portrait.setAttribute("data-shooting","");
        }
        last = cel;
        lastSpark = spark;
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
  }

  function sync() {
    trigger.hidden = !allowed();
    if (!allowed() || document.hidden) requested = false;
    if (!visible()) { reset(); return; }
    clearTimeout(timer);
    if (requested) {
      requested = false;
      shoot();
      return;
    }
    if (!played && !pending && !navigator.connection?.saveData) timer = setTimeout(shoot,550);
  }
  trigger.addEventListener("click",() => {
    if (!allowed() || pending) return;
    if (onScreen) shoot();
    else {
      requested = true;
      portrait.scrollIntoView({block:"center",behavior:"instant"});
    }
  });
  document.addEventListener("visibilitychange",sync);
  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting && entry.intersectionRatio >= .3;
    sync();
  }, {threshold:[0,.3]});
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
