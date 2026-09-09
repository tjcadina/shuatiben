const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
const paper = {
  id: 'p1', title: '滑动测试卷', subject: '数学', createdAt: 1, lastResult: null,
  questions: [
    { id: 'q1', question: '1+1=?', options: ['1', '2', '3', '4'], answer: 'B', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q2', question: '2+2=?', options: ['2', '3', '4', '5'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q3', question: '3+3=?', options: ['3', '5', '6', '7'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' }
  ]
};
const storage = {};
storage[KEY] = JSON.stringify({ papers: [paper], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] });
const clearAuto = "if (session && session._autoTimer) { clearTimeout(session._autoTimer); session._autoTimer = null; }";

const ctx = loadApp(storage);
ctx.__run("startPaper('p1', false);");
assert.strictEqual(ctx.__run('currentView'), 'practice');
assert.strictEqual(ctx.__run('session.index'), 0, 'starts at 0');

// 左滑 -> 下一题
assert.strictEqual(ctx.__run('handlePracticeSwipe(-90, 4)'), true);
assert.strictEqual(ctx.__run('session.index'), 1, 'left swipe next');
// 右滑 -> 上一题
assert.strictEqual(ctx.__run('handlePracticeSwipe(90, 4)'), true);
assert.strictEqual(ctx.__run('session.index'), 0, 'right swipe prev');

// 第一题右滑 -> 退出刷题
ctx.__run('handlePracticeSwipe(90, 4)');
assert.strictEqual(ctx.__run('session'), null, 'first-question right swipe exits');
assert.strictEqual(ctx.__run('currentView'), 'papers', 'back to papers view');

// 重新开始，继续验证其余手势
ctx.__run("startPaper('p1', false);");
assert.strictEqual(ctx.__run('handlePracticeSwipe(20, 5)'), false, 'short swipe ignored');
assert.strictEqual(ctx.__run('handlePracticeSwipe(10, 120)'), false, 'vertical swipe ignored');
assert.strictEqual(ctx.__run('session.index'), 0, 'index unchanged after ignored swipes');

// 最后一题未作答时左滑：不进入报告
ctx.__run('goToQuestion(2);');
ctx.__run('handlePracticeSwipe(-90, 4)');
assert.strictEqual(ctx.__run('session.index'), 2, 'last unanswered stays');
assert.strictEqual(ctx.__run('currentView'), 'practice');

// 作答最后一题后左滑：进入答题报告
ctx.__run("session.answers[2] = { selected: 'C' }; submitCurrentAnswer(); " + clearAuto);
ctx.__run('handlePracticeSwipe(-90, 4)');
assert.strictEqual(ctx.__run('currentView'), 'report', 'left swipe last answered opens report');
// 报告界面：滑动不再切题
assert.strictEqual(ctx.__run('handlePracticeSwipe(-90, 4)'), false, 'swipe disabled outside practice');
console.log('PASS test-swipe');
