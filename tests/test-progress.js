const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
const paper = {
  id: 'p1',
  title: '测试卷',
  subject: '数学',
  createdAt: 1,
  lastResult: null,
  questions: [
    { id: 'q1', question: '1+1=?', options: ['1', '2', '3', '4'], answer: 'B', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q2', question: '2+2=?', options: ['2', '3', '4', '5'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q3', question: '3+3=?', options: ['3', '5', '6', '7'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' }
  ]
};
const initial = { papers: [paper], wrongBook: [], progress: {} };
const storage = {};
storage[KEY] = JSON.stringify(initial);

// First visit: start, answer q1 correctly, progress should be saved
const ctx = loadApp(storage);
ctx.__run(`startPaper('p1', false);`);
assert.strictEqual(ctx.__run('session.index'), 0, 'should start at 0');
ctx.__run(`session.answers[0] = { selected: 'B' }; submitCurrentAnswer();`);
let saved = JSON.parse(storage[KEY]);
assert.ok(saved.progress.p1, 'progress should be saved after answering');
assert.strictEqual(saved.progress.p1.answers[0].submitted, true, 'q1 should be marked submitted');
assert.strictEqual(saved.progress.p1.answers[0].correct, true, 'q1 should be correct');

// Simulate leaving and reopening: should resume at first unanswered (index 1)
const ctx2 = loadApp(storage);
ctx2.__run(`startPaper('p1', false);`);
assert.strictEqual(ctx2.__run('session.index'), 1, 'should resume at first unanswered question');
assert.strictEqual(ctx2.__run('session.answers[0].submitted'), true, 'restored q1 submitted');
assert.strictEqual(ctx2.__run('session.answers[1] && session.answers[1].submitted ? true : false'), false, 'q2 not submitted yet');

// Answer remaining questions then finish -> progress cleared after report
ctx2.__run(`session.answers[1] = { selected: 'C' }; submitCurrentAnswer();`);
ctx2.__run(`nextQuestion(); session.answers[2] = { selected: 'C' }; submitCurrentAnswer();`);
ctx2.__run(`nextQuestion();`);
saved = JSON.parse(storage[KEY]);
assert.ok(!saved.progress.p1, 'progress should be removed after finishing report');

console.log('PASS test-progress');
