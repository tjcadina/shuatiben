const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl(sel) {
  const handlers = {};
  return {
    sel,
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire(type) { (handlers[type] || []).forEach((fn) => fn({ target: this })); },
    setAttribute() {},
    click() { this.fire('click'); },
    remove() {},
    select() {},
    dataset: {}
  };
}

function loadApp(initialStorage, extra) {
  const cache = new Map();
  const storage = initialStorage || {};
  const ctx = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    JSON,
    Math,
    String,
    Array,
    Object,
    Set,
    RegExp,
    URL,
    Blob,
    localStorage: {
      getItem(k) { return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null; },
      setItem(k, v) { storage[k] = String(v); },
      removeItem(k) { delete storage[k]; }
    },
    document: {
      documentElement: { setAttribute() {}, getAttribute() { return null; }, dataset: {} },
      addEventListener() {},
      querySelector(sel) {
        if (!cache.has(sel)) cache.set(sel, makeEl(sel));
        return cache.get(sel);
      },
      querySelectorAll(sel) {
        if (!cache.has(sel)) cache.set(sel, [makeEl(sel)]);
        return cache.get(sel);
      },
      createElement() { return makeEl(''); },
      body: makeEl('body')
    },
    window: {
      speechSynthesis: { speaking: false, cancel() { this.cancelled = true; }, speak(u) { this.spoken = u; } },
      SpeechSynthesisUtterance: function (text) { this.text = text; }
    },
    navigator: { clipboard: { writeText() { return Promise.resolve(); } } },
    confirm() { return true; }
  };
  if (extra) {
    if (extra.cloudbase) ctx.window.cloudbase = extra.cloudbase;
    if (extra.config) ctx.window.CLOUDBASE_CONFIG = extra.config;
  }
  vm.createContext(ctx);
  const code = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.runInContext(code, ctx, { filename: 'app.js' });
  ctx.__run = (expr) => vm.runInContext(expr, ctx);
  ctx.__storage = storage;
  return ctx;
}

module.exports = { loadApp };

