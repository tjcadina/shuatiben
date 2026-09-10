const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./harness');

// 静态：上传提示文案已更新
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(html.includes('模拟卷不要有重复的题型'), '提示文案含“模拟卷不要有重复的题型”');
assert.ok(html.includes('floatNextToggle'), '显示设置含悬浮按钮开关');

const KEY = 'shuatiben_v1';
function q(id, type) {
  return { id, question: 'q' + id, options: ['A', 'B', 'C', 'D'], answer: 'A', analysis: '', type: type || 'single', typeLabel: type === 'single' ? '单选题' : '多选题', subject: '数学' };
}
const mkPaper = (id, title, subject, questions) => ({ id, title, subject, createdAt: 1, lastResult: null, questions });

// 计分工具：满分 100，题型统计正确
const ctx = loadApp({});
const sc = ctx.__run('buildScoring([{q:{type:"single"}},{q:{type:"single"}},{q:{type:"judge"}},{q:{type:"judge"}},{q:{type:"text"}}])');
assert.strictEqual(sc.perIndex.reduce((a, b) => a + b, 0), 100, '分值总和=100');
assert.strictEqual(sc.perType['单选题'], 2, '单选题 2 道');
assert.strictEqual(sc.perType['判断题'], 2, '判断题 2 道');

// 试卷开始即显示计分条
const storage = {};
const paper = mkPaper('p1', '置顶测试A', '数学', [q('a1'), q('a2')]);
storage[KEY] = JSON.stringify({ papers: [paper], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] });
const ctx2 = loadApp(storage);
ctx2.__run("startPaper('p1', false);");
let ph = ctx2.__run("document.querySelector('#view-practice').innerHTML");
assert.ok(ph.includes('满分 100 分'), '答题页显示计分标准');
assert.ok(ph.includes('分'), '每题显示分值');

// 悬浮“下一题”开关
assert.strictEqual(ctx2.__run('isFloatNext()'), true, '默认开启悬浮按钮');
ctx2.__run('setFloatNext(false);');
assert.strictEqual(ctx2.__run('isFloatNext()'), false, '可关闭');
assert.strictEqual(ctx2.__storage['shuatiben_floatnext'], '0', '设置已保存');
ctx2.__run('setFloatNext(true);');

// 最近刷题置顶：同一科目内，最后刷的试卷排前
const paperB = mkPaper('pB', '置顶测试B（后刷）', '数学', [q('b1'), q('b2')]);
ctx2.__run("db.papers.push(" + JSON.stringify(paperB) + ");");
ctx2.__run("db.papers.find(p=>p.id==='pB').lastOpenedAt = 9999; db.papers.find(p=>p.id==='p1').lastOpenedAt = 100; renderPapers();");
let papersHtml = ctx2.__run("document.querySelector('#view-papers').innerHTML");
assert.ok(papersHtml.indexOf('置顶测试B（后刷）') < papersHtml.indexOf('置顶测试A'), '后刷试卷置顶');

// 备份 JSON 含进度
ctx2.__run("db.progress.p1 = { mode:'paper', title:'t', index:1, answers:[null,{submitted:true}], total:2, updatedAt: 5 }; generateBackup();");
const backup = JSON.parse(ctx2.__run("document.querySelector('#backupTextarea').value"));
assert.ok(backup.progress && backup.progress.p1, '备份含进度');
assert.ok(backup.papers.length >= 2, '备份含试卷');
// 静态：手机菜单手动折叠按钮存在
assert.ok(html.includes('id="menuToggle"'), '含菜单折叠按钮');

// 顶部科目下拉选择器
const ctx3 = loadApp(storage);
ctx3.__run('renderPapers();');
let lh = ctx3.__run("document.querySelector('#view-papers').innerHTML");
assert.ok(lh.includes('paperSubjectFilter'), '试卷库含科目下拉');
assert.ok(lh.includes('全部科目'), '含“全部科目”项');
ctx3.__run("paperSubjectFilter = '数学'; renderPapers();");
let fh3 = ctx3.__run("document.querySelector('#view-papers').innerHTML");
assert.ok(fh3.includes('置顶测试B（后刷）') || fh3.includes('置顶测试A'), '按科目筛选仍有该科目试卷');
ctx3.__run("paperSubjectFilter = 'all'; renderPapers();");

// 悬浮下一题开启时：不渲染内联“下一题”；关闭后恢复
ctx3.__run("startPaper('p1', false); session.answers[0] = { selected: 'A' }; submitCurrentAnswer(); if (session._autoTimer) { clearTimeout(session._autoTimer); session._autoTimer = null; }");
let vp = ctx3.__run("document.querySelector('#view-practice').innerHTML");
assert.ok(!vp.includes('id="nextQuestion"'), '开启悬浮时隐藏内联下一题');
ctx3.__run('setFloatNext(false);');
vp = ctx3.__run("document.querySelector('#view-practice').innerHTML");
assert.ok(vp.includes('id="nextQuestion"'), '关闭悬浮时恢复内联下一题');
ctx3.__run('setFloatNext(true);');

// 文件导入：支持选择 .json 上传到本页导入（手机->电脑 互通）
assert.ok(html.includes('backupFileBtn'), '含“选择 .json 文件导入”按钮');
const backupDoc = JSON.stringify({ papers:[{ id:'x1', title:'导入卷', subject:'数学', createdAt:1, questions:[{id:'xq',question:'1?',options:['A','B'],answer:'A',analysis:'',type:'single',typeLabel:'单选题',subject:'数学'}] }], wrongBook:[], favorites:[{id:'f1',paperId:'x1',subject:'数学',questionId:'xq',question:{id:'xq',question:'1?',options:[],answer:'A'}}], progress:{ x1:{ mode:'paper', index:0, answers:[null], total:1, updatedAt:1 } } });
const importCtx = loadApp(storage);
assert.ok(importCtx.__run('runImportBackup(' + JSON.stringify(backupDoc) + ')') === true, '文件内容可导入');
assert.strictEqual(importCtx.__run('db.papers[0].id'), 'x1', '导入后试卷替换');
assert.strictEqual(importCtx.__run('db.favorites.length'), 1, '导入后收藏恢复');
assert.ok(importCtx.__run('db.progress.x1'), '导入后进度恢复');

// 微信端：备份提示与“复制优先”逻辑存在
assert.ok(!html.includes('backup-warn'), '首页不再显示大段微信提醒横幅');
assert.ok(html.includes('请用系统浏览器'), '数据传输页保留一句简短小提示');
assert.ok(!html.includes('browserNotice'), '已移除页面级横幅元素');
const appSrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
assert.ok(appSrc.includes('isWeChat'), '含微信环境判断');
assert.ok(appSrc.includes('请勿在微信内导出'), '微信内导出被拦截并提示');

// 手机界面分组：数据传输/模式/显示
for (const k of ['transferPanel', 'modePanel', 'displayPanel']) {
  assert.ok(html.includes('id="' + k + '"'), '含分组面板 ' + k);
}
assert.ok(html.includes('>📤 数据传输<') || html.includes('📤 数据传输'), '含数据传输分组');
assert.ok(html.includes('>🎨 模式<') || html.includes('🎨 模式'), '含模式分组');
assert.ok(html.includes('>🛠 显示<') || html.includes('🛠 显示'), '含显示分组');

// 分段传输纯函数：切分/加头/解析/重组无损
const sctx = loadApp({});
assert.strictEqual(JSON.stringify(sctx.__run('splitEvery("abcdef", 2)')), JSON.stringify(['ab','cd','ef']), '分段正确');
const payload = JSON.stringify({ papers: [{ title: '卷A', questions: [] }], favorites: [] });
const segs = sctx.__run('splitEvery(' + JSON.stringify(payload) + ', 50)');
let recv = '';
segs.forEach((part, i) => {
  const txt = sctx.__run('makeSegText(' + i + ',' + segs.length + ',' + JSON.stringify(part) + ')');
  const p = sctx.__run('parseSegText(' + JSON.stringify(txt) + ')');
  recv += p.body;
});
assert.strictEqual(recv, payload, '分段发送->重组后与原文一致');

// 一次性粘贴全部“分段”到导入框：自动拼接后也能导入
const payload2 = JSON.stringify({ papers: [{ id: 's1', title: '分段卷', subject: '数学', createdAt: 1, questions: [] }], favorites: [] });
const segs2 = sctx.__run('splitEvery(' + JSON.stringify(payload2) + ', 30)');
let pastedAll = '';
segs2.forEach((part, i) => { pastedAll += sctx.__run('makeSegText(' + i + ',' + segs2.length + ',' + JSON.stringify(part) + ')'); });
const joined2 = sctx.__run('tryAssembleSegments(' + JSON.stringify(pastedAll) + ')');
assert.strictEqual(joined2, payload2, '整段粘贴自动拼接');
const imp2 = loadApp(storage);
assert.ok(imp2.__run('runImportBackup(' + JSON.stringify(pastedAll) + ')') === true, '多段整贴也能导入');
assert.strictEqual(imp2.__run('db.papers[0].id'), 's1', '导入成功');

assert.ok(html.includes('backupDownloadBtn'), '含导出/下载按钮');
assert.ok(appSrc.includes('function checkBackupText'), '含内容自检逻辑');

// 单套卷子（小数据）复制粘贴：导入时并入、不覆盖本机其它数据
const single = JSON.stringify({ v: 1, mode: 'paper', paper: { id: 'w1', title: '微信传过来的卷', subject: '数学', createdAt: 3, questions: [{ id: 'wq', question: 'x?', options: ['A','B'], answer: 'A', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' }] } });
const stLocal = {};
stLocal[KEY] = JSON.stringify({ papers: [mkPaper('p1', '本机原有卷', '数学', [q('keep')])], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] });
const sctx2 = loadApp(stLocal);
const before = sctx2.__run('db.papers.length');
assert.ok(sctx2.__run('runImportBackup(' + JSON.stringify(single) + ')') === true, '单卷导入成功');
assert.strictEqual(sctx2.__run('db.papers.length'), before + 1, '新增一套');
assert.ok(sctx2.__run('db.papers.some(p=>p.id==="w1")'), '单卷已加入');
assert.ok(sctx2.__run('db.papers.some(p=>p.id==="p1")'), '本机原有试卷未被覆盖');
// 同 id 重复导入：更新而非追加
sctx2.__run('runImportBackup(' + JSON.stringify(single) + ')');
assert.strictEqual(sctx2.__run('db.papers.length'), before + 1, '同 id 不重复添加');

// 迁移链接（微信→浏览器）：按钮与逻辑存在
assert.ok(fs.existsSync(path.join(__dirname, '..', 'vendor/lz-string.min.js')), '压缩组件存在');
assert.ok(html.includes('genLinkBtn'), '含迁移链接按钮');
assert.ok(appSrc.includes('genTransferLink') && appSrc.includes('tryImportFromHash'), '含迁移链接逻辑');

// 悬浮按钮常驻：未作答时点击提示；作答后可前进/后退
const stFloat = {};
stFloat[KEY] = JSON.stringify({ papers: [mkPaper('pf', '悬浮卷', '数学', [q('f1'), q('f2')])], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] });
const fx = loadApp(stFloat);
fx.__run("startPaper('pf', false);");
fx.__run('clickFloatNext();');
assert.ok(fx.__run("document.querySelector('#toast').textContent").includes('请先作答'), '未作答点击悬浮下一题有提示');
fx.__run("session.answers[0] = { selected: 'A' }; submitCurrentAnswer(); if (session._autoTimer) { clearTimeout(session._autoTimer); session._autoTimer = null; } clickFloatNext();");
assert.strictEqual(fx.__run('session.index'), 1, '作答后悬浮下一题可前进');
fx.__run('clickFloatPrev();');
assert.strictEqual(fx.__run('session.index'), 0, '悬浮上一题可后退');
fx.__run('clickFloatPrev();');
assert.ok(fx.__run("document.querySelector('#toast').textContent").includes('第一题'), '第一题再上一题有提示');

// 悬浮按钮：缓存版本号 + 位置越界校正
assert.ok(html.includes('app.js?v='), 'JS 带版本号防缓存');
assert.ok(appSrc.includes('clampFloatPos') && appSrc.includes('bindFloatResize'), '悬浮按钮位置会校正');

console.log('PASS test-extra');
