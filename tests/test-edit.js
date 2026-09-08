const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
const paper = {
  id: 'p1',
  title: '修改答案卷',
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
storage[KEY] = JSON.stringify({ papers: [paper], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] });
const clearAuto = "if (session && session._autoTimer) { clearTimeout(session._autoTimer); session._autoTimer = null; }";

const ctx = loadApp(storage);
ctx.__run("startPaper('p1', false);");
ctx.__run("session.answers[0] = { selected: 'B' }; submitCurrentAnswer(); " + clearAuto);
ctx.__run('nextQuestion();');
ctx.__run("session.answers[1] = { selected: 'B' }; submitCurrentAnswer(); " + clearAuto);
ctx.__run('nextQuestion();');
ctx.__run("session.answers[2] = { selected: 'C' }; submitCurrentAnswer(); " + clearAuto);
ctx.__run('nextQuestion();');
assert.strictEqual(ctx.__run('currentView'), 'report', '完成进入报告');
let rh = ctx.__run("document.querySelector('#view-report').innerHTML");
assert.ok(rh.includes('继续答题修改'), '报告页提供“继续答题修改”');

// 报告 -> 继续答题：回到第一道错题（q2）
ctx.__run('continuePractice();');
assert.strictEqual(ctx.__run('currentView'), 'practice', '回到答题');
assert.strictEqual(ctx.__run('session.index'), 1, '跳到第一道错题 q2');
assert.strictEqual(ctx.__run('session.answers[1].correct'), false, 'q2 仍是错');

// 已提交的题：点击“修改本题答案”后可改
ctx.__run('goToQuestion(0);');
let ph = ctx.__run("document.querySelector('#view-practice').innerHTML");
assert.ok(ph.includes('修改本题答案'), '已答题提供修改按钮');
assert.strictEqual(ctx.__run('session.answers[0].submitted'), true, 'q1 已提交');
ctx.__run('editCurrentAnswer();');
assert.strictEqual(ctx.__run('session.answers[0].submitted'), false, '修改后进入可作答状态');

// 把 q1 从“对”改成“错”
ctx.__run("session.answers[0] = { selected: 'A' }; submitCurrentAnswer(); " + clearAuto);
assert.strictEqual(ctx.__run('session.answers[0].correct'), false, 'q1 改为答错');
assert.strictEqual(ctx.__run("db.wrongBook.some((w) => w.paperId === 'p1' && w.questionId === 'q1')"), true, '改错后进错题集');

// 把 q2 从“错”改成“对”：错题集同步移除
ctx.__run('goToQuestion(1); editCurrentAnswer();');
ctx.__run("session.answers[1] = { selected: 'C' }; submitCurrentAnswer(); " + clearAuto);
assert.strictEqual(ctx.__run('session.answers[1].correct'), true, 'q2 改为答对');
assert.strictEqual(ctx.__run("db.wrongBook.some((w) => w.paperId === 'p1' && w.questionId === 'q2')"), false, '改对后从错题集移除');

// 修改后进度已保存
const saved = JSON.parse(storage[KEY]);
assert.strictEqual(saved.progress.p1.answers[0].correct, false, '进度保存了修改后的 q1');
assert.strictEqual(saved.progress.p1.answers[1].correct, true, '进度保存了修改后的 q2');
ctx.__run(clearAuto);
console.log('PASS test-edit');
