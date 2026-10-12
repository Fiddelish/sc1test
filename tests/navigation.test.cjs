const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'navigation.js'), 'utf8');
const telegram = 'https://telegram.me/+ohwFt9qF6LZlNjE8';

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  emit(type, properties = {}) {
    const event = { type, target: this, button: 0, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...properties };
    for (const callback of this.listeners.get(type) || []) callback(event);
    return event;
  }
}

class Styles {
  constructor() { this.values = new Map(); }
  setProperty(name, value, priority = '') { this.values.set(name, [String(value), priority]); }
  getPropertyValue(name) { return this.values.get(name)?.[0] || ''; }
  getPropertyPriority(name) { return this.values.get(name)?.[1] || ''; }
  removeProperty(name) { this.values.delete(name); }
}

// A small tree parser lets the real generated markup drive the tests. It only
// models selectors, events, styles and the dialog API used by navigation.js.
class Node extends Events {
  constructor(tag, document) {
    super();
    this.tagName = tag.toLowerCase(); this.document = document; this.children = [];
    this.attrs = new Map(); this.dataset = {}; this.style = new Styles();
    this.textContent = ''; this.open = false; this.hidden = false;
    this.classList = {
      contains: name => this.className.split(/\s+/).includes(name),
      add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(' '); },
      remove: (...names) => { this.className = this.className.split(/\s+/).filter(name => !names.includes(name)).join(' '); },
    };
  }
  get className() { return this.attrs.get('class') || ''; }
  set className(value) { this.attrs.set('class', value); }
  get id() { return this.attrs.get('id') || ''; }
  set id(value) { this.attrs.set('id', value); }
  setAttribute(name, value) { this.attrs.set(name, String(value)); if (name === 'hidden') this.hidden = true; }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
  appendChild(node) { this.children.push(node); return node; }
  matches(selector) {
    if (selector.startsWith('.')) return this.classList.contains(selector.slice(1));
    const match = selector.match(/^([\w-]+)?\[([\w-]+)(?:="([^"]*)")?\]$/);
    if (match) return (!match[1] || this.tagName === match[1]) && this.attrs.has(match[2]) && (match[3] === undefined || this.attrs.get(match[2]) === match[3]);
    return this.tagName === selector;
  }
  querySelectorAll(selector) {
    return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  set innerHTML(html) {
    this.children = [];
    const stack = [this];
    for (const token of html.match(/<[^>]+>|[^<]+/g) || []) {
      if (token.startsWith('</')) { stack.pop(); continue; }
      if (!token.startsWith('<')) { stack.at(-1).textContent += token; continue; }
      const [, tag, attrs] = token.match(/^<([\w-]+)([^>]*)>/);
      const node = new Node(tag, this.document);
      for (const match of attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)) node.setAttribute(match[1], match[2] || '');
      stack.at(-1).appendChild(node);
      if (!token.endsWith('/>') && !['img', 'input', 'br'].includes(tag)) stack.push(node);
    }
  }
  focus() { this.document.activeElement = this; }
  showModal() { this.open = true; }
  close() { this.open = false; this.emit('close'); }
  getBoundingClientRect() { return { left: 0, top: 0, right: 420, bottom: 800 }; }
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

function setup({ pathname = '/index.html', hash = '#home', reducedMotion = false, mount = true, cached, cart } = {}) {
  const document = {};
  document.documentElement = new Node('html', document);
  document.body = document.documentElement.appendChild(new Node('body', document));
  if (pathname === '/fighter.html') document.body.dataset.activeView = 'fighter-profile';
  if (mount) { const node = document.body.appendChild(new Node('div', document)); node.id = 'sc1-navigation'; }
  document.createElement = tag => new Node(tag, document);
  document.querySelector = selector => document.documentElement.querySelector(selector);
  document.querySelectorAll = selector => document.documentElement.querySelectorAll(selector);
  document.getElementById = id => document.querySelector(`[id="${id}"]`);
  const assigned = [], routed = [], timers = new Map();
  let timerId = 0;
  const window = Object.assign(new Events(), {
    location: { pathname, hash, assign: url => assigned.push(url) },
    localStorage: storage(cached === undefined ? {} : { 'sc1:cart-count': cached }),
    sessionStorage: storage(), scrollX: 12, scrollY: 460,
    matchMedia: () => ({ matches: reducedMotion }),
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id),
    scrollTo(x, y) { this.scrollX = x; this.scrollY = y; },
    SC1_NAVIGATE: view => routed.push(view), SC1_CART: cart,
  });
  const context = vm.createContext({ document, window });
  const run = () => vm.runInContext(source, context, { filename: 'navigation.js' });
  run();
  return { document, window, assigned, routed, timers, run,
    node: selector => document.querySelector(selector),
    finishClose() { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } },
  };
}

function activeViews(env) {
  return [...new Set(env.document.querySelectorAll('[aria-current="page"]').map(node => node.getAttribute('data-sc1-view')))];
}

test('all six pages load shared navigation once before app, without legacy headers', () => {
  for (const page of ['index', 'webshop', 'fighter', 'athletes', 'gallery', 'apply']) {
    const html = fs.readFileSync(path.join(root, `${page}.html`), 'utf8');
    assert.equal((html.match(/id="sc1-navigation"/g) || []).length, 1, page);
    assert.equal((html.match(/<script\b[^>]*src="navigation\.js(?:\?[^"]*)?"/g) || []).length, 1, page);
    assert.match(html, /<link\b[^>]*href="navigation\.css(?:\?[^"]*)?"/);
    assert.ok(html.indexOf('src="navigation.js') < html.indexOf('src="app.js'), `${page}: shared nav precedes app snapshots`);
    assert.doesNotMatch(html, /<header\b[^>]*class="site-header/);
  }
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /window\.SC1_NAVIGATE\s*=\s*setActiveView/);
  assert.match(app, /new CustomEvent\("sc1:view-change"/);
  assert.match(app, /if \(link\.hasAttribute\("data-sc1-view"\)\) return/);
  assert.match(app, /if \(src && \/[^\n]+navigation\\\.js[^\n]+\) \{\s*return;/);
});

test('shared markup keeps six drawer rows and Latest without duplicate desktop navigation', () => {
  const env = setup();
  assert.equal(env.node('.sc1-desktop-links'), null);
  assert.equal(env.node('[aria-label="Quick navigation"]'), null);
  assert.deepEqual(env.node('.sc1-header').querySelectorAll('[data-sc1-view]').map(node => node.getAttribute('data-sc1-view')), ['home'],
    'Only the logo home shortcut remains in the top row');
  assert.equal(env.node('.sc1-news-label').textContent, 'Latest');
  assert.equal(env.node('.sc1-news-link').getAttribute('href'), 'https://www.youtube.com/playlist?list=PLPYLKNd1GJ5s');
  const rows = env.node('.sc1-menu-links').querySelectorAll('a');
  assert.deepEqual(rows.map(row => row.querySelector('.sc1-menu-label').textContent),
    ['Home', 'Watch fights', 'Fighters', 'Shop', 'Apply & rules', 'Contact us']);
  assert.deepEqual(rows.slice(0, 5).map(row => row.getAttribute('href')),
    ['home', 'gallery', 'athletes', 'webshop', 'apply'].map(view => `index.html#${view}`));
  assert.equal(rows[5].getAttribute('href'), telegram);
  const socials = env.node('.sc1-menu-socials').querySelectorAll('a');
  assert.deepEqual(socials.map(node => node.getAttribute('href')),
    ['https://www.youtube.com/@sc1simon', 'https://www.instagram.com/sc1simon/', telegram]);
  for (const link of env.document.querySelectorAll('a[target="_blank"]')) assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
  assert.equal(env.node('input'), null);
  assert.equal(env.node('.sc1-menu-toggle').getAttribute('aria-controls'), 'sc1-menu');
  assert.equal(env.node('dialog').getAttribute('aria-label'), 'Main navigation');
});

test('active links follow SPA changes and standalone paths, including profiles and rules', () => {
  for (const [pathname, expected] of [['/index.html', 'home'], ['/', 'home'], ['/fighter.html', 'athletes'],
    ['/athletes.html', 'athletes'], ['/webshop.html', 'webshop'], ['/gallery.html', 'gallery'], ['/apply.html', 'apply']]) {
    const env = setup({ pathname });
    assert.deepEqual(activeViews(env), [expected]);
    if (pathname === '/fighter.html') assert.equal(env.document.body.dataset.activeView, 'fighter-profile');
    env.window.emit('sc1:view-change', { detail: { view: 'about' } });
    assert.deepEqual(activeViews(env), [pathname === '/index.html' || pathname === '/' ? 'apply' : expected]);
  }
  const env = setup({ hash: '#athletes' });
  assert.deepEqual(activeViews(env), ['athletes']);
  env.window.location.hash = '#webshop'; env.window.emit('hashchange');
  assert.deepEqual(activeViews(env), ['webshop']);
  env.window.location.hash = '#about'; env.window.emit('popstate');
  assert.deepEqual(activeViews(env), ['apply']);
});

test('drawer close button, Escape, backdrop and animation restore exact scroll, focus and inline styles', () => {
  for (const action of ['close', 'escape', 'backdrop', 'transition']) {
    const env = setup(); const rootStyle = env.document.documentElement.style;
    rootStyle.setProperty('overflow', 'clip', 'important'); rootStyle.setProperty('scroll-behavior', 'smooth', 'important');
    env.document.body.style.setProperty('overflow', 'auto');
    const toggle = env.node('.sc1-menu-toggle'), close = env.node('.sc1-menu-close'), dialog = env.node('dialog');
    toggle.emit('click'); toggle.emit('click');
    assert.equal(dialog.open, true); assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(env.document.activeElement, close);
    assert.equal(rootStyle.getPropertyValue('overflow'), 'hidden');
    assert.equal(env.document.body.style.getPropertyPriority('overflow'), 'important');
    assert.deepEqual([env.window.scrollX, env.window.scrollY], [12, 460]);
    dialog.emit('click', { clientX: 200, clientY: 200 });
    assert.equal(dialog.classList.contains('is-closing'), false, 'Inside clicks do not close the menu');
    if (action === 'escape') assert.equal(dialog.emit('cancel').defaultPrevented, true);
    else if (action === 'backdrop') dialog.emit('click', { clientX: 500, clientY: 200 });
    else close.emit('click');
    assert.equal(dialog.open, true, 'Close animation completes before removing the dialog');
    if (action === 'transition') dialog.emit('transitionend', { propertyName: 'transform' });
    else env.finishClose();
    assert.equal(dialog.open, false); assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(env.document.activeElement, toggle);
    assert.deepEqual([env.window.scrollX, env.window.scrollY], [12, 460]);
    assert.equal(rootStyle.getPropertyValue('overflow'), 'clip');
    assert.equal(rootStyle.getPropertyPriority('overflow'), 'important');
    assert.equal(rootStyle.getPropertyValue('scroll-behavior'), 'smooth');
    assert.equal(rootStyle.getPropertyPriority('scroll-behavior'), 'important');
    assert.equal(env.document.body.style.getPropertyValue('overflow'), 'auto');
    assert.equal(env.document.body.style.getPropertyPriority('overflow'), '');
    assert.equal(env.timers.size, 0);
  }
});

test('route selection closes first, preserves modified clicks, and navigates standalone pages', () => {
  const env = setup(); const fighters = env.node('.sc1-menu-links').querySelector('[data-sc1-view="athletes"]');
  for (const properties of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
    assert.equal(fighters.emit('click', properties).defaultPrevented, false);
  }
  assert.deepEqual(env.routed, []);
  env.node('.sc1-menu-toggle').emit('click');
  assert.equal(fighters.emit('click').defaultPrevented, true);
  assert.deepEqual(env.routed, []); env.finishClose();
  assert.deepEqual(env.routed, ['athletes']); assert.equal(env.node('dialog').open, false);
  assert.notEqual(env.document.activeElement, env.node('.sc1-menu-toggle'));
  const standalone = setup({ pathname: '/fighter.html' });
  standalone.node('[data-sc1-view="webshop"]').emit('click');
  assert.deepEqual(standalone.assigned, ['index.html#webshop']);
  const noRouter = setup(); delete noRouter.window.SC1_NAVIGATE;
  noRouter.node('[data-sc1-view="athletes"]').emit('click');
  assert.deepEqual(noRouter.assigned, ['index.html#athletes']);
});

test('reduced motion closes immediately and external/history actions close without blocking navigation', () => {
  const env = setup({ reducedMotion: true });
  env.node('.sc1-menu-toggle').emit('click');
  const contact = env.node('.sc1-menu-links').querySelector('a[target="_blank"]');
  assert.equal(contact.emit('click').defaultPrevented, false);
  assert.equal(env.node('dialog').open, false); assert.equal(env.timers.size, 0);
  for (const event of ['hashchange', 'popstate']) {
    env.node('.sc1-menu-toggle').emit('click'); env.window.emit(event);
    assert.equal(env.node('dialog').open, false);
    assert.equal(env.document.body.style.getPropertyValue('overflow'), '');
  }
});

test('Back/Forward while the drawer closes preserves the new view scroll position', () => {
  for (const type of ['hashchange', 'popstate']) {
    const env = setup(); const rootStyle = env.document.documentElement.style;
    rootStyle.setProperty('overflow', 'clip', 'important');
    env.document.body.style.setProperty('overflow', 'auto');
    env.node('.sc1-menu-toggle').emit('click');
    env.window.location.hash = '#athletes'; env.window.emit(type);
    // app.js changes the view and scrolls before the closing animation finishes.
    env.window.scrollTo(0, 0);
    assert.equal(env.node('dialog').open, true);
    env.finishClose();
    assert.equal(env.node('dialog').open, false);
    assert.deepEqual([env.window.scrollX, env.window.scrollY], [0, 0]);
    assert.deepEqual(activeViews(env), ['athletes']);
    assert.equal(rootStyle.getPropertyValue('overflow'), 'clip');
    assert.equal(rootStyle.getPropertyPriority('overflow'), 'important');
    assert.equal(env.document.body.style.getPropertyValue('overflow'), 'auto');
    // History opt-out must not leak into subsequent ordinary close operations.
    env.window.scrollTo(8, 300); env.node('.sc1-menu-toggle').emit('click');
    env.window.scrollTo(0, 0); env.node('.sc1-menu-close').emit('click'); env.finishClose();
    assert.deepEqual([env.window.scrollX, env.window.scrollY], [8, 300]);
  }
});

test('cart count uses confirmed events/cache, caps display, and rejects invalid counts', () => {
  const env = setup(); const badge = env.node('.sc1-cart-count'), button = env.node('.sc1-cart-button');
  assert.equal(badge.hidden, true);
  env.window.emit('sc1:cart-update', { detail: { count: 1 } });
  assert.equal(badge.textContent, '1'); assert.equal(badge.hidden, false);
  assert.equal(button.getAttribute('aria-label'), 'Open shopping cart, 1 item');
  env.window.emit('storage', { key: 'sc1:cart-count', newValue: '102' });
  assert.equal(badge.textContent, '99+');
  assert.equal(env.window.localStorage.getItem('sc1:cart-count'), '102');
  for (const count of [-1, NaN, Infinity, 'invalid']) env.window.emit('sc1:cart-update', { detail: { count } });
  assert.equal(badge.textContent, '99+');
  env.window.emit('sc1:cart-update', { detail: { count: 0 } });
  assert.equal(badge.textContent, '0');
  assert.equal(setup({ cached: '3' }).node('.sc1-cart-count').textContent, '3');
  assert.equal(setup({ cached: '3', cart: { count: 2 } }).node('.sc1-cart-count').textContent, '2');
});

test('cart opens an existing integration or requests the shop without navigating twice', () => {
  let opened = 0;
  const ready = setup({ cart: { open() { opened++; return true; } } });
  ready.node('.sc1-cart-button').emit('click');
  assert.equal(opened, 1); assert.deepEqual(ready.routed, []);
  for (const pathname of ['/index.html', '/fighter.html', '/webshop.html']) {
    const env = setup({ pathname }); env.node('.sc1-cart-button').emit('click');
    assert.equal(env.window.SC1_CART_OPEN_REQUESTED, true);
    assert.equal(env.window.sessionStorage.getItem('sc1:open-cart'), '1');
    assert.deepEqual(env.routed, pathname === '/index.html' ? ['webshop'] : []);
    assert.deepEqual(env.assigned, pathname === '/fighter.html' ? ['webshop.html?cart=open'] : []);
  }
});

test('missing mount and repeated execution safely leave navigation unchanged', () => {
  const missing = setup({ mount: false });
  assert.equal(missing.node('dialog'), null);
  const env = setup(); const dialog = env.node('dialog'); env.run();
  assert.equal(env.node('dialog'), dialog);
  assert.equal(env.document.querySelectorAll('dialog').length, 1);
  assert.equal(env.node('.sc1-menu-toggle').listeners.get('click').length, 1);
});
