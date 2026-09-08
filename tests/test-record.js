const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
const paper = {
  id: 'p1',
  title: '记录测试卷',
  subject: '数学',
  createdAt: 1,
  lastResult: null,
  questions: [
    { id: 'q1', question: '1+1=?', options: ['1', '2', '3', '4'], answer: 'B', analysis: '基础加法', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q2', question: '2+2=?', options: ['2', '3', '4', '5'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q3', question: '3+3=?', options: ['3', '5', '6', '7'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' }
  ]
};
const storage = {};
storage[KEY] = JSON.stringify({ papers: [paper], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {} });
const clearAuto = "if (session && session._autoTimer) { clearTimeout(session._autoTimer); session._autoTimer = null; }";

const ctx = loadApp(storage);
ctx.__run(`startPaper('p1', false);`);
ctx.__run(`session.answers[0] = { selected: 'B' }; submitCurrentAnswer(); ${clearAuto}`);
ctx.__run('nextQuestion();');
ctx.__run(`session.answers[1] = { selected: 'B' }; submitCurrentAnswer(); ${clearAuto}`);
ctx.__run('nextQuestion();');
ctx.__run(`session.answers[2] = { selected: 'C' }; submitCurrentAnswer(); ${clearAuto}`);
ctx.__run('nextQuestion();');
assert.strictEqual(ctx.__run('currentView'), 'report', '完成并进入报告');

// 完成后：整份答题记录已保存（内部），只有“重新答题”才清空
const rec = ctx.__run('db.papers[0].lastRecord');
assert.ok(rec, '完成后应保存 lastRecord');
assert.strictEqual(rec.total, 3, '记录含总题数');
assert.strictEqual(rec.correct, 2, '答对 2');
assert.strictEqual(rec.wrong, 1, '答错 1');
assert.strictEqual(rec.answers.length, 3, '每题一条记录');
assert.strictEqual(rec.answers[1].correct, false, '第2题记为答错');

// 试卷库卡片（方案乙）：主按钮=开始刷题，旁边=重新答题，无“上次记录”按钮
ctx.__run('renderPapers();');
let html = ctx.__run("document.querySelector('#view-papers').innerHTML");
assert.ok(html.includes('>开始刷题<'), '主按钮为开始刷题');
assert.ok(html.includes('重新答题'), '旁边提供重新答题');
assert.ok(!html.includes('上次记录'), '不再显示“上次记录”按钮');
assert.ok(html.includes('✅ 已完成'), '标记已完成');

// “开始刷题”不删除旧记录（模拟点开始后记录仍在）
ctx.__run(`startPaper('p1', false); ${clearAuto}`);
assert.ok(ctx.__run('db.papers[0].lastRecord'), '开始刷题不清空旧记录');

// 只有“重新答题”才清空
ctx.__run("clearPaperRecord('p1'); clearPaperProgress('p1'); renderPapers();");
assert.strictEqual(ctx.__run('db.papers[0].lastRecord'), undefined, '重新答题后清除 lastRecord');
assert.strictEqual(ctx.__run('db.papers[0].lastResult'), null, '重新答题后清除 lastResult');
html = ctx.__run("document.querySelector('#view-papers').innerHTML");
assert.ok(!html.includes('重新答题'), '清空后不再显示重新答题');
assert.ok(html.includes('>开始刷题<'), '回到开始刷题');
ctx.__run(clearAuto);
console.log('PASS test-record');
