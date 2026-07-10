document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const main = document.querySelector("main");
const footer = document.querySelector("footer");
const scrollLinks = document.querySelectorAll("[data-scroll]");
const navLinks = document.querySelectorAll(".site-nav > a[href^='#']:not(.button)");
const revealItems = document.querySelectorAll("[data-reveal]");
const drawItems = document.querySelectorAll("[data-draw]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileLayout = window.matchMedia("(max-width: 900px)");

let menuIsOpen = false;
let menuFocusTimer;

const setPageInert = (isInert) => {
  if (main) main.inert = isInert;
  if (footer) footer.inert = isInert;
};

const getFocusableMenuItems = () => {
  if (!header) return [];

  return Array.from(header.querySelectorAll("a[href], button:not([disabled])")).filter(
    (element) => element.getClientRects().length > 0
  );
};

const closeMenu = ({ restoreFocus = false } = {}) => {
  if (!header || !menuToggle) return;

  menuIsOpen = false;
  header.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
  setPageInert(false);
  window.clearTimeout(menuFocusTimer);

  if (restoreFocus && mobileLayout.matches) menuToggle.focus();
};

const openMenu = () => {
  if (!header || !menuToggle || !menu || !mobileLayout.matches) return;

  menuIsOpen = true;
  header.classList.add("is-open");
  document.body.classList.add("menu-open");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Close menu");
  setPageInert(true);

  const firstMenuLink = menu.querySelector("a[href]");
  menuFocusTimer = window.setTimeout(() => {
    if (menuIsOpen) firstMenuLink?.focus();
  }, 240);
};

menuToggle?.addEventListener("click", () => {
  if (menuIsOpen) {
    closeMenu({ restoreFocus: true });
  } else {
    openMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (!menuIsOpen) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu({ restoreFocus: true });
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = getFocusableMenuItems();
  if (!focusable.length) return;

  const firstItem = focusable[0];
  const lastItem = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === firstItem) {
    event.preventDefault();
    lastItem.focus();
  } else if (!event.shiftKey && document.activeElement === lastItem) {
    event.preventDefault();
    firstItem.focus();
  }
});

mobileLayout.addEventListener("change", (event) => {
  if (!event.matches) closeMenu();
});

scrollLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    if (!targetId?.startsWith("#")) return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    closeMenu();

    const headerOffset = header ? header.offsetHeight + 10 : 0;
    const targetTop = targetId === "#top" ? 0 : target.getBoundingClientRect().top + window.scrollY - headerOffset;

    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  });
});

let scrollTicking = false;

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
  scrollTicking = false;
};

window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateHeader);
  },
  { passive: true }
);

updateHeader();

if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
  drawItems.forEach((item) => item.classList.add("is-drawn"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${(index % 4) * 55}ms`);
    revealObserver.observe(item);
  });

  const drawObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-drawn");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.22 }
  );

  drawItems.forEach((item) => drawObserver.observe(item));
}

if (navLinks.length && "IntersectionObserver" in window) {
  const observedSections = Array.from(navLinks)
    .map((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      return section ? { link, section } : null;
    })
    .filter(Boolean);

  const setCurrentSection = (sectionId) => {
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === `#${sectionId}`) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visibleEntry) setCurrentSection(visibleEntry.target.id);
    },
    { rootMargin: "-28% 0px -58% 0px", threshold: [0, 0.1, 0.25] }
  );

  observedSections.forEach(({ section }) => sectionObserver.observe(section));
}

window.requestAnimationFrame(() => document.body.classList.add("is-ready"));
