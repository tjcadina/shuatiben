'use strict';

/* ============================== 常量与工具 ============================== */
const STORAGE_KEY = 'shuatiben_v1';

const SUBJECTS = ['数学','英语','语文','物理','化学','生物','历史','政治','地理','计算机','其他'];
const SUBJECT_COLORS = {
  '数学':'#5b5bd6','英语':'#0ea5e9','语文':'#f97316','物理':'#8b5cf6','化学':'#10b981',
  '生物':'#22c55e','历史':'#eab308','政治':'#ef4444','地理':'#06b6d4','计算机':'#64748b','其他':'#94a3b8'
};

const SUBJECT_RULES = {
  '数学': ['数学','方程','函数','几何','代数','三角','数列','向量','导数','微积分','概率','统计','计算','求解','证明','面积','周长','坐标','不等式','圆','椭圆','双曲线','抛物线','多项式','矩阵','极限','集合','余数','因数','倍数','角度','体积','斜率'],
  '英语': ['英语','阅读理解','完形填空','翻译','语法','时态','单词','短语','从句','词汇','完形','听力','写作'],
  '语文': ['语文','古诗词','文言文','阅读理解','作文','拼音','修辞','成语','词语','病句','古诗','诗人','作者','表达方式','标点','字音','字形','默写','名句'],
  '物理': ['物理','力','运动','速度','加速度','牛顿','电路','电流','电压','电阻','磁场','电场','光学','热力学','能量守恒','动量','机械能','浮力','压强','波长','频率','做功','功率'],
  '化学': ['化学','反应','元素','分子','原子','离子','溶液','酸碱','氧化还原','化学式','化合物','沉淀','气体','质量守恒','摩尔','催化剂','电解质'],
  '生物': ['生物','细胞','基因','遗传','DNA','蛋白质','酶','光合作用','生态系统','种群','进化','染色体','激素','氨基酸','呼吸作用'],
  '历史': ['历史','朝代','战争','革命','改革','皇帝','古代','近代','条约','帝国','资本主义','变法','起义','制度','王朝','封建','甲午','辛亥'],
  '政治': ['政治','哲学','经济','法律','宪法','公民','权利','义务','国家','政府','民主','法治','价值观','文化自信','市场经济','宏观调控'],
  '地理': ['地理','气候','地形','经纬度','地图','河流','山脉','资源','人口','农业','工业','城市化','洋流','板块','降水量','纬度'],
  '计算机': ['计算机','编程','代码','算法','数据结构','网络','数据库','Python','Java','C语言','C++','操作系统','软件','程序','二进制','人工智能','函数式','前端','后端']
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cloneQuestion(q) {
  return JSON.parse(JSON.stringify(q));
}

function formatDate(ts) {
  const d = new Date(ts || Date.now());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  if (sec < 60) return `${sec} 秒`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} 分 ${s} 秒`;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ============================== 数据存储 ============================== */
const THEME_KEY = 'shuatiben_theme';

function applyTheme(theme) {
  const t = ['light', 'eye', 'dark'].includes(theme) ? theme : 'light';
  if (document.documentElement) document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  $$('.theme-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.theme === t));
}

function initTheme() {
  let saved = 'light';
  try { saved = localStorage.getItem(THEME_KEY) || 'light'; } catch (e) {}
  applyTheme(saved);
}

/* ============================== 显示设置：字号 + 字体 ============================== */
const FONT_SCALE_KEY = 'shuatiben_fontscale';
const FONT_FAMILY_KEY = 'shuatiben_fontfamily';
const FONT_FAMILIES = {
  default: '',
  hei: '"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",system-ui,-apple-system,sans-serif',
  pingfang: '"PingFang SC","PingFang HK",system-ui,-apple-system,sans-serif',
  yahei: '"Microsoft YaHei","微软雅黑",system-ui,sans-serif',
  harmonyos: '"HarmonyOS Sans SC","HarmonyOS Sans","Source Han Sans SC",sans-serif',
  sourcehan: '"Source Han Sans SC","Noto Sans CJK SC","思源黑体",sans-serif',
  dengxian: '"DengXian","等线",system-ui,sans-serif',
  song: '"SimSun","Songti SC","Noto Serif CJK SC",serif',
  kai: '"KaiTi","Kaiti SC","STKaiti",serif',
  yuan: '"Yuanti SC","YouYuan","幼圆",sans-serif'
};
const DISPLAY_OPEN_KEY = 'shuatiben_displayopen';
const FLOAT_NEXT_KEY = 'shuatiben_floatnext';
function isDisplayOpen() {
  try {
    const v = localStorage.getItem(DISPLAY_OPEN_KEY);
    return v === null || v !== '0';
  } catch (e) { return true; }
}
function setDisplayOpen(open) {
  try { localStorage.setItem(DISPLAY_OPEN_KEY, open ? '1' : '0'); } catch (e) {}
  const body = $('#displayBody');
  if (body) body.classList.toggle('hidden', !open);
  const t = $('#displayToggle');
  if (t) t.textContent = (open ? '▾ ' : '▸ ') + 'Aa 显示设置';
}
function toggleDisplayPanel() {
  setDisplayOpen(!isDisplayOpen());
}
function isFloatNext() {
  try { return localStorage.getItem(FLOAT_NEXT_KEY) !== '0'; } catch (e) { return true; }
}
function setFloatNext(on) {
  try { localStorage.setItem(FLOAT_NEXT_KEY, on ? '1' : '0'); } catch (e) {}
  const box = $('#floatNextToggle');
  if (box) box.checked = !!on;
  updateFloatNext();
  if (currentView === 'practice') renderPractice();
}
function prevQuestion() {
  if (!session) return;
  if (session.index > 0) goToQuestion(session.index - 1);
  else toast('已经是第一题了');
}
function clampFloatPos(btn, key) {
  if (!btn || !btn.style || btn.style.left === '' || btn.style.left === 'auto') return;
  const l = parseFloat(btn.style.left), t = parseFloat(btn.style.top);
  if (isNaN(l) || isNaN(t)) return;
  const W = (document.documentElement && document.documentElement.clientWidth) || window.innerWidth || 400;
  const H = (document.documentElement && document.documentElement.clientHeight) || window.innerHeight || 700;
  const cl = Math.min(Math.max(l, 0), Math.max(W - 110, 0));
  const ct = Math.min(Math.max(t, 0), Math.max(H - 76, 0));
  btn.style.left = cl + 'px';
  btn.style.top = ct + 'px';
  btn.style.right = 'auto';
  if ((cl !== l || ct !== t) && key) { try { localStorage.setItem(key, JSON.stringify({ l: cl, t: ct })); } catch (e) {} }
}
function restoreFloatPos(btn, key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p && typeof p.l === 'number' && typeof p.t === 'number') {
      btn.style.left = p.l + 'px';
      btn.style.top = p.t + 'px';
      btn.style.right = 'auto';
      clampFloatPos(btn, key);
    }
  } catch (e) {}
}
function bindFloatResize() {
  if (typeof window.addEventListener !== 'function') return;
  const onResize = () => {
    clampFloatPos($('#floatNext'), 'shuatiben_floatpos_next');
    clampFloatPos($('#floatPrev'), 'shuatiben_floatpos_prev');
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  onResize();
}
function updateFloatNext() {
  const showBase = isFloatNext() && session && currentView === 'practice';
  const next = $('#floatNext');
  if (next) next.classList.toggle('hidden', !showBase);
  const prev = $('#floatPrev');
  if (prev) prev.classList.toggle('hidden', !showBase);
}
function clickFloatNext() {
  if (!session) return;
  const st = session.answers[session.index];
  if (!st || !st.submitted) { toast('请先作答本题'); return; }
  if (session.index + 1 < session.items.length) nextQuestion();
  else nextQuestion(); // 最后一题：进入答题报告
}
function clickFloatPrev() {
  if (!session) return;
  if (session.index > 0) goToQuestion(session.index - 1);
  else toast('已经是第一题了');
}
function makeFloatDraggable(sel, key) {
  const btn = $(sel);
  if (!btn || typeof btn.addEventListener !== 'function' || typeof window.addEventListener !== 'function') return;
  restoreFloatPos(btn, key);
  let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, moved = false;
  const down = (e) => {
    const p = (e.touches && e.touches[0]) || e;
    sx = p.clientX; sy = p.clientY;
    const r = (typeof btn.getBoundingClientRect === 'function') ? btn.getBoundingClientRect() : { left: 0, top: 0 };
    ox = r.left; oy = r.top;
    dragging = true; moved = false;
    try { e.preventDefault(); } catch (err) {}
  };
  const move = (e) => {
    if (!dragging) return;
    const p = (e.touches && e.touches[0]) || e;
    const dx = p.clientX - sx, dy = p.clientY - sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
    const W = (document.documentElement && document.documentElement.clientWidth) || window.innerWidth || 400;
    const H = (document.documentElement && document.documentElement.clientHeight) || window.innerHeight || 700;
    const left = Math.min(Math.max(ox + dx, 0), Math.max(W - 110, 0));
    const top = Math.min(Math.max(oy + dy, 0), Math.max(H - 76, 0));
    btn.style.left = left + 'px';
    btn.style.top = top + 'px';
    btn.style.right = 'auto';
    try { e.preventDefault(); } catch (err) {}
  };
  const up = () => {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      window.__floatDragMoved = true;
      try {
        const l = parseFloat(btn.style.left);
        const t = parseFloat(btn.style.top);
        if (!isNaN(l) && !isNaN(t)) localStorage.setItem(key, JSON.stringify({ l: l, t: t }));
      } catch (e) {}
    }
  };
  btn.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
let fontScale = 1;
let fontFamilyName = 'default';

function clampFontScale(v) {
  v = Number(v);
  if (!isFinite(v) || v <= 0) v = 1;
  return Math.min(1.4, Math.max(0.8, Math.round(v * 100) / 100));
}

function applyFontScale(v) {
  fontScale = clampFontScale(v);
  try { localStorage.setItem(FONT_SCALE_KEY, String(fontScale)); } catch (e) {}
  if (document.documentElement) document.documentElement.style.zoom = String(fontScale);
  const label = $('#fontResetBtn');
  if (label) label.textContent = Math.round(fontScale * 100) + '%';
}

function applyFontFamily(name) {
  fontFamilyName = Object.prototype.hasOwnProperty.call(FONT_FAMILIES, name) ? name : 'default';
  try { localStorage.setItem(FONT_FAMILY_KEY, fontFamilyName); } catch (e) {}
  if (document.body) document.body.style.fontFamily = FONT_FAMILIES[fontFamilyName] || '';
  const sel = $('#fontFamilySelect');
  if (sel) sel.value = fontFamilyName;
}

function initFooterPanels() {
  const desktop = !!(window.matchMedia && window.matchMedia('(min-width:821px)').matches);
  ['transferPanel', 'modePanel', 'displayPanel'].forEach((id) => {
    const el = $('#' + id);
    if (el && typeof el.open !== 'undefined') el.open = desktop;
  });
  // 分组“显示”内不再用第二层折叠：始终展开字体/悬浮设置
  const db2 = $('#displayBody');
  if (db2) db2.classList.remove('hidden');
}

function initDisplaySettings() {
  let scale = 1;
  let family = 'default';
  try { scale = Number(localStorage.getItem(FONT_SCALE_KEY)) || 1; } catch (e) {}
  try { family = localStorage.getItem(FONT_FAMILY_KEY) || 'default'; } catch (e) {}
  applyFontScale(scale);
  applyFontFamily(family);
  setDisplayOpen(isDisplayOpen());
  const box = $('#floatNextToggle');
  if (box) box.checked = isFloatNext();
  updateFloatNext();
}

function setFontScaleBy(delta) {
  applyFontScale(fontScale + delta);
}

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.papers) && Array.isArray(d.wrongBook)) {
        if (!d.progress || typeof d.progress !== 'object') d.progress = {};
        if (!Array.isArray(d.deletedPapers)) d.deletedPapers = [];
        if (!Array.isArray(d.deletedWrong)) d.deletedWrong = [];
        if (!d.clearedProgress || typeof d.clearedProgress !== 'object') d.clearedProgress = {};
        if (!Array.isArray(d.favorites)) d.favorites = [];
        return d;
      }
    }
  } catch (e) {}
  return { papers: [], wrongBook: [], progress: {}, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites: [] };
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  scheduleCloudPush();
}

let db = loadDB();
let session = null;
let currentView = 'papers';
let pendingImport = null;
let pendingTitle = '未命名试卷';

/* ============================== 腾讯云开发 CloudBase：账号登录 + 云端同步 ============================== */
const CLOUD_UID_KEY = 'shuatiben_cloud_uid';
const CLOUD_EMAIL_KEY = 'shuatiben_cloud_email';
const SYNC_COLLECTION = 'shuatiben_users';

const cloud = {
  enabled: false,
  config: null,
  app: null,
  auth: null,
  db: null,
  user: null,
  state: 'off', // off | connecting | signed-in | anon | error
  error: '',
  lastSyncAt: 0,
  syncing: false,
  pending: false,
  timer: null
};

function cloudConfig() {
  if (typeof window !== 'undefined' && window.CLOUDBASE_CONFIG && window.CLOUDBASE_CONFIG.env && window.CLOUDBASE_CONFIG.enabled !== false) {
    return window.CLOUDBASE_CONFIG;
  }
  return null;
}

function cloudSDK() {
  return (typeof window !== 'undefined' && window.cloudbase) ? window.cloudbase : null;
}

function readCloudUid() {
  try { return localStorage.getItem(CLOUD_UID_KEY) || ''; } catch (e) { return ''; }
}
function writeCloudUid(uid) {
  try {
    if (uid) localStorage.setItem(CLOUD_UID_KEY, uid);
    else localStorage.removeItem(CLOUD_UID_KEY);
  } catch (e) {}
}
function readCloudEmail() {
  try { return localStorage.getItem(CLOUD_EMAIL_KEY) || ''; } catch (e) { return ''; }
}
function writeCloudEmail(email) {
  try {
    if (email) localStorage.setItem(CLOUD_EMAIL_KEY, email);
    else localStorage.removeItem(CLOUD_EMAIL_KEY);
  } catch (e) {}
}

function normalizeDB(d) {
  return {
    papers: Array.isArray(d && d.papers) ? d.papers : [],
    wrongBook: Array.isArray(d && d.wrongBook) ? d.wrongBook : [],
    progress: (d && d.progress && typeof d.progress === 'object') ? d.progress : {},
    deletedPapers: Array.isArray(d && d.deletedPapers) ? d.deletedPapers : [],
    deletedWrong: Array.isArray(d && d.deletedWrong) ? d.deletedWrong : [],
    clearedProgress: (d && d.clearedProgress && typeof d.clearedProgress === 'object') ? d.clearedProgress : {},
    favorites: Array.isArray(d && d.favorites) ? d.favorites : []
  };
}

function recordTombstone(kind, id) {
  if (!id) return;
  if (kind === 'clearedProgress') {
    if (!db.clearedProgress || typeof db.clearedProgress !== 'object') db.clearedProgress = {};
    db.clearedProgress[id] = Math.max(db.clearedProgress[id] || 0, Date.now());
    return;
  }
  const arrKey = kind === 'deletedPapers' ? 'deletedPapers' : 'deletedWrong';
  if (!Array.isArray(db[arrKey])) db[arrKey] = [];
  if (!db[arrKey].includes(id)) db[arrKey].push(id);
}

function unionList(a, b) {
  const s = new Set(a || []);
  (b || []).forEach((x) => s.add(x));
  return Array.from(s);
}

function mergeListById(arrA, arrB, tsFn) {
  const map = new Map();
  (arrA || []).forEach((it) => { if (it && it.id != null) map.set(it.id, it); });
  (arrB || []).forEach((it) => {
    if (!it || it.id == null) return;
    const ex = map.get(it.id);
    if (!ex) map.set(it.id, it);
    else if ((tsFn(it) || 0) > (tsFn(ex) || 0)) map.set(it.id, it);
  });
  return Array.from(map.values());
}

function mergeDB(local, remote) {
  const a = normalizeDB(local);
  const b = normalizeDB(remote);
  const deletedPapers = unionList(a.deletedPapers, b.deletedPapers);
  const deletedWrong = unionList(a.deletedWrong, b.deletedWrong);
  const clearedProgress = {};
  Object.keys(a.clearedProgress || {}).forEach((k) => { clearedProgress[k] = a.clearedProgress[k] || 0; });
  Object.keys(b.clearedProgress || {}).forEach((k) => {
    clearedProgress[k] = Math.max(clearedProgress[k] || 0, b.clearedProgress[k] || 0);
  });

  const papers = mergeListById(a.papers, b.papers, (p) => p.updatedAt || p.createdAt || 0)
    .filter((p) => !deletedPapers.includes(p.id));

  const wrongBook = mergeListById(a.wrongBook, b.wrongBook, (w) => w.lastWrongAt || 0)
    .filter((w) => !deletedWrong.includes(w.id) && !deletedPapers.includes(w.paperId));

  const progress = {};
  Object.keys(a.progress || {}).concat(Object.keys(b.progress || {})).forEach((key) => {
    if (deletedPapers.includes(key)) return;
    const pa = (a.progress || {})[key];
    const pb = (b.progress || {})[key];
    let chosen;
    if (!pa) chosen = pb;
    else if (!pb) chosen = pa;
    else chosen = (pb.updatedAt || 0) > (pa.updatedAt || 0) ? pb : pa;
    if (!chosen) return;
    const clearedAt = clearedProgress[key] || 0;
    if (clearedAt && (chosen.updatedAt || 0) <= clearedAt) return;
    progress[key] = chosen;
  });

  const favorites = mergeListById(a.favorites, b.favorites, (f) => f.favoritedAt || 0);

  return { papers, wrongBook, progress, deletedPapers, deletedWrong, clearedProgress, favorites };
}

function loginStateUser(ls) {
  if (!ls) return null;
  const u = ls.user || ls;
  if (!u) return null;
  const uid = u.uid || u._id || u.openid || u.id;
  return uid ? { uid: String(uid), email: u.email || u.mail || '' } : null;
}

function syncPayload() {
  return {
    papers: db.papers,
    wrongBook: db.wrongBook,
    progress: db.progress,
    deletedPapers: db.deletedPapers || [],
    deletedWrong: db.deletedWrong || [],
    clearedProgress: db.clearedProgress || {},
    favorites: db.favorites || [],
    updatedAt: Date.now(),
    schema: 1
  };
}

function scheduleCloudPush() {
  if (!cloud.enabled || cloud.state !== 'signed-in' || !cloud.user) return;
  if (cloud.syncing) { cloud.pending = true; return; }
  const delay = (cloud.config && cloud.config.debounceMs != null) ? cloud.config.debounceMs : 1200;
  clearTimeout(cloud.timer);
  cloud.timer = setTimeout(() => { cloud.timer = null; pushDB(); }, delay);
}

async function pushDB() {
  if (!cloud.enabled || cloud.state !== 'signed-in' || !cloud.user || !cloud.db) return;
  if (cloud.syncing) { cloud.pending = true; return; }
  cloud.syncing = true;
  try {
    await cloud.db.collection(SYNC_COLLECTION).doc(cloud.user.uid).set(syncPayload());
    cloud.lastSyncAt = Date.now();
    cloud.error = '';
    renderAccountArea();
  } catch (e) {
    console.error('[cloud] push failed', e);
    cloud.error = friendlyCloudError(e, '上传');
    renderAccountArea();
  } finally {
    cloud.syncing = false;
    if (cloud.pending) { cloud.pending = false; scheduleCloudPush(); }
  }
}

function isNotFoundError(e) {
  const msg = String((e && (e.message || e.msg || e.code)) || e || '').toLowerCase();
  return msg.includes('not found') || msg.includes('notfound') || msg.includes('不存在') ||
    msg.includes('document') || msg.includes('记录') || msg.includes('404');
}

async function pullAndMerge() {
  const uid = cloud.user && cloud.user.uid;
  if (!cloud.enabled || !uid || !cloud.db) return;
  if (cloud.syncing) { cloud.pending = true; return; }
  cloud.syncing = true;
  try {
    let data = null;
    let remoteExists = false;
    try {
      const res = await cloud.db.collection(SYNC_COLLECTION).doc(uid).get();
      data = res && res.data ? res.data : null;
      remoteExists = !!(data && (Array.isArray(data.papers) || Array.isArray(data.wrongBook) || data.progress));
    } catch (e) {
      // 部分版本的 SDK 在“文档不存在”时会抛错；按空数据处理即可
      if (isNotFoundError(e)) { data = null; remoteExists = false; }
      else throw e;
    }
    const remote = normalizeDB(data);
    const lastUid = readCloudUid();
    let merged;
    if (remoteExists && lastUid && lastUid !== uid) {
      merged = remote; // 本机曾登录过其他账号：以云端为准，避免把别的账号数据混进来
    } else if (remoteExists) {
      merged = mergeDB(db, remote);
    } else {
      merged = normalizeDB(db);
    }
    db = merged;
    writeCloudUid(uid);
    saveDB();
    renderAll();
    cloud.lastSyncAt = Date.now();
    cloud.error = '';
    renderAccountArea();
  } catch (e) {
    console.error('[cloud] pull failed', e);
    cloud.error = friendlyCloudError(e, '下载');
    renderAccountArea();
  } finally {
    cloud.syncing = false;
    if (cloud.pending) { cloud.pending = false; scheduleCloudPush(); }
  }
}

function friendlyCloudError(e, op) {
  const msg = String((e && (e.message || e.msg)) || e || '');
  const low = msg.toLowerCase();
  if (low.includes('permission') || low.includes('denied') || low.includes('无权限') || low.includes('权限') || low.includes('forbidden')) {
    return `${op}失败：数据库暂无读写权限。请在云开发控制台 → 数据库 → ${SYNC_COLLECTION} 集合的“权限设置”中，把规则改为允许登录用户读写自己的文档（例如：{"read": "auth != null && doc._id == auth.uid", "write": "auth != null && doc._id == auth.uid"}）。`;
  }
  if (low.includes('collection') || low.includes('not exist') || low.includes('不存在') || low.includes('未找到') || low.includes('not found')) {
    return `${op}失败：请先在云开发控制台 → 数据库 中创建名为 ${SYNC_COLLECTION} 的集合（文档型）。`;
  }
  if (low.includes('email') || low.includes('邮箱') || low.includes('password') || low.includes('密码') || low.includes('user') || low.includes('用户') || low.includes('verify') || low.includes('激活') || low.includes('验证')) {
    return `${op}失败：${msg}（如刚注册，请先到邮箱点击激活链接；确认已在控制台开启“邮箱登录”并配置发件邮箱）。`;
  }
  return `${op}失败：${msg || '网络异常，请稍后重试'}（若环境为新版身份认证，请把 cloudbase-config.js 中的 clientId 填上）。`;
}

function renderAll() {
  renderPapers();
  renderWrongBook();
  updateBadge();
}

async function onAuthStateChange(loginState) {
  const user = loginStateUser(loginState);
  const prevUid = cloud.user && cloud.user.uid;
  cloud.user = user;
  if (user) {
    cloud.state = 'signed-in';
    cloud.error = '';
    if (user.email) writeCloudEmail(user.email);
    closeAuthModal();
    if (prevUid !== user.uid) {
      toast('登录成功，正在同步云端数据…');
      await pullAndMerge();
    } else {
      renderAccountArea();
    }
  } else {
    cloud.state = 'anon';
    cloud.user = null;
    renderAccountArea();
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
function validPassword(pwd) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,32}$/.test(String(pwd || ''));
}

async function registerAccount(email, pwd) {
  if (!cloud.auth) throw new Error('云服务未就绪，请稍后重试');
  if (typeof cloud.auth.signUpWithEmailAndPassword === 'function') {
    await cloud.auth.signUpWithEmailAndPassword(email, pwd);
    return;
  }
  if (typeof cloud.auth.signUp === 'function') {
    throw new Error('当前环境为新版身份认证，邮箱注册需邮箱验证码，暂不支持直接密码注册。请改用“登录”，或到云开发控制台开启邮箱验证码登录。');
  }
  throw new Error('当前环境未开启邮箱注册，请在云开发控制台“登录授权”中开启邮箱登录。');
}

async function loginAccount(email, pwd) {
  if (!cloud.auth) throw new Error('云服务未就绪，请稍后重试');
  let loginState;
  if (typeof cloud.auth.signInWithEmailAndPassword === 'function') {
    loginState = await cloud.auth.signInWithEmailAndPassword(email, pwd);
  } else if (typeof cloud.auth.signIn === 'function') {
    loginState = await cloud.auth.signIn({ username: email, password: pwd });
  } else {
    throw new Error('当前环境未开启邮箱登录，请在云开发控制台“登录授权”中开启邮箱登录。');
  }
  await onAuthStateChange(loginState);
  return loginState;
}

async function logoutAccount() {
  if (!cloud.auth) return;
  try {
    if (typeof cloud.auth.signOut === 'function') await cloud.auth.signOut();
  } catch (e) {
    console.error('[cloud] logout failed', e);
  }
  if (cloud.user) {
    cloud.state = 'anon';
    cloud.user = null;
    renderAccountArea();
  }
}

async function sendResetEmail(email) {
  if (!cloud.auth) throw new Error('云服务未就绪，请稍后重试');
  if (typeof cloud.auth.sendPasswordResetEmail === 'function') {
    await cloud.auth.sendPasswordResetEmail(email);
    return;
  }
  throw new Error('当前环境不支持邮箱找回密码，请在云开发控制台配置。');
}

/* ---- 登录弹窗 / 账号卡片 ---- */
let authMode = 'login';

function showAuthMsg(text, kind) {
  const el = $('#authMsg');
  el.textContent = text || '';
  el.className = 'auth-msg ' + (kind || 'info') + (text ? '' : ' hidden');
}

function updateAuthTabs() {
  $$('.auth-tab').forEach((b) => b.classList.toggle('active', b.dataset.authTab === authMode));
  const isLogin = authMode === 'login';
  const isRegister = authMode === 'register';
  const isReset = authMode === 'reset';
  $('#authPwdField').classList.toggle('hidden', isReset);
  $('#authPwd2Field').classList.toggle('hidden', !isRegister);
  $('#authModalTitle').textContent = isLogin ? '登录账号' : (isRegister ? '注册账号' : '找回密码');
  $('#authSubmit').textContent = isLogin ? '登录' : (isRegister ? '注册' : '发送重置邮件');
  const hint = $('#authHint');
  if (isLogin) hint.innerHTML = '登录后，本机数据会自动与云端合并，手机 / 电脑登录同一账号即可互通。';
  else if (isRegister) hint.innerHTML = '注册后请到邮箱点击<b>激活链接</b>完成注册，再回来登录。';
  else hint.innerHTML = '输入注册时使用的邮箱，系统会发送一封重置密码邮件。';
}

function openAuthModal(mode) {
  authMode = mode || 'login';
  $('#authEmail').value = readCloudEmail();
  $('#authPassword').value = '';
  $('#authPassword2').value = '';
  showAuthMsg('');
  updateAuthTabs();
  $('#authOverlay').classList.remove('hidden');
}

function closeAuthModal() {
  $('#authOverlay').classList.add('hidden');
}

async function submitAuth() {
  const email = String($('#authEmail').value || '').trim();
  if (!validateEmail(email)) {
    showAuthMsg('请输入正确的邮箱地址', 'bad');
    return;
  }
  if (authMode === 'reset') {
    const btn = $('#authSubmit');
    btn.disabled = true;
    try {
      await sendResetEmail(email);
      showAuthMsg('重置邮件已发送，请到邮箱按提示重设密码。', 'ok');
    } catch (e) {
      console.error(e);
      showAuthMsg(friendlyCloudError(e, '操作'), 'bad');
    } finally {
      btn.disabled = false;
    }
    return;
  }
  const pwd = String($('#authPassword').value || '');
  if (!validPassword(pwd)) {
    showAuthMsg('密码需为 8-32 位，且同时包含字母和数字。', 'bad');
    return;
  }
  const btn = $('#authSubmit');
  btn.disabled = true;
  try {
    if (authMode === 'register') {
      const pwd2 = String($('#authPassword2').value || '');
      if (pwd !== pwd2) {
        showAuthMsg('两次输入的密码不一致。', 'bad');
        return;
      }
      await registerAccount(email, pwd);
      showAuthMsg('注册成功！已向邮箱发送激活邮件，请点击邮件中的链接完成激活后登录。', 'ok');
      authMode = 'login';
      updateAuthTabs();
      $('#authPassword').value = '';
      $('#authPassword2').value = '';
    } else {
      await loginAccount(email, pwd);
      // 登录成功由 onAuthStateChange 处理：关弹窗 + 拉取合并云端数据
    }
  } catch (e) {
    console.error(e);
    showAuthMsg(friendlyCloudError(e, '操作'), 'bad');
  } finally {
    btn.disabled = false;
  }
}

function renderAccountArea() {
  const card = $('#accountCard');
  if (!card) return;
  const cfg = cloudConfig();
  const sdk = cloudSDK();
  if (!cfg || !sdk) {
    // 云端未启用（enabled:false 或未配置）：隐藏登录入口，保持纯本地使用
    card.innerHTML = '';
    card.style.display = 'none';
    return;
  }
  card.style.display = '';
  let html;
  if (cloud.state === 'signed-in' && cloud.user) {
    const email = cloud.user.email || readCloudEmail() || '已登录';
    const sub = cloud.error
      ? '⚠ ' + cloud.error
      : (cloud.lastSyncAt ? '上次同步：' + formatDate(cloud.lastSyncAt) : '已开启云端自动同步');
    html = `<div class="ac-state"><span class="ac-dot on"></span><span>云端同步已开启</span></div>
      <div class="ac-user">👤 ${escapeHtml(email)}</div>
      <div class="ac-sub">${escapeHtml(sub)}</div>
      <div class="ac-actions"><button class="btn ac-btn-out" id="accountLogoutBtn">退出登录</button></div>`;
  } else if (cloud.state === 'connecting') {
    html = `<div class="ac-state"><span class="ac-dot off"></span><span>正在连接云端…</span></div>`;
  } else {
    const tip = cloud.error ? '⚠ ' + cloud.error : '登录后，手机 / 电脑数据自动互通';
    html = `<div class="ac-state"><span class="ac-dot ${cloud.error ? 'err' : 'off'}"></span><span>未登录 · 数据仅在本机</span></div>
      <div class="ac-sub">${escapeHtml(tip)}</div>
      <div class="ac-actions"><button class="btn ac-btn-login" id="accountLoginBtn">登录 / 注册</button></div>`;
  }
  card.innerHTML = html;
  const loginBtn = $('#accountLoginBtn');
  if (loginBtn) loginBtn.addEventListener('click', () => openAuthModal('login'));
  const outBtn = $('#accountLogoutBtn');
  if (outBtn) outBtn.addEventListener('click', () => logoutAccount());
}

async function initCloud() {
  const cfg = cloudConfig();
  const sdk = cloudSDK();
  if (!cfg || !sdk) return;
  cloud.enabled = true;
  cloud.config = cfg;
  try {
    const initOpts = { env: cfg.env };
    if (cfg.region) initOpts.region = cfg.region;
    if (cfg.clientId) initOpts.clientId = cfg.clientId;
    cloud.app = sdk.init(initOpts);
    cloud.auth = cloud.app && typeof cloud.app.auth === 'function' ? cloud.app.auth({ persistence: 'local' }) : null;
    cloud.db = cloud.app && typeof cloud.app.database === 'function' ? cloud.app.database() : null;
  } catch (e) {
    cloud.state = 'error';
    cloud.error = '云服务初始化失败：' + (e && e.message ? e.message : e);
    renderAccountArea();
    return;
  }
  if (!cloud.auth) {
    cloud.state = 'error';
    cloud.error = '当前加载的云 SDK 不支持账号登录';
    renderAccountArea();
    return;
  }
  cloud.state = 'connecting';
  renderAccountArea();
  try {
    if (typeof cloud.auth.onLoginStateChanged === 'function') {
      cloud.auth.onLoginStateChanged((ls) => { onAuthStateChange(ls); });
    }
    const ls = (typeof cloud.auth.getLoginState === 'function') ? await cloud.auth.getLoginState() : null;
    await onAuthStateChange(ls);
  } catch (e) {
    console.error('[cloud] init login state failed', e);
    cloud.state = 'anon';
    cloud.error = '';
    renderAccountArea();
  }
}

/* ============================== 科目识别 ============================== */
function countKeywordScore(text, words) {
  let score = 0;
  for (const w of words) {
    const re = new RegExp(escapeRegExp(w), 'g');
    const n = (text.match(re) || []).length;
    if (n > 0) score += n * (w.length >= 2 ? 2 : 1);
  }
  return score;
}

function detectSubjectName(text) {
  const m = String(text || '').match(/数学|英语|语文|物理|化学|生物|历史|政治|道法|地理|计算机|信息技术/);
  if (!m) return '';
  const hit = m[0];
  if (hit === '道法') return '政治';
  if (hit === '信息技术') return '计算机';
  return SUBJECTS.includes(hit) ? hit : '';
}

function extractExamSubject(title) {
  const t = String(title || '').trim();
  const book = t.match(/《([^》]+)》/);
  if (book) return book[1].trim();
  const exam = t.match(/(?:^|\s)(?:\d{4}年)?([\u4e00-\u9fa5A-Za-z0-9·（）()]{2,24}?)考试/);
  if (exam && exam[1] && !/考试|模拟|真题/.test(exam[1])) return exam[1].trim();
  const tail = t.match(/^(?:\d{4}年)?(.{2,24}?)(?:模拟题|真题|预测题|试卷|测试卷|押题卷)/);
  if (tail && tail[1]) return tail[1].trim();
  return '';
}

function classifySubject(text) {
  const compact = String(text || '').replace(/\s+/g, '');
  const scores = {};
  for (const [subject, words] of Object.entries(SUBJECT_RULES)) {
    scores[subject] = countKeywordScore(compact, words);
  }

  const latin = (compact.match(/[A-Za-z]/g) || []).length;
  const han = (compact.match(/[\u4e00-\u9fa5]/g) || []).length;
  if (latin >= 14 && latin > han * 0.3) {
    scores['英语'] = (scores['英语'] || 0) + 7;
  }

  const hasMathPhrase = /函数|方程|求解|解方程|求证|几何|代数|概率|统计|数列|向量|导数|积分|坐标|已知|求值|不等式|集合|面积|体积/.test(compact);
  const hasFormula = /[=+\-*/^×÷≤≥]/.test(compact);
  if (hasMathPhrase && hasFormula) scores['数学'] = (scores['数学'] || 0) + 4;
  else if (hasMathPhrase) scores['数学'] = (scores['数学'] || 0) + 2;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const second = ranked[1] || ['其他', 0];
  if (top && top[1] >= 5 && top[1] - second[1] >= 3) return top[0];

  const named = detectSubjectName(text);
  if (named) return named;
  return '其他';
}

/* ============================== 答案标准化与判题 ============================== */
function extractLetters(s) {
  const m = String(s || '').match(/[A-Ha-hＡ-Ｈａ-ｈ]/g);
  return m ? m.map((x) => {
    if (/[Ａ-Ｈａ-ｈ]/.test(x)) return String.fromCharCode(x.charCodeAt(0) - 0xfee0).toUpperCase();
    return x.toUpperCase();
  }) : [];
}

function sortLetters(arr) {
  return Array.from(new Set(arr)).sort().join('');
}

function normalizeJudge(ans) {
  const s = String(ans || '').trim();
  if (/^(正确|对|√|是|T|TRUE)$/i.test(s)) return '对';
  if (/^(错误|错|×|否|F|FALSE)$/i.test(s)) return '错';
  return s;
}

function normalizeTextAnswer(s) {
  return String(s || '').replace(/\s+/g, '').replace(/[，。！？、；：,.!?;:]/g, '').toLowerCase();
}

function detectType(typeLabel, options, answer) {
  const label = String(typeLabel || '');
  let type = 'text';
  const hasOptions = options && options.length > 0;

  if (/多选|不定项|多项/.test(label)) type = 'multiple';
  else if (/判断|是非|对错|True|False/i.test(label)) type = 'judge';
  else if (/填空|简答|问答|主观|计算|名词解释/.test(label)) type = 'text';
  else if (hasOptions) type = 'single';

  if (hasOptions && type === 'single') {
    const letters = extractLetters(answer).join('');
    if (letters.length >= 2) type = 'multiple';
  }
  if (!hasOptions && type === 'text') {
    if (/^(正确|错误|对|错|√|×|T|F)$/i.test(String(answer || '').trim())) type = 'judge';
  }
  return type;
}

function finalizeQuestion(raw, index) {
  const question = String(raw.question || '').trim();
  const options = (raw.options || []).map((o) => String(o || '').trim()).filter(Boolean);
  let answer = String(raw.answer == null ? '' : raw.answer).trim();
  const analysis = String(raw.analysis || '').trim();
  const typeLabel = String(raw.typeLabel || '').trim();
  const subject = String(raw.subject || '').trim();
  const type = detectType(typeLabel, options, answer);

  if (options.length && (type === 'single' || type === 'multiple')) {
    const letters = extractLetters(answer);
    if (letters.length) answer = type === 'multiple' ? sortLetters(letters) : letters[0];
  } else if (type === 'judge') {
    answer = normalizeJudge(answer);
  } else if (type === 'text') {
    answer = answer.replace(/^[【\[〖]?\s*["“]?\s*(?:答案|正确答案|参考答案)\s*["”]?\s*[】\]〗]?\s*[:：]?\s*/i, '');
  }

  return {
    id: uid('q'),
    question,
    options,
    answer,
    analysis,
    type,
    typeLabel,
    subject
  };
}

function judgeAnswer(q, userAnswer) {
  if (!q) return false;
  if (q.type === 'multiple') {
    const a = sortLetters(extractLetters(q.answer));
    const u = sortLetters(extractLetters(userAnswer));
    return !!a && a === u;
  }
  if (q.type === 'judge') {
    return normalizeJudge(userAnswer) === normalizeJudge(q.answer);
  }
  if (q.type === 'text') {
    const accepted = String(q.answer || '').split(/[|｜；;]/).map(normalizeTextAnswer).filter(Boolean);
    const u = normalizeTextAnswer(userAnswer);
    return accepted.some((a) => a === u);
  }
  const a = extractLetters(q.answer)[0] || normalizeTextAnswer(q.answer);
  const u = extractLetters(userAnswer)[0] || normalizeTextAnswer(userAnswer);
  return !!a && a === u;
}

function typeName(q) {
  const map = { single: '单选题', multiple: '多选题', judge: '判断题', text: '填空题/简答题' };
  return map[q.type] || q.type;
}

function buildScoring(items) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length || 1;
  const base = Math.floor(100 / total);
  const rem = 100 - base * total;
  const perIndex = list.map((_, i) => base + (i < rem ? 1 : 0));
  const perType = {};
  const perTypeScore = {};
  list.forEach((it, i) => {
    const k = it && it.q ? typeName(it.q) : '题目';
    perType[k] = (perType[k] || 0) + 1;
    perTypeScore[k] = (perTypeScore[k] || 0) + perIndex[i];
  });
  return { total, perIndex, perType, perTypeScore };
}

function answerDisplay(q) {
  if (q.type === 'multiple') {
    return q.answer || '（未提供）';
  }
  if (q.options && q.options.length) {
    const letters = extractLetters(q.answer);
    if (letters.length === 1) {
      const idx = letters[0].charCodeAt(0) - 65;
      const text = q.options[idx] || '';
      return `${letters[0]}${text ? '．' + text : ''}`;
    }
  }
  return q.answer || '（未提供）';
}

/* ============================== 试卷解析 ============================== */
function splitInlineOptions(line) {
  const re = /[A-Ha-hＡ-Ｈａ-ｈ]\s*[.、．:：\)）]/g;
  const markers = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    markers.push({ start: m.index, end: m.index + m[0].length });
  }
  if (markers.length < 2) return null;
  const beforeFirst = line.slice(0, markers[0].start).trim();
  if (beforeFirst !== '' && markers.length < 3) return null;
  const parts = [];
  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].end;
    const end = i + 1 < markers.length ? markers[i + 1].start : line.length;
    parts.push(line.slice(start, end).trim());
  }
  return parts.filter((p) => p !== '');
}

function extractInlineOptions(text) {
  const re = /[A-Ha-hＡ-Ｈａ-ｈ]\s*[.、．:：\)）]/g;
  let m;
  let first = null;
  let count = 0;
  while ((m = re.exec(text)) !== null) {
    count++;
    if (!first) first = { start: m.index };
  }
  if (!first || count < 2 || first.start <= 0) return null;
  const options = splitInlineOptions(text.slice(first.start));
  if (!options || options.length < 2) return null;
  return { question: text.slice(0, first.start).trim(), options };
}

function extractAnswerAnalysis(text) {
  const s = String(text == null ? '' : text);
  const anaIdx = s.indexOf('解析');
  let answer = '';
  let analysis = '';
  if (anaIdx >= 0) {
    analysis = s.slice(anaIdx + 2).replace(/^[】\]〗]?\s*[:：]?\s*/, '').trim();
    const beforeAna = s.slice(0, anaIdx);
    const ansIdx = beforeAna.lastIndexOf('答案');
    if (ansIdx >= 0) {
      answer = beforeAna.slice(ansIdx + 2).replace(/^[】\]〗]?\s*[:：]?\s*/, '').trim();
    }
  } else {
    const ansIdx = s.lastIndexOf('答案');
    if (ansIdx >= 0) {
      answer = s.slice(ansIdx + 2).replace(/^[】\]〗]?\s*[:：]?\s*/, '').trim();
    }
  }
  // 答案解析 这种“答案”只用于提示“解析”，不当作答案
  if (analysis && !answer) {
    const before = s.slice(0, anaIdx);
    if (/答案解析$/.test(before)) { /* ignore */ }
  }
  return { answer, analysis };
}
function splitAnswerAnalysis(str) { return extractAnswerAnalysis(str); }

function isAnswerSectionHeader(line) {
  const t = line.replace(/^[一二三四五六七八九十]+[、.．]\s*/, '').replace(/[【\[\]〖〗"“”】]/g, '').trim();
  return /^(?:参考答案|答案与解析|答案解析|试题答案|答案详解|参考答案及解析|参考答案与解析|答案及解析|试题答案解析)(?:[:：]?\s*)$/.test(t)
    || /^答案[:：]?\s*$/.test(t)
    || /^(?:解析|答案解析|试题解析|详解|分析|本题解析)$/.test(t.replace(/[【\[\]"“”】:：\s]/g, ''));
}

function addAnswerEntry(entries, num, answer, analysis) {
  if (!answer && !analysis) return;
  const existing = entries.find((e) => e.num === num && (!e.answer || !e.analysis));
  if (existing) {
    if (answer && !existing.answer) existing.answer = answer;
    if (analysis && !existing.analysis) existing.analysis = analysis;
    return;
  }
  entries.push({ num, answer: answer || '', analysis: analysis || '' });
}

function parseAnswerKeyLine(line, entries) {
  const trimmed = String(line || '').trim();
  if (!trimmed) return false;

  const range = trimmed.match(/^(\d+)\s*[-–~至]\s*(\d+)\s*[:：]?\s*([A-Ha-hＡ-Ｈａ-ｈ]+|[√×对错正确错误]+)\s*$/);
  if (range) {
    const start = parseInt(range[1], 10);
    const end = parseInt(range[2], 10);
    const letters = range[3].replace(/\s/g, '');
    for (let n = start; n <= end; n++) {
      const ans = letters[n - start];
      if (ans) addAnswerEntry(entries, n, ans, '');
    }
    return true;
  }

  const single = trimmed.match(/^(\d+)\s*[.、．]\s*(.+)$/);
  if (single) {
    const num = parseInt(single[1], 10);
    const rest = single[2].trim();
    const hasMoreNumbers = /(?:^|\s)\d+\s*[.、．]/.test(rest);
    if (!hasMoreNumbers) {
      const sa = splitAnswerAnalysis(rest);
      let answer = sa.answer;
      if (!answer && !sa.analysis && rest.indexOf('答案') < 0 && rest.indexOf('解析') < 0) answer = rest.trim();
      addAnswerEntry(entries, num, answer, sa.analysis);
      return true;
    }
  }

  const tokenRe = /(?:^|\s)(\d+)\s*[.、．]\s*([A-Ha-hＡ-Ｈａ-ｈ]+|[√×对错正确错误]+)(?=\s|$)/g;
  let tm;
  let found = false;
  while ((tm = tokenRe.exec(trimmed)) !== null) {
    addAnswerEntry(entries, parseInt(tm[1], 10), tm[2], '');
    found = true;
  }
  if (found) return true;

  // 只要有“答案/解析”字样，就按包含式规则拆分为答案/解析（针对当前最后一条）
  const ea = extractAnswerAnalysis(trimmed);
  if (ea.answer || ea.analysis) {
    if (entries.length) {
      const last = entries[entries.length - 1];
      if (ea.answer && !last.answer) last.answer = ea.answer;
      if (ea.analysis) last.analysis = last.analysis ? last.analysis + '\n' + ea.analysis : ea.analysis;
    }
    return true;
  }
  return false;
}

function normalizeAnswerForQuestion(q, rawAnswer) {
  const s = String(rawAnswer == null ? '' : rawAnswer).trim();
  if (q.options && q.options.length && (q.type === 'single' || q.type === 'multiple')) {
    const letters = extractLetters(s);
    if (letters.length) return q.type === 'multiple' ? sortLetters(letters) : letters[0];
  }
  if (!q.options.length && /^(正确|错误|对|错|√|×|T|F)$/i.test(s)) {
    q.type = 'judge';
    return normalizeJudge(s);
  }
  if (q.type === 'judge') return normalizeJudge(s);
  return s.replace(/^[【\[〖]?\s*["“]?\s*(?:答案|正确答案|参考答案)\s*["”]?\s*[】\]〗]?\s*[:：]?\s*/i, '');
}

function applyAnswerEntries(questions, nums, entries) {
  if (!entries || !entries.length) return;
  const pos = {};
  nums.forEach((num, qi) => {
    if (num == null) return;
    const idx = pos[num] || 0;
    let seen = 0;
    let found = null;
    for (const e of entries) {
      if (e.num === num) {
        if (seen === idx) { found = e; break; }
        seen++;
      }
    }
    if (!found) return;
    pos[num] = idx + 1;
    const q = questions[qi];
    if (found.answer) q.answer = normalizeAnswerForQuestion(q, found.answer);
    if (found.analysis) q.analysis = q.analysis ? q.analysis + '\n' + found.analysis : found.analysis;
  });
}

function parseTextPaper(text, fallbackTitle) {
  return parseTextPapers(text, fallbackTitle)[0] || { title: fallbackTitle || '未命名试卷', subject: '其他', questions: [], warnings: [] };
}

function parseTextPapers(text, fallbackTitle) {
  const lines = String(text || '').split(/\r?\n/);
  const papers = [];
  let paper = { title: '', subject: '', fallback: '', answerEntries: [], meta: {} };
  let blocks = [];
  let cur = null;
  let answerMode = false;
  let pendingAnswerLabel = false;
  let pendingAnalysisLabel = false;

  const isSectionLine = (l) => /^[一二三四五六七八九十]+[、.．]/.test(l) || /^第[一二三四五六七八九十]+[部分大题]/.test(l);
  const isPaperTitle = (l) => {
    if (!l || isSectionLine(l)) return false;
    if (/^(?:科目|学科)\s*[:：]/.test(l)) return false;
    if (/^([A-Ha-hＡ-Ｈａ-ｈ])\s*[.、．:：）]/.test(l)) return false;
    if (/^(?:[【〖]?\s*(?:答案|正确答案|参考答案)\s*[】〗]?|Answer)\s*[:：]?/i.test(l)) return false;
    if (/^(?:[【〖]?\s*(?:解析|答案解析|试题解析|详解|分析)\s*[】〗]?|Explanation|Analysis)\s*[:：]?/i.test(l)) return false;
    return /试卷|模拟卷|测试卷|真题卷|押题卷|模拟题|真题|预测题|期中|期末|月考|入学|摸底|单元测试|综合测试|练习卷|测验|考试|试题卷|考试.{0,16}试题|第[一二三四五六七八九十\d]+套/.test(l);
  };

  const flushQuestion = () => {
    if (cur && (cur.question || cur.answer || cur.options.length)) blocks.push(cur);
    cur = null;
    pendingAnswerLabel = false;
    pendingAnalysisLabel = false;
  };

  const buildPaper = () => {
    const nums = blocks.map((b) => b.num);
    const questions = blocks.map((b, i) => finalizeQuestion(b, i));
    applyAnswerEntries(questions, nums, paper.answerEntries || []);
    const warnings = [];
    questions.forEach((q, i) => {
      if (!q.answer) warnings.push(`第 ${i + 1} 题未识别到答案`);
    });
    if (!questions.length) return null;
    const contentText = questions.map((q) => q.question).join('\n');
    const titleText = paper.title || paper.fallback || fallbackTitle || ''; // 科目优先依据标题/文件名
    const bookSubject = extractExamSubject(titleText);
    const subject = paper.subject || bookSubject || detectSubjectName(titleText) || classifySubject(contentText);
    return {
      title: paper.title || paper.fallback || fallbackTitle || `试卷 ${papers.length + 1}`,
      subject,
      examMeta: paper.meta || {},
      questions,
      warnings
    };
  };

  const startNewPaper = (title) => {
    flushQuestion();
    if (blocks.length) {
      const built = buildPaper();
      if (built) papers.push(built);
      blocks = [];
      paper = { title: '', subject: '', fallback: '', answerEntries: [], meta: {} };
    }
    answerMode = false;
    pendingAnswerLabel = false;
    pendingAnalysisLabel = false;
    paper.title = title;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const heading = line.match(/^#{1,6}\s*(.*)$/);
    if (heading) {
      const txt = heading[1].trim();
      if (isAnswerSectionHeader(txt) && (blocks.length || cur)) {
        flushQuestion();
        answerMode = true;
        continue;
      }
      if (isPaperTitle(txt)) {
        startNewPaper(txt);
      } else if (/^(?:科目|学科)\s*[:：]/.test(txt)) {
        paper.subject = txt.replace(/^(?:科目|学科)\s*[:：]\s*/, '').trim();
      }
      continue;
    }

    let m = line.match(/^(?:科目|学科)\s*[:：]\s*(.+)$/);
    if (m) {
      paper.subject = m[1].trim();
      continue;
    }
    m = line.match(/^(?:考试时间|答题时间|时间)\s*[:：]\s*(.+)$/);
    if (m) { paper.meta = paper.meta || {}; paper.meta.time = m[1].trim(); continue; }
    m = line.match(/^(?:试卷满分|满分|总分)\s*[:：]\s*(.+)$/);
    if (m) { paper.meta = paper.meta || {}; paper.meta.fullScore = m[1].trim(); continue; }
    m = line.match(/^(?:合格标准|合格线|及格线|及格标准)\s*[:：]\s*(.+)$/);
    if (m) { paper.meta = paper.meta || {}; paper.meta.passLine = m[1].trim(); continue; }
    m = line.match(/^(?:命题依据|命题依据说明|命题范围)\s*[:：]\s*(.+)$/);
    if (m) { paper.meta = paper.meta || {}; paper.meta.basis = m[1].trim(); continue; }
    m = line.match(/^(?:考试说明|答题说明|考生须知)\s*[:：]\s*(.+)$/);
    if (m) { paper.meta = paper.meta || {}; paper.meta.instructions = m[1].trim(); continue; }

    if (pendingAnalysisLabel) {
      if (cur) {
        const text = line.replace(/^[【\[〖]?\s*["“]?\s*(?:解析|答案解析|试题解析|详解|分析)\s*["”]?\s*[】\]〗]?\s*[:：]?\s*/, '').trim();
        if (text) cur.analysis = cur.analysis ? cur.analysis + '\n' + text : text;
      }
      pendingAnalysisLabel = false;
      continue;
    }
    if (pendingAnswerLabel) {
      if (/^\s*\d+\s*[.、．]/.test(line)) {
        answerMode = true; // 后面是“1. B / 2. C”这种答案区
        pendingAnswerLabel = false;
        // 不 continue：交给下方 answerMode 分支处理
      } else {
        const sa = splitAnswerAnalysis(line);
        if (cur) {
          let ans = sa.answer;
          if (!ans && !sa.analysis && line.indexOf('答案') < 0 && line.indexOf('解析') < 0) ans = line.trim();
          cur.answer = ans;
          if (sa.analysis) cur.analysis = sa.analysis;
        }
        pendingAnswerLabel = false;
        continue;
      }
    }
    if (isAnswerSectionHeader(line) && (blocks.length || cur)) {
      const clean = line.replace(/[【\[\]〖〗"“”】:：\s]/g, '').replace(/^[一二三四五六七八九十]+[、.．]/, '');
      if (cur && /^(?:答案|参考答案)$/.test(clean)) {
        pendingAnswerLabel = true; // 本行只是“参考答案”，答案在下一行
        continue;
      }
      if (cur && /^(?:解析|答案解析|试题解析|详解|分析)$/.test(clean)) {
        pendingAnalysisLabel = true; // 本行只是“解析”，解析内容在下一行
        continue;
      }
      flushQuestion();
      answerMode = true;
      continue;
    }

    if (answerMode && isPaperTitle(line)) {
      startNewPaper(line);
      continue;
    }

    if (answerMode) {
      parseAnswerKeyLine(line, paper.answerEntries);
      continue;
    }

    if (isPaperTitle(line)) {
      startNewPaper(line);
      continue;
    }
    if (isSectionLine(line)) {
      flushQuestion();
      continue;
    }

    let rest = line;
    let typeLabel = '';
    m = rest.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (m) {
      typeLabel = m[1].trim();
      rest = m[2].trim();
    }
    m = rest.match(/^(\d+)[.、．、]\s*(.*)$/) || rest.match(/^Q\.?\s*(\d+)\s*[.、．:：]\s*(.*)$/i);
    if (m) {
      flushQuestion();
      const qText = m[2].trim();
      const inline = extractInlineOptions(qText);
      cur = {
        num: parseInt(m[1], 10),
        typeLabel,
        question: inline ? inline.question : qText,
        options: inline ? inline.options : [],
        answer: '',
        analysis: '',
        subject: ''
      };
      continue;
    }

    if (!cur) {
      const metaLike = line.indexOf('解析') >= 0 || line.indexOf('答案') >= 0 || /^[【\[〖]?\s*["“]?\s*(?:详解|Answer|Explanation|Analysis)/i.test(line);
      const optLike = /^([A-Ha-hＡ-Ｈａ-ｈ])\s*[.、．:：）]/.test(line);
      if (!paper.title && !paper.fallback && !metaLike && !optLike) paper.fallback = line;
      continue;
    }

    m = line.match(/^([A-Ha-hＡ-Ｈａ-ｈ])\s*[.、．:：）]\s*(.+)$/);
    if (m && cur.options.length < 8) {
      const inline = splitInlineOptions(line);
      if (inline && inline.length > 1) {
        cur.options.push(...inline);
      } else {
        cur.options.push(m[2].trim());
      }
      continue;
    }

    const ea = extractAnswerAnalysis(line);
    if (ea.answer || ea.analysis) {
      if (ea.answer) cur.answer = ea.answer;
      if (ea.analysis) cur.analysis = cur.analysis ? cur.analysis + '\n' + ea.analysis : ea.analysis;
      continue;
    }
    m = line.match(/^[【\[〖]?\s*["“]?\s*(?:详解|分析)\s*["”]?\s*[】\]〗]?\s*[:：]?\s*(.*)$/i);
    if (m) {
      cur.analysis = m[1].trim();
      continue;
    }

    m = line.match(/^(?:科目|学科)\s*[:：]\s*(.+)$/);
    if (m) {
      cur.subject = m[1].trim();
      continue;
    }
    m = line.match(/^(?:题型)\s*[:：]\s*(.+)$/);
    if (m) {
      cur.typeLabel = m[1].trim();
      continue;
    }

    if (!cur.answer) cur.question += '\n' + line;
    else cur.analysis = (cur.analysis ? cur.analysis + '\n' : '') + line;
  }
  flushQuestion();

  const built = buildPaper();
  if (built) papers.push(built);
  return papers;
}


function normalizeJSONOptions(opts) {
  if (!opts) return [];
  if (Array.isArray(opts)) {
    return opts.map((o) => {
      if (typeof o === 'string') return o.trim();
      if (o && typeof o === 'object') return String(o.text || o.value || o.content || '').trim();
      return '';
    }).filter(Boolean);
  }
  if (typeof opts === 'string') return opts.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function stringifyAnswer(a) {
  if (Array.isArray(a)) return a.join('');
  if (a == null) return '';
  return String(a);
}

function parseJSONPaper(text, fallbackTitle) {
  return parseJSONPapers(text, fallbackTitle)[0] || { title: fallbackTitle || '未命名试卷', subject: '其他', questions: [], warnings: [] };
}

function parseJSONPapers(text, fallbackTitle) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return [{ title: fallbackTitle || '未命名试卷', subject: '其他', questions: [], warnings: ['JSON 解析失败：' + e.message] }];
  }

  let sources = [];
  if (Array.isArray(data)) {
    const firstIsQuestion = data.length && data[0] && typeof data[0] === 'object' && (data[0].question || data[0].stem || data[0].content || data[0].options);
    if (firstIsQuestion) {
      sources.push({ title: fallbackTitle || '未命名试卷', subject: '', questions: data });
    } else {
      sources = data.filter((p) => p && typeof p === 'object' && Array.isArray(p.questions));
    }
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.papers)) sources = data.papers;
    else if (Array.isArray(data.questions)) sources.push(data);
    else sources.push({ title: data.title || data.name || fallbackTitle || '未命名试卷', subject: data.subject || data['科目'] || '', questions: [data] });
  }

  const papers = sources.map((src, idx) => {
    const title = src.title || src.name || (sources.length > 1 ? `试卷 ${idx + 1}` : fallbackTitle) || '未命名试卷';
    const subject = src.subject || src['科目'] || '';
    const rawQuestions = Array.isArray(src.questions) ? src.questions : [];
    const warnings = [];
    const questions = rawQuestions.map((q, i) => {
      const rawQ = {
        question: q.question || q.stem || q.title || q.content || q.text || '',
        options: normalizeJSONOptions(q.options || q.choices || q.items || q.answers),
        answer: stringifyAnswer(q.answer != null ? q.answer : (q.correct != null ? q.correct : (q.key != null ? q.key : q.answerKey))),
        analysis: q.analysis || q.explanation || q['解析'] || q['详解'] || '',
        subject: q.subject || q['科目'] || '',
        typeLabel: q.type || q['题型'] || ''
      };
      const fq = finalizeQuestion(rawQ, i);
      if (!fq.answer) warnings.push(`第 ${i + 1} 题未识别到答案`);
      return fq;
    }).filter((q) => q.question);
    const allText = questions.map((q) => q.question + '\n' + q.analysis).join('\n');
    const titleSrc = title || fallbackTitle || ''; // 科目优先依据标题/文件名
    return {
      title,
      subject: subject || extractExamSubject(titleSrc) || detectSubjectName(titleSrc) || classifySubject(allText || text || titleSrc),
      examMeta: (src && src.examMeta) || {},
      questions,
      warnings
    };
  }).filter((p) => p.questions.length);

  if (!papers.length) {
    return [{ title: fallbackTitle || '未命名试卷', subject: '其他', questions: [], warnings: ['未解析到任何题目'] }];
  }
  return papers;
}

function parseAuto(text, fallbackTitle) {
  const trimmed = String(text || '').trim();
  const papers = trimmed.startsWith('[') || trimmed.startsWith('{')
    ? parseJSONPapers(trimmed, fallbackTitle)
    : parseTextPapers(trimmed, fallbackTitle);
  return { papers };
}

/* ============================== 错题集 ============================== */
function upsertWrong(paper, q, lastAnswer) {
  const found = db.wrongBook.find((w) => w.paperId === paper.id && w.questionId === q.id);
  if (found) {
    found.wrongCount = (found.wrongCount || 1) + 1;
    found.lastWrongAt = Date.now();
    found.lastAnswer = lastAnswer;
    found.question = cloneQuestion(q);
  } else {
    db.wrongBook.unshift({
      id: uid('w'),
      paperId: paper.id,
      paperTitle: paper.title,
      subject: paper.subject,
      questionId: q.id,
      question: cloneQuestion(q),
      wrongCount: 1,
      lastWrongAt: Date.now(),
      lastAnswer
    });
  }
}

function removeWrongById(id) {
  db.wrongBook = db.wrongBook.filter((w) => w.id !== id);
  recordTombstone('deletedWrong', id);
}

/* ============================== 进度保存 ============================== */
function ensureProgressStore() {
  if (!db.progress || typeof db.progress !== 'object') db.progress = {};
}

function savePaperProgress() {
  if (!session || session.mode !== 'paper' || !session.paperId) return;
  ensureProgressStore();
  const answers = session.answers.map((a) => {
    if (!a) return null;
    return {
      selected: a.selected || '',
      text: a.text || '',
      submitted: !!a.submitted,
      correct: !!a.correct,
      userAnswer: a.userAnswer || ''
    };
  });
  db.progress[session.paperId] = {
    mode: 'paper',
    title: session.title,
    subject: session.subject,
    index: session.index,
    answers,
    total: session.items.length,
    updatedAt: Date.now()
  };
  saveDB();
}

function getPaperProgress(paperId) {
  ensureProgressStore();
  return db.progress[paperId] || null;
}

function clearPaperProgress(paperId) {
  ensureProgressStore();
  const had = !!db.progress[paperId];
  if (had) delete db.progress[paperId];
  if (had) {
    if (!db.clearedProgress || typeof db.clearedProgress !== 'object') db.clearedProgress = {};
    db.clearedProgress[paperId] = Math.max(db.clearedProgress[paperId] || 0, Date.now());
    saveDB();
  }
}

function firstUnansweredIndex(answers) {
  for (let i = 0; i < (answers || []).length; i++) {
    if (!answers[i] || !answers[i].submitted) return i;
  }
  return -1;
}

function restoreAnswersFromProgress(progress, itemCount) {
  const answers = [];
  if (progress && Array.isArray(progress.answers)) {
    for (let i = 0; i < itemCount; i++) {
      const a = progress.answers[i];
      answers.push(a ? {
        selected: a.selected || '',
        text: a.text || '',
        submitted: !!a.submitted,
        correct: !!a.correct,
        userAnswer: a.userAnswer || ''
      } : null);
    }
  }
  return answers;
}

/* ============================== 视图切换 ============================== */
function updateBadge() {
  const badge = $('#wrongBadge');
  if (badge) badge.textContent = db.wrongBook.length;
  const fav = $('#favBadge');
  if (fav) fav.textContent = (db.favorites || []).length;
}

function setTopbar(title, subtitle) {
  $('#topbar').innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle || '')}</p>`;
}

function showView(view) {
  currentView = view;
  $$('.view').forEach((v) => v.classList.remove('active'));
  const target = $('#view-' + view);
  if (target) target.classList.add('active');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  updateBadge();
  updateFloatNext();
}

/* ============================== 试卷库 ============================== */
let paperSubjectFilter = 'all';
function subjectSelectHtml(list) {
  const opts = ['<option value="all">📚 全部科目</option>'].concat((list || []).map((s) => `<option value="${escapeHtml(s)}"${paperSubjectFilter === s ? ' selected' : ''}>${escapeHtml(s)}</option>`)).join('');
  return `<div class="subject-filter"><label>科目</label><select id="paperSubjectFilter">${opts}</select></div>`;
}
function bindSubjectFilter() {
  const sel = $('#paperSubjectFilter');
  if (!sel) return;
  sel.addEventListener('change', () => {
    paperSubjectFilter = sel.value;
    renderPapers();
  });
}
function renderPapers() {
  setTopbar('试卷库', '按科目自动归档，点击一套试卷开始刷题');
  const root = $('#view-papers');
  if (!db.papers.length) {
    root.innerHTML = `
      <div class="empty">
        <div class="emoji">📚</div>
        <h3>还没有试卷</h3>
        <p>上传一份试卷，系统会自动识别科目并拆分为刷题模式。</p>
        <button class="btn btn-solid" data-action="open-upload">＋ 上传第一份试卷</button>
        <button class="btn btn-outline" data-action="load-sample">载入示例试卷体验</button>
      </div>`;
    return;
  }

  const subjectKeys = [];
  for (const p of db.papers) { const k = p.subject || '其他'; if (!subjectKeys.includes(k)) subjectKeys.push(k); }
  const orderedSubjects = [...SUBJECTS.filter((s) => subjectKeys.includes(s)), ...subjectKeys.filter((s) => !SUBJECTS.includes(s))];
  const filteredPapers = paperSubjectFilter === 'all' ? db.papers : db.papers.filter((x) => (x.subject || '其他') === paperSubjectFilter);
  const groups = {};
  for (const p of filteredPapers) {
    const key = p.subject || '其他';
    (groups[key] = groups[key] || []).push(p);
  }
  if (!Object.keys(groups).length) {
    root.innerHTML = `<div class="library-toolbar">${subjectSelectHtml(orderedSubjects)}</div>
      <div class="empty"><div class="emoji">🗂️</div><h3>该科目暂无试卷</h3>
      <button class="btn btn-outline" data-action="clear-subject-filter">查看全部科目</button></div>`;
    bindSubjectFilter();
    return;
  }
  const groupLatest = (list) => list.reduce((m, p) => Math.max(m, p.lastOpenedAt || 0), 0);
  const practiced = Object.keys(groups).filter((s) => groupLatest(groups[s]) > 0).sort((a, b) => groupLatest(groups[b]) - groupLatest(groups[a]));
  const others = Object.keys(groups).filter((s) => !practiced.includes(s));
  const orderedKeys = [...practiced, ...SUBJECTS.filter((s) => others.includes(s)), ...others.filter((s) => !SUBJECTS.includes(s))];
  let html = '<div class="library-toolbar">' + subjectSelectHtml(orderedSubjects) + '</div>';
  for (const subject of orderedKeys) {
    const papers = groups[subject].slice().sort((a, b) => ((b.lastOpenedAt || 0) - (a.lastOpenedAt || 0)) || ((b.createdAt || 0) - (a.createdAt || 0)));
    html += `<div class="subject-group"><details open><summary class="subject-head">
        <span class="subject-dot" style="background:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}"></span>
        <h3>${escapeHtml(subject)}</h3>
        <span class="count">${papers.length} 套试卷 <span class="caret">▾</span></span>
      </summary><div class="grid">`;

﻿    for (const p of papers) {
      const wrongCount = db.wrongBook.filter((w) => w.paperId === p.id).length;
      const progress = (db.progress || {})[p.id];
      const hasProgress = !!progress;
      const roundDone = hasProgress && paperRoundDone(p, progress); // 本轮已全部答完，但尚未点“重新开始”结束
      const hasRecord = !!(p.lastRecord && p.lastRecord.answers);
      const showRedo = hasProgress || hasRecord;
      const mainLabel = hasProgress ? (roundDone ? '查看报告' : '继续上次') : '开始刷题';
      const redoLabel = hasProgress ? '重新开始' : '重新答题';
      const last = p.lastResult
        ? `<span>📈 上次 ${p.lastResult.accuracy}% · ${p.lastResult.correct}/${p.lastResult.total}</span>`
        : `<span>🕒 ${formatDate(p.createdAt)}</span>`;
      const statusTag = roundDone
        ? '<span class="tag" style="background:#e9f9ef;color:#16a34a">✅ 本轮已答完</span>'
        : (hasProgress ? '<span class="tag" style="background:#fff3cd;color:#8a6d1a">⏸ 未完成</span>' : (hasRecord ? '<span class="tag" style="background:#e9f9ef;color:#16a34a">✅ 已完成</span>' : ''));
      html += `<div class="card">
        <div class="card-top">
          <span class="tag tag-subject" style="background:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}22;color:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}">${escapeHtml(subject)}</span>
          <span class="tag">${p.questions.length} 题</span>
          ${statusTag}
          ${wrongCount ? `<span class="tag" style="background:#fdeef2;color:#e11d48">错题 ${wrongCount}</span>` : ''}
        </div>
        <h4>${escapeHtml(p.title)}</h4>
        <div class="meta">${last}<span>💯 满分100 · 每题约${Math.round(100 / Math.max(1, p.questions.length))} 分</span></div>
        <div class="card-actions">
          <button class="btn btn-solid" data-action="${hasProgress ? 'start-paper' : 'start-paper-info'}" data-id="${p.id}">${mainLabel}</button>
          ${showRedo ? `<button class="btn btn-outline btn-sm" data-action="restart-paper" data-id="${p.id}">${redoLabel}</button>` : ''}
          ${wrongCount ? `<button class="btn btn-outline" data-action="start-paper-wrong" data-id="${p.id}">错题重练</button>` : ''}
          <button class="btn btn-outline btn-sm" data-action="copy-paper" data-id="${p.id}" title="复制本卷数据（可粘贴到其它设备导入）">📋 复制本卷</button>
          <button class="btn btn-outline btn-sm" data-action="edit-paper" data-id="${p.id}">编辑</button>
          <button class="btn btn-danger-soft btn-sm" data-action="delete-paper" data-id="${p.id}">删除</button>
        </div>
      </div>`;
    }
    html += `</div></details></div>`;
  }
  root.innerHTML = html;
  bindSubjectFilter();
}

/* ============================== 错题集视图 ============================== */
function renderWrongBook() {
  setTopbar('错题集', '答对自动消除，答错继续保留，可反复重练');
  const root = $('#view-wrong');
  if (!db.wrongBook.length) {
    root.innerHTML = `
      <div class="empty">
        <div class="emoji">🎯</div>
        <h3>错题集是空的</h3>
        <p>刷题时答错的题目会自动进入这里。答对后会自动消除。</p>
      </div>`;
    return;
  }

  const groups = {};
  for (const w of db.wrongBook) {
    const key = w.subject || '其他';
    (groups[key] = groups[key] || []).push(w);
  }
  const orderedKeys = [...SUBJECTS.filter((s) => groups[s]), ...Object.keys(groups).filter((s) => !SUBJECTS.includes(s))];

  let html = `<div class="wrong-toolbar">
      <span><b>${db.wrongBook.length}</b> 道错题待攻克</span>
      <span class="spacer"></span>
      <button class="btn btn-solid" data-action="practice-all-wrong">全部重练</button>
      <button class="btn btn-danger-soft" data-action="clear-wrong">清空错题集</button>
    </div>`;

  for (const subject of orderedKeys) {
    const list = groups[subject];
    html += `<div class="subject-group"><details open><summary class="subject-head">
        <span class="subject-dot" style="background:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}"></span>
        <h3>${escapeHtml(subject)}</h3>
        <span class="count">${list.length} 道 <span class="caret">▾</span></span>
      </summary>`;

    for (const w of list) {
      html += `<div class="wrong-entry">
        <div class="q-body">
          <p class="q-text">${escapeHtml(w.question.question)}</p>
          <div class="meta">
            <span>📄 ${escapeHtml(w.paperTitle)}</span>
            <span>❌ 答错 ${w.wrongCount} 次</span>
            ${w.lastAnswer ? `<span>上次答案：${escapeHtml(w.lastAnswer)}</span>` : ''}
            <span>${formatDate(w.lastWrongAt)}</span>
          </div>
          <details class="hint">
            <summary>查看答案与解析</summary>
            <div style="margin-top:8px"><b>答案：</b>${escapeHtml(answerDisplay(w.question))} <button type="button" class="speaker-btn analysis-speaker" data-action="speak-wrong-analysis" data-id="${w.id}" title="语音播报解析">🔊</button><br/><b>解析：</b>${escapeHtml(w.question.analysis || '（无解析）')}</div>
          </details>
          <div class="actions">
            <button class="btn btn-solid btn-sm" data-action="practice-wrong-one" data-id="${w.id}">重新作答</button>
            <button class="btn btn-outline btn-sm" data-action="remove-wrong" data-id="${w.id}">移除</button>
          </div>
        </div>
      </div>`;
    }
    html += `</details></div>`;
  }
  root.innerHTML = html;
}


/* ============================== 收藏题目 ============================== */
function ensureFavorites() {
  if (!Array.isArray(db.favorites)) db.favorites = [];
}
function isQuestionFavorited(paperId, qid) {
  ensureFavorites();
  return db.favorites.some((f) => f.paperId === (paperId || '') && f.questionId === qid);
}

// 收藏 / 取消收藏；返回 'added' | 'removed' | 'none'
function toggleFavoriteQuestion(q, src) {
  if (!q || !q.id) return 'none';
  ensureFavorites();
  const paperId = (src && src.paperId) || '';
  const found = db.favorites.find((f) => f.paperId === paperId && f.questionId === q.id);
  if (found) {
    db.favorites = db.favorites.filter((f) => f.id !== found.id);
    saveDB();
    return 'removed';
  }
  db.favorites.unshift({
    id: uid('f'),
    paperId,
    paperTitle: (src && src.title) || '',
    subject: (src && src.subject) || '',
    questionId: q.id,
    question: cloneQuestion(q),
    favoritedAt: Date.now()
  });
  saveDB();
  return 'added';
}

function toggleFavoriteCurrentQuestion() {
  if (!session) return;
  const item = session.items[session.index];
  const q = item && item.q;
  if (!q) return;
  const src = {
    paperId: session.paperId || item.srcPaperId || '',
    title: session.paperId ? session.title : (item.srcTitle || session.title || ''),
    subject: session.subject || item.srcSubject || ''
  };
  const res = toggleFavoriteQuestion(q, src);
  if (res === 'none') return;
  renderPractice();
  updateBadge();
  toast(res === 'added' ? '已收藏本题 ⭐' : '已取消收藏');
}

function removeFavoriteById(id) {
  ensureFavorites();
  db.favorites = db.favorites.filter((f) => f.id !== id);
  saveDB();
}

function renderFavorites() {
  ensureFavorites();
  setTopbar('收藏题目', '按科目归档的收藏题库，随时回来重看');
  const root = $('#view-fav');
  if (!db.favorites.length) {
    root.innerHTML = `
      <div class="empty">
        <div class="emoji">⭐</div>
        <h3>还没有收藏的题目</h3>
        <p>答题时点击题目右上角的 ☆，就能把好题收进这里，按科目自动归档。</p>
      </div>`;
    return;
  }
  const groups = {};
  for (const f of db.favorites) {
    const key = f.subject || '其他';
    (groups[key] = groups[key] || []).push(f);
  }
  const orderedKeys = [...SUBJECTS.filter((s) => groups[s]), ...Object.keys(groups).filter((s) => !SUBJECTS.includes(s))];
  let html = `<div class="wrong-toolbar">
      <span><b>${db.favorites.length}</b> 道收藏题</span>
      <span class="spacer"></span>
    </div>`;
  for (const subject of orderedKeys) {
    const list = groups[subject];
    html += `<div class="subject-group"><details open><summary class="subject-head">
        <span class="subject-dot" style="background:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}"></span>
        <h3>${escapeHtml(subject)}</h3>
        <span class="count">${list.length} 道 <span class="caret">▾</span></span>
      </summary>`;
    for (const f of list) {
      html += `<div class="wrong-entry">
        <div class="q-body">
          <p class="q-text">${escapeHtml(f.question.question)}</p>
          <div class="meta">
            <span>⭐ 收藏于 ${formatDate(f.favoritedAt)}</span>
            ${f.paperTitle ? `<span>📄 ${escapeHtml(f.paperTitle)}</span>` : ''}
          </div>
          <details class="hint">
            <summary>查看答案与解析</summary>
            <div style="margin-top:8px"><b>答案：</b>${escapeHtml(answerDisplay(f.question))} <button type="button" class="speaker-btn analysis-speaker" data-action="speak-fav-analysis" data-id="${f.id}" title="语音播报解析">🔊</button><br/><b>解析：</b>${escapeHtml(f.question.analysis || '（无解析）')}</div>
          </details>
          <div class="actions">
            <button class="btn btn-outline btn-sm" data-action="remove-fav" data-id="${f.id}">取消收藏</button>
          </div>
        </div>
      </div>`;
    }
    html += `</details></div>`;
  }
  root.innerHTML = html;
}

/* ============================== 刷题模式 ============================== */
function answerStatusClass(st) {
  if (!st || !st.submitted) return 'todo';
  return st.correct ? 'ok' : 'bad';
}

function buildSpeechText(q) {
  if (!q) return '';
  let text = q.question || '';
  if (q.options && q.options.length) {
    const letters = q.options.map((_, i) => String.fromCharCode(65 + i));
    text += '。选项：' + q.options.map((opt, i) => letters[i] + '，' + opt).join('。') + '。';
  }
  return text;
}

function stopSpeech() {
  try {
    if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
  } catch (e) {}
}

function listTTSVoices(synth) {
  try {
    if (synth && typeof synth.getVoices === 'function') return synth.getVoices() || [];
  } catch (e) {}
  return [];
}

const CUTE_VOICES = ['XiaoxiaoNeural','XiaoyiNeural','Xiaoxiao','Xiaoyi','YunxiNeural','Yunxi','Ting-Ting','Meijia','Yaoyao','Hanhan','Huihui','婷婷','晓晓','云希'];
function pickChineseVoiceFrom(voices) {
  const zh = voices.filter((v) => /zh|Chinese|中文/i.test((v.lang || '') + ' ' + (v.name || '')));
  for (const n of CUTE_VOICES) {
    const hit = zh.find((v) => (v.name || '').indexOf(n) >= 0);
    if (hit) return hit;
  }
  return zh[0] || voices[0] || null;
}

function speakText(text) {
  const synth = window.speechSynthesis;
  const Utter = window.SpeechSynthesisUtterance;
  if (!synth || typeof Utter === 'undefined') {
    toast('当前浏览器不支持语音播报：请用手机系统浏览器（如华为浏览器/Chrome/Safari）打开，不要在微信内打开');
    return;
  }
  try { synth.cancel(); } catch (e) {}

  const doSpeak = (voice) => {
    try {
      const utter = new Utter(text);
      utter.lang = 'zh-CN';
      utter.volume = 1;
      utter.rate = 1.12; // 中快速
      utter.pitch = 1.08; // 更可爱亲和
      if (voice) utter.voice = voice;
      let started = false;
      let keep = null;
      const failTimer = setTimeout(() => {
        if (!started && synth.speaking === false) {
          toast('没有听到声音：请确认手机已开启“文字转语音/朗读”，并改用系统浏览器打开本页');
        }
      }, 1400);
      utter.onstart = () => { started = true; clearTimeout(failTimer); };
      utter.onend = utter.onerror = () => {
        clearTimeout(failTimer);
        if (keep) clearInterval(keep);
        try { synth.cancel(); } catch (e) {}
      };
      synth.speak(utter);
      // 修复部分浏览器长时间播报自动暂停
      keep = setInterval(() => {
        try {
          if (synth.speaking) { synth.pause(); synth.resume(); }
        } catch (e) {}
      }, 12000);
    } catch (e) {
      console.error('[tts]', e);
      toast('语音播放失败：' + (e && e.message ? e.message : e));
    }
  };

  const voices = listTTSVoices(synth);
  const zh = pickChineseVoiceFrom(voices);
  if (!zh && voices.length === 0 && typeof synth.addEventListener === 'function') {
    // 部分 Android/WebView 的语音列表是异步加载的：等 voiceschanged 再播
    let fired = false;
    const onVoices = () => {
      if (fired) return;
      fired = true;
      try { synth.removeEventListener('voiceschanged', onVoices); } catch (e) {}
      doSpeak(pickChineseVoiceFrom(listTTSVoices(synth)));
    };
    try { synth.addEventListener('voiceschanged', onVoices); } catch (e) {}
    setTimeout(() => { if (!fired) { fired = true; doSpeak(null); } }, 1000);
  } else {
    doSpeak(zh);
  }
}

function speakCurrentQuestion() {
  if (!session) return;
  speakText(buildSpeechText(session.items[session.index].q));
}
function speakQuestionAnalysis(q) {
  if (!q) return;
  const ans = (typeof answerDisplay === 'function') ? answerDisplay(q) : (q.answer || '');
  const text = '正确答案：' + ans + '。解析：' + (q.analysis || '暂无解析');
  speakText(text);
}
function speakAnalysisCurrent() {
  if (!session) return;
  const item = session.items[session.index];
  if (item && item.q) speakQuestionAnalysis(item.q);
}

function goToQuestion(idx) {
  if (!session) return;
  if (idx < 0 || idx >= session.items.length) return;
  stopSpeech();
  clearTimeout(session._autoTimer);
  session.index = idx;
  if (session.mode === 'paper') savePaperProgress();
  renderPractice();
}


function startPaper(paperId, wrongOnly) {
  stopSpeech();
  const paper = db.papers.find((p) => p.id === paperId);
  if (!paper) return;
  paper.lastOpenedAt = Date.now(); // 用于“最近刷题置顶”
  saveDB();
  let items = [];
  let mode = 'paper';
  let title = paper.title;
  let progress = null;

  if (wrongOnly) {
    const wrongs = db.wrongBook.filter((w) => w.paperId === paperId);
    if (!wrongs.length) {
      toast('该试卷暂无错题');
      return;
    }
    mode = 'wrong';
    title = `${paper.title} · 错题重练`;
    items = wrongs.map((w) => ({ q: w.question, wrongId: w.id }));
  } else {
    items = paper.questions.map((q) => ({ q, wrongId: null }));
    progress = getPaperProgress(paper.id);
  }

  const answers = mode === 'paper' && progress ? restoreAnswersFromProgress(progress, items.length) : [];
  const first = progress ? firstUnansweredIndex(answers) : 0;
  const resumeIndex = progress && first >= 0 ? first : (progress ? (progress.index || 0) : 0);

  session = {
    mode,
    title,
    subject: paper.subject,
    paperId: paper.id,
    items,
    index: Math.min(resumeIndex, Math.max(items.length - 1, 0)),
    answers,
    startTime: Date.now()
  };

  if (mode === 'paper') {
    // 本轮已全部答完：查看报告不结束本轮、不清进度、不存档（B 版生命周期）
    if (progress && first < 0) {
      renderReport();
      return;
    }
    if (progress) toast('已恢复上次进度，继续答题');
    savePaperProgress();
  }
  renderPractice();
}

function startWrongSession(items, title) {
  if (!items || !items.length) {
    toast('没有可练习的错题');
    return;
  }
  session = {
    mode: 'wrong',
    title: title || '错题集 · 重新作答',
    subject: '',
    paperId: null,
    items,
    index: 0,
    answers: [],
    startTime: Date.now()
  };
  renderPractice();
}

function startWrongPractice(wrongIds) {
  const list = db.wrongBook.filter((w) => wrongIds.includes(w.id));
  startWrongSession(list.map((w) => ({
    q: w.question,
    wrongId: w.id,
    srcPaperId: w.paperId,
    srcTitle: w.paperTitle,
    srcSubject: w.subject
  })));
}

function renderPractice() {
  if (!session) return;
  const total = session.items.length;
  const index = session.index;
  const item = session.items[index];
  const q = item.q;
  const st = session.answers[index] || {};
  const submitted = !!st.submitted;
  const answeredCount = session.answers.filter((a) => a && a.submitted).length;
  const pct = Math.round((answeredCount / total) * 100);
  const favActive = isQuestionFavorited(session.paperId || (item.srcPaperId || ''), q.id);
  if (!session.scoring) session.scoring = buildScoring(session.items);
  const pts = session.scoring.perIndex[index] || 1;
  const curType = typeName(q);
  const typeCount = session.scoring.perType[curType] || 1;
  const scoringLine = `<div class="scoring-bar">💯 满分 100 分 · 本题 ${pts} 分 · ${curType} 共 ${typeCount} 道 · 全卷 ${session.items.length} 题</div>`;

  setTopbar(session.title, `${session.mode === 'wrong' ? '错题重练' : '试卷刷题'} · 可点 ☆ 收藏本题`);
  showView('practice');
  const root = $('#view-practice');

  let answerUI = '';
  if (q.type === 'judge') {
    const clsFor = (val) => {
      const selected = st.selected === val;
      let cls = 'judge-btn';
      if (selected) cls += ' selected';
      if (submitted) {
        const isCorrect = normalizeJudge(val) === normalizeJudge(q.answer);
        if (isCorrect) cls += ' correct';
        else if (selected) cls += ' wrong';
      }
      return cls;
    };
    answerUI = `<div class="judge-row">
      <button class="${clsFor('对')}" data-judge="对">✔ 正确</button>
      <button class="${clsFor('错')}" data-judge="错">✘ 错误</button>
    </div>`;
  } else if (q.type === 'text') {
    answerUI = `<textarea class="text-answer" id="textAnswer" placeholder="请输入答案" ${submitted ? 'disabled' : ''}>${escapeHtml(st.text || '')}</textarea>`;
  } else {
    const letters = q.options.map((_, i) => String.fromCharCode(65 + i));
    const selectedSet = new Set(st.selected ? st.selected.split('') : []);
    answerUI = `<div class="options">`;
    q.options.forEach((opt, i) => {
      const key = letters[i];
      let cls = 'option';
      if (selectedSet.has(key)) cls += ' selected';
      if (submitted) {
        const correctSet = new Set(extractLetters(q.answer));
        const isCorrect = correctSet.has(key);
        if (isCorrect) cls += ' correct';
        else if (selectedSet.has(key)) cls += ' wrong';
      }
      answerUI += `<button class="${cls}" data-opt="${key}">
        <span class="option-key">${key}</span><span>${escapeHtml(opt)}</span>
      </button>`;
    });
    answerUI += `</div>`;
  }

﻿  let action = '';
  if (!submitted) {
    if (q.type === 'text') {
      action = `<button class="btn btn-solid" id="submitAnswer">确认答案</button>`;
    } else if (q.type === 'multiple') {
      const need = extractLetters(q.answer).length;
      const have = (st.selected || '').length;
      action = `<span class="hint">已选 ${have} / ${need} 项，选满后自动判题</span>`;
    } else {
      action = `<span class="hint">选择答案后自动判题</span>`;
    }
  } else {
    const isLast = index + 1 >= total;
    if (!(isFloatNext() && !isLast)) {
      action = `<button class="btn btn-solid" id="nextQuestion">${isLast ? '查看答题报告' : '下一题 →'}</button>`;
    }
    action += `<button type="button" class="btn btn-outline btn-sm" data-action="edit-answer">✎ 修改本题答案</button>`;
    if (st.correct && !isLast) action += `<span class="hint" style="color:#16a34a">回答正确，即将自动进入下一题…</span>`;
  }

  let resultPanel = '';
  if (submitted) {
    const good = st.correct;
    resultPanel = `<div class="result-panel ${good ? 'good' : 'bad'}">
      <div class="result-title">${good ? '✅ 回答正确' : '❌ 回答错误'}</div>
      <div class="line"><span class="label">正确答案：</span>${escapeHtml(answerDisplay(q))}</div>
      <div class="line"><span class="label">你的答案：</span>${escapeHtml(st.userAnswer || '（未作答）')}</div>
      ${q.analysis ? `<div class="analysis-box"><div class="analysis-head"><b>解析</b><button type="button" class="speaker-btn analysis-speaker" data-action="speak-analysis" title="语音播报解析">🔊</button></div><div class="analysis-text">${escapeHtml(q.analysis)}</div></div>` : ''}
    </div>`;
  }

﻿﻿  const navChips = session.items.map((item, i) => {
    const s = session.answers[i];
    const cls = 'qnav-chip ' + answerStatusClass(s) + (i === index ? ' current' : '');
    const tip = (s && s.submitted) ? (s.correct ? '答对' : '答错') : '未答';
    return `<button type="button" class="${cls}" data-action="jump-question" data-index="${i}" title="第 ${i + 1} 题 · ${tip}">${i + 1}</button>`;
  }).join('');
  const progressNav = `
      <details class="progress-nav" id="progressNav">
        <summary class="progress-summary">
          <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
          <span class="progress-hint">▾ 点击展开题目列表：绿=答对 / 红=答错 / 灰=未答</span>
        </summary>
        <div class="qnav-grid">${navChips}</div>
      </details>`;

  root.innerHTML = `
    <div class="practice-shell">
      <div class="practice-top">
        <button class="back-link" data-action="exit-practice">← 退出刷题</button>
        <div class="progress-meta">第 ${index + 1} / ${total} 题</div>
      </div>
      ${progressNav}
      ${scoringLine}
      <div class="question-card">
        <div class="question-head">
          <span class="question-no">第 ${index + 1} 题</span>
          <button type="button" class="fav-btn ${favActive ? 'active' : ''}" data-action="toggle-fav" title="${favActive ? '取消收藏' : '收藏本题'}">${favActive ? '⭐' : '☆'}</button>
          <button type="button" class="speaker-btn" data-action="speak-question" title="语音播报本题">🔊</button>
          <span class="tag">${typeName(q)}</span>
          ${session.subject ? `<span class="tag tag-subject">${escapeHtml(session.subject)}</span>` : ''}
        </div>
        <p class="question-text">${escapeHtml(q.question)} <span class="q-score">（本题 ${pts} 分）</span></p>
        ${answerUI}
        ${submitted ? '' : `<div class="action-row">${action}</div>`}
        ${resultPanel}
        ${submitted ? `<div class="action-row">${action}</div>` : ''}
      </div>
    </div>`;

  bindPracticeEvents();

}

function bindPracticeEvents() {
  const root = $('#view-practice');

  $$('.qnav-chip', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      if (!Number.isNaN(idx)) goToQuestion(idx);
    });
  });

﻿  $$('.option', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = session.items[session.index];
      const q = item.q;
      const st = session.answers[session.index] || {};
      if (st.submitted) return;
      const key = btn.dataset.opt;
      if (q.type === 'multiple') {
        const set = new Set(st.selected ? st.selected.split('') : []);
        if (set.has(key)) set.delete(key);
        else set.add(key);
        st.selected = sortLetters(Array.from(set));
      } else {
        st.selected = key;
      }
      session.answers[session.index] = st;
      if (q.type === 'multiple') {
        const need = extractLetters(q.answer).length;
        if ((st.selected || '').length >= need) submitCurrentAnswer();
        else renderPractice();
      } else {
        submitCurrentAnswer();
      }
    });
  });

  $$('.judge-btn', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = session.answers[session.index] || {};
      if (st.submitted) return;
      st.selected = btn.dataset.judge;
      session.answers[session.index] = st;
      submitCurrentAnswer();
    });
  });

  const textArea = $('#textAnswer');
  if (textArea) {
    textArea.addEventListener('input', () => {
      const st = session.answers[session.index] || {};
      if (st.submitted) return;
      st.text = textArea.value;
      session.answers[session.index] = st;
    });
  }

  const submitBtn = $('#submitAnswer');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitCurrentAnswer);
  }

  const nextBtn = $('#nextQuestion');
  if (nextBtn) {
    nextBtn.addEventListener('click', nextQuestion);
  }
}

function currentUserAnswer(q, st) {
  if (q.type === 'multiple') return st.selected || '';
  if (q.type === 'judge') return st.selected || '';
  if (q.type === 'text') return st.text || '';
  return st.selected || '';
}

function scheduleAutoNextIfCorrect(st) {
  if (!st || !st.correct || !session) return;
  const isLast = session.index + 1 >= session.items.length;
  if (isLast) return;
  clearTimeout(session._autoTimer);
  session._autoTimer = setTimeout(() => {
    if (!session) return;
    const cur = session.answers[session.index];
    if (cur && cur.submitted && cur.correct) nextQuestion();
  }, 900);
}

function submitCurrentAnswer() {
  const item = session.items[session.index];
  const q = item.q;
  const st = session.answers[session.index] || {};
  const userAnswer = currentUserAnswer(q, st).trim();
  if (!userAnswer) {
    toast('请先作答');
    return;
  }
  const correct = judgeAnswer(q, userAnswer);
  st.submitted = true;
  st.correct = correct;
  st.userAnswer = userAnswer;
  session.answers[session.index] = st;

  if (session.mode === 'wrong') {
    if (correct) {
      removeWrongById(item.wrongId);
      item.resolved = true;
    } else {
      const w = db.wrongBook.find((x) => x.id === item.wrongId);
      if (w) {
        w.wrongCount = (w.wrongCount || 1) + 1;
        w.lastWrongAt = Date.now();
        w.lastAnswer = userAnswer;
      }
    }
  } else if (session.mode === 'paper') {
    const paper = { id: session.paperId, title: session.title, subject: session.subject };
    const existingWrong = db.wrongBook.find((w) => w.paperId === session.paperId && w.questionId === q.id);
    if (correct && existingWrong) removeWrongById(existingWrong.id);
    else if (!correct) upsertWrong(paper, q, userAnswer);
  }

  if (session.mode === 'paper') savePaperProgress();
  else saveDB();
  updateBadge();
  renderPractice();
  scheduleAutoNextIfCorrect(st);
}

function nextQuestion() {
  if (!session) return;
  stopSpeech();
  if (session.index + 1 < session.items.length) {
    session.index += 1;
    if (session.mode === 'paper') savePaperProgress();
    renderPractice();
  } else {
    renderReport();
  }
}

/* ============================== 左右滑动切换题目 ============================== */
// 说明：向左滑（手指向左移动）→ 下一道题；向右滑 → 上一道题。
// 在最后一题且已作答时，再向左滑会进入答题报告。
function exitPracticeBySwipe() {
  if (!session) return;
  if (session.mode === 'paper') savePaperProgress();
  session = null;
  showView('papers');
  renderPapers();
  toast('已退出刷题，进度已保存');
}

function swipeNavigate(dir) {
  if (!session || !session.items) return;
  const total = session.items.length;
  if (dir === 'prev') {
    if (session.index > 0) {
      goToQuestion(session.index - 1);
    } else {
      exitPracticeBySwipe(); // 第一题右滑=退出刷题
    }
  } else {
    if (session.index + 1 < total) {
      goToQuestion(session.index + 1);
    } else {
      const st = session.answers[session.index];
      if (st && st.submitted) nextQuestion();
      else toast('已是最后一题，请先完成本题');
    }
  }
}

function handlePracticeSwipe(dx, dy) {
  if (!session || currentView !== 'practice') return false;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < 60 || absX < absY * 1.2) return false; // 太短或偏向竖滑：不处理
  swipeNavigate(dx < 0 ? 'next' : 'prev');
  return true;
}

function bindPracticeSwipe() {
  const el = $('#view-practice');
  if (!el) return;
  let startX = null;
  let startY = null;
  el.addEventListener('touchstart', (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (startX == null) return;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    startX = null;
    startY = null;
    handlePracticeSwipe(dx, dy);
  }, { passive: true });
}

/* ============================== 答题报告 ============================== */

/* ---- B 版生命周期：本轮结束 = 点「重新开始」（查看报告不结束本轮） ---- */
function paperRoundDone(p, progress) {
  if (!progress || !Array.isArray(progress.answers)) return false;
  const total = progress.total || (p && p.questions ? p.questions.length : progress.answers.length);
  if (!total || !progress.answers.length) return false;
  return progress.answers.length >= total && progress.answers.every((a) => a && a.submitted);
}

function finalizePaperRecord(paperId) {
  const p = db.papers.find((x) => x.id === paperId);
  const prog = db.progress && db.progress[paperId];
  if (!p || !paperRoundDone(p, prog)) return; // 未答完本轮不存档
  const answers = prog.answers.map((a) => a
    ? { userAnswer: a.userAnswer || '', correct: !!a.correct, selected: a.selected || '', text: a.text || '' }
    : null);
  const answeredCount = answers.filter(Boolean).length;
  if (!answeredCount) return;
  const total = prog.total || (p.questions ? p.questions.length : answers.length);
  const correct = answers.filter((a) => a && a.correct).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  p.lastResult = { score: accuracy, accuracy, total, correct, date: Date.now() };
  p.lastRecord = {
    completedAt: Date.now(),
    total,
    correct,
    wrong: total - correct,
    accuracy,
    answers
  };
  saveDB();
}

function finalizeAndRestartPaper(paperId) {
  // 本轮结束：把本轮完整作答存档为“上次记录/成绩”→ 清空本轮进度 → 从第 1 题开始新一轮
  finalizePaperRecord(paperId);
  clearPaperProgress(paperId);
  renderPapers();
  startPaper(paperId, false);
}

/* ---- 任意时刻返回修改已提交的答案 ---- */
function editCurrentAnswer() {
  if (!session) return;
  const st = session.answers[session.index];
  if (st && st.submitted) {
    st.submitted = false;
    delete st.correct;
    delete st.userAnswer;
    if (session.mode === 'paper') savePaperProgress();
    renderPractice();
    toast('现在可以修改本题答案');
  }
}

function continuePractice() {
  if (!session) return;
  // 回到第一道错题；没有错题就回到第 1 题，方便用进度下拉逐题核对/修改
  let idx = 0;
  const ans = session.answers || [];
  for (let i = 0; i < ans.length; i++) {
    const a = ans[i];
    if (a && a.submitted && !a.correct) { idx = i; break; }
  }
  goToQuestion(idx);
}

function feedbackText(acc) {
  if (acc >= 90) return '太强了！这套题掌握得很好。';
  if (acc >= 75) return '不错！再巩固一下错题就更稳了。';
  if (acc >= 60) return '及格了，建议重点重练错题。';
  return '别灰心，把错题集刷一遍，进步会很快。';
}

function renderReport() {
  if (!session) return;
  const total = session.items.length;
  let correct = 0;
  const wrongItems = [];
  session.items.forEach((item, i) => {
    const st = session.answers[i];
    if (st && st.correct) correct += 1;
    else if (st && !st.correct) wrongItems.push({ item, st });
  });
  const wrong = total - correct;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const score = accuracy;
  const duration = (Date.now() - session.startTime) / 1000;

  // B 版生命周期：查看报告不结束本轮——不写记录、不清进度、不改任何状态。
  // 只有用户点「重新开始」时，才会在本轮结束时保存记录并清空进度（见 finalizeAndRestartPaper）。
  setTopbar('答题报告', session.title);
  showView('report');
  const root = $('#view-report');

  const wrongList = wrongItems.map(({ item, st }) => {
    const q = item.q;
    return `<div class="wrong-item">
      <div class="q">${escapeHtml(q.question)}</div>
      <div>正确答案：<b>${escapeHtml(answerDisplay(q))}</b>　你的答案：${escapeHtml(st.userAnswer || '（未作答）')}</div>
      ${q.analysis ? `<div class="hint" style="margin-top:6px">${escapeHtml(q.analysis)}</div>` : ''}
    </div>`;
  }).join('');

  root.innerHTML = `
    <div class="report-shell">
      <div class="score-main">
        <div class="ring" style="background:conic-gradient(${accuracy >= 60 ? '#16a34a' : '#e11d48'} ${accuracy}%, #e6e7f0 0)">
          <div class="ring-inner"><div><div class="big">${score}</div><div class="small">得分</div></div></div>
        </div>
        <div class="score-summary">
          <h3>${escapeHtml(session.title)}</h3>
          <p>用时 ${formatDuration(duration)}　·　正确率 ${accuracy}%</p>
          <p>${feedbackText(accuracy)}</p>
        </div>
      </div>

      <div class="score-row">
        <div class="score-card"><div class="num">${total}</div><div class="lbl">总题数</div></div>
        <div class="score-card"><div class="num" style="color:#16a34a">${correct}</div><div class="lbl">答对</div></div>
        <div class="score-card"><div class="num" style="color:#e11d48">${wrong}</div><div class="lbl">答错</div></div>
        <div class="score-card"><div class="num" style="color:#5b5bd6">${accuracy}%</div><div class="lbl">正确率</div></div>
      </div>

      <div class="report-section">
        <h3>错题回顾</h3>
        ${wrong ? `<p class="hint">以下题目已自动并入错题集，可在「错题集」中重新作答。</p><div class="wrong-list">${wrongList}</div>` : `<p style="color:#16a34a;font-weight:700">🎉 全部答对，没有错题！</p>`}
      </div>

      <div class="action-row">
        <button class="btn btn-outline" data-action="back-papers">返回试卷库</button>
        ${session.mode === 'paper' ? `<button class="btn btn-outline" data-action="continue-practice">✎ 继续答题修改</button>` : ''}
        ${wrong ? `<button class="btn btn-solid" data-action="retry-wrong">重练本次错题</button>` : ''}
        <button class="btn btn-outline" data-action="export-report">导出报告 JSON</button>
      </div>
    </div>`;
}

/* ============================== 上传试卷弹窗 ============================== */
function openUploadModal() {
  pendingImport = null;
  pendingTitle = '未命名试卷';
  $('#rawInput').value = '';
  $('#previewWrap').classList.add('hidden');
  $('#papersList').innerHTML = '';
  $('#previewCount').textContent = '0';
  const qCount = $('#previewQuestionCount');
  if (qCount) qCount.textContent = '0';
  $('#fileInput').value = '';
  $('#modalTitle').textContent = '上传试卷';
  $('#modalOverlay').classList.remove('hidden');
}

function closeUploadModal() {
  $('#modalOverlay').classList.add('hidden');
}

function buildSubjectOptions(selected) {
  const values = [...SUBJECTS];
  if (selected && !values.includes(selected)) values.push(selected);
  return values.map((s) => `<option value="${escapeHtml(s)}"></option>`).join('');
}

function refreshSubjectDatalist(extraList) {
  const values = [...SUBJECTS];
  (extraList || []).forEach((v) => {
    if (v && !values.includes(v)) values.push(v);
  });
  const dl = $('#subjectDatalist');
  if (dl) dl.innerHTML = values.map((s) => `<option value="${escapeHtml(s)}"></option>`).join('');
}

function parsePreview() {
  const raw = $('#rawInput').value;
  if (!raw.trim()) {
    toast('请先选择文件或粘贴试卷内容');
    return;
  }
  const parsed = parseAuto(raw, pendingTitle);
  const papers = (parsed.papers || []).filter((p) => p.questions && p.questions.length);
  pendingImport = { papers };
  refreshSubjectDatalist(papers.map((p) => p.subject));
  const listEl = $('#papersList');
  $('#previewCount').textContent = papers.length;
  const qCount = $('#previewQuestionCount');
  if (qCount) qCount.textContent = papers.reduce((n, p) => n + p.questions.length, 0);
  $('#previewWrap').classList.remove('hidden');

  if (!papers.length) {
    const firstWarn = parsed.papers && parsed.papers[0] && parsed.papers[0].warnings;
    listEl.innerHTML = `<div class="preview-box"><div class="hint">未识别到题目，请检查格式。示例：<br/>1. 题目<br/>A. 选项<br/>B. 选项<br/>答案：B<br/>解析：……</div>${firstWarn && firstWarn.length ? '<div class="hint" style="color:#d97706;margin-top:8px">' + firstWarn.map(escapeHtml).join('；') + '</div>' : ''}</div>`;
    return;
  }

  listEl.innerHTML = papers.map((p, pi) => {
    const subject = p.subject || '其他';
    const qsHtml = p.questions.map((q, qi) => {
      const parts = [];
      if (q.answer) parts.push(`<span class="ans">答案：${escapeHtml(q.answer)}</span>`);
      if (q.analysis) parts.push(`<span class="ans" style="color:#0ea5e9">解析：${escapeHtml(q.analysis.slice(0, 26))}${q.analysis.length > 26 ? '…' : ''}</span>`);
      else parts.push('<span class="warn">⚠ 无解析</span>');
      return `<div class="preview-q"><b>${qi + 1}.</b> ${escapeHtml(q.question.slice(0, 56))}${q.question.length > 56 ? '…' : ''}　${parts.join('　')}</div>`;
    }).join('');
    const warnHtml = p.warnings && p.warnings.length
      ? `<div class="hint" style="color:#d97706;margin-top:8px">${p.warnings.map(escapeHtml).join('；')}</div>`
      : '';
    return `<div class="paper-preview-card">
      <div class="pp-head">第 ${pi + 1} 套 · ${p.questions.length} 道题${p.title ? ' · ' + escapeHtml(p.title) : ''}</div>
      <div class="pp-fields">
        <div class="field"><label>试卷名称</label><input type="text" class="pp-title" data-i="${pi}" value="${escapeHtml(p.title || ('试卷 ' + (pi + 1)))}" /></div>
        <div class="field"><label>归档科目</label><input type="text" class="pp-subject" data-i="${pi}" list="subjectDatalist" value="${escapeHtml(subject)}" placeholder="选择或输入科目" /></div>
      </div>
      <div class="preview-box">${qsHtml}${warnHtml}</div>
    </div>`;
  }).join('');
}

function confirmImport() {
  if (!pendingImport || !pendingImport.papers.length) {
    toast('没有可导入的试卷');
    return;
  }
  const totalQuestions = pendingImport.papers.reduce((n, p) => n + p.questions.length, 0);
  const papers = pendingImport.papers.map((p, i) => {
    const titleEl = $(`.pp-title[data-i="${i}"]`);
    const subjectEl = $(`.pp-subject[data-i="${i}"]`);
    const title = (titleEl && titleEl.value.trim()) || p.title || ('试卷 ' + (i + 1));
    const subject = subjectEl ? subjectEl.value : (p.subject || '其他');
    return {
      id: uid('p'),
      title,
      subject,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      questions: p.questions.map((q) => ({ ...q, subject })),
      lastResult: null
    };
  });
  db.papers.unshift(...papers);
  saveDB();
  closeUploadModal();
  toast(`已导入 ${papers.length} 套试卷，共 ${totalQuestions} 道题`);
  showView('papers');
  renderPapers();
}


let editPaperId = null;

function openEditPaper(id) {
  const p = db.papers.find((x) => x.id === id);
  if (!p) return;
  editPaperId = id;
  $('#editTitle').value = p.title;
  $('#editSubject').value = p.subject;
  refreshSubjectDatalist([p.subject]);
  $('#editOverlay').classList.remove('hidden');
}

function closeEditPaper() {
  editPaperId = null;
  $('#editOverlay').classList.add('hidden');
}

function saveEditPaper() {
  if (!editPaperId) return;
  const p = db.papers.find((x) => x.id === editPaperId);
  if (!p) { closeEditPaper(); return; }
  p.title = $('#editTitle').value.trim() || p.title;
  p.subject = $('#editSubject').value;
  p.updatedAt = Date.now();
  db.wrongBook.forEach((w) => {
    if (w.paperId === p.id) {
      w.paperTitle = p.title;
      w.subject = p.subject;
    }
  });
  saveDB();
  closeEditPaper();
  renderPapers();
  updateBadge();
  toast('已保存试卷修改');
}

let pendingExamPaperId = null;
function closeExamInfo() {
  $('#examOverlay').classList.add('hidden');
  pendingExamPaperId = null;
}
function showExamInfo(paperId) {
  const p = db.papers.find((x) => x.id === paperId);
  if (!p) return;
  pendingExamPaperId = paperId;
  const meta = p.examMeta || {};
  const scoring = buildScoring(p.questions.map((q) => ({ q })));
  const typeRows = Object.keys(scoring.perType).map((t) => `${t} ${scoring.perType[t]} 道 · 共 ${scoring.perTypeScore[t]} 分（每题 ${Math.round(scoring.perTypeScore[t] / scoring.perType[t])} 分）`).join('<br/>');
  const suggest = meta.time || (Math.max(10, Math.round((p.questions.length * 1.2) / 5) * 5) + ' 分钟');
  const rows = [
    ['考试说明', meta.instructions || '请独立完成本次练习，作答后系统即时判分并给出答案解析。'],
    ['考试科目', p.subject || '其他'],
    ['考试时间', suggest],
    ['试卷满分', meta.fullScore || ('100 分（共 ' + p.questions.length + ' 题）')],
    ['合格标准', meta.passLine || '60 分（60%）'],
    ['题型与计分', typeRows || '—'],
    ['命题依据说明', meta.basis || '依据本试卷内容命题，用于专项练习与自测。']
  ];
  $('#examInfoBody').innerHTML = '<div class="exam-title">' + escapeHtml(p.title) + '</div>' + rows.map((r) => `<div class="exam-row"><span class="exam-label">${r[0]}</span><span class="exam-value">${r[1]}</span></div>`).join('');
  $('#examOverlay').classList.remove('hidden');
}
function startExamNow() {
  const id = pendingExamPaperId;
  closeExamInfo();
  if (id) startPaper(id, false);
}

function isWeChat() {
  try { return /MicroMessenger/i.test(navigator.userAgent || ''); } catch (e) { return false; }
}

function openBackupModal() {
  $('#backupTextarea').value = '';
  $('#backupOverlay').classList.remove('hidden');
}

function closeBackupModal() {
  $('#backupOverlay').classList.add('hidden');
}

let _segList = [], _segIdx = 0, _recv = {}, _recvTotal = 0;
function splitEvery(s, n) { const out = []; for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n)); return out; }
function segHeader(i, n) { return '【vessel刷题 第' + (i + 1) + '/' + n + '段】'; }
function makeSegText(i, n, part) { return segHeader(i, n) + '\n' + part; }
function parseSegText(text) {
  const m = String(text || '').match(/【vessel刷题 第(\d+)\/(\d+)段】[\s\S]*?\n?/);
  if (!m) return null;
  const h = m[0];
  return { idx: Number(m[1]) - 1, total: Number(m[2]), body: String(text || '').slice(h.length) };
}
function tryAssembleSegments(text) {
  const s = String(text || '');
  const re = /【vessel刷题 第(\d+)\/(\d+)段】([\s\S]*?)(?=【vessel刷题 第\d+\/\d+段】|$)/g;
  const parts = [];
  let m = null;
  let totalSeen = 0;
  let n = 0;
  while ((m = re.exec(s))) {
    const idx = Number(m[1]) - 1;
    const tot = Number(m[2]);
    totalSeen = Math.max(totalSeen, tot);
    parts[idx] = m[3].replace(/^\n/, '');
    n++;
  }
  if (!n) return null;
  for (let i = 0; i < totalSeen; i++) { if (!(i in parts) || parts[i] === null || parts[i] === undefined) return null; }
  return parts.slice(0, totalSeen).join('');
}

function backupPayload() {
  return JSON.stringify({ papers: db.papers, wrongBook: db.wrongBook, favorites: db.favorites || [], progress: db.progress || {}, exportedAt: formatDate(Date.now()) }, null, 2);
}
function generateBackup() {
  $('#backupTextarea').value = backupPayload();
}

function copyBackup() {
  const ta = $('#backupTextarea');
  if (!ta.value) generateBackup();
  const text = ta.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('备份内容已复制')).catch(() => toast('复制失败，请手动选择复制'));
  } else {
    ta.select();
    document.execCommand('copy');
    toast('备份内容已复制');
  }
}

function downloadBackup() {
  if (isWeChat()) { toast('请勿在微信内导出：微信无法保存文件。请用系统浏览器（Chrome/华为浏览器）打开本网页后再导出。'); return; }
  const data = backupPayload();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shuatiben-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('已导出 .json 文件');
}

function handleBackupFile(input) {
  const file = input && input.files && input.files[0];
  if (!file) return;
  if (typeof FileReader === 'undefined') { toast('当前浏览器不支持读取文件，请改用支持 FileReader 的浏览器'); return; }
  toast('正在读取 .json 文件…');
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    if (input && typeof input.value !== 'undefined') input.value = '';
    runImportBackup(text);
  };
  reader.onerror = () => { toast('读取文件失败，请重试'); };
  reader.readAsText(file, 'utf-8');
}

function genTransferLink() {
  if (!window.LZString) { toast('链接组件未就绪，请刷新页面重试'); return; }
  const payload = backupPayload();
  const enc = window.LZString.compressToEncodedURIComponent(payload);
  if (enc.length > 7500) { toast('数据太大（约 ' + enc.length + ' 字符），微信链接放不下。请改用「📋 复制本卷」或系统浏览器 + .json 文件。'); return; }
  try { window.location.hash = '#d=' + enc; } catch (e) { toast('无法写入链接'); return; }
  toast('已把数据写入链接：请点微信右上角 “···” → “在浏览器打开”，系统浏览器会自动读取并导入');
}
function tryImportFromHash() {
  try {
    if (!window.LZString || !window.location || !window.location.hash) return;
    const m = /^#d=([\s\S]+)$/.exec(window.location.hash);
    if (!m) return;
    const plain = window.LZString.decompressFromEncodedURIComponent(m[1]);
    if (!plain) return;
    window.location.hash = '';
    const ok = runImportBackup(plain);
    toast(ok ? '已从链接导入数据' : '链接数据导入未成功，请手动粘贴导入');
  } catch (e) {}
}

function copyPaperData(paperId) {
  const p = db.papers.find((x) => x.id === paperId);
  if (!p) { toast('未找到该试卷'); return; }
  const payload = JSON.stringify({ v: 1, mode: 'paper', paper: { id: p.id, title: p.title, subject: p.subject, questions: p.questions, lastResult: p.lastResult || null, lastRecord: p.lastRecord || null } });
  openBackupModal();
  const migrate = $('#migratePanel');
  if (migrate && typeof migrate.open !== 'undefined') migrate.open = true;
  const ta = $('#backupTextarea');
  ta.value = payload;
  ta.select();
  toast('已把本卷数据放入文本框：长按“全选→复制”，再到目标浏览器/电脑的“数据传输-仅迁移用”粘贴并点“导入下方内容”');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(payload).then(() => toast('已复制，可直接到目标页面粘贴')).catch(() => {});
  }
}
function mergeSinglePaper(paper) {
  if (!paper || !Array.isArray(paper.questions)) return false;
  const idx = db.papers.findIndex((x) => x.id === paper.id);
  const merged = { id: paper.id, title: paper.title || '未命名试卷', subject: paper.subject || '其他', createdAt: paper.createdAt || Date.now(), updatedAt: Date.now(), questions: paper.questions, lastResult: paper.lastResult || null, lastRecord: paper.lastRecord || null };
  if (idx >= 0) db.papers[idx] = merged; else db.papers.unshift(merged);
  saveDB();
  return true;
}

function runImportBackup(raw) {
  raw = String(raw || '').trim();
  if (!raw) { toast('请先选择/粘贴备份文件内容'); return false; }
  let data = null;
  try { data = JSON.parse(raw); } catch (e) {}
  if (!data) {
    const assembled = tryAssembleSegments(raw);
    if (assembled !== null) { try { data = JSON.parse(assembled); } catch (e2) {} }
  }
  if (!data) {
    if (/【vessel刷题 第/.test(raw)) toast('导入失败：这是“分段传输”内容，请用下方接收端逐段「＋添加这段」后点「合并并导入全部段」，或一次性把完整分段都贴进来');
    else toast('导入失败：不是有效的 JSON。请完整复制“备份内容”（别漏开头结尾），或改点「📁 选择 .json 文件导入」');
    return false;
  }
  const papers = Array.isArray(data.papers) ? data.papers : [];
  const wrongBook = Array.isArray(data.wrongBook) ? data.wrongBook : [];
  const favorites = Array.isArray(data.favorites) ? data.favorites : [];
  const progress = (data.progress && typeof data.progress === 'object') ? data.progress : {};
  if (data && data.mode === 'paper') {
    if (mergeSinglePaper(data.paper)) {
      closeBackupModal();
      renderPapers();
      updateBadge();
      toast('已并入 1 套试卷，未覆盖本机其它数据');
      return true;
    }
    toast('导入失败：单卷数据不完整');
    return false;
  }
  if (!papers.length && !wrongBook.length && !favorites.length && !Object.keys(progress).length) { toast('没有可导入的数据'); return false; }
  if (!confirm('导入将覆盖当前设备的全部数据，是否继续？')) return false;
  db = { papers, wrongBook, progress, deletedPapers: [], deletedWrong: [], clearedProgress: {}, favorites };
  saveDB();
  closeBackupModal();
  renderPapers();
  renderWrongBook();
  updateBadge();
  toast('数据导入成功');
  return true;
}
function checkBackupText() {
  const raw = $('#backupTextarea').value || '';
  if (!raw) { toast('内容为空：请先粘贴要检查的内容'); return; }
  const t = raw.trim();
  const msgs = [];
  msgs.push('长度 ' + raw.length + ' 字');
  if (/【vessel刷题 第/.test(raw)) {
    const segCount = (raw.match(/【vessel刷题 第/g) || []).length;
    const heads = raw.match(/【vessel刷题 第(\d+)\/(\d+)段】/g) || [];
    msgs.push('是分段内容，检测到 ' + segCount + ' 段（' + heads.join('、') + '）');
    if (segCount === 1) msgs.push('只有 1 段：若还有后续段请全部贴进来，或用下方接收端逐段添加');
  } else if (!t.startsWith('{')) {
    msgs.push('不是以 { 开头（开头是：' + JSON.stringify(raw.slice(0, 20)) + '）——可能多复制了说明文字或只复制了一部分');
  } else if (!t.endsWith('}')) {
    msgs.push('不是以 } 结尾——内容可能被截断，请完整复制');
  }
  const curly = (raw.match(/[“”]/g) || []).length;
  if (curly) msgs.push('发现 ' + curly + ' 个中文引号 “ ”（应使用英文双引号 " ）');
  const openB = (t.match(/{/g) || []).length;
  const closeB = (t.match(/}/g) || []).length;
  msgs.push('大括号 ' + openB + '/' + closeB + (openB === closeB ? '（配对正常）' : '（不配对，可能截断）'));
  try { JSON.parse(raw); msgs.push('✓ 是有效 JSON，可直接导入'); }
  catch (e) { msgs.push('✗ 解析失败：' + e.message); }
  toast(msgs.join('；'));
}

function importBackup() {
  const raw = $('#backupTextarea').value;
  runImportBackup(raw);
}

function loadSample() {
  const raws = [
    { typeLabel: '单选题', question: '若集合 A = {1, 2, 3}，B = {2, 3, 4}，则 A ∩ B =（　）', options: ['{1}', '{2, 3}', '{2, 3, 4}', '{1, 2, 3, 4}'], answer: 'B', analysis: '交集表示同时属于两个集合的元素，即 2 和 3。' },
    { typeLabel: '单选题', question: '已知函数 f(x) = 2x + 1，则 f(3) 的值为（　）', options: ['5', '6', '7', '8'], answer: 'C', analysis: '代入 x = 3：2 × 3 + 1 = 7。' },
    { typeLabel: '单选题', question: '方程 2x - 4 = 0 的解是（　）', options: ['x = -2', 'x = 0', 'x = 2', 'x = 4'], answer: 'C', analysis: '移项得 2x = 4，两边同除以 2，x = 2。' },
    { typeLabel: '单选题', question: 'sin 30° 的值等于（　）', options: ['0', '1/2', '√2/2', '1'], answer: 'B', analysis: '特殊角的三角函数值，sin 30° = 1/2。' },
    { typeLabel: '单选题', question: '一枚质地均匀的骰子，掷出偶数的概率是（　）', options: ['1/6', '1/3', '1/2', '2/3'], answer: 'C', analysis: '偶数点数为 2、4、6，共 3 个，概率为 3/6 = 1/2。' },
    { typeLabel: '多选题', question: '下列数中，属于偶数的有（　）', options: ['2', '3', '4', '5'], answer: 'AC', analysis: '偶数能被 2 整除，2 和 4 是偶数。' },
    { typeLabel: '判断题', question: '三角形的内角和等于 180°。', options: [], answer: '正确', analysis: '三角形内角和定理：任意三角形内角和为 180°。' },
    { typeLabel: '判断题', question: '0 是最小的正整数。', options: [], answer: '错误', analysis: '0 不是正整数，最小的正整数是 1。' },
    { typeLabel: '填空题', question: '2 的平方等于（　）。', options: [], answer: '4', analysis: '2² = 2 × 2 = 4。' },
    { typeLabel: '填空题', question: '一个直角三角形的两条直角边分别为 3 和 4，则斜边长为（　）。', options: [], answer: '5', analysis: '由勾股定理：√(3² + 4²) = √25 = 5。' }
  ];

  const questions = raws.map((r, i) => finalizeQuestion(r, i));
  db.papers.unshift({
    id: uid('p'),
    title: '示例 · 数学基础练习',
    subject: '数学',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    questions,
    lastResult: null
  });
  saveDB();
  toast('已载入示例试卷，点击开始刷题试试吧');
  showView('papers');
  renderPapers();
}

/* ============================== 报告导出 ============================== */
function exportReport() {
  if (!session) return;
  const rows = session.items.map((item, i) => {
    const st = session.answers[i] || {};
    return {
      index: i + 1,
      question: item.q.question,
      options: item.q.options,
      correctAnswer: item.q.answer,
      userAnswer: st.userAnswer || '',
      correct: !!st.correct,
      analysis: item.q.analysis || ''
    };
  });
  const data = {
    title: session.title,
    exportedAt: formatDate(Date.now()),
    total: session.items.length,
    correct: rows.filter((r) => r.correct).length,
    wrong: rows.filter((r) => !r.correct).length,
    rows
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `刷题报告_${data.title.replace(/[\\/:*?"<>|]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================== 全局事件 ============================== */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'open-upload') openUploadModal();
  else if (action === 'load-sample') loadSample();
  else if (action === 'copy-paper') copyPaperData(id);
  else if (action === 'start-paper-info') showExamInfo(id);
  else if (action === 'clear-subject-filter') { paperSubjectFilter = 'all'; renderPapers(); }
  else if (action === 'start-paper') startPaper(id, false);
  else if (action === 'jump-question') goToQuestion(Number(btn.dataset.index));
  else if (action === 'speak-question') speakCurrentQuestion();
  else if (action === 'speak-analysis') speakAnalysisCurrent();
  else if (action === 'speak-wrong-analysis') { const w = db.wrongBook.find((x) => x.id === id); if (w) speakQuestionAnalysis(w.question); }
  else if (action === 'speak-fav-analysis') { const fv = (db.favorites || []).find((x) => x.id === id); if (fv) speakQuestionAnalysis(fv.question); }
  else if (action === 'edit-answer') editCurrentAnswer();
  else if (action === 'continue-practice') continuePractice();
  else if (action === 'toggle-fav') toggleFavoriteCurrentQuestion();
  else if (action === 'remove-fav') {
    removeFavoriteById(id);
    renderFavorites();
    updateBadge();
    toast('已取消收藏');
  }
  else if (action === 'start-paper-wrong') startPaper(id, true);
  else if (action === 'restart-paper') {
    if (confirm('「重新开始」将结束本轮：保存本轮作答为上次记录，并从第 1 题开始新一轮。确定吗？')) {
      finalizeAndRestartPaper(id);
    }
  }
  else if (action === 'edit-paper') openEditPaper(id);
  else if (action === 'delete-paper') {
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    if (confirm(`确定删除「${p.title}」吗？其错题记录也会一并删除。`)) {
      recordTombstone('deletedPapers', id);
      db.wrongBook.filter((w) => w.paperId === id).forEach((w) => recordTombstone('deletedWrong', w.id));
      db.papers = db.papers.filter((x) => x.id !== id);
      db.wrongBook = db.wrongBook.filter((w) => w.paperId !== id);
      clearPaperProgress(id);
      saveDB();
      renderPapers();
      updateBadge();
      toast('已删除试卷');
    }
  }
  else if (action === 'practice-all-wrong') startWrongPractice(db.wrongBook.map((w) => w.id));
  else if (action === 'practice-wrong-one') startWrongPractice([id]);
  else if (action === 'remove-wrong') {
    removeWrongById(id);
    saveDB();
    renderWrongBook();
    updateBadge();
    toast('已移除该错题');
  }
  else if (action === 'clear-wrong') {
    if (confirm('确定清空全部错题吗？此操作不可恢复。')) {
      db.wrongBook.forEach((w) => recordTombstone('deletedWrong', w.id));
      db.wrongBook = [];
      saveDB();
      renderWrongBook();
      updateBadge();
      toast('错题集已清空');
    }
  }
  else if (action === 'exit-practice') {
    if (confirm('确定退出本次刷题吗？进度会自动保存，下次可继续。')) {
      if (session && session.mode === 'paper') savePaperProgress();
      session = null;
      showView('papers');
      renderPapers();
    }
  }
  else if (action === 'back-papers') {
    session = null;
    showView('papers');
    renderPapers();
  }
  else if (action === 'retry-wrong') {
    const items = [];
    session.items.forEach((item, i) => {
      const st = session.answers[i];
      if (st && !st.correct) {
        let wrongId = item.wrongId;
        if (!wrongId && session.paperId) {
          const w = db.wrongBook.find((x) => x.paperId === session.paperId && x.questionId === item.q.id);
          wrongId = w ? w.id : null;
        }
        items.push({ q: item.q, wrongId });
      }
    });
    if (items.length) startWrongSession(items, '本次错题 · 重新作答');
    else toast('暂无错题可重练');
  }
  else if (action === 'export-report') exportReport();
});

$$('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    if (view === 'papers') {
      showView('papers');
      renderPapers();
    } else if (view === 'wrong') {
      showView('wrong');
      renderWrongBook();
    } else if (view === 'fav') {
      showView('fav');
      renderFavorites();
    }
  });
});

$('#openUploadBtn').addEventListener('click', openUploadModal);
$('#loadSampleBtn').addEventListener('click', loadSample);
$('#modalClose').addEventListener('click', closeUploadModal);
$('#cancelImportBtn').addEventListener('click', closeUploadModal);
$('#modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeUploadModal();
});
$('#parseBtn').addEventListener('click', parsePreview);
$('#confirmImportBtn').addEventListener('click', confirmImport);

const dropzone = $('#dropzone');
const fileInput = $('#fileInput');
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = '#5b5bd6';
  dropzone.style.background = '#eeedfd';
});
dropzone.addEventListener('dragleave', () => {
  dropzone.style.borderColor = '';
  dropzone.style.background = '';
});
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = '';
  dropzone.style.background = '';
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) readFile(file);
});
fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  if (file) readFile(file);
});

function readFile(file) {
  pendingTitle = file.name.replace(/\.[^.]+$/, '') || '未命名试卷';
  $('#modalTitle').textContent = `上传试卷 · ${file.name}`;
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'docx') { readDocx(file); return; }
  if (ext === 'pdf') { readPdf(file); return; }
  if (ext === 'doc') {
    toast('.doc 旧格式暂不支持，请先用 Word 另存为 .docx 再上传');
    return;
  }
  readTextFile(file);
}

function readTextFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    $('#rawInput').value = String(reader.result || '');
    parsePreview();
  };
  reader.onerror = () => toast('文件读取失败');
  reader.readAsText(file, 'utf-8');
}

function fillParsedText(text, file) {
  $('#rawInput').value = text;
  parsePreview();
}

async function readDocx(file) {
  if (!window.mammoth) {
    toast('Word 解析组件未加载，请检查 vendor/mammoth.browser.min.js 是否存在');
    return;
  }
  toast('正在解析 Word 文档…');
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    const text = result.value || '';
    if (!text.trim()) {
      toast('未从 Word 中提取到文字（可能是扫描图片版）');
      return;
    }
    fillParsedText(text, file);
  } catch (e) {
    console.error(e);
    toast('Word 解析失败：' + (e && e.message ? e.message : e));
  }
}

async function readPdf(file) {
  const pdfjs = window.pdfjsLib;
  if (!pdfjs) {
    toast('PDF 解析组件未加载，请检查 vendor/pdf.min.js 是否存在');
    return;
  }
  toast('正在解析 PDF…');
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjs.GlobalWorkerOptions.workerSrc || 'vendor/pdf.worker.js';
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    let text = '';
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const groups = new Map();
      for (const item of content.items || []) {
        if (!item || !item.str) continue;
        const y = Math.round(item.transform[5]);
        if (!groups.has(y)) groups.set(y, []);
        groups.get(y).push({ x: item.transform[4], str: item.str });
      }
      const rows = Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
      for (const [, items] of rows) {
        items.sort((a, b) => a.x - b.x);
        text += items.map((o) => o.str).join('') + '\n';
      }
    }
    if (pdf.destroy) pdf.destroy();
    const cleaned = text.replace(/[ \t]+\n/g, '\n')
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+$/, ''))
      .filter((line) => {
        const t = line.trim();
        if (!t) return false;
        if (/^(file:\/\/|https?:\/\/)/i.test(t)) return false;
        if (/^\d+\s*\/\s*\d+\s*$/.test(t)) return false;
        if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}(?:\s|$)/.test(t)) return false;
        return true;
      })
      .join('\n');
    if (!cleaned.trim()) {
      toast('未能从 PDF 中提取文字（可能是扫描图片版，请先 OCR 或转为 Word）');
      return;
    }
    fillParsedText(cleaned, file);
  } catch (e) {
    console.error(e);
    toast('PDF 解析失败：' + (e && e.message ? e.message : e));
  }
}

$('#editClose').addEventListener('click', closeEditPaper);
$('#editCancel').addEventListener('click', closeEditPaper);
$('#editSave').addEventListener('click', saveEditPaper);
$('#editOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'editOverlay') closeEditPaper();
});

$('#copyPromptBtn').addEventListener('click', () => {
  const textEl = $('#formatPromptText');
  const text = textEl ? textEl.textContent : '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('已复制 AI 出题要求')).catch(() => toast('复制失败，请手动选择复制'));
  } else {
    toast('当前浏览器不支持自动复制，请手动选择文字复制');
  }
});

$('#examClose').addEventListener('click', closeExamInfo);
$('#examCancel').addEventListener('click', closeExamInfo);
$('#examStart').addEventListener('click', startExamNow);
$('#examOverlay').addEventListener('click', (e) => { if (e.target.id === 'examOverlay') closeExamInfo(); });
$('#openBackupBtn').addEventListener('click', openBackupModal);
$('#backupClose').addEventListener('click', closeBackupModal);
$('#backupDownloadBtn').addEventListener('click', downloadBackup);
$('#backupOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'backupOverlay') closeBackupModal();
});

$$('.theme-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

$('#floatNext').addEventListener('click', () => { if (window.__floatDragMoved) { window.__floatDragMoved = false; return; } clickFloatNext(); });
$('#floatPrev').addEventListener('click', () => { if (window.__floatDragMoved) { window.__floatDragMoved = false; return; } clickFloatPrev(); });
makeFloatDraggable('#floatNext', 'shuatiben_floatpos_next');
makeFloatDraggable('#floatPrev', 'shuatiben_floatpos_prev');
$('#floatNextToggle').addEventListener('change', (e) => setFloatNext(e.target.checked));
$('#menuToggle').addEventListener('click', () => {
  const sb = document.querySelector('.sidebar');
  if (!sb) return;
  sb.classList.toggle('menu-collapsed');
  const btn = $('#menuToggle');
  const collapsed = sb.classList.contains('menu-collapsed');
  if (btn) btn.textContent = collapsed ? '☰ 展开菜单' : '☰ 收起菜单';
});
$('#displayToggle').addEventListener('click', toggleDisplayPanel);
$('#fontDecBtn').addEventListener('click', () => setFontScaleBy(-0.1));
$('#fontIncBtn').addEventListener('click', () => setFontScaleBy(0.1));
$('#fontResetBtn').addEventListener('click', () => applyFontScale(1));
$('#fontFamilySelect').addEventListener('change', (e) => applyFontFamily(e.target.value));

/* ---- 账号登录弹窗事件 ---- */
$('#authClose').addEventListener('click', closeAuthModal);
$('#authCancel').addEventListener('click', closeAuthModal);
$('#authSubmit').addEventListener('click', submitAuth);
$$('.auth-tab').forEach((b) => {
  b.addEventListener('click', () => {
    authMode = b.dataset.authTab;
    updateAuthTabs();
    showAuthMsg('');
  });
});
$('#authOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'authOverlay') closeAuthModal();
});

/* ============================== 初始化 ============================== */
initTheme();
initFooterPanels();
initDisplaySettings();
renderPapers();
updateBadge();
initCloud();
renderAccountArea();
bindPracticeSwipe();
bindFloatResize();
tryImportFromHash();


























