const assert = require('assert');
const { loadApp } = require('./harness');
const KEY = 'shuatiben_v1';
const paper = { id:'p1', title:'t', subject:'数学', createdAt:1, lastResult:null, questions:[
  { id:'q1', question:'下列哪个是水果？', options:['苹果','汽车'], answer:'A', analysis:'', type:'single', typeLabel:'单选题', subject:'数学' }
]};
const storage = {}; storage[KEY] = JSON.stringify({ papers:[paper], wrongBook:[], progress:{} });
const ctx = loadApp(storage);
ctx.__run(`startPaper('p1', false);`);
const text = ctx.__run(`buildSpeechText(session.items[session.index].q)`);
assert.ok(text.includes('水果'), 'should include question');
assert.ok(text.includes('苹果'), 'should include option content');
assert.ok(text.includes('A'), 'should include option letter');
ctx.__run(`speakCurrentQuestion();`);
assert.ok(ctx.window.speechSynthesis.spoken, 'should speak an utterance');
assert.ok(ctx.window.speechSynthesis.spoken.text.includes('水果'), 'spoken text should contain question');
assert.strictEqual(ctx.window.speechSynthesis.cancelled, true, 'previous speech should be cancelled');
console.log('PASS test-speech');
