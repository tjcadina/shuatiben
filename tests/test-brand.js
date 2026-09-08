const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.ok(html.includes('<title>vessel 刷题'), '网页标题应为 vessel 刷题');
assert.ok(html.includes('href="favicon.png"'), '应引用 favicon');
assert.ok(html.includes('<img class="brand-logo" src="vessel-logol.png" alt="vessel 刷题" />'), '品牌区应使用上传的 Logo 图片');
assert.ok(fs.existsSync(path.join(root, 'vessel-logol.png')), 'Logo 图片文件应存在');
assert.ok(fs.existsSync(path.join(root, 'favicon.png')), 'favicon 文件应存在');
const slogan = '刷题不用到处找，你自己的试卷，就是最好的题库。上传它，专属练习立马生成。';
assert.ok(html.includes(slogan), '品牌旁应显示宣传标语');
assert.ok(!html.includes('<h1>vessel 刷题</h1>'), '文字版品牌标题已由 Logo 图取代（避免重复）');
assert.ok(!html.includes('>刷题本<') && !html.includes('<title>刷题本'), '旧的“刷题本”名称应移除');

console.log('PASS test-brand');
