const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'fighter-gallery.js'), 'utf8');

class Style {
  constructor() { this.values = new Map(); }
  setProperty(name, value, priority = '') { this.values.set(name, { value, priority }); }
  getPropertyValue(name) { return this.values.get(name)?.value || ''; }
  getPropertyPriority(name) { return this.values.get(name)?.priority || ''; }
  removeProperty(name) { this.values.delete(name); }
  snapshot() { return [...this.values.entries()].sort(([a], [b]) => a.localeCompare(b)); }
}

class Element {
  constructor(id = '') {
    this.id = id;
    this.style = new Style();
    this.listeners = {};
    this.attributes = {};
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.isConnected = true;
    this.textContent = '';
    this.scrollLeft = 0;
    this.clientWidth = 300;
    this.scrollWidth = 300;
    this.bounds = { left: 100, top: 100, right: 700, bottom: 500, width: 600 };
  }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  fire(name, props = {}) {
    const event = { target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...props };
    (this.listeners[name] || []).forEach(fn => fn(event));
    return event;
  }
  getAttribute(name) { return this.attributes[name] || null; }
  removeAttribute(name) { delete this.attributes[name]; if (name === 'src') this.src = ''; }
  querySelector(selector) { return selector === 'img' ? this.image || null : null; }
  querySelectorAll() { return this.children; }
  contains(child) { return this.children.includes(child); }
  closest(selector) {
    if (selector === '.profile-photo-trigger' && this.isPhoto) return this;
    return this.parent?.closest(selector) || null;
  }
  getBoundingClientRect() { return this.bounds; }
  focus(options) { this.focusCalls ||= []; this.focusCalls.push(options); }
  showModal() { this.open = true; }
  close() { this.open = false; this.fire('close'); }
  scrollBy(options) {
    this.lastScroll = options;
    this.scrollLeft = Math.min(Math.max(0, this.scrollWidth - this.clientWidth), Math.max(0, this.scrollLeft + options.left));
    this.fire('scroll');
  }
}

function setup({ count = 3, videoCount = 0, reducedMotion = false, resizeObserver = true } = {}) {
  const ids = ['profile-photos', 'profile-photo-controls', 'profile-photo-prev', 'profile-photo-next',
    'profile-videos', 'profile-video-controls', 'profile-video-prev', 'profile-video-next',
    'profile-photo-dialog', 'profile-photo-close', 'profile-photo-dialog-prev', 'profile-photo-dialog-next',
    'profile-photo-expanded', 'profile-photo-status', 'profile-photo-caption', 'profile-photo-counter'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element(id)]));
  const track = elements['profile-photos'];
  const videoTrack = elements['profile-videos'];
  const root = new Element('html');
  const body = new Element('body');
  root.style.setProperty('overflow-x', 'clip', 'important');
  root.style.setProperty('overflow-y', 'auto');
  root.style.setProperty('scroll-behavior', 'smooth', 'important');
  body.style.setProperty('overflow-x', 'hidden');
  body.style.setProperty('padding-right', '7px', 'important');
  const before = { root: root.style.snapshot(), body: body.style.snapshot() };
  Object.defineProperty(root, 'clientWidth', { get: () => root.style.getPropertyValue('overflow-y') === 'hidden' ? 1000 : 985 });
  const window = new Element('window');
  const frames = new Map();
  const images = [];
  const mutationObservers = [];
  const resizeObservers = [];
  let frameId = 0;
  Object.assign(window, {
    innerWidth: 1000, scrollX: 4, scrollY: 830,
    matchMedia: () => ({ matches: reducedMotion }),
    getComputedStyle: () => ({ paddingRight: body.style.getPropertyValue('padding-right') }),
    requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
    scrollTo(x, y) {
      assert.equal(root.style.getPropertyValue('scroll-behavior'), 'auto', 'scroll restoration overrides smooth CSS');
      this.scrollX = x;
      this.scrollY = y;
    }
  });
  class Observer {
    constructor(fn, collection) { this.fn = fn; collection.push(this); }
    observe(target, options) { this.target = target; this.options = options; }
    trigger() { this.fn(); }
  }
  function setPhotos(length, notify = true) {
    track.children.forEach(photo => { photo.isConnected = false; });
    track.children = Array.from({ length }, (_, index) => {
      const button = new Element();
      button.isPhoto = true;
      button.attributes['data-full-src'] = `full-${index}.jpg`;
      button.attributes['data-photo-index'] = String(index);
      button.bounds = { left: index * 116, width: 100 };
      button.image = new Element();
      button.image.parent = button;
      button.image.src = `thumb-${index}.jpg`;
      button.image.alt = `Fighter photo ${index + 1}`;
      return button;
    });
    track.scrollWidth = Math.max(track.clientWidth, length * 116 - 16);
    if (notify) mutationObservers.forEach(observer => observer.trigger());
  }
  function setVideos(length, notify = true) {
    videoTrack.children.forEach(video => { video.isConnected = false; });
    videoTrack.children = Array.from({ length }, (_, index) => {
      const card = new Element();
      card.className = 'profile-video-card';
      card.bounds = { left: index * 252, width: 236 };
      return card;
    });
    videoTrack.scrollWidth = Math.max(videoTrack.clientWidth, length * 252 - 16);
    if (notify) mutationObservers.forEach(observer => observer.trigger());
  }
  function flushFrames() {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(fn => fn());
  }
  setPhotos(count, false);
  setVideos(videoCount, false);
  const context = {
    document: { documentElement: root, body, getElementById: id => elements[id] },
    window,
    Image: class { constructor() { images.push(this); } },
    MutationObserver: class extends Observer { constructor(fn) { super(fn, mutationObservers); } }
  };
  if (resizeObserver) context.ResizeObserver = class extends Observer { constructor(fn) { super(fn, resizeObservers); } };
  vm.runInNewContext(source, context, { filename: 'fighter-gallery.js' });
  flushFrames();
  const get = suffix => elements[`profile-photo-${suffix}`];
  const getVideo = suffix => elements[`profile-video-${suffix}`];
  const open = index => track.fire('click', { target: track.children[index].image });
  return { get, getVideo, track, videoTrack, root, body, before, window, images, mutationObservers, resizeObservers, setPhotos, setVideos, flushFrames, open };
}

test('delegated thumbnail clicks open full images; buttons and keyboard wrap both ways', () => {
  const h = setup();
  h.open(1);
  assert.equal(h.get('dialog').open, true);
  assert.equal(h.images[0].src, 'full-1.jpg');
  assert.equal(h.get('caption').textContent, 'Fighter photo 2');
  assert.equal(h.get('counter').textContent, '2 / 3');
  h.images[0].onload();
  assert.equal(h.get('expanded').src, 'full-1.jpg');
  assert.equal(h.get('expanded').hidden, false);
  h.get('dialog-next').fire('click');
  h.get('dialog-next').fire('click');
  assert.equal(h.get('counter').textContent, '1 / 3');
  h.get('dialog-prev').fire('click');
  assert.equal(h.get('counter').textContent, '3 / 3');
  const right = h.get('dialog').fire('keydown', { key: 'ArrowRight' });
  assert.equal(right.defaultPrevented, true);
  assert.equal(h.get('counter').textContent, '1 / 3');
  h.get('dialog').fire('keydown', { key: 'ArrowLeft' });
  assert.equal(h.get('counter').textContent, '3 / 3');
  h.get('dialog').fire('keydown', { key: 'ArrowRight', altKey: true });
  assert.equal(h.get('counter').textContent, '3 / 3');
});

test('stale asynchronous image responses cannot replace newer images; failures are visible', () => {
  const h = setup();
  h.open(0);
  const first = h.images[0];
  h.get('dialog-next').fire('click');
  const second = h.images[1];
  first.onload();
  assert.equal(h.get('expanded').src, '');
  second.onerror();
  assert.equal(h.get('status').textContent, 'Image could not be loaded.');
  assert.equal(h.get('expanded').hidden, true);
  h.get('dialog-next').fire('click');
  h.images[2].onload();
  first.onerror();
  assert.equal(h.get('expanded').src, 'full-2.jpg');
  assert.equal(h.get('status').textContent, '');
  h.get('close').fire('click');
  second.onload();
  assert.equal(h.get('expanded').src, '');
});

test('native close after Escape restores exact scroll, style priorities and originating focus', () => {
  const h = setup();
  const origin = h.track.children[1];
  h.open(1);
  assert.equal(h.root.style.getPropertyPriority('overflow-y'), 'important');
  assert.equal(h.body.style.getPropertyValue('padding-right'), '22px');
  assert.equal(h.body.style.getPropertyValue('position'), '', 'body never becomes fixed');
  assert.equal(h.get('close').focusCalls[0].preventScroll, true);
  h.window.scrollY = 0;
  // Browser-owned Escape behavior dispatches cancel and then closes the native dialog.
  const cancel = h.get('dialog').fire('cancel');
  assert.equal(cancel.defaultPrevented, false);
  h.get('dialog').close();
  h.flushFrames();
  assert.equal(h.window.scrollX, 4);
  assert.equal(h.window.scrollY, 830);
  assert.equal(origin.focusCalls.at(-1).preventScroll, true);
  assert.deepEqual(h.root.style.snapshot(), h.before.root);
  assert.deepEqual(h.body.style.snapshot(), h.before.body);
});

test('only an outside-bounds backdrop click closes; close button and navigation also clean up', () => {
  const h = setup();
  h.open(0);
  h.get('dialog').fire('click', { clientX: 200, clientY: 200 });
  assert.equal(h.get('dialog').open, true);
  h.get('dialog').fire('click', { clientX: 50, clientY: 50, target: h.get('expanded') });
  assert.equal(h.get('dialog').open, true);
  h.get('dialog').fire('click', { clientX: 50, clientY: 50 });
  assert.equal(h.get('dialog').open, false);
  for (const event of ['hashchange', 'popstate']) {
    h.open(0);
    h.window.fire(event);
    assert.equal(h.get('dialog').open, false);
  }
  h.open(0);
  h.get('close').fire('click');
  assert.equal(h.get('dialog').open, false);
  assert.deepEqual(h.body.style.snapshot(), h.before.body);
});

test('carousel tracks overflow, scroll endpoints, one-thumbnail steps, resize and reduced motion', () => {
  const h = setup({ count: 6 });
  assert.equal(h.get('controls').hidden, false);
  assert.equal(h.get('prev').disabled, true);
  h.get('next').fire('click');
  h.flushFrames();
  assert.equal(h.track.lastScroll.left, 116);
  assert.equal(h.track.lastScroll.behavior, 'smooth');
  assert.equal(h.get('prev').disabled, false);
  h.track.scrollLeft = h.track.scrollWidth - h.track.clientWidth;
  h.track.fire('scroll');
  h.flushFrames();
  assert.equal(h.get('next').disabled, true);
  h.get('prev').fire('click');
  assert.equal(h.track.lastScroll.left, -116);
  h.track.clientWidth = 900;
  h.resizeObservers[0].trigger();
  h.flushFrames();
  assert.equal(h.get('controls').hidden, true);
  const fallback = setup({ count: 6, reducedMotion: true, resizeObserver: false });
  fallback.get('next').fire('click');
  assert.equal(fallback.track.lastScroll.behavior, 'instant');
  fallback.track.clientWidth = 900;
  fallback.window.fire('resize');
  fallback.flushFrames();
  assert.equal(fallback.get('controls').hidden, true);
});

test('video gallery uses the photo carousel controls, scroll steps, and responsive overflow state', () => {
  const h = setup({ videoCount: 4 });
  assert.equal(h.getVideo('controls').hidden, false);
  assert.equal(h.getVideo('prev').disabled, true);
  h.getVideo('next').fire('click');
  h.flushFrames();
  assert.equal(h.videoTrack.lastScroll.left, 252);
  assert.equal(h.videoTrack.lastScroll.behavior, 'smooth');
  assert.equal(h.getVideo('prev').disabled, false);
  h.videoTrack.scrollLeft = h.videoTrack.scrollWidth - h.videoTrack.clientWidth;
  h.videoTrack.fire('scroll');
  h.flushFrames();
  assert.equal(h.getVideo('next').disabled, true);
  h.getVideo('prev').fire('click');
  assert.equal(h.videoTrack.lastScroll.left, -252);
  h.videoTrack.clientWidth = 1000;
  h.resizeObservers[0].trigger();
  h.flushFrames();
  assert.equal(h.getVideo('controls').hidden, true);

  const reduced = setup({ videoCount: 4, reducedMotion: true, resizeObserver: false });
  reduced.getVideo('next').fire('click');
  assert.equal(reduced.videoTrack.lastScroll.behavior, 'instant');
  reduced.videoTrack.clientWidth = 1000;
  reduced.window.fire('resize');
  reduced.flushFrames();
  assert.equal(reduced.getVideo('controls').hidden, true);
});

test('video carousel controls stay hidden when the video row does not overflow', () => {
  const h = setup({ videoCount: 1 });
  assert.equal(h.getVideo('controls').hidden, true);
  h.setVideos(0);
  h.flushFrames();
  assert.equal(h.getVideo('controls').hidden, true);
});

test('empty/single galleries hide controls and delayed rendering/removal is observed', () => {
  const h = setup({ count: 0 });
  assert.equal(h.get('controls').hidden, true);
  h.get('next').fire('click');
  assert.equal(h.track.lastScroll, undefined);
  h.setPhotos(1);
  h.flushFrames();
  h.open(0);
  assert.equal(h.get('counter').textContent, '1 / 1');
  assert.equal(h.get('dialog-prev').hidden, true);
  assert.equal(h.get('dialog-next').disabled, true);
  const key = h.get('dialog').fire('keydown', { key: 'ArrowRight' });
  assert.equal(key.defaultPrevented, false);
  assert.equal(h.images.length, 1);
  h.setPhotos(0);
  h.flushFrames();
  assert.equal(h.get('dialog').open, false);
  assert.deepEqual(h.root.style.snapshot(), h.before.root);
  h.setPhotos(5);
  h.flushFrames();
  assert.equal(h.get('controls').hidden, false);
  h.open(4);
  assert.equal(h.get('counter').textContent, '5 / 5');
});
