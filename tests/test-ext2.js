const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./harness');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// 1) 悬浮：只保留上一题，报告页有返回按钮
assert.ok(!html.includes('id="floatNext"'), '已移除下一题悬浮按钮');
assert.ok(html.includes('id="floatPrev"') && html.includes('id="floatBack"'), '保留上一题与返回试卷库悬浮按钮');
assert.ok(app.includes('backToPapersFromFloat'), '含报告页返回逻辑');

// 2) 语速三档
assert.ok(html.includes('speechRateSelect'), '含语速选择器');
assert.ok(app.includes('getSpeechRate') && app.includes('setSpeechRate'), '含语速读写逻辑');
const ctx = loadApp({});
ctx.__run("setSpeechRate('1.35');");
assert.strictEqual(ctx.__run('getSpeechRate()'), 1.35, '快速语速可保存');

// 3) 荧光标记渲染
const mark = ctx.__run("renderHighlightedQuestion('苹果和香蕉', [{text:'香蕉'}])");
assert.ok(mark.includes('<mark class="exam-highlight">香蕉</mark>'), '选中文字会渲染荧光标记');

// 4) 笔记本
ctx.__run("ensureNotes(); db.notes.unshift({id:'n1',text:'重点片段',remark:'记住',createdAt:1}); renderNotes();");
const notesHtml = ctx.__run("document.querySelector('#view-notes').innerHTML");
assert.ok(notesHtml.includes('重点片段') && notesHtml.includes('记住'), '笔记内容与备注可显示');
ctx.__run("removeNote('n1');");
assert.strictEqual(ctx.__run('db.notes.length'), 0, '笔记可删除');

// 5) 元数据：考试类型/试卷类型
const text = ['考试类型：注册城乡规划师考试','试卷类型：2026年模拟题','2026年考试《法规》试题','1. 1+1=?','A. 1','B. 2','答案：B'].join('\n');
const parsed = ctx.__run('parseAuto(' + JSON.stringify(text) + ', "m")');
assert.strictEqual(parsed.papers[0].examMeta.examType, '注册城乡规划师考试', '考试类型识别');
assert.strictEqual(parsed.papers[0].examMeta.paperType, '2026年模拟题', '试卷类型识别');

// 6) 题型扩展与 1）编号
const text2 = ['2026年考试《Z》试题','1）1+1=?','A. 1','B. 2','答案：B','【材料题】请分析材料','答案：见解析','解析：材料解析'].join('\n');
const parsed2 = ctx.__run('parseAuto(' + JSON.stringify(text2) + ', "z")');
assert.strictEqual(parsed2.papers[0].questions[0].type, 'single', '1）选择题识别');
assert.ok(parsed2.papers[0].questions.some(q => q.type === 'text' && q.typeLabel.includes('材料')), '材料题识别为文字题');

console.log('PASS test-ext2');
