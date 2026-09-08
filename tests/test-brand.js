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

const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
assert.ok(css.includes('.brand-logo{width:180px'), '桌面版 Logo 宽度 180px（放大 1.5 倍）');
assert.ok(css.includes('.brand-logo{width:237px} /* 手机端 Logo（158px x 1.5） */'), '手机端 Logo 放大 1.5 倍（237px）');
assert.ok(css.includes('.brand.brand-logo-mode{flex-direction:column;align-items:flex-start;gap:8px;padding:0 0 6px;margin:0}'), 'Logo 左上角对齐、去掉多余偏移');

assert.ok(html.includes('rel="manifest" href="manifest.webmanifest"'), '应引用 manifest');
assert.ok(html.includes('apple-mobile-web-app-title" content="vessel 刷题"'), '手机主屏应用名应为 vessel 刷题');
for (const file of ['manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
  assert.ok(fs.existsSync(path.join(root, file)), file + ' 应存在');
}
const manifest = fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8');
assert.ok(manifest.includes('"name": "vessel 刷题"'), 'manifest 名称为 vessel 刷题');

console.log('PASS test-brand');


