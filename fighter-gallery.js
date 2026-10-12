(function () {
  "use strict";

  var track = document.getElementById("profile-photos");
  var controls = document.getElementById("profile-photo-controls");
  var previous = document.getElementById("profile-photo-prev");
  var next = document.getElementById("profile-photo-next");
  var videoTrack = document.getElementById("profile-videos");
  var videoControls = document.getElementById("profile-video-controls");
  var videoPrevious = document.getElementById("profile-video-prev");
  var videoNext = document.getElementById("profile-video-next");
  var dialog = document.getElementById("profile-photo-dialog");
  var closeButton = document.getElementById("profile-photo-close");
  var dialogPrevious = document.getElementById("profile-photo-dialog-prev");
  var dialogNext = document.getElementById("profile-photo-dialog-next");
  var expanded = document.getElementById("profile-photo-expanded");
  var status = document.getElementById("profile-photo-status");
  var caption = document.getElementById("profile-photo-caption");
  var counter = document.getElementById("profile-photo-counter");
  if (!track || !controls || !previous || !next || !dialog || !closeButton ||
      !dialogPrevious || !dialogNext || !expanded || !status || !caption || !counter) return;

  var photos = [];
  var videos = [];
  var currentIndex = 0;
  var origin = null;
  var scrollLock = null;
  var loadToken = 0;
  var controlsFrame = 0;
  var videoControlsFrame = 0;
  var restoreFrame = 0;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function saveProperties(element, properties) {
    return properties.map(function (property) {
      return {
        element: element,
        property: property,
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property)
      };
    });
  }

  function restoreProperties(properties) {
    properties.forEach(function (saved) {
      if (saved.value) {
        saved.element.style.setProperty(saved.property, saved.value, saved.priority);
      } else {
        saved.element.style.removeProperty(saved.property);
      }
    });
  }

  function scrollInstantly(x, y) {
    var root = document.documentElement;
    var saved = saveProperties(root, ["scroll-behavior"]);
    root.style.setProperty("scroll-behavior", "auto", "important");
    window.scrollTo(x, y);
    restoreProperties(saved);
  }

  function lockScroll() {
    if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
    var root = document.documentElement;
    var body = document.body;
    var scrollbar = Math.max(0, window.innerWidth - root.clientWidth);
    var padding = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    scrollLock = {
      x: window.scrollX,
      y: window.scrollY,
      styles: saveProperties(root, ["overflow-x", "overflow-y"])
        .concat(saveProperties(body, ["overflow-x", "overflow-y", "padding-right"]))
    };
    root.style.setProperty("overflow-x", "hidden", "important");
    root.style.setProperty("overflow-y", "hidden", "important");
    body.style.setProperty("overflow-x", "hidden", "important");
    body.style.setProperty("overflow-y", "hidden", "important");
    // A stable scrollbar gutter already reserves the space; only replace space actually lost.
    var lostScrollbar = Math.min(scrollbar, Math.max(0, root.clientWidth - (window.innerWidth - scrollbar)));
    if (lostScrollbar) body.style.setProperty("padding-right", (padding + lostScrollbar) + "px", "important");
  }

  function updateControls() {
    controlsFrame = 0;
    var limit = Math.max(0, track.scrollWidth - track.clientWidth);
    controls.hidden = photos.length < 2 || limit <= 2;
    previous.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= limit - 2;
  }

  function scheduleControls() {
    if (!controlsFrame) controlsFrame = window.requestAnimationFrame(updateControls);
  }

  function updateVideoControls() {
    videoControlsFrame = 0;
    if (!videoTrack || !videoControls || !videoPrevious || !videoNext) return;
    var limit = Math.max(0, videoTrack.scrollWidth - videoTrack.clientWidth);
    videoControls.hidden = videos.length < 2 || limit <= 2;
    videoPrevious.disabled = videoTrack.scrollLeft <= 2;
    videoNext.disabled = videoTrack.scrollLeft >= limit - 2;
  }

  function scheduleVideoControls() {
    if (!videoTrack || !videoControls || !videoPrevious || !videoNext) return;
    if (!videoControlsFrame) videoControlsFrame = window.requestAnimationFrame(updateVideoControls);
  }

  function syncVideos() {
    if (!videoTrack) return;
    videos = Array.prototype.slice.call(videoTrack.querySelectorAll(".profile-video-card"));
    scheduleVideoControls();
  }

  function slideVideos(direction) {
    if (!videos.length || !videoTrack) return;
    var step = videos[0].getBoundingClientRect().width;
    if (videos.length > 1) {
      step = Math.abs(videos[1].getBoundingClientRect().left - videos[0].getBoundingClientRect().left) || step;
    }
    videoTrack.scrollBy({ left: direction * step, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  function syncPhotos() {
    photos = Array.prototype.slice.call(track.querySelectorAll(".profile-photo-trigger"));
    if (dialog.open) {
      if (!origin || !track.contains(origin)) {
        dialog.close();
      } else {
        currentIndex = Math.min(currentIndex, photos.length - 1);
        updateDialogControls();
      }
    }
    scheduleControls();
  }

  function slide(direction) {
    if (!photos.length) return;
    var step = photos[0].getBoundingClientRect().width;
    if (photos.length > 1) {
      step = Math.abs(photos[1].getBoundingClientRect().left - photos[0].getBoundingClientRect().left) || step;
    }
    track.scrollBy({ left: direction * step, behavior: reducedMotion.matches ? "instant" : "smooth" });
  }

  function updateDialogControls() {
    var single = photos.length <= 1;
    dialogPrevious.hidden = single;
    dialogNext.hidden = single;
    dialogPrevious.disabled = single;
    dialogNext.disabled = single;
    counter.textContent = (currentIndex + 1) + " / " + photos.length;
  }

  function showPhoto(index) {
    if (!photos.length) return;
    currentIndex = (index + photos.length) % photos.length;
    var button = photos[currentIndex];
    var thumbnail = button.querySelector("img");
    var source = button.getAttribute("data-full-src") || (thumbnail && (thumbnail.currentSrc || thumbnail.src));
    var description = thumbnail ? thumbnail.alt : "Fighter photo";
    var request = ++loadToken;
    caption.textContent = description;
    expanded.alt = description;
    expanded.hidden = true;
    expanded.removeAttribute("src");
    status.textContent = "Loading image…";
    updateDialogControls();

    if (!source) {
      status.textContent = "Image could not be loaded.";
      return;
    }
    var image = new Image();
    image.decoding = "async";
    image.onload = function () {
      if (request !== loadToken || !dialog.open) return;
      expanded.src = source;
      expanded.hidden = false;
      status.textContent = "";
    };
    image.onerror = function () {
      if (request !== loadToken || !dialog.open) return;
      status.textContent = "Image could not be loaded.";
    };
    image.src = source;
  }

  function openPhoto(button) {
    if (typeof dialog.showModal !== "function") return;
    syncPhotos();
    var index = photos.indexOf(button);
    if (index === -1) return;
    origin = button;
    if (!dialog.open) {
      lockScroll();
      try {
        dialog.showModal();
      } catch (error) {
        restoreProperties(scrollLock.styles);
        scrollInstantly(scrollLock.x, scrollLock.y);
        scrollLock = null;
        origin = null;
        return;
      }
      closeButton.focus({ preventScroll: true });
      scrollInstantly(scrollLock.x, scrollLock.y);
    }
    showPhoto(index);
  }

  function closePhoto() {
    if (dialog.open) dialog.close();
  }

  function cleanup() {
    ++loadToken;
    expanded.hidden = true;
    expanded.removeAttribute("src");
    status.textContent = "";
    var saved = scrollLock;
    var returnTo = origin;
    scrollLock = null;
    origin = null;
    if (saved) restoreProperties(saved.styles);
    if (returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true });
    if (saved) {
      scrollInstantly(saved.x, saved.y);
      restoreFrame = window.requestAnimationFrame(function () {
        restoreFrame = 0;
        if (!dialog.open) scrollInstantly(saved.x, saved.y);
      });
    }
  }

  previous.addEventListener("click", function () { slide(-1); });
  next.addEventListener("click", function () { slide(1); });
  videoPrevious?.addEventListener("click", function () { slideVideos(-1); });
  videoNext?.addEventListener("click", function () { slideVideos(1); });
  track.addEventListener("scroll", scheduleControls, { passive: true });
  track.addEventListener("load", scheduleControls, true);
  videoTrack?.addEventListener("scroll", scheduleVideoControls, { passive: true });
  videoTrack?.addEventListener("load", scheduleVideoControls, true);
  track.addEventListener("click", function (event) {
    var button = event.target.closest(".profile-photo-trigger");
    if (button && track.contains(button)) openPhoto(button);
  });
  closeButton.addEventListener("click", closePhoto);
  dialogPrevious.addEventListener("click", function () { showPhoto(currentIndex - 1); });
  dialogNext.addEventListener("click", function () { showPhoto(currentIndex + 1); });
  dialog.addEventListener("close", cleanup);
  dialog.addEventListener("keydown", function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey || photos.length <= 1) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(currentIndex + (event.key === "ArrowLeft" ? -1 : 1));
    }
  });
  dialog.addEventListener("click", function (event) {
    if (event.target !== dialog) return;
    var bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) closePhoto();
  });
  window.addEventListener("hashchange", closePhoto);
  window.addEventListener("popstate", closePhoto);
  new MutationObserver(syncPhotos).observe(track, { childList: true, subtree: true });
  if (videoTrack) new MutationObserver(syncVideos).observe(videoTrack, { childList: true, subtree: true });
  if (typeof ResizeObserver === "function") {
    var carouselResizeObserver = new ResizeObserver(function () {
      scheduleControls();
      scheduleVideoControls();
    });
    carouselResizeObserver.observe(track);
    if (videoTrack) carouselResizeObserver.observe(videoTrack);
  } else {
    window.addEventListener("resize", function () {
      scheduleControls();
      scheduleVideoControls();
    });
  }
  syncPhotos();
  syncVideos();
}());
