// Navigation, anchored scrolling, scroll-spy, reveal animation and desktop-only parallax.
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const scrollLinks = document.querySelectorAll("[data-scroll]");
const navLinks = document.querySelectorAll(".site-nav a[href^='#']");
const revealItems = document.querySelectorAll(".reveal");
const parallaxItems = document.querySelectorAll("[data-parallax]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const desktopPointer = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 900px)");

const closeMenu = () => {
  if (!header || !menuToggle) return;

  header.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
};

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });
}

scrollLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");

    if (!targetId || !targetId.startsWith("#")) return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();

    const offset = header ? header.offsetHeight + 8 : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top,
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });

    closeMenu();
  });
});

window.addEventListener(
  "scroll",
  () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  },
  { passive: true }
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

document.addEventListener("click", (event) => {
  if (!header || !menu || !header.classList.contains("is-open")) return;
  if (header.contains(event.target)) return;
  closeMenu();
});

// Scroll-spy: highlight the nav link for the section currently in view.
if (navLinks.length && "IntersectionObserver" in window) {
  const sections = [];
  navLinks.forEach((link) => {
    const section = document.querySelector(link.getAttribute("href"));
    if (section) sections.push({ link, section });
  });

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
    });
  };

  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    {
      rootMargin: "-45% 0px -50% 0px",
      threshold: 0,
    }
  );

  sections.forEach(({ section }) => spy.observe(section));
}

// Reveal-on-scroll.
if ("IntersectionObserver" in window && !reduceMotion.matches) {
  const revealIfNearViewport = () => {
    revealItems.forEach((item) => {
      if (item.classList.contains("is-visible")) return;

      const rect = item.getBoundingClientRect();
      if (rect.top < window.innerHeight + 260 && rect.bottom > -260) {
        item.classList.add("is-visible");
      }
    });
  };

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.01,
      rootMargin: "240px 0px 240px 0px",
    }
  );

  revealItems.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 55}ms`);
    revealObserver.observe(item);
  });

  let revealTicking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (revealTicking) return;
      revealTicking = true;
      window.requestAnimationFrame(() => {
        revealIfNearViewport();
        revealTicking = false;
      });
    },
    { passive: true }
  );

  revealIfNearViewport();
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

// Desktop-only hero parallax.
if (parallaxItems.length && !reduceMotion.matches && desktopPointer.matches) {
  const hero = document.querySelector(".hero");

  if (hero) {
    hero.addEventListener(
      "pointermove",
      (event) => {
        const rect = hero.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;

        parallaxItems.forEach((item, index) => {
          const depth = 10 + index * 5;
          item.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
        });
      },
      { passive: true }
    );

    hero.addEventListener("pointerleave", () => {
      parallaxItems.forEach((item) => {
        item.style.transform = "translate3d(0, 0, 0)";
      });
    });
  }
}
