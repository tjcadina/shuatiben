const assert = require('assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(html.includes('<title>vessel 刷题'), '网页标题应为 vessel 刷题');
assert.ok(html.includes('<h1>vessel 刷题</h1>'), '品牌名应为 vessel 刷题');
assert.ok(html.includes('class="brand-mark">V<'), '品牌图标应为 V');
const slogan = '刷题不用到处找，你自己的试卷，就是最好的题库。上传它，专属练习立马生成。';
assert.ok(html.includes(slogan), '品牌旁应显示宣传标语');
assert.ok(!html.includes('>刷题本<') && !html.includes('<title>刷题本'), '旧的“刷题本”名称应移除');

console.log('PASS test-brand');
