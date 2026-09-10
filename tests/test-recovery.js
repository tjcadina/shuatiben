const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
const paper = { id: 'p1', title: '可恢复卷', subject: '数学', createdAt: 1, lastResult: null, questions: [{ id: 'q1', question: '1+1?', options: ['1','2'], answer: 'B', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' }] };
const wrong = { id: 'w1', paperId: 'p1', paperTitle: '可恢复卷', subject: '数学', questionId: 'q1', question: paper.questions[0], wrongCount: 1, lastWrongAt: 1 };
const storage = {};
storage[KEY] = JSON.stringify({ papers: [paper], wrongBook: [wrong], progress: { p1: { mode: 'paper', title: '可恢复卷', index: 0, answers: [null], total: 1, updatedAt: 2 } }, deletedPapers: ['p1'], deletedWrong: ['w1'], clearedProgress: {}, favorites: [], trash: [] });
const ctx = loadApp(storage);

// 删除 -> 记录到回收站（模拟删除流程的前置记录 + 移除）
ctx.__run("recordTrash('p1'); db.papers = db.papers.filter(p=>p.id!=='p1'); db.wrongBook = db.wrongBook.filter(w=>w.paperId!=='p1'); delete db.progress.p1;");
assert.strictEqual(ctx.__run('db.trash.length'), 1, '删除后进回收站');
assert.strictEqual(ctx.__run('db.papers.length'), 0, '试卷已从主列表移除');

// 恢复 -> 试卷、错题、进度、墓碑一并恢复
const tid = ctx.__run('db.trash[0].id');
ctx.__run('restoreTrash(' + JSON.stringify(tid) + ');');
assert.strictEqual(ctx.__run('db.papers.length'), 1, '试卷已恢复');
assert.strictEqual(ctx.__run('db.wrongBook.length'), 1, '错题已恢复');
assert.ok(ctx.__run('db.progress.p1'), '进度已恢复');
assert.strictEqual(ctx.__run('db.trash.length'), 0, '恢复后回收站清空');
assert.strictEqual(ctx.__run('db.deletedPapers.includes("p1")'), false, '试卷墓碑已移除');

// 24 小时过期自动清理
ctx.__run("recordTrash('p1'); db.trash[0].deletedAt = Date.now() - 25*3600*1000; pruneTrash();");
assert.strictEqual(ctx.__run('db.trash.length'), 0, '超过24小时自动清理');

console.log('PASS test-recovery');
