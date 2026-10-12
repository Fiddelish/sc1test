const sc1Config = window.SC1_CONFIG || {};
const backendBaseUrl = (sc1Config.backendBaseUrl || "http://localhost:4000").replace(/\/$/, "");
const fightManagerUrl = sc1Config.fightManagerUrl || "http://localhost:5173";
const sc1LocalUrl = sc1Config.sc1LocalUrl || "http://127.0.0.1:8081";

const viewContainers = Array.from(document.querySelectorAll(".app-view"));
const hasSpaViewShell = viewContainers.length > 0;
const tabButtons = Array.from(document.querySelectorAll(".tab-button[data-view]"));
const navToggle = document.querySelector(".nav-toggle");
const primaryNav = document.getElementById("primaryNav");
let menuCloseButton = document.querySelector(".menu-close");
const brandLink = document.querySelector(".brand");
const fileNotice = document.getElementById("fileNotice");
const fileNoticeLink = fileNotice?.querySelector("a");
const videoModal = document.getElementById("videoModal");
const videoModalPlayer = document.getElementById("videoModalPlayer");
const videoModalTitle = document.getElementById("videoModalTitle");
const closeVideoModal = document.getElementById("closeVideoModal");
const aboutQuickLinks = Array.from(document.querySelectorAll("[data-about-target]"));
const loadedViews = new Set();
let pendingShopTarget = "";
let shopScrollRequest = 0;
let lastStableShopScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
let shopModalReturnScrollY = null;
let shopModalWasOpen = false;
let shopModalBodyStyleSnapshot = null;
let shopModalRootScrollBehaviorSnapshot = null;

function isShopProductModalOpen() {
  return Boolean(document.querySelector(".shopify-buy-modal-wrapper.is-active"));
}

function readInlineStyleProperty(style, property) {
  return {
    value: style.getPropertyValue(property),
    priority: style.getPropertyPriority(property),
  };
}

function restoreInlineStyleProperty(style, property, snapshot) {
  if (snapshot && snapshot.value) {
    style.setProperty(property, snapshot.value, snapshot.priority || "");
    return;
  }
  style.removeProperty(property);
}

function freezeShopScrollPosition(scrollY) {
  if (!Number.isFinite(scrollY)) {
    return;
  }

  if (!shopModalBodyStyleSnapshot) {
    const bodyStyle = document.body.style;
    shopModalBodyStyleSnapshot = {
      position: readInlineStyleProperty(bodyStyle, "position"),
      top: readInlineStyleProperty(bodyStyle, "top"),
      left: readInlineStyleProperty(bodyStyle, "left"),
      right: readInlineStyleProperty(bodyStyle, "right"),
      width: readInlineStyleProperty(bodyStyle, "width"),
    };
    shopModalRootScrollBehaviorSnapshot = readInlineStyleProperty(
      document.documentElement.style,
      "scroll-behavior",
    );
  }

  document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
  document.body.style.setProperty("position", "fixed", "important");
  document.body.style.setProperty("top", `${-scrollY}px`, "important");
  document.body.style.setProperty("left", "0", "important");
  document.body.style.setProperty("right", "0", "important");
  document.body.style.setProperty("width", "100%", "important");
}

function restoreShopScrollPosition(scrollY) {
  if (!Number.isFinite(scrollY)) {
    return;
  }

  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("scroll-behavior", "auto", "important");

  if (shopModalBodyStyleSnapshot) {
    const bodyStyle = document.body.style;
    restoreInlineStyleProperty(bodyStyle, "position", shopModalBodyStyleSnapshot.position);
    restoreInlineStyleProperty(bodyStyle, "top", shopModalBodyStyleSnapshot.top);
    restoreInlineStyleProperty(bodyStyle, "left", shopModalBodyStyleSnapshot.left);
    restoreInlineStyleProperty(bodyStyle, "right", shopModalBodyStyleSnapshot.right);
    restoreInlineStyleProperty(bodyStyle, "width", shopModalBodyStyleSnapshot.width);
    shopModalBodyStyleSnapshot = null;
  }

  const restore = () => window.scrollTo(0, scrollY);
  lastStableShopScrollY = scrollY;
  restore();
  window.requestAnimationFrame(() => {
    restore();
    window.requestAnimationFrame(() => {
      restore();
      restoreInlineStyleProperty(
        rootStyle,
        "scroll-behavior",
        shopModalRootScrollBehaviorSnapshot,
      );
      shopModalRootScrollBehaviorSnapshot = null;
    });
  });
}

function syncShopModalScrollState() {
  const isOpen = isShopProductModalOpen();

  if (isOpen && !shopModalWasOpen) {
    shopModalReturnScrollY = lastStableShopScrollY;
    shopModalWasOpen = true;
    freezeShopScrollPosition(shopModalReturnScrollY);
    return;
  }

  if (!isOpen && shopModalWasOpen) {
    const returnY = shopModalReturnScrollY;
    shopModalReturnScrollY = null;
    shopModalWasOpen = false;
    restoreShopScrollPosition(returnY);
  }
}

function initShopModalScrollMemory() {
  window.SC1_SHOP_SCROLL_MEMORY_ACTIVE = true;

  window.addEventListener("scroll", () => {
    if (!shopModalWasOpen && !isShopProductModalOpen()) {
      lastStableShopScrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
    }
  }, { passive: true });

  const observer = new MutationObserver(syncShopModalScrollState);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
  syncShopModalScrollState();
}

function getSharedFooterMarkup() {
  return `
    <footer class="shop-footer" data-shared-footer="true" aria-label="SC1 footer">
      <div class="shop-footer-cta">
        <div>
          <p class="shop-footer-eyebrow">Step into the arena</p>
          <h2>Ready to step&nbsp;in?</h2>
        </div>
        <a class="shop-footer-apply" href="index.html#apply">
          Apply to Fight <span aria-hidden="true">&rarr;</span>
        </a>
      </div>

      <div class="shop-footer-main">
        <a class="shop-footer-brand" href="index.html#home" aria-label="SC1 home">
          <img src="sc1.svg" alt="SC1" />
          <p>One round. No draws.<br />Street MMA.</p>
        </a>

        <nav class="shop-footer-column" aria-label="Explore">
          <h3>Explore</h3>
          <ul>
            <li><a href="https://www.youtube.com/playlist?list=PLPYLKNd1GJ5s" target="_blank" rel="noopener noreferrer">Watch fights</a></li>
            <li><a href="athletes.html">Fighters</a></li>
            <li><a href="index.html#about">Rules</a></li>
          </ul>
        </nav>

        <nav class="shop-footer-column" aria-label="Shop">
          <h3>Shop</h3>
          <ul>
            <li><a href="webshop.html#tshirts" data-shop-target="tshirts">T-Shirts</a></li>
            <li><a href="webshop.html#hoodies" data-shop-target="hoodies">Hoodies</a></li>
            <li><a href="output/pdf/sc1-terms-and-returns.pdf" target="_blank" rel="noopener">Terms &amp; Returns</a></li>
          </ul>
        </nav>

        <nav class="shop-footer-column" aria-label="Follow SC1">
          <h3>Follow</h3>
          <ul>
            <li><a href="https://www.instagram.com/sc1simon/" target="_blank" rel="noopener noreferrer">Instagram</a></li>
            <li><a href="https://www.youtube.com/@sc1simon" target="_blank" rel="noopener noreferrer">YouTube</a></li>
            <li><a href="https://telegram.me/+ohwFt9qF6LZlNjE8" target="_blank" rel="noopener noreferrer">Telegram</a></li>
          </ul>
        </nav>
      </div>

      <div class="shop-footer-bottom">
        <span>&copy; 2026 SC1 &mdash; Super Clean One</span>
        <a href="output/pdf/sc1-terms-and-returns.pdf" target="_blank" rel="noopener">Terms &amp; Returns (PDF)</a>
      </div>
    </footer>`;
}

function ensureSharedFooter() {
  document.querySelectorAll(".site-footer").forEach((footer) => footer.remove());

  const existingFooter = Array.from(document.querySelectorAll(".shop-footer")).find(
    (footer) => !footer.closest(".app-view")
  );
  if (existingFooter) {
    return existingFooter;
  }

  const template = document.createElement("template");
  template.innerHTML = getSharedFooterMarkup().trim();
  const footer = template.content.firstElementChild;
  if (!(footer instanceof HTMLElement)) {
    return null;
  }

  const anchor =
    document.getElementById("app-view-shell") ||
    document.querySelector("main.shop-page") ||
    document.querySelector("main#top") ||
    document.querySelector("body > main") ||
    document.querySelector("main");

  if (anchor) {
    anchor.insertAdjacentElement("afterend", footer);
  } else {
    document.body.appendChild(footer);
  }

  return footer;
}

function scrollToShopSection(targetId) {
  if (!["tshirts", "hoodies"].includes(targetId)) {
    return;
  }

  pendingShopTarget = targetId;
  const requestId = ++shopScrollRequest;
  let attempts = 0;

  const tryScroll = () => {
    if (requestId !== shopScrollRequest || pendingShopTarget !== targetId) {
      return;
    }

    const target =
      document.querySelector(`.app-view[data-view="webshop"].is-active #${targetId}`) ||
      document.querySelector(`body.shop-standalone #${targetId}`);

    if (target instanceof HTMLElement) {
      const headerHeight = document.querySelector(".sc1-header, .site-header")?.getBoundingClientRect().height || 76;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;
      pendingShopTarget = "";
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return;
    }

    attempts += 1;
    if (attempts < 100) {
      window.setTimeout(tryScroll, 50);
    }
  };

  window.requestAnimationFrame(tryScroll);
}

function initShopSectionLinks(container) {
  container.querySelectorAll("a[data-shop-target]").forEach((link) => {
    if (!(link instanceof HTMLAnchorElement) || link.dataset.shopTargetBound === "true") {
      return;
    }

    link.dataset.shopTargetBound = "true";
    link.addEventListener("click", (event) => {
      const targetId = link.dataset.shopTarget || "";
      if (!["tshirts", "hoodies"].includes(targetId)) {
        return;
      }

      if (hasSpaViewShell) {
        event.preventDefault();
        setActiveView("webshop");
        scrollToShopSection(targetId);
        return;
      }

      const isStandaloneShop = document.body.classList.contains("shop-standalone") || /\/webshop\.html$/i.test(window.location.pathname);
      if (isStandaloneShop) {
        event.preventDefault();
        history.replaceState({}, "", `#${targetId}`);
        scrollToShopSection(targetId);
      }
    });
  });
}

function normalizeShopifyModalCloseButtons() {
  if (document.body.dataset.activeView !== "webshop") {
    return;
  }

  Array.from(document.querySelectorAll("iframe")).forEach((frame) => {
    let doc;
    try {
      doc = frame.contentDocument;
    } catch (_error) {
      return;
    }

    if (!doc || !doc.querySelector(".shopify-buy__modal, .shopify-buy__modal__close, [aria-label='Close']")) {
      return;
    }

    doc.querySelectorAll(".shopify-buy__modal__close, [aria-label='Close'], .shopify-buy__btn--close").forEach((button) => {
      if (!(button instanceof HTMLElement)) {
        return;
      }
      button.textContent = "X";
      button.setAttribute("aria-label", "Close");
      button.setAttribute("title", "Close");
      button.style.setProperty("font-size", "20px", "important");
      button.style.setProperty("font-weight", "800", "important");
      button.style.setProperty("line-height", "1", "important");
      button.style.setProperty("text-transform", "uppercase", "important");
    });
  });
}

function getViewNameFromHash() {
  const hash = window.location.hash.replace("#", "").trim();
  return hash && ["home", "about", "webshop", "athletes", "gallery", "apply"].includes(hash) ? hash : "home";
}

function syncTabState(viewName) {
  viewContainers.forEach((view) => {
    const isActive = view.getAttribute("data-view") === viewName;
    view.classList.toggle("is-active", isActive);
  });

  tabButtons.forEach((button) => {
    const isActive = button.getAttribute("data-view") === viewName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function setActiveView(viewName, updateHistory = true) {
  syncTabState(viewName);

  if (updateHistory) {
    const nextHash = `#${viewName}`;
    const currentHash = window.location.hash;
    if (currentHash !== nextHash) {
      history.pushState({}, "", nextHash);
    }
  }

  if (viewName === "home") {
    document.body.dataset.activeView = "home";
  } else {
    document.body.dataset.activeView = viewName;
  }

  window.dispatchEvent(new CustomEvent("sc1:view-change", { detail: { view: viewName } }));

  if (viewName === "home") {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  } else {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  }

  if (viewName === "gallery") {
    loadViewContent("gallery");
    initGalleryView();
  }

  if (viewName === "webshop") {
    loadViewContent("webshop");
    window.requestAnimationFrame(normalizeShopifyModalCloseButtons);
  }

  if (viewName === "athletes") {
    loadViewContent("athletes");
  }
}

function interceptLocalLinks(container) {
  if (!hasSpaViewShell) {
    return;
  }

  container.querySelectorAll("a[href]").forEach((link) => {
    if (link.hasAttribute("data-sc1-view")) return;
    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) {
      return;
    }

    if (link.hasAttribute("data-shop-target")) {
      return;
    }

    const targetName = href.split("?")[0].split("#")[0].split("/").pop().toLowerCase();
    if (targetName === "index.html" || targetName === "") {
      const hashPart = href.split("#")[1] || "";
      const mappedView = ["home", "about", "webshop", "athletes", "gallery", "apply"].includes(hashPart)
        ? hashPart
        : "home";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveView(mappedView);
      });
      return;
    }

    if (targetName === "apply.html") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveView("apply");
      });
      return;
    }

    if (targetName === "webshop.html") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveView("webshop");
      });
      return;
    }

    if (targetName === "athletes.html") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveView("athletes");
      });
      return;
    }

    if (targetName === "gallery.html") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveView("gallery");
      });
      return;
    }

    if (targetName === "contact.html") {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveView("home");
      });
    }
  });
}

function sanitizeInjectedStyles(styleMarkup, viewName) {
  if (!styleMarkup) {
    return "";
  }

  // In SPA mode, webshop.html ships its own fixed-header/nav lock rules.
  // Those rules override global mobile navbar styles and break nav layout.
  if (viewName === "webshop") {
    return styleMarkup.replace(/\/\*\s*Canonical navbar lock:[\s\S]*$/m, "");
  }

  if (viewName === "athletes") {
    return styleMarkup
      .replace(/main#top,\s*[\r\n]+\s*\.site-footer,\s*[\r\n]+\s*\.video-modal\s*\{[\s\S]*?\}/m, "")
      .replace(/\.site-footer,\s*[\r\n]+\s*\.video-modal\s*\{[\s\S]*?\}/m, "");
  }

  return styleMarkup;
}

function purgeInjectedWebshopNavLockStyles() {
  document.head.querySelectorAll('style[data-injected-view="webshop"], style').forEach((styleTag) => {
    const cssText = styleTag.textContent || "";
    if (cssText.includes("Canonical navbar lock:")) {
      styleTag.remove();
    }
  });
}

function injectStyles(styleMarkup, viewName) {
  if (!styleMarkup) {
    return;
  }

  if (viewName === "webshop") {
    purgeInjectedWebshopNavLockStyles();
  }

  const sanitizedStyles = sanitizeInjectedStyles(styleMarkup, viewName).trim();
  if (!sanitizedStyles) {
    return;
  }

  const styleTag = document.createElement("style");
  if (viewName) {
    styleTag.dataset.injectedView = viewName;
  }
  styleTag.textContent = sanitizedStyles;
  document.head.appendChild(styleTag);
}

function attachScripts(container, scriptNodes) {
  scriptNodes.forEach((scriptNode) => {
    const src = scriptNode.getAttribute("src");
    if (src && /app\.js|sc1-config\.js|navigation\.js/.test(src)) {
      return;
    }

    const newScript = document.createElement("script");
    if (src) {
      newScript.src = src;
    } else {
      newScript.textContent = scriptNode.textContent;
    }
    newScript.type = scriptNode.getAttribute("type") || "text/javascript";
    container.appendChild(newScript);
  });
}

function attachViewScripts(container, scriptNodes, viewName) {
  const filteredScripts = scriptNodes.filter((scriptNode) => {
    if (viewName === "gallery") {
      return false;
    }

    if (viewName === "athletes") {
      const sourceFile = (scriptNode.getAttribute("src") || "").split("?")[0].split("/").pop();
      if (sourceFile === "app.js" || sourceFile === "sc1-config.js") {
        return false;
      }
    }

    return true;
  });

  attachScripts(container, filteredScripts);
}

function loadViewContent(viewName) {
  if (loadedViews.has(viewName)) {
    return;
    
  }

  const targetView = document.querySelector(`.app-view[data-view="${viewName}"]`);
  if (!targetView) {
    return;
  }

  const viewFileMap = {
    webshop: "webshop.html",
    athletes: "athletes.html",
    gallery: "gallery.html",
  };

  const fileName = viewFileMap[viewName];
  if (!fileName) {
    return;
  }

  fetch(fileName, { cache: "no-store" })
    .then((response) => response.text())
    .then((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const main = doc.querySelector("main");
      const athletesComingSoon = doc.querySelector(".athletes-coming-soon");
      const styles = Array.from(doc.querySelectorAll("style"));
      const scripts = Array.from(doc.querySelectorAll("script"));

      if (viewName === "athletes" && athletesComingSoon instanceof HTMLElement) {
        targetView.innerHTML = athletesComingSoon.outerHTML;
      } else if (main) {
        main.removeAttribute("id");
        main.querySelectorAll(".shop-footer, .site-footer").forEach((footer) => footer.remove());
        targetView.innerHTML = main.outerHTML;
      }

      styles.forEach((style) => injectStyles(style.textContent, viewName));
      attachViewScripts(targetView, scripts, viewName);
      interceptLocalLinks(targetView);
      initShopSectionLinks(targetView);
      loadedViews.add(viewName);

      if (viewName === "gallery") {
        initGalleryView();
      }

      if (viewName === "webshop") {
        window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
        window.requestAnimationFrame(normalizeShopifyModalCloseButtons);
        if (pendingShopTarget) {
          scrollToShopSection(pendingShopTarget);
        }
      }
    })
    .catch(() => {
      targetView.innerHTML = '<p class="error">Unable to load this view right now.</p>';
    });
}

function initGalleryView() {
  const galleryRoot = document.querySelector('.app-view[data-view="gallery"] .gallery-main');
  if (!galleryRoot) {
    return;
  }

  const events = [
    {
      title: "BADLANDS",
      date: "2026",
      photos: 111,
      tagline: "No soft rounds. No easy exits. Just hard collisions and championship intent.",
      image: "sc3.jpg",
      thumbs: ["sc3.jpg", "sc3.jpg", "sc1logo.jpg", "sc1logo.jpg"],
      slug: "badlands-card",
    },
    {
      title: "BREAKOUT",
      date: "2026",
      photos: 94,
      tagline: "Young killers, elite pressure, and highlight moments carved under red lights.",
      image: "sc3.jpg",
      thumbs: ["sc1logo.jpg", "sc3.jpg", "sc1logo.jpg", "sc3.jpg"],
      slug: "breakout-series",
    },
  ];

  galleryRoot.innerHTML = events
    .map((event, index) => {
      const side = index % 2 === 0 ? "left" : "right";
      const thumbs = event.thumbs
        .map((src, thumbIndex) => `<div class="event-thumb"><img src="${src}" alt="${event.title} thumbnail ${thumbIndex + 1}" loading="lazy" /></div>`)
        .join("");

      return `
        <section class="event-gallery-section" data-side="${side}">
          <div class="event-hero-media">
            <img src="${event.image}" alt="${event.title} featured image" />
          </div>
          <div class="event-overlay" aria-hidden="true"></div>
          <div class="event-content">
            <p class="event-kicker">.</p>
            <h2 class="event-title">${event.title}</h2>
            <ul class="event-meta" aria-label="Event details">
              <li>${event.date}</li>
              <li>${event.photos} Photos</li>
            </ul>
            <a class="event-cta" href="#home">Watch Fights</a>
          </div>
          <div class="event-thumbs" aria-hidden="true">${thumbs}</div>
        </section>
      `;
    })
    .join("");

  if (galleryRoot) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.target.classList.toggle("is-visible", entry.isIntersecting));
      },
      { threshold: 0.35 }
    );

    galleryRoot.querySelectorAll(".event-gallery-section").forEach((section) => observer.observe(section));
  }
}

function initHeaderBehavior() {
  if (hasSpaViewShell && brandLink instanceof HTMLAnchorElement) {
    brandLink.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView("home");
    });
  }

  document.body.classList.remove("social-strip-hidden");
  document.querySelector(".site-header")?.classList.remove("is-scrolled");

  if (navToggle instanceof HTMLButtonElement && primaryNav instanceof HTMLElement) {
    if (!(menuCloseButton instanceof HTMLButtonElement)) {
      menuCloseButton = document.createElement("button");
      menuCloseButton.className = "menu-close";
      menuCloseButton.type = "button";
      menuCloseButton.setAttribute("aria-label", "Close navigation menu");
      menuCloseButton.innerHTML = '<span aria-hidden="true">Close</span>';
      primaryNav.prepend(menuCloseButton);
    }

    let menuBackdrop = document.querySelector(".mobile-nav-backdrop");
    if (!(menuBackdrop instanceof HTMLButtonElement)) {
      menuBackdrop = document.createElement("button");
      menuBackdrop.className = "mobile-nav-backdrop";
      menuBackdrop.type = "button";
      menuBackdrop.setAttribute("aria-label", "Close navigation menu");
      menuBackdrop.setAttribute("tabindex", "-1");
      primaryNav.insertAdjacentElement("beforebegin", menuBackdrop);
    }

    const setMenuBodyLock = (isOpen) => {
      if (!window.matchMedia("(max-width: 760px)").matches) {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.body.classList.remove("mobile-nav-open");
        document.documentElement.classList.remove("mobile-nav-open");
        return;
      }

      document.body.style.overflow = isOpen ? "hidden" : "";
      document.documentElement.style.overflow = isOpen ? "hidden" : "";
      document.body.classList.toggle("mobile-nav-open", isOpen);
      document.documentElement.classList.toggle("mobile-nav-open", isOpen);
    };

    const closeMenu = (restoreFocus = false) => {
      primaryNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      primaryNav.setAttribute("aria-hidden", "true");
      setMenuBodyLock(false);
      if (restoreFocus && window.matchMedia("(max-width: 760px)").matches) {
        navToggle.focus({ preventScroll: true });
      }
    };

    const openMenu = () => {
      primaryNav.classList.add("is-open");
      navToggle.setAttribute("aria-expanded", "true");
      primaryNav.setAttribute("aria-hidden", "false");
      setMenuBodyLock(true);
      window.setTimeout(() => menuCloseButton?.focus({ preventScroll: true }), 40);
    };

    primaryNav.setAttribute("aria-hidden", "true");

    navToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = !primaryNav.classList.contains("is-open");
      if (isOpen) {
        openMenu();
      } else {
        closeMenu(true);
      }
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    if (menuCloseButton instanceof HTMLButtonElement) {
      menuCloseButton.addEventListener("click", () => closeMenu(true));
    }

    menuBackdrop.addEventListener("click", () => closeMenu(true));

    primaryNav.querySelectorAll("a, .tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        const nextView = button.getAttribute("data-view");
        if (nextView) {
          setActiveView(nextView);
        }
        if (window.matchMedia("(max-width: 760px)").matches) {
          closeMenu();
        }
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && primaryNav.classList.contains("is-open")) {
        event.preventDefault();
        closeMenu(true);
      }
    });

    window.addEventListener("resize", () => {
      if (!window.matchMedia("(max-width: 760px)").matches) {
        closeMenu();
        setMenuBodyLock(false);
      }
    });
  }
}

function initNavDropdowns() {
  const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));
  if (dropdowns.length === 0) {
    return;
  }

  const closeAll = () => {
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("is-open");
      const trigger = dropdown.querySelector(".nav-dropdown-trigger");
      if (trigger instanceof HTMLButtonElement) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  };

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".nav-dropdown-trigger");
    const menu = dropdown.querySelector(".nav-dropdown-menu");
    if (!(trigger instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) {
      return;
    }

    trigger.setAttribute("aria-expanded", "false");

    const setOpen = (open) => {
      dropdown.classList.toggle("is-open", open);
      trigger.setAttribute("aria-expanded", String(open));
    };

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const willOpen = !dropdown.classList.contains("is-open");
      closeAll();
      setOpen(willOpen);
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        closeAll();
        setOpen(true);
        const firstAction = menu.querySelector(".nav-dropdown-link");
        if (firstAction instanceof HTMLElement) {
          firstAction.focus();
        }
      }
    });

    menu.querySelectorAll("a, button").forEach((item) => {
      item.addEventListener("click", () => {
        setOpen(false);
      });
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    const clickedInsideDropdown = dropdowns.some((dropdown) => dropdown.contains(target));
    if (!clickedInsideDropdown) {
      closeAll();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });
}

function initVideoModal() {
  if (fileNoticeLink instanceof HTMLAnchorElement) {
    fileNoticeLink.href = sc1LocalUrl;
  }

  if (window.location.protocol === "file:") {
    fileNotice?.removeAttribute("hidden");
  }

  function openVideoModal(videoId, title) {
    if (!videoModal || !videoModalPlayer || !videoModalTitle) {
      return;
    }

    videoModalTitle.textContent = title;
    videoModalPlayer.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1"
        title="${title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    `;
    videoModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!videoModal || !videoModalPlayer) {
      return;
    }

    videoModal.hidden = true;
    videoModalPlayer.innerHTML = "";
    document.body.style.overflow = "";
  }

  document.querySelectorAll(".video-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const videoId = button.getAttribute("data-video-id");
      const title = button.getAttribute("data-video-title") || "SC1 Video";
      if (!videoId) {
        return;
      }
      openVideoModal(videoId, title);
    });
  });

  closeVideoModal?.addEventListener("click", closeModal);
  videoModal?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.hasAttribute("data-close-video")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && videoModal && !videoModal.hidden) {
      closeModal();
    }
  });
}

function initRulesModal() {
  const rulesModalId = "rulesModal";

  const ensureRulesModal = () => {
    let modal = document.getElementById(rulesModalId);
    if (modal instanceof HTMLElement) {
      return modal;
    }

    modal = document.createElement("div");
    modal.id = rulesModalId;
    modal.className = "rules-modal";
    modal.setAttribute("hidden", "");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="rules-modal-backdrop" data-close-rules></div>
      <section class="rules-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="rulesModalTitle">
        <header class="rules-modal-head">
          <h2 id="rulesModalTitle">SC1 Rules</h2>
          <button class="rules-modal-close" type="button" aria-label="Close rules popup">X</button>
        </header>
        <div class="rules-modal-body">
          <p><strong>SUPER CLEAN ONE - ONE ROUND STREET MMA 1v1</strong></p>
          <p><strong>Official Competition Rules</strong></p>

          <h3>1. Format</h3>
          <ul>
            <li>The match consists of one continuous round with a maximum duration of 15 minutes.</li>
            <li>At the 15 minute mark, the referee will assess both fighters' condition and must explicitly approve any continuation.</li>
            <li>The bout may be decided by knockout, technical knockout, choke submission, or referee stoppage.</li>
            <li>The referee may stop or conclude the match at any time in the interest of fighter safety.</li>
            <li>The match is conducted as controlled full contact competition under these rules.</li>
            <li>Participation is voluntary and based on informed consent.</li>
          </ul>

          <h3>2. Equipment</h3>
          <ul>
            <li>MMA gloves, provided by sc1.</li>
            <li>Mandatory mouthguard, provided by fighter.</li>
            <li>Mandatory groin protection, provided by fighter.</li>
            <li>Optional hand wraps, provided by fighter.</li>
          </ul>

          <h3>3. Permitted Techniques</h3>
          <ul>
            <li>Standing: Punches, elbows, kicks, and knees.</li>
            <li>Ground strikes: punches, elbows, kicks, and knees.</li>
            <li>Wrestling, clinch work, takedowns, and positional control permitted.</li>
            <li>Choke submissions permitted.</li>
          </ul>

          <h3>Prohibited Techniques</h3>
          <ul>
            <li>12-6 elbows to the head.</li>
            <li>Joint locks or limb submissions.</li>
            <li>Strikes to the back of the head, spine, groin, or throat.</li>
            <li>Knees or kicks to the head of a grounded opponent (grounded as in any of the following parts touch the ground: knee, elbow, buttocks).</li>
            <li>Eye gouging or biting.</li>
          </ul>

          <p>The referee has final authority over rule enforcement.</p>

          <h3>4. Safety and Consent</h3>
          <ul>
            <li>Fighters compete only while conscious and able to defend themselves.</li>
            <li>If a fighter loses consciousness or cannot intelligently defend, the referee will immediately stop the match.</li>
            <li>No further contact is permitted after a stoppage.</li>
          </ul>

          <h3>5. Compensation</h3>
          <ul>
            <li>Each fighter receives participation compensation of 500 SEK / 50 EURO upon entering the match and competing in good faith.</li>
            <li>An additional discretionary performance bonus of 500-2500 SEK / 50-250 EURO may be awarded based on overall performance and competitiveness.</li>
            <li>Total potential compensation per fighter ranges between 500-3000 SEK / 50-300 EURO.</li>
            <li>A fighter may voluntarily stop the match at any time. Safety takes priority.</li>
          </ul>

          <h3>6. Matching and Conduct</h3>
          <ul>
            <li>Fighters are matched as closely as possible in weight and skill level.</li>
            <li>Standard maximum weight difference is 9 kg unless mutually agreed.</li>
            <li>Unsportsmanlike conduct may result in disqualification.</li>
            <li>All participants acknowledge the inherent risks of full contact competition and must sign a waiver prior to competing.</li>
          </ul>
        </div>
      </section>
    `;

    document.body.appendChild(modal);
    return modal;
  };

  const openRulesModal = () => {
    const modal = ensureRulesModal();
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const closeButton = modal.querySelector(".rules-modal-close");
    if (closeButton instanceof HTMLButtonElement) {
      closeButton.focus();
    }
  };

  const closeRulesModal = () => {
    const modal = document.getElementById(rulesModalId);
    if (!(modal instanceof HTMLElement) || modal.hidden) {
      return;
    }

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const isRulesTrigger = (element) => {
    if (!(element instanceof Element)) {
      return false;
    }

    if (element.closest('button.tab-button[data-view="about"]')) {
      return true;
    }

    const rulesAnchor = element.closest('a[href="index.html#about"], a[href="/index.html#about"], a[href="#about"]');
    return rulesAnchor instanceof HTMLAnchorElement;
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!isRulesTrigger(target)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      openRulesModal();

      if (primaryNav instanceof HTMLElement) {
        primaryNav.classList.remove("is-open");
      }
      if (navToggle instanceof HTMLButtonElement) {
        navToggle.setAttribute("aria-expanded", "false");
      }
    },
    true
  );

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest(".rules-modal-close") || target.hasAttribute("data-close-rules")) {
      closeRulesModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const modal = document.getElementById(rulesModalId);
    if (modal instanceof HTMLElement && !modal.hidden) {
      closeRulesModal();
    }
  });
}

function initFighterCarousel() {
  const fighterCarousel = document.querySelector("[data-fighter-carousel]");
  if (!(fighterCarousel instanceof HTMLElement)) {
    return;
  }

  const viewport = fighterCarousel.querySelector(".fighter-viewport");
  const track = fighterCarousel.querySelector(".fighter-track");
  if (!(viewport instanceof HTMLElement) || !(track instanceof HTMLElement)) {
    return;
  }

  const cards = Array.from(track.querySelectorAll(".fighter-card"));
  if (cards.length === 0) {
    return;
  }

  const prevButton = fighterCarousel.querySelector("[data-fighter-prev]");
  const nextButton = fighterCarousel.querySelector("[data-fighter-next]");

  const MOTION_MS = 620;
  const MOTION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
  const TABLET_BREAKPOINT = 980;
  const MOBILE_BREAKPOINT = 760;
  const DESKTOP_DEPTH = 2;
  const TABLET_DEPTH = 1;
  const MOBILE_DEPTH = 1;

  let activeIndex = Math.floor(cards.length / 2);
  let isAnimating = false;
  let queuedSteps = 0;
  let animationReleaseTimer = null;

  function wrapIndex(value) {
    const length = cards.length;
    return ((value % length) + length) % length;
  }

  function getSignedOffset(cardIndex) {
    const raw = cardIndex - activeIndex;
    const half = cards.length / 2;
    if (raw > half) {
      return raw - cards.length;
    }
    if (raw < -half) {
      return raw + cards.length;
    }
    return raw;
  }

  function getDepthForViewport() {
    const width = window.innerWidth || document.documentElement.clientWidth || viewport.getBoundingClientRect().width;
    if (width <= MOBILE_BREAKPOINT) {
      return MOBILE_DEPTH;
    }
    if (width <= TABLET_BREAKPOINT) {
      return TABLET_DEPTH;
    }
    return DESKTOP_DEPTH;
  }

  function getXStepForViewport(depth) {
    const width = viewport.getBoundingClientRect().width;
    if (depth === DESKTOP_DEPTH) {
      return Math.max(170, Math.min(252, width * 0.24));
    }
    if (width <= MOBILE_BREAKPOINT) {
      return Math.max(160, Math.min(260, width * 0.7));
    }
    return Math.max(180, Math.min(280, width * 0.36));
  }

  function getProfileForOffset(offset, depth, xStep) {
    const distance = Math.abs(offset);
    const direction = Math.sign(offset) || 1;
    const isMobile = (window.innerWidth || document.documentElement.clientWidth || viewport.getBoundingClientRect().width) <= MOBILE_BREAKPOINT;

    if (distance > depth) {
      return {
        hidden: true,
        x: direction * xStep * (depth + 1.45),
        y: 18,
        scale: 0.62,
        opacity: 0,
        blur: 5.4,
        rotateY: direction * -18,
      };
    }

    if (distance === 0) {
      return {
        hidden: false,
        x: 0,
        y: -6,
        scale: 1.06,
        opacity: 1,
        blur: 0,
        rotateY: 0,
      };
    }

    if (depth === DESKTOP_DEPTH) {
      if (distance === 1) {
        return {
          hidden: false,
          x: direction * xStep,
          y: 10,
          scale: 0.8,
          opacity: 0.66,
          blur: 1.9,
          rotateY: direction * -10,
        };
      }
      return {
        hidden: false,
        x: direction * xStep * 1.95,
        y: 22,
        scale: 0.66,
        opacity: 0.38,
        blur: 3.6,
        rotateY: direction * -13,
      };
    }

    if (isMobile) {
      return {
        hidden: false,
        x: direction * xStep,
        y: 12,
        scale: 0.78,
        opacity: 0.3,
        blur: 2.5,
        rotateY: direction * -9,
      };
    }

    return {
      hidden: false,
      x: direction * xStep,
      y: 12,
      scale: 0.83,
      opacity: 0.63,
      blur: 2.2,
      rotateY: direction * -10,
    };
  }

  function setTransitions(enabled) {
    const transitionValue = enabled
      ? `transform ${MOTION_MS}ms ${MOTION_EASING}, opacity ${MOTION_MS}ms ${MOTION_EASING}, filter ${MOTION_MS}ms ${MOTION_EASING}, box-shadow ${MOTION_MS}ms ${MOTION_EASING}, border-color 360ms ease`
      : "none";

    cards.forEach((card) => {
      card.style.transition = transitionValue;
    });
  }

  function render(withAnimation = true) {
    const depth = getDepthForViewport();
    const xStep = getXStepForViewport(depth);

    setTransitions(withAnimation);

    cards.forEach((card, index) => {
      const offset = getSignedOffset(index);
      const distance = Math.abs(offset);
      const profile = getProfileForOffset(offset, depth, xStep);

      card.classList.toggle("is-active", distance === 0);
      card.classList.toggle("is-side", distance === 1);
      card.classList.toggle("is-outer", distance === 2);

      card.style.transform = `translate(-50%, -50%) translate3d(${profile.x}px, ${profile.y}px, 0) scale(${profile.scale}) rotateY(${profile.rotateY}deg)`;
      card.style.opacity = `${profile.opacity}`;
      card.style.filter = `blur(${profile.blur}px) saturate(${distance === 0 ? 1 : 0.72})`;
      card.style.zIndex = `${100 - distance}`;
      card.style.pointerEvents = profile.hidden ? "none" : "auto";
      card.setAttribute("aria-hidden", profile.hidden ? "true" : "false");
    });
  }

  function clearAnimationReleaseTimer() {
    if (animationReleaseTimer !== null) {
      window.clearTimeout(animationReleaseTimer);
      animationReleaseTimer = null;
    }
  }

  function queueRelease() {
    clearAnimationReleaseTimer();
    animationReleaseTimer = window.setTimeout(() => {
      isAnimating = false;
      if (queuedSteps !== 0) {
        const nextStep = queuedSteps > 0 ? 1 : -1;
        queuedSteps -= nextStep;
        rotateBy(nextStep);
      }
    }, MOTION_MS);
  }

  function rotateBy(step) {
    if (step === 0 || cards.length < 2) {
      return;
    }

    if (isAnimating) {
      queuedSteps += step;
      return;
    }

    isAnimating = true;
    activeIndex = wrapIndex(activeIndex + step);
    render(true);
    queueRelease();
  }

  function getShortestStepCount(targetIndex) {
    const forwardDistance = wrapIndex(targetIndex - activeIndex);
    const backwardDistance = wrapIndex(activeIndex - targetIndex);
    return forwardDistance <= backwardDistance ? forwardDistance : -backwardDistance;
  }

  function rotateToIndex(targetIndex) {
    const boundedIndex = wrapIndex(targetIndex);
    const stepCount = getShortestStepCount(boundedIndex);
    if (stepCount === 0) {
      return;
    }

    if (Math.abs(stepCount) === 1) {
      rotateBy(stepCount);
      return;
    }

    const direction = stepCount > 0 ? 1 : -1;
    queuedSteps += stepCount - direction;
    rotateBy(direction);
  }

  cards.forEach((card, index) => {
    card.addEventListener("click", () => {
      rotateToIndex(index);
    });
  });

  if (prevButton instanceof HTMLButtonElement) {
    prevButton.addEventListener("click", () => {
      rotateBy(-1);
    });
  }

  if (nextButton instanceof HTMLButtonElement) {
    nextButton.addEventListener("click", () => {
      rotateBy(1);
    });
  }

  window.addEventListener("resize", () => render(false));
  render(false);
}

function initAboutQuickNav() {
  aboutQuickLinks.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.getAttribute("data-about-target");
      if (!targetId) {
        return;
      }

      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      if (getViewNameFromHash() !== "about") {
        setActiveView("about");
      }

      const headerOffset = document.querySelector(".sc1-header, .site-header")?.getBoundingClientRect().height || 118;
      const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}

function initApp() {
  ensureSharedFooter();
  initShopModalScrollMemory();
  initShopSectionLinks(document);
  interceptLocalLinks(document);
  initHeaderBehavior();
  initNavDropdowns();
  initVideoModal();
  initRulesModal();
  initFighterCarousel();
  initAboutQuickNav();

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const viewName = button.getAttribute("data-view");
      if (viewName) {
        setActiveView(viewName);
      }
    });
  });

	const initialView = hasSpaViewShell
		? getViewNameFromHash()
		: (document.body.dataset.activeView || getViewNameFromHash());
  setActiveView(initialView, false);
  window.addEventListener("hashchange", () => {
    setActiveView(getViewNameFromHash(), false);
  });
  window.addEventListener("popstate", () => {
    setActiveView(getViewNameFromHash(), false);
  });
}

// Shared navigation owns its links; page content keeps the existing SPA router.
if (hasSpaViewShell) window.SC1_NAVIGATE = setActiveView;
initApp();
