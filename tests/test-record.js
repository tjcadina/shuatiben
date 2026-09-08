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
ctx.__run('nextQuestion();'); // 完成并进入报告
assert.strictEqual(ctx.__run('currentView'), 'report', '完成并进入报告');

// B 版：查看报告无副作用——不结束本轮、不写记录、不清进度
assert.ok(ctx.__run('db.progress.p1'), '查看报告后本轮进度仍保留');
assert.strictEqual(ctx.__run('db.papers[0].lastRecord'), undefined, '查看报告不保存 lastRecord');
assert.strictEqual(ctx.__run('db.papers[0].lastResult'), null, '查看报告不更新 lastResult');

// 卡片状态：本轮已答完 -> 主按钮=查看报告，旁边=重新开始
ctx.__run('renderPapers();');
let html = ctx.__run("document.querySelector('#view-papers').innerHTML");
assert.ok(html.includes('查看报告'), '已答完未结束时主按钮为查看报告');
assert.ok(html.includes('重新开始'), '旁边提供重新开始');
assert.ok(html.includes('本轮已答完'), '标记本轮已答完');
assert.ok(!html.includes('>开始刷题<'), '此时不显示开始刷题');

// 再次点主按钮（查看报告）：仍只打开报告，不结束本轮、不存档
ctx.__run(`startPaper('p1', false);`);
assert.strictEqual(ctx.__run('currentView'), 'report', '再次进入报告');
assert.ok(ctx.__run('db.progress.p1'), '再次查看报告后进度仍保留');
assert.strictEqual(ctx.__run('db.papers[0].lastRecord'), undefined, '再次查看报告仍不存档');

// 点“重新开始”：本轮结束 → 存档 + 清进度 + 开新一轮
ctx.__run("finalizeAndRestartPaper('p1');");
const rec = ctx.__run('db.papers[0].lastRecord');
assert.ok(rec, '重新开始时本轮存档为 lastRecord');
assert.strictEqual(rec.total, 3, '记录总题数 3');
assert.strictEqual(rec.correct, 2, '答对 2');
assert.strictEqual(rec.wrong, 1, '答错 1');
assert.strictEqual(rec.answers.length, 3, '每题一条记录');
assert.strictEqual(rec.answers[1].correct, false, '第2题答错已记录');
assert.strictEqual(ctx.__run('db.papers[0].lastResult.accuracy'), 67, 'lastResult 更新为 67%');
const newProg = ctx.__run('db.progress.p1');
assert.ok(newProg && !newProg.answers.some((a) => a && a.submitted), '新一轮进度已重置（无已提交答案）');
assert.strictEqual(ctx.__run('currentView'), 'practice', '重新开始后进入新一轮作答');
ctx.__run(clearAuto);
console.log('PASS test-record');
