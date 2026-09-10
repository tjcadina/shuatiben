const assert = require('assert');
const { loadApp } = require('./harness');
const KEY = 'shuatiben_v1';
const paper = { id:'p1', title:'t', subject:'数学', createdAt:1, lastResult:null, questions:[
  { id:'q1', question:'下列哪个是水果？', options:['苹果','汽车'], answer:'A', analysis:'', type:'single', typeLabel:'单选题', subject:'数学' }
]};
const storage = {}; storage[KEY] = JSON.stringify({ papers:[paper], wrongBook:[], progress:{} });
const ctx = loadApp(storage);
ctx.__run(`startPaper('p1', false);`);
const text = ctx.__run(`buildSpeechText(session.items[session.index].q)`);
assert.ok(text.includes('水果'), 'should include question');
assert.ok(text.includes('苹果'), 'should include option content');
assert.ok(text.includes('A'), 'should include option letter');
ctx.__run(`speakCurrentQuestion();`);
assert.ok(ctx.window.speechSynthesis.spoken, 'should speak an utterance');
assert.ok(ctx.window.speechSynthesis.spoken.text.includes('水果'), 'spoken text should contain question');
assert.strictEqual(ctx.window.speechSynthesis.cancelled, true, 'previous speech should be cancelled');
const spoken = ctx.window.speechSynthesis.spoken;
if (typeof spoken.onend === 'function') spoken.onend();
if (typeof spoken.onerror === 'function') spoken.onerror();


// 解析语音按钮：播报正确答案与解析内容
ctx.__run("session.items[0].q.analysis = '苹果属于水果'; speakAnalysisCurrent();");
const ana = ctx.window.speechSynthesis.spoken;
assert.ok(ana && ana.text.includes('正确答案'), '解析播报含正确答案');
assert.ok(ana.text.includes('苹果属于水果'), '解析播报含解析内容');
if (typeof ana.onend === 'function') ana.onend();

// 语音列表已就绪时应自动选中中文语音（utter.voice 被设置）
ctx.window.speechSynthesis = {
  speaking: false,
  cancel() { this.cancelled = true; },
  speak(u) { this.spoken = u; },
  getVoices() { return [{ lang: 'zh-CN', name: 'Ting-Ting' }, { lang: 'en-US', name: 'Samantha' }]; }
};
ctx.__run('speakCurrentQuestion();');
const withVoice = ctx.window.speechSynthesis.spoken;
assert.ok(withVoice && withVoice.voice, '应自动选择可用语音');
assert.ok(/zh/i.test(withVoice.voice.lang), '优先选择中文语音');
if (withVoice && typeof withVoice.onend === 'function') withVoice.onend();
if (withVoice && typeof withVoice.onerror === 'function') withVoice.onerror();

console.log('PASS test-speech');
