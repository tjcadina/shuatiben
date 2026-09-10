const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
function paperObj(id, title, questions) {
  return { id, title, subject: '数学', createdAt: 1, lastResult: null, examMeta: { time: '90 分钟', fullScore: '100 分', passLine: '60 分', basis: '历年真题' }, questions };
}
const q = (id, ans) => ({ id, question: 'Q' + id, options: ['A', 'B', 'C', 'D'], answer: ans || 'A', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' });
const storage = {};
storage[KEY] = JSON.stringify({ papers: [paperObj('p1', '须知卷', [q('1'), q('2'), q('3')])], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] });
const ctx = loadApp(storage);

// 1) 上一题悬浮按钮 + 上一题函数
assert.strictEqual(ctx.__run("typeof prevQuestion === 'function'"), true, '含上一题函数');
ctx.__run("startPaper('p1', false); goToQuestion(1);");
assert.strictEqual(ctx.__run('session.index'), 1);
ctx.__run('prevQuestion();');
assert.strictEqual(ctx.__run('session.index'), 0, '悬浮上一题可回到上一题');

// 6) 每题分值显示在题目后面
ctx.__run('goToQuestion(1);');
const ph = ctx.__run("document.querySelector('#view-practice').innerHTML");
assert.ok(ph.includes('（本题') && ph.includes('分）'), '题目后显示本题分值');

// 5) 考试须知：标题/字段齐全，开始后进入答题
ctx.__run("showExamInfo('p1');");
const info = ctx.__run("document.querySelector('#examInfoBody').innerHTML");
for (const label of ['考试说明', '考试科目', '考试时间', '试卷满分', '合格标准', '题型与计分', '命题依据说明']) {
  assert.ok(info.includes(label), '须知含：' + label);
}
assert.ok(info.includes('90 分钟') && info.includes('历年真题'), '须知使用试卷元信息');
ctx.__run('startExamNow();');
assert.strictEqual(ctx.__run('currentView'), 'practice', '须知页可开始作答');

// 2/3/4) 解析识别：答案/解析标签容错 + 后置答案按题号对应 + 考试…试题切分
const text = [
  '2026年注册城乡规划师考试《城乡规划管理与法规》模拟试题',
  '考试时间：90分钟',
  '满分：100分',
  '合格标准：60分',
  '1. 1+1=?',
  'A. 1',
  'B. 2',
  '"答案"：B',
  '【解析】基础加法',
  '2. 2+2=?',
  'A. 2',
  'B. 3',
  'C. 4',
  'D. 5',
  '参考答案及解析',
  '1. B',
  '解析：第一题解析',
  '2. C',
  '【解析】第二题解析',
  '2026年注册城乡规划师考试《城乡规划实务》试题',
  '1. 3+3=?',
  'A. 5',
  'B. 6',
  '答案：B',
  '解析：加法'
].join('\n');
const parsed = ctx.__run('parseAuto(' + JSON.stringify(text) + ', "上传文件名")');
assert.strictEqual(parsed.papers.length, 2, '“考试…试题”识别为下一套试卷');
assert.strictEqual(parsed.papers[0].questions[0].answer, 'B', '“答案”带引号可识别');
assert.ok(parsed.papers[0].questions[0].analysis.includes('基础加法'), '【解析】可识别');
assert.strictEqual(parsed.papers[0].questions[1].answer, 'C', '后置答案按题号对应');
assert.ok(parsed.papers[0].questions[1].analysis.includes('第二题解析'), '后置解析按题号对应');
assert.strictEqual(parsed.papers[0].examMeta.time, '90分钟', '解析考试时间元信息');
assert.strictEqual(parsed.papers[1].title.includes('城乡规划实务'), true, '第二套试卷标题正确');

// 包含“解析”两字即视为解析（本题解析 / 答案解析 / 【解析】）
const text2 = ['2026年考试《B》试题','1. 1+1=?','A. 1','B. 2','答案：B','本题解析：因为 1+1=2','2. 2+2=?','A. 2','B. 3','C. 4','答案：C','答案解析说明一下：2+2=4'].join('\n');
const parsed2 = ctx.__run('parseAuto(' + JSON.stringify(text2) + ', "f2")');
assert.ok(parsed2.papers[0].questions[0].analysis.includes('1+1=2'), '本题解析 被识别');
assert.ok(parsed2.papers[0].questions[1].analysis.includes('2+2=4'), '答案解析说明 被识别');

// 〖解析〗/〖答案〗 也能识别
const text3 = ['2026年考试《C》试题','1. 1+1=?','A. 1','B. 2','〖答案〗：B','〖解析〗因为 1+1=2'].join('\n');
const parsed3 = ctx.__run('parseAuto(' + JSON.stringify(text3) + ', "f3")');
assert.strictEqual(parsed3.papers[0].questions[0].answer, 'B', '〖答案〗可识别');
assert.ok(parsed3.papers[0].questions[0].analysis.includes('1+1=2'), '〖解析〗可识别');

// 〖参考答案〗单独一行、答案在下一行
const text4 = ['2026年考试《D》试题','1. 1+1=?','A. 1','B. 2','〖参考答案〗','B','〖解析〗','因为 1+1=2','2. 2+2=?','A. 2','B. 3','C. 4','〖参考答案〗：C'].join('\n');
const parsed4 = ctx.__run('parseAuto(' + JSON.stringify(text4) + ', "f4")');
assert.strictEqual(parsed4.papers[0].questions[0].answer, 'B', '单独一行〖参考答案〗+下一行答案');
assert.ok(parsed4.papers[0].questions[0].analysis.includes('1+1=2'), '紧随的〖解析〗可识别');
assert.strictEqual(parsed4.papers[0].questions[1].answer, 'C', '〖参考答案〗：C 可识别');

// 后置答案区仍正常：参考答案（单独一行）+ 1. B / 2. C
const text5 = ['2026年考试《E》试题','1. 1+1=?','A. 1','B. 2','2. 2+2=?','A. 2','B. 3','C. 4','参考答案','1. B','解析：第一题','2. C','解析：第二题'].join('\n');
const parsed5 = ctx.__run('parseAuto(' + JSON.stringify(text5) + ', "f5")');
assert.strictEqual(parsed5.papers[0].questions[0].answer, 'B', '后置答案区第1题');
assert.strictEqual(parsed5.papers[0].questions[1].answer, 'C', '后置答案区第2题');

// 每道题后面紧跟的答案/解析优先于文末答案区
const text6 = ['2026年考试《F》试题','1. 1+1=?','A. 1','B. 2','答案：B','解析：紧跟解析','2. 2+2=?','A. 2','B. 3','C. 4','答案：C','解析：紧跟第二题','参考答案及解析','1. A','解析：文末解析一','2. B','解析：文末解析二'].join('\n');
const parsed6 = ctx.__run('parseAuto(' + JSON.stringify(text6) + ', "f6")');
assert.strictEqual(parsed6.papers[0].questions[0].answer, 'B', '紧跟答案优先于文末答案');
assert.strictEqual(parsed6.papers[0].questions[0].analysis, '紧跟解析', '紧跟解析优先于文末解析');
assert.strictEqual(parsed6.papers[0].questions[1].answer, 'C', '第二题紧跟答案优先');
assert.strictEqual(parsed6.papers[0].questions[1].analysis, '紧跟第二题', '第二题紧跟解析优先');

// 答案 与 参考答案 等价
const text7 = ['2026年考试《G》试题','1. 1+1=?','A. 1','B. 2','参考答案：B','2. 2+2=?','A. 2','B. 3','C. 4','答案：C'].join('\n');
const parsed7 = ctx.__run('parseAuto(' + JSON.stringify(text7) + ', "f7")');
assert.strictEqual(parsed7.papers[0].questions[0].answer, 'B', '参考答案=答案');
assert.strictEqual(parsed7.papers[0].questions[1].answer, 'C', '答案=参考答案');

console.log('PASS test-exam');
