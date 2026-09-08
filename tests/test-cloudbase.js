const assert = require('assert');
const { loadApp } = require('./harness');

const tick = (ms) => new Promise((r) => setTimeout(r, ms || 20));
const uidOf = (email) => 'uid_' + email.replace(/[^a-z0-9]/gi, '');
const CONFIG = { env: 'test-env', debounceMs: 0 };

function makeCloudbase(opts) {
  opts = opts || {};
  const docs = new Map();
  const users = new Map();
  if (opts.remote) {
    Object.keys(opts.remote).forEach((u) => docs.set(u, JSON.parse(JSON.stringify(opts.remote[u]))));
  }
  if (opts.users) Object.keys(opts.users).forEach((e) => users.set(e, opts.users[e]));
  let currentUser = opts.currentUser ? { uid: opts.currentUser.uid, email: opts.currentUser.email } : null;
  const listeners = [];
  const auth = {
    signUpWithEmailAndPassword(email, pwd) { users.set(email, pwd); return Promise.resolve({}); },
    signInWithEmailAndPassword(email, pwd) {
      if (!users.has(email) || users.get(email) !== pwd) return Promise.reject(new Error('邮箱或密码错误'));
      currentUser = { uid: uidOf(email), email };
      return Promise.resolve({ user: currentUser });
    },
    signOut() { currentUser = null; listeners.forEach((fn) => fn(null)); return Promise.resolve(); },
    getLoginState() { return Promise.resolve(currentUser ? { user: currentUser } : null); },
    onLoginStateChanged(fn) { listeners.push(fn); },
    sendPasswordResetEmail() { return Promise.resolve({}); }
  };
  const col = {
    doc(uid) {
      return {
        get() {
          if (!docs.has(uid) && opts.throwOnNotFound) return Promise.reject(new Error('document not found'));
          return Promise.resolve({ data: docs.has(uid) ? JSON.parse(JSON.stringify(docs.get(uid))) : null });
        },
        set(payload) { docs.set(uid, JSON.parse(JSON.stringify(payload))); return Promise.resolve(); }
      };
    }
  };
  return {
    init() { return { auth: () => auth, database: () => ({ collection: () => col }) }; },
    docs, users, auth
  };
}

function makePaper(id, over) {
  return Object.assign({
    id, title: '试卷' + id, subject: '数学', createdAt: 1000, updatedAt: 1000,
    questions: [], lastResult: null
  }, over || {});
}
function makeWrong(id, paperId, over) {
  return Object.assign({
    id, paperId, paperTitle: '试卷' + paperId, subject: '数学', questionId: 'q' + id,
    question: { id: 'q' + id, question: '题目' + id, options: ['A1', 'B2', 'C3', 'D4'], answer: 'B', analysis: '解析', type: 'single', typeLabel: '单选题', subject: '数学' },
    wrongCount: 1, lastWrongAt: 2000, lastAnswer: ''
  }, over || {});
}
function baseDoc() {
  return { papers: [], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, updatedAt: 1 };
}
function cleanupTimers(ctx) {
  ctx.__run('if (cloud.timer) { clearTimeout(cloud.timer); cloud.timer = null; }');
  ctx.__run('if (session && session._autoTimer) { clearTimeout(session._autoTimer); session._autoTimer = null; }');
}

async function scenario1_loginPullsRemote() {
  const email = 'alice@test.com';
  const uid = uidOf(email);
  const remote = {};
  remote[uid] = Object.assign(baseDoc(), { papers: [makePaper('pA')], updatedAt: 5000 });
  const sdk = makeCloudbase({ users: { [email]: 'pass1234' }, remote });
  const ctx = loadApp({}, { cloudbase: sdk, config: CONFIG });
  await tick();
  await ctx.__run("loginAccount('alice@test.com','pass1234')");
  await tick(30);
  assert.strictEqual(ctx.__run("cloud.state === 'signed-in'"), true, 'state signed-in');
  assert.strictEqual(ctx.__run('db.papers.length'), 1, 'remote paper pulled');
  assert.strictEqual(ctx.__run('db.papers[0].id'), 'pA');
  assert.strictEqual(ctx.__run('readCloudUid()'), uid, 'uid remembered');
  assert.ok(sdk.docs.has(uid), 'cloud doc exists after pull');
  cleanupTimers(ctx);
  console.log('PASS cloud: 首次登录空本机拉取云端试卷');
}

async function scenario2_firstLoginUploadsLocal() {
  const email = 'bob@test.com';
  const uid = uidOf(email);
  const storage = {};
  storage['shuatiben_v1'] = JSON.stringify({ papers: [makePaper('pLocal')], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {} });
  const sdk = makeCloudbase({ users: { [email]: 'pass1234' } });
  const ctx = loadApp(storage, { cloudbase: sdk, config: CONFIG });
  await tick();
  await ctx.__run("loginAccount('bob@test.com','pass1234')");
  await tick(40);
  assert.strictEqual(ctx.__run('db.papers[0].id'), 'pLocal', 'local paper kept after login');
  const doc = sdk.docs.get(uid);
  assert.ok(doc && doc.papers.some((p) => p.id === 'pLocal'), 'local paper uploaded to cloud');
  cleanupTimers(ctx);
  console.log('PASS cloud: 首次登录本机数据上传云端');
}

async function scenario3_crossDeviceMergeAndWrongPush() {
  const email = 'carol@test.com';
  const uid = uidOf(email);
  const remote = {};
  remote[uid] = Object.assign(baseDoc(), { papers: [makePaper('pX')], wrongBook: [makeWrong('wX', 'pX')], updatedAt: 5000 });
  const sdk = makeCloudbase({ users: { [email]: 'pass1234' }, remote });

  // 设备 1：登录拉取，然后做错一道题并入错题集（本地新增），应自动上传
  const ctx1 = loadApp({}, { cloudbase: sdk, config: CONFIG });
  await tick();
  await ctx1.__run("loginAccount('carol@test.com','pass1234')");
  await tick(30);
  assert.strictEqual(ctx1.__run('db.wrongBook.length'), 1, 'remote wrong pulled on device1');
  ctx1.__run("upsertWrong({id:'pX', title:'试卷pX', subject:'数学'}, {id:'qq', question:'新错题?', options:['A','B','C','D'], answer:'C', analysis:'', type:'single', typeLabel:'单选题', subject:'数学'}, 'A'); saveDB();");
  await tick(40);
  assert.strictEqual(ctx1.__run('db.wrongBook.length'), 2, 'device1 has 2 wrong after mistake');
  const d1 = sdk.docs.get(uid);
  assert.strictEqual(d1.wrongBook.length, 2, 'wrong entry uploaded to cloud');

  // 设备 2（全新空本机）：登录同账号，应看到设备 1 的 2 条错题
  const ctx2 = loadApp({}, { cloudbase: sdk, config: CONFIG });
  await tick();
  await ctx2.__run("loginAccount('carol@test.com','pass1234')");
  await tick(30);
  assert.strictEqual(ctx2.__run('db.wrongBook.length'), 2, 'device2 sees both wrong entries');
  assert.strictEqual(ctx2.__run('db.papers.length'), 1, 'device2 sees paper');
  cleanupTimers(ctx1);
  cleanupTimers(ctx2);
  console.log('PASS cloud: 跨设备错题互通');
}

async function scenario4_mergeDBTombstones() {
  const ctx = loadApp({});
  ctx.__run("__ta={papers:[{id:'pA',updatedAt:10}],wrongBook:[{id:'wA',paperId:'pA',lastWrongAt:1}],progress:{pA:{updatedAt:5}},deletedPapers:[],deletedWrong:[],clearedProgress:{}}");
  ctx.__run("__tb={papers:[{id:'pA',updatedAt:8},{id:'pB',updatedAt:3}],wrongBook:[{id:'wB',paperId:'pB',lastWrongAt:1},{id:'wA',paperId:'pA',lastWrongAt:9}],progress:{pA:{updatedAt:100}},deletedPapers:[],deletedWrong:[],clearedProgress:{}}");
  let m = ctx.__run('mergeDB(__ta,__tb)');
  assert.strictEqual(m.papers.length, 2, 'merge keeps union of paper ids');
  assert.strictEqual(m.papers.find((p) => p.id === 'pA').updatedAt, 10, 'same-id paper keeps newer updatedAt');
  assert.strictEqual(m.wrongBook.length, 2, 'merge keeps union of wrong ids');
  assert.strictEqual(m.wrongBook.find((w) => w.id === 'wA').lastWrongAt, 9, 'same-id wrong keeps newer lastWrongAt');
  assert.strictEqual(m.progress.pA.updatedAt, 100, 'progress keeps newer updatedAt');

  ctx.__run("__tc={papers:[{id:'pKeep',updatedAt:3}],wrongBook:[],progress:{pC:{updatedAt:50}},deletedPapers:['pDel'],deletedWrong:['wDel'],clearedProgress:{pC:100}}");
  ctx.__run("__td={papers:[{id:'pDel',updatedAt:9},{id:'pKeep',updatedAt:1}],wrongBook:[{id:'wDel',paperId:'pDel',lastWrongAt:9},{id:'wKeep',paperId:'pKeep',lastWrongAt:1}],progress:{pC:{updatedAt:200}},deletedPapers:[],deletedWrong:[],clearedProgress:{}}");
  m = ctx.__run('mergeDB(__tc,__td)');
  assert.deepStrictEqual(m.papers.map((p) => p.id).sort(), ['pKeep'], 'deleted paper tombstoned out');
  assert.deepStrictEqual(m.wrongBook.map((w) => w.id), ['wKeep'], 'deleted wrong tombstoned out');
  assert.strictEqual(m.progress.pC.updatedAt, 200, 'progress newer than clear time survives');
  assert.strictEqual(m.deletedPapers.includes('pDel'), true, 'tombstone merged');
  console.log('PASS cloud: mergeDB 合并与墓碑过滤');
}

async function scenario5_wrongResolveAndRemovalTombstones() {
  const email = 'dave@test.com';
  const uid = uidOf(email);
  const remote = {};
  remote[uid] = Object.assign(baseDoc(), { papers: [makePaper('pY')], wrongBook: [makeWrong('wY', 'pY')], updatedAt: 5000 });
  const sdk = makeCloudbase({ users: { [email]: 'pass1234' }, remote });
  const ctx = loadApp({}, { cloudbase: sdk, config: CONFIG });
  await tick();
  await ctx.__run("loginAccount('dave@test.com','pass1234')");
  await tick(30);

  // 错题重练答对 → 从错题集消除并记录墓碑
  ctx.__run("startWrongPractice(['wY']); session.answers[0] = { selected: 'B' }; submitCurrentAnswer();");
  await tick(40);
  assert.strictEqual(ctx.__run('db.wrongBook.length'), 0, 'correct answer removes wrong entry');
  assert.strictEqual(ctx.__run("db.deletedWrong.includes('wY')"), true, 'tombstone recorded for resolved wrong');
  const doc = sdk.docs.get(uid);
  assert.strictEqual(doc.wrongBook.length, 0, 'cloud wrong cleared');
  assert.strictEqual(doc.deletedWrong.includes('wY'), true, 'cloud tombstone recorded');

  // 直接移除也记录墓碑
  ctx.__run("upsertWrong({id:'pY', title:'试卷pY', subject:'数学'}, {id:'qNew', question:'再错一次?', options:['A','B','C','D'], answer:'A', analysis:'', type:'single', typeLabel:'单选题', subject:'数学'}, 'B'); saveDB();");
  const wid = ctx.__run('db.wrongBook[0].id');
  ctx.__run(`removeWrongById('${wid}')`);
  assert.strictEqual(ctx.__run(`db.deletedWrong.includes('${wid}')`), true, 'manual remove records tombstone');

  // 删除整套试卷记录墓碑
  ctx.__run("recordTombstone('deletedPapers','pY')");
  assert.strictEqual(ctx.__run("db.deletedPapers.includes('pY')"), true, 'delete paper records tombstone');

  // 完成/重开清除进度记录墓碑
  ctx.__run("db.progress.pY = { mode:'paper', title:'t', index:2, answers:[], total:10, updatedAt: Date.now() }");
  ctx.__run("clearPaperProgress('pY')");
  assert.strictEqual(ctx.__run("typeof db.clearedProgress.pY === 'number'"), true, 'clear progress records clearedProgress tombstone');
  cleanupTimers(ctx);
  console.log('PASS cloud: 答对消除/手动移除/删卷/清进度 均记录墓碑');
}


async function scenario6_autoRestoreOnReload() {
  const email = 'erin@test.com';
  const uid = uidOf(email);
  const remote = {};
  remote[uid] = Object.assign(baseDoc(), { papers: [makePaper('pRestore')], updatedAt: 5000 });
  const sdk = makeCloudbase({ users: { [email]: 'pass1234' }, remote, currentUser: { uid, email } });
  // 模拟刷新页面：打开时 SDK 已保存登录态
  const ctx = loadApp({}, { cloudbase: sdk, config: CONFIG });
  await tick(40);
  assert.strictEqual(ctx.__run("cloud.state === 'signed-in'"), true, 'restored signed-in');
  assert.strictEqual(ctx.__run('db.papers.length'), 1, 'auto pulled remote on reload');
  assert.strictEqual(ctx.__run('db.papers[0].id'), 'pRestore');
  cleanupTimers(ctx);
  console.log('PASS cloud: 刷新页面自动登录并从云端恢复');
}

async function scenario7_notFoundTolerated() {
  const email = 'frank@test.com';
  const uid = uidOf(email);
  const storage = {};
  storage['shuatiben_v1'] = JSON.stringify({ papers: [makePaper('pLocal')], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {} });
  const sdk = makeCloudbase({ users: { [email]: 'pass1234' }, throwOnNotFound: true });
  const ctx = loadApp(storage, { cloudbase: sdk, config: CONFIG });
  await tick();
  await ctx.__run("loginAccount('frank@test.com','pass1234')");
  await tick(50);
  assert.strictEqual(ctx.__run('db.papers[0].id'), 'pLocal', 'local kept when cloud doc missing');
  assert.strictEqual(ctx.__run("cloud.error === ''"), true, 'no error for missing doc');
  const doc = sdk.docs.get(uid);
  assert.ok(doc && doc.papers.some((p) => p.id === 'pLocal'), 'doc created after missing doc tolerated');
  cleanupTimers(ctx);
  console.log('PASS cloud: 云端文档不存在时自动创建（容错）');
}

async function scenario8_logoutKeepsLocal() {
  const email = 'grace@test.com';
  const uid = uidOf(email);
  const remote = {};
  remote[uid] = Object.assign(baseDoc(), { papers: [makePaper('pG')], updatedAt: 5000 });
  const sdk = makeCloudbase({ users: { [email]: 'pass1234' }, remote });
  const ctx = loadApp({}, { cloudbase: sdk, config: CONFIG });
  await tick();
  await ctx.__run("loginAccount('grace@test.com','pass1234')");
  await tick(30);
  assert.strictEqual(ctx.__run("cloud.state === 'signed-in'"), true);
  await ctx.__run('logoutAccount()');
  await tick();
  assert.strictEqual(ctx.__run("cloud.state === 'anon'"), true, 'logout -> anon');
  assert.strictEqual(ctx.__run('db.papers.length'), 1, 'local data kept after logout');
  const cardHtml = ctx.__run("document.querySelector('#accountCard').innerHTML");
  assert.ok(cardHtml.includes('登录 / 注册'), 'account card shows login button after logout');
  cleanupTimers(ctx);
  console.log('PASS cloud: 退出登录后本地数据保留并回到登录态');
}

async function scenario9_submitAuthRegisterThenLogin() {
  const sdk = makeCloudbase({});
  const ctx = loadApp({}, { cloudbase: sdk, config: CONFIG });
  await tick();
  // 注册
  ctx.__run("authMode = 'register'; openAuthModal('register');");
  ctx.__run("document.querySelector('#authEmail').value = 'hugo@test.com';");
  ctx.__run("document.querySelector('#authPassword').value = 'pass1234';");
  ctx.__run("document.querySelector('#authPassword2').value = 'pass1234';");
  await ctx.__run('submitAuth()');
  assert.strictEqual(sdk.users.has('hugo@test.com'), true, 'user registered');
  assert.strictEqual(ctx.__run("authMode === 'login'"), true, 'after register switch to login tab');
  // 登录
  ctx.__run("document.querySelector('#authPassword').value = 'pass1234';");
  await ctx.__run('submitAuth()');
  await tick(40);
  assert.strictEqual(ctx.__run("cloud.state === 'signed-in'"), true, 'login via modal works');
  assert.strictEqual(ctx.__run('readCloudUid()'), uidOf('hugo@test.com'), 'uid recorded');
  cleanupTimers(ctx);
  console.log('PASS cloud: 弹窗注册+登录路径');
}

(async () => {
  await scenario1_loginPullsRemote();
  await scenario2_firstLoginUploadsLocal();
  await scenario3_crossDeviceMergeAndWrongPush();
  await scenario4_mergeDBTombstones();
  await scenario5_wrongResolveAndRemovalTombstones();
  await scenario6_autoRestoreOnReload();
  await scenario7_notFoundTolerated();
  await scenario8_logoutKeepsLocal();
  await scenario9_submitAuthRegisterThenLogin();
  console.log('PASS test-cloudbase');
})().catch((e) => {
  console.error('FAIL test-cloudbase');
  console.error(e);
  process.exit(1);
});

