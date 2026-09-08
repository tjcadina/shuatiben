const assert = require('assert');
const fs = require('fs');
const path = require('path');
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

assert.ok(
  /jump-question[\s\S]*?goToQuestion\(Number\(btn\.dataset\.index\)\)/.test(appCode),
  'jump action should read data-index'
);
assert.ok(
  !/jump-question[\s\S]*?goToQuestion\(Number\(id\)\)/.test(appCode),
  'jump action must not read old data-id'
);
assert.ok(appCode.includes('pickChineseVoice'), 'speech should have Chinese voice picker');
assert.ok(appCode.includes('utter.onend = utter.onerror'), 'speech should clean up timers');
console.log('PASS test-fixes');
