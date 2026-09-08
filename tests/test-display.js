const assert = require('assert');
const { loadApp } = require('./harness');

const FS_KEY = 'shuatiben_fontscale';
const FF_KEY = 'shuatiben_fontfamily';

// 默认：字号 1、字体 default
const ctx = loadApp({});
assert.strictEqual(ctx.__run('fontScale'), 1, 'default font scale 1');
assert.strictEqual(ctx.__run('fontFamilyName'), 'default', 'default font family');
assert.strictEqual(ctx.__run("document.documentElement.style.zoom"), '1', 'zoom applied 1');

// 放大：+0.1 → 1.1，写入本地存储并更新按钮文案
ctx.__run('setFontScaleBy(0.1)');
assert.strictEqual(ctx.__run('fontScale'), 1.1, 'scale increases to 1.1');
assert.strictEqual(ctx.__storage[FS_KEY], '1.1', 'scale persisted');
assert.strictEqual(ctx.__run("document.documentElement.style.zoom"), '1.1', 'zoom style updated');
assert.strictEqual(ctx.__run("document.querySelector('#fontResetBtn').textContent"), '110%', 'label shows percent');

// 放大到上限后夹紧
ctx.__run('applyFontScale(9)');
assert.strictEqual(ctx.__run('fontScale'), 1.4, 'scale clamped to max 1.4');
ctx.__run('applyFontScale(0.1)');
assert.strictEqual(ctx.__run('fontScale'), 0.8, 'scale clamped to min 0.8');

// 重置回 100%
ctx.__run('applyFontScale(1)');
assert.strictEqual(ctx.__storage[FS_KEY], '1', 'reset stored');

// 换字体：宋体
ctx.__run("applyFontFamily('song')");
assert.strictEqual(ctx.__run('fontFamilyName'), 'song', 'family name stored');
assert.strictEqual(ctx.__storage[FF_KEY], 'song', 'family persisted');
assert.ok(ctx.__run("document.body.style.fontFamily").includes('SimSun'), 'body font-family applied');
assert.strictEqual(ctx.__run("document.querySelector('#fontFamilySelect').value"), 'song', 'select synced');

// 无效字体回退 default
ctx.__run("applyFontFamily('nope')");
assert.strictEqual(ctx.__run('fontFamilyName'), 'default', 'invalid family falls back to default');

// 重新打开页面：字号/字体设置恢复
const storage2 = {};
storage2[FS_KEY] = '1.2';
storage2[FF_KEY] = 'kai';
const ctx2 = loadApp(storage2);
assert.strictEqual(ctx2.__run('fontScale'), 1.2, 'scale restored on reload');
assert.strictEqual(ctx2.__run('fontFamilyName'), 'kai', 'family restored on reload');
assert.strictEqual(ctx2.__run("document.documentElement.style.zoom"), '1.2', 'zoom restored');
assert.ok(ctx2.__run("document.body.style.fontFamily").includes('KaiTi'), 'kai font restored');


// 多种黑体字体可用
for (const k of ['hei', 'pingfang', 'yahei', 'harmonyos', 'sourcehan', 'dengxian', 'song', 'kai', 'yuan']) {
  assert.ok(ctx.__run('FONT_FAMILIES.hasOwnProperty(' + JSON.stringify(k) + ')'), '字体可用: ' + k);
}
ctx.__run("applyFontFamily('yahei');");
assert.strictEqual(ctx.__run('fontFamilyName'), 'yahei', '切换到微软雅黑');
assert.ok(ctx.__run("document.body.style.fontFamily").includes('Microsoft YaHei'), '微软雅黑栈应用');

// 显示面板可折叠，并记忆状态
ctx.__run('setDisplayOpen(false);');
assert.strictEqual(ctx.__run('isDisplayOpen()'), false, '面板折叠');
assert.strictEqual(ctx.__storage['shuatiben_displayopen'], '0', '折叠状态已保存');
ctx.__run('toggleDisplayPanel();');
assert.strictEqual(ctx.__run('isDisplayOpen()'), true, '面板再次展开');

console.log('PASS test-display');
