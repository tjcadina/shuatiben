const fs = require('fs');
const path = require('path');
const assert = require('assert');
let s = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
assert.ok(s.includes("$$('.qnav-chip', root).forEach"), 'should attach direct click handlers to question chips');
assert.ok(s.includes('goToQuestion(idx)'), 'direct handler should call goToQuestion');
console.log('PASS test-fixes');
