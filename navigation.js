(function () {
  "use strict";
  // One shared header for standalone pages and the index page's in-place views.
  if (document.querySelector(".sc1-header")) return;
  var mount = document.getElementById("sc1-navigation");
  if (!mount) return;

  var telegram = "https://telegram.me/+ohwFt9qF6LZlNjE8";
  var links = [
    { view: "home", label: "Home" },
    { view: "gallery", label: "Watch fights" },
    { view: "athletes", label: "Fighters" },
    { view: "webshop", label: "Shop" },
    { view: "apply", label: "Apply & rules" }
  ];
  var arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 8 8-8 8"/></svg>';
  var icons = {
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" stroke="none" d="M22 7.2a3 3 0 0 0-2.1-2.1C18.1 4.6 12 4.6 12 4.6s-6.1 0-7.9.5A3 3 0 0 0 2 7.2a28 28 0 0 0 0 9.6 3 3 0 0 0 2.1 2.1c1.8.5 7.9.5 7.9.5s6.1 0 7.9-.5a3 3 0 0 0 2.1-2.1 28 28 0 0 0 0-9.6Z"/><path fill="#080808" stroke="none" d="m10 8 6 4-6 4Z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-4 18-6-5-4 3 1-7-5-2 18-7Z"/><path d="m8 12 9-6-6 10"/></svg>'
  };
  function href(view) { return "index.html#" + view; }
  function navLink(item, index) {
    return '<a class="sc1-menu-link" data-sc1-view="' + item.view + '" href="' + href(item.view) + '"><span class="sc1-menu-number" aria-hidden="true">0' + (index + 1) + '</span><span class="sc1-menu-label">' + item.label + '</span>' + arrow + '</a>';
  }

  mount.innerHTML = '<header class="sc1-header">' +
    '<div class="sc1-header-main"><div class="sc1-header-inner">' +
      '<a class="sc1-brand" href="' + href("home") + '" data-sc1-view="home" aria-label="SC1 home"><img src="sc1.svg" alt="SC1 — Super Clean One" width="80" height="80"/></a>' +
      '<div class="sc1-header-actions"><button class="sc1-cart-button" type="button" aria-label="Open shopping cart"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 5h4l4 17h15l3-12H8"/><circle cx="13" cy="27" r="1.5"/><circle cx="25" cy="27" r="1.5"/></svg><span class="sc1-cart-count" hidden></span></button>' +
      '<button class="sc1-menu-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="sc1-menu" aria-haspopup="dialog"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 7h24M4 16h24M4 25h24"/></svg></button></div>' +
    '</div></div>' +
    '<a class="sc1-news-link" href="https://www.youtube.com/playlist?list=PLPYLKNd1GJ5s" target="_blank" rel="noopener noreferrer"><span class="sc1-news-label">Latest</span><span class="sc1-news-copy">Badlands - Full event now available</span><span class="sc1-news-arrow">' + arrow + '</span></a></header>';

  var dialog = document.createElement("dialog");
  dialog.id = "sc1-menu";
  dialog.className = "sc1-menu-dialog";
  dialog.setAttribute("aria-label", "Main navigation");
  dialog.innerHTML = '<button class="sc1-menu-close" type="button" aria-label="Close navigation menu" autofocus><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m5 5 22 22M27 5 5 27"/></svg></button>' +
    '<nav class="sc1-menu-links" aria-label="Main navigation">' + links.map(navLink).join("") +
    '<a class="sc1-menu-link" href="' + telegram + '" target="_blank" rel="noopener noreferrer"><span class="sc1-menu-number" aria-hidden="true">06</span><span class="sc1-menu-label">Contact us</span>' + arrow + '</a></nav>' +
    '<div class="sc1-menu-socials"><a href="https://www.youtube.com/@sc1simon" target="_blank" rel="noopener noreferrer">' + icons.youtube + '<span>YouTube</span></a><a href="https://www.instagram.com/sc1simon/" target="_blank" rel="noopener noreferrer">' + icons.instagram + '<span>Instagram</span></a><a href="' + telegram + '" target="_blank" rel="noopener noreferrer">' + icons.telegram + '<span>Telegram</span></a></div>' +
    '<div class="sc1-menu-brand"><strong>Super Clean One</strong><span>One round street MMA</span></div>';
  document.body.appendChild(dialog);
  document.body.classList.add("sc1-navigation-ready");

  var toggle = mount.querySelector(".sc1-menu-toggle");
  var closeButton = dialog.querySelector(".sc1-menu-close");
  var cartButton = mount.querySelector(".sc1-cart-button");
  var cartCount = mount.querySelector(".sc1-cart-count");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var scrollState = null;
  var closeTimer = 0;
  var afterClose = null;
  var returnFocus = true;
  var returnScroll = true;
  var closing = false;
  var pageName = window.location.pathname.split("/").pop().toLowerCase();
  var pageViews = { "fighter.html": "athletes", "athletes.html": "athletes", "webshop.html": "webshop", "gallery.html": "gallery", "apply.html": "apply" };
  var isIndex = !pageName || pageName === "index.html";
  if (!isIndex && pageName !== "fighter.html") document.body.dataset.activeView = pageViews[pageName] || "home";

  function activeView() {
    if (!isIndex) return pageViews[pageName] || "home";
    var view = window.location.hash.slice(1) || "home";
    return view === "about" ? "apply" : view;
  }
  function updateActive(view) {
    var selected = isIndex ? (view || activeView()) : activeView();
    if (selected === "about" || selected === "fighter-profile") selected = selected === "about" ? "apply" : "athletes";
    document.querySelectorAll("[data-sc1-view]").forEach(function (link) {
      if (link.getAttribute("data-sc1-view") === selected) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
  function snapshot(element, name) {
    return { element: element, name: name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) };
  }
  function restore(property) {
    if (property.value) property.element.style.setProperty(property.name, property.value, property.priority);
    else property.element.style.removeProperty(property.name);
  }
  function scrollInstantly(x, y) {
    var behavior = snapshot(document.documentElement, "scroll-behavior");
    document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
    window.scrollTo(x, y);
    restore(behavior);
  }
  function openMenu() {
    if (dialog.open || typeof dialog.showModal !== "function") return;
    updateActive();
    var root = document.documentElement;
    var body = document.body;
    scrollState = { x: window.scrollX, y: window.scrollY, styles: [snapshot(root, "overflow"), snapshot(body, "overflow")] };
    root.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty("overflow", "hidden", "important");
    dialog.showModal();
    dialog.scrollTop = 0;
    toggle.setAttribute("aria-expanded", "true");
    closeButton.focus({ preventScroll: true });
    scrollInstantly(scrollState.x, scrollState.y);
    dialog.getBoundingClientRect();
    dialog.classList.add("is-visible");
  }
  function finishClose() {
    if (dialog.open) dialog.close();
  }
  function closeMenu(restoreFocus, callback) {
    if (!dialog.open) { if (callback) callback(); return; }
    if (closing) return;
    closing = true;
    returnFocus = restoreFocus !== false;
    afterClose = callback || null;
    dialog.classList.remove("is-visible");
    dialog.classList.add("is-closing");
    if (reducedMotion.matches) finishClose();
    else closeTimer = window.setTimeout(finishClose, 350);
  }
  dialog.addEventListener("transitionend", function (event) {
    if (closing && event.target === dialog && event.propertyName === "transform") finishClose();
  });
  dialog.addEventListener("close", function () {
    window.clearTimeout(closeTimer);
    closing = false;
    dialog.classList.remove("is-visible", "is-closing");
    toggle.setAttribute("aria-expanded", "false");
    if (scrollState) {
      scrollState.styles.forEach(restore);
      if (returnFocus) toggle.focus({ preventScroll: true });
      if (returnScroll) scrollInstantly(scrollState.x, scrollState.y);
    }
    scrollState = null;
    var callback = afterClose;
    afterClose = null;
    returnFocus = true;
    returnScroll = true;
    if (callback) callback();
  });
  toggle.addEventListener("click", openMenu);
  closeButton.addEventListener("click", function () { closeMenu(true); });
  dialog.addEventListener("cancel", function (event) { event.preventDefault(); closeMenu(true); });
  dialog.addEventListener("click", function (event) {
    if (event.target !== dialog) return;
    var box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeMenu(true);
  });
  function navigate(view) {
    if (isIndex && typeof window.SC1_NAVIGATE === "function") window.SC1_NAVIGATE(view);
    else window.location.assign(href(view));
  }
  document.querySelectorAll("[data-sc1-view]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      var view = link.getAttribute("data-sc1-view");
      closeMenu(false, function () { navigate(view); });
    });
  });
  dialog.querySelectorAll('a[target="_blank"]').forEach(function (link) {
    link.addEventListener("click", function () { closeMenu(true); });
  });
  window.addEventListener("sc1:view-change", function (event) { updateActive(event.detail.view); });
  function onHistoryNavigation() {
    // A new view owns its scroll position; do not restore the old view after closing.
    if (dialog.open) returnScroll = false;
    afterClose = null;
    closeMenu(false);
    updateActive();
  }
  window.addEventListener("hashchange", onHistoryNavigation);
  window.addEventListener("popstate", onHistoryNavigation);

  function updateCart(count) {
    var quantity = Number(count);
    if (!Number.isFinite(quantity) || quantity < 0) return;
    quantity = Math.floor(quantity);
    cartCount.textContent = quantity > 99 ? "99+" : String(quantity);
    cartCount.hidden = false;
    cartButton.setAttribute("aria-label", "Open shopping cart, " + quantity + (quantity === 1 ? " item" : " items"));
    try { window.localStorage.setItem("sc1:cart-count", String(quantity)); } catch (_) { /* Storage may be disabled. */ }
  }
  window.addEventListener("sc1:cart-update", function (event) { updateCart(event.detail.count); });
  window.addEventListener("storage", function (event) { if (event.key === "sc1:cart-count" && event.newValue !== null) updateCart(event.newValue); });
  try { var cached = window.localStorage.getItem("sc1:cart-count"); if (cached !== null) updateCart(cached); } catch (_) { /* Keep an unconfirmed count hidden. */ }
  if (window.SC1_CART && Number.isFinite(window.SC1_CART.count)) updateCart(window.SC1_CART.count);
  cartButton.addEventListener("click", function () {
    if (window.SC1_CART && typeof window.SC1_CART.open === "function" && window.SC1_CART.open()) return;
    window.SC1_CART_OPEN_REQUESTED = true;
    try { window.sessionStorage.setItem("sc1:open-cart", "1"); } catch (_) { /* The in-page flag also handles this. */ }
    if (isIndex) navigate("webshop");
    else if (pageName !== "webshop.html") window.location.assign("webshop.html?cart=open");
  });
  updateActive();
}());
