const assert = require('assert');
const { loadApp } = require('./harness');
const KEY = 'shuatiben_v1';
const paper = { id:'p1', title:'测试卷', subject:'数学', createdAt:1, lastResult:null, questions:[
  { id:'q1', question:'1+1=?', options:['1','2','3','4'], answer:'B', analysis:'', type:'single', typeLabel:'单选题', subject:'数学' },
  { id:'q2', question:'2+2=?', options:['2','3','4','5'], answer:'C', analysis:'', type:'single', typeLabel:'单选题', subject:'数学' },
  { id:'q3', question:'3+3=?', options:['3','5','6','7'], answer:'C', analysis:'', type:'single', typeLabel:'单选题', subject:'数学' }
]};
const storage = {}; storage[KEY] = JSON.stringify({ papers:[paper], wrongBook:[], progress:{} });
const ctx = loadApp(storage);
ctx.__run(`startPaper('p1', false);`);

let html = ctx.document.querySelector('#view-practice').innerHTML;
assert.ok(html.includes('qnav-chip'), 'should render question chips');
assert.ok(html.includes('data-action="jump-question"'), 'chips should be clickable');
assert.ok(html.includes('qnav-chip todo'), 'initial chips should be unanswered');

ctx.__run(`session.answers[0] = { selected: 'A' }; submitCurrentAnswer();`);
html = ctx.document.querySelector('#view-practice').innerHTML;
assert.ok(html.includes('qnav-chip bad'), 'wrong answer should be marked bad');
assert.strictEqual(ctx.__run('session.index'), 0, 'still on q1 after wrong');

ctx.__run(`goToQuestion(2);`);
assert.strictEqual(ctx.__run('session.index'), 2, 'goToQuestion should jump to index 2');
let saved = JSON.parse(storage[KEY]);
assert.strictEqual(saved.progress.p1.index, 2, 'progress index should update after jump');

console.log('PASS test-nav');
