const assert = require('assert');
const { loadApp } = require('./harness');

const KEY = 'shuatiben_v1';
const paper = {
  id: 'p1',
  title: '收藏测试卷',
  subject: '数学',
  createdAt: 1,
  lastResult: null,
  questions: [
    { id: 'q1', question: '1+1=?', options: ['1', '2', '3', '4'], answer: 'B', analysis: '基础加法', type: 'single', typeLabel: '单选题', subject: '数学' },
    { id: 'q2', question: '2+2=?', options: ['2', '3', '4', '5'], answer: 'C', analysis: '', type: 'single', typeLabel: '单选题', subject: '数学' }
  ]
};
const storage = {};
storage[KEY] = JSON.stringify({ papers: [paper], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] });
const clearAuto = "if (session && session._autoTimer) { clearTimeout(session._autoTimer); session._autoTimer = null; }";

const ctx = loadApp(storage);
ctx.__run("startPaper('p1', false);");
assert.strictEqual(ctx.__run('session.index'), 0, 'start q1');
assert.strictEqual(ctx.__run("isQuestionFavorited('p1','q1')"), false, 'initial not favorited');

ctx.__run('toggleFavoriteCurrentQuestion();');
assert.strictEqual(ctx.__run('db.favorites.length'), 1, 'one favorite');
assert.strictEqual(ctx.__run('db.favorites[0].questionId'), 'q1', 'favorite q1');
assert.strictEqual(ctx.__run('db.favorites[0].subject'), '数学', 'keeps subject');
assert.strictEqual(ctx.__run('db.favorites[0].paperTitle'), '收藏测试卷', 'keeps paper title');
assert.strictEqual(ctx.__run("isQuestionFavorited('p1','q1')"), true, 'q1 favorited');
assert.strictEqual(Number(ctx.__run("document.querySelector('#favBadge').textContent")), 1, 'badge=1');
let ph = ctx.__run("document.querySelector('#view-practice').innerHTML");
assert.ok(ph.includes('fav-btn active'), 'star shows active');

ctx.__run('renderFavorites();');
let fh = ctx.__run("document.querySelector('#view-fav').innerHTML");
assert.ok(fh.includes('数学'), 'fav view has subject group');
assert.ok(fh.includes('1+1=?'), 'fav view has question');
assert.ok(fh.includes('取消收藏'), 'fav view can unfavorite');

// cancel favorite
const fid = ctx.__run('db.favorites[0].id');
ctx.__run('removeFavoriteById(' + JSON.stringify(fid) + '); renderFavorites(); updateBadge();');
assert.strictEqual(ctx.__run('db.favorites.length'), 0, 'favorites cleared');
assert.strictEqual(Number(ctx.__run("document.querySelector('#favBadge').textContent")), 0, 'badge=0');

// favorite q2 and persist
ctx.__run('goToQuestion(1); toggleFavoriteCurrentQuestion(); ' + clearAuto);
const saved = JSON.parse(storage[KEY]);
assert.strictEqual(saved.favorites.length, 1, 'saved to storage');
assert.strictEqual(saved.favorites[0].questionId, 'q2', 'persisted q2');

// reload restores favorites
const ctx2 = loadApp(storage);
assert.strictEqual(ctx2.__run('db.favorites.length'), 1, 'restored after reload');
assert.strictEqual(ctx2.__run('db.favorites[0].questionId'), 'q2', 'restored q2');
console.log('PASS test-favorite');
