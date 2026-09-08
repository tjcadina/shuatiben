const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
const paper = {
  id: 'p1',
  title: '滑动测试卷',
  subject: '数学',
  createdAt: 1,
  lastResult: null,
  questions: [
    { id: 'q1', question: '1+1=?', options: ['1', '2', '3', '4'], answer: 'B', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q2', question: '2+2=?', options: ['2', '3', '4', '5'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q3', question: '3+3=?', options: ['3', '5', '6', '7'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' }
  ]
};
const storage = {};
storage[KEY] = JSON.stringify({ papers: [paper], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {} });

const ctx = loadApp(storage);
ctx.__run(`startPaper('p1', false);`); // renderPractice -> showView('practice')
assert.strictEqual(ctx.__run('currentView'), 'practice', 'should be in practice view');
assert.strictEqual(ctx.__run('session.index'), 0, 'starts at 0');

// 向右滑 -> 下一题
assert.strictEqual(ctx.__run('handlePracticeSwipe(90, 4)'), true, 'right swipe handled');
assert.strictEqual(ctx.__run('session.index'), 1, 'right swipe goes to next question');

// 向左滑 -> 上一题
assert.strictEqual(ctx.__run('handlePracticeSwipe(-90, 4)'), true, 'left swipe handled');
assert.strictEqual(ctx.__run('session.index'), 0, 'left swipe goes to previous question');

// 第一题再向左滑：保持不变
ctx.__run('handlePracticeSwipe(-90, 4)');
assert.strictEqual(ctx.__run('session.index'), 0, 'no previous beyond first question');

// 短横滑 / 竖滑：不触发切题
assert.strictEqual(ctx.__run('handlePracticeSwipe(20, 5)'), false, 'short swipe ignored');
assert.strictEqual(ctx.__run('handlePracticeSwipe(10, 120)'), false, 'vertical swipe ignored');
assert.strictEqual(ctx.__run('session.index'), 0, 'index unchanged after ignored swipes');

// 最后一题未作答时向右滑：不进入报告
ctx.__run('goToQuestion(2);');
assert.strictEqual(ctx.__run('session.index'), 2, 'on last question');
ctx.__run('handlePracticeSwipe(90, 4)');
assert.strictEqual(ctx.__run('session.index'), 2, 'last unanswered question does not jump to report');
assert.strictEqual(ctx.__run('currentView'), 'practice', 'still practice view');

// 作答最后一题后向右滑：进入答题报告
ctx.__run(`session.answers[2] = { selected: 'C' }; submitCurrentAnswer();`);
ctx.__run('handlePracticeSwipe(90, 4)');
assert.strictEqual(ctx.__run('currentView'), 'report', 'right swipe after finishing last question opens report');

// 报告界面：滑动不应再切题
assert.strictEqual(ctx.__run('handlePracticeSwipe(-90, 4)'), false, 'swipe disabled outside practice view');

console.log('PASS test-swipe');
