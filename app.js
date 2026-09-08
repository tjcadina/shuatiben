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

function loadDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.papers) && Array.isArray(d.wrongBook)) {
        if (!d.progress || typeof d.progress !== 'object') d.progress = {};
        return d;
      }
    }
  } catch (e) {}
  return { papers: [], wrongBook: [], progress: {} };
}

function saveDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

let db = loadDB();
let session = null;
let pendingImport = null;
let pendingTitle = '未命名试卷';

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
    answer = answer.replace(/^(?:答案|正确答案|参考答案)\s*[:：]?\s*/i, '');
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

function splitAnswerAnalysis(str) {
  const re = /\s*(?:【?\s*(?:解析|答案解析|试题解析|详解|分析)\s*】?|Explanation|Analysis)\s*[:：]\s*/i;
  const mm = str.match(re);
  if (!mm) return { answer: str, analysis: '' };
  const idx = str.search(re);
  return { answer: str.slice(0, idx).trim(), analysis: str.slice(idx + mm[0].length).trim() };
}

function isAnswerSectionHeader(line) {
  const t = line.replace(/^[一二三四五六七八九十]+[、.．]\s*/, '').trim();
  return /^(?:参考答案|答案与解析|答案解析|试题答案|答案详解|参考答案及解析|参考答案与解析)(?:[:：]?\s*)$/.test(t)
    || /^答案[:：]?\s*$/.test(t);
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

  const analysisOnly = trimmed.match(/^(?:解析|答案解析|试题解析|详解|分析)\s*[:：]\s*(.+)$/i);
  if (analysisOnly) {
    if (entries.length) {
      const last = entries[entries.length - 1];
      const text = analysisOnly[1].trim();
      last.analysis = last.analysis ? last.analysis + '\n' + text : text;
    }
    return true;
  }

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
      const answer = sa.answer.replace(/^(?:答案|正确答案|参考答案)\s*[:：]?\s*/i, '');
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
  return found;
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
  return s.replace(/^(?:答案|正确答案|参考答案)\s*[:：]?\s*/i, '');
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
  let paper = { title: '', subject: '', fallback: '', answerEntries: [] };
  let blocks = [];
  let cur = null;
  let answerMode = false;

  const isSectionLine = (l) => /^[一二三四五六七八九十]+[、.．]/.test(l) || /^第[一二三四五六七八九十]+[部分大题]/.test(l);
  const isPaperTitle = (l) => {
    if (!l || isSectionLine(l)) return false;
    if (/^(?:科目|学科)\s*[:：]/.test(l)) return false;
    if (/^([A-Ha-hＡ-Ｈａ-ｈ])\s*[.、．:：）]/.test(l)) return false;
    if (/^(?:【?\s*(?:答案|正确答案|参考答案)\s*】?|Answer)\s*[:：]?/i.test(l)) return false;
    if (/^(?:【?\s*(?:解析|答案解析|试题解析|详解|分析)\s*】?|Explanation|Analysis)\s*[:：]?/i.test(l)) return false;
    return /试卷|模拟卷|测试卷|真题卷|押题卷|模拟题|真题|预测题|期中|期末|月考|入学|摸底|单元测试|综合测试|练习卷|测验|考试|第[一二三四五六七八九十\d]+套/.test(l);
  };

  const flushQuestion = () => {
    if (cur && (cur.question || cur.answer || cur.options.length)) blocks.push(cur);
    cur = null;
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
    const titleText = paper.title || paper.fallback || '';
    const bookSubject = extractExamSubject(titleText);
    const subject = paper.subject || bookSubject || detectSubjectName(titleText) || classifySubject(contentText);
    return {
      title: paper.title || paper.fallback || fallbackTitle || `试卷 ${papers.length + 1}`,
      subject,
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
      paper = { title: '', subject: '', fallback: '', answerEntries: [] };
    }
    answerMode = false;
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

    if (isAnswerSectionHeader(line) && (blocks.length || cur)) {
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
      const metaLike = /^(?:答案|正确答案|参考答案|解析|答案解析|试题解析|详解|Answer|Explanation|Analysis)/i.test(line);
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

    m = line.match(/^(?:【?\s*(?:答案|正确答案|参考答案)\s*】?|Answer)\s*[:：]?\s*(.*)$/i);
    if (m) {
      const withAnalysis = splitAnswerAnalysis(m[1].trim());
      cur.answer = withAnalysis.answer;
      if (withAnalysis.analysis) cur.analysis = withAnalysis.analysis;
      continue;
    }

    m = line.match(/^(?:【?\s*(?:解析|答案解析|试题解析|详解|分析)\s*】?|Explanation|Analysis)\s*[:：]?\s*(.*)$/i);
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
    return {
      title,
      subject: subject || classifySubject(allText || text),
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
  if (db.progress[paperId]) {
    delete db.progress[paperId];
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
}

function setTopbar(title, subtitle) {
  $('#topbar').innerHTML = `<h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle || '')}</p>`;
}

function showView(view) {
  $$('.view').forEach((v) => v.classList.remove('active'));
  const target = $('#view-' + view);
  if (target) target.classList.add('active');
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  updateBadge();
}

/* ============================== 试卷库 ============================== */
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

  const groups = {};
  for (const p of db.papers) {
    const key = p.subject || '其他';
    (groups[key] = groups[key] || []).push(p);
  }
  const orderedKeys = [...SUBJECTS.filter((s) => groups[s]), ...Object.keys(groups).filter((s) => !SUBJECTS.includes(s))];
  let html = '';
  for (const subject of orderedKeys) {
    const papers = groups[subject];
    html += `<div class="subject-group">
      <div class="subject-head">
        <span class="subject-dot" style="background:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}"></span>
        <h3>${escapeHtml(subject)}</h3>
        <span class="count">${papers.length} 套试卷</span>
      </div>
      <div class="grid">`;

﻿    for (const p of papers) {
      const wrongCount = db.wrongBook.filter((w) => w.paperId === p.id).length;
      const hasProgress = !!(db.progress || {})[p.id];
      const last = p.lastResult
        ? `<span>📈 上次 ${p.lastResult.accuracy}% · ${p.lastResult.correct}/${p.lastResult.total}</span>`
        : `<span>🕒 ${formatDate(p.createdAt)}</span>`;
      html += `<div class="card">
        <div class="card-top">
          <span class="tag tag-subject" style="background:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}22;color:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}">${escapeHtml(subject)}</span>
          <span class="tag">${p.questions.length} 题</span>
          ${hasProgress ? '<span class="tag" style="background:#fff3cd;color:#8a6d1a">⏸ 未完成</span>' : ''}
          ${wrongCount ? `<span class="tag" style="background:#fdeef2;color:#e11d48">错题 ${wrongCount}</span>` : ''}
        </div>
        <h4>${escapeHtml(p.title)}</h4>
        <div class="meta">${last}</div>
        <div class="card-actions">
          <button class="btn btn-solid" data-action="start-paper" data-id="${p.id}">${hasProgress ? '继续上次' : '开始刷题'}</button>
          ${hasProgress ? `<button class="btn btn-outline btn-sm" data-action="restart-paper" data-id="${p.id}">重新开始</button>` : ''}
          ${wrongCount ? `<button class="btn btn-outline" data-action="start-paper-wrong" data-id="${p.id}">错题重练</button>` : ''}
          <button class="btn btn-outline btn-sm" data-action="edit-paper" data-id="${p.id}">编辑</button>
          <button class="btn btn-danger-soft btn-sm" data-action="delete-paper" data-id="${p.id}">删除</button>
        </div>
      </div>`;
    }
    html += `</div></div>`;
  }
  root.innerHTML = html;
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
    html += `<div class="subject-group">
      <div class="subject-head">
        <span class="subject-dot" style="background:${SUBJECT_COLORS[subject] || SUBJECT_COLORS['其他']}"></span>
        <h3>${escapeHtml(subject)}</h3>
        <span class="count">${list.length} 道</span>
      </div>`;

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
            <div style="margin-top:8px"><b>答案：</b>${escapeHtml(answerDisplay(w.question))}<br/><b>解析：</b>${escapeHtml(w.question.analysis || '（无解析）')}</div>
          </details>
          <div class="actions">
            <button class="btn btn-solid btn-sm" data-action="practice-wrong-one" data-id="${w.id}">重新作答</button>
            <button class="btn btn-outline btn-sm" data-action="remove-wrong" data-id="${w.id}">移除</button>
          </div>
        </div>
      </div>`;
    }
    html += `</div>`;
  }
  root.innerHTML = html;
}

/* ============================== 刷题模式 ============================== */
function answerStatusClass(st) {
  if (!st || !st.submitted) return 'todo';
  return st.correct ? 'ok' : 'bad';
}

function goToQuestion(idx) {
  if (!session) return;
  if (idx < 0 || idx >= session.items.length) return;
  clearTimeout(session._autoTimer);
  session.index = idx;
  if (session.mode === 'paper') savePaperProgress();
  renderPractice();
}


function startPaper(paperId, wrongOnly) {
  const paper = db.papers.find((p) => p.id === paperId);
  if (!paper) return;
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
    if (progress && first < 0) {
      clearPaperProgress(paper.id);
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
  startWrongSession(list.map((w) => ({ q: w.question, wrongId: w.id })));
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

  setTopbar(session.title, `${session.mode === 'wrong' ? '错题重练' : '试卷刷题'} · 提交后显示答案与解析`);
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
    action = `<button class="btn btn-solid" id="nextQuestion">${isLast ? '查看答题报告' : '下一题 →'}</button>`;
    if (st.correct && !isLast) action += `<span class="hint" style="color:#16a34a">回答正确，即将自动进入下一题…</span>`;
  }

  let resultPanel = '';
  if (submitted) {
    const good = st.correct;
    resultPanel = `<div class="result-panel ${good ? 'good' : 'bad'}">
      <div class="result-title">${good ? '✅ 回答正确' : '❌ 回答错误'}</div>
      <div class="line"><span class="label">正确答案：</span>${escapeHtml(answerDisplay(q))}</div>
      <div class="line"><span class="label">你的答案：</span>${escapeHtml(st.userAnswer || '（未作答）')}</div>
      ${q.analysis ? `<div class="analysis-box"><b>解析</b><br/>${escapeHtml(q.analysis)}</div>` : ''}
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
      <div class="question-card">
        <div class="question-head">
          <span class="question-no">第 ${index + 1} 题</span>
          <span class="tag">${typeName(q)}</span>
          ${session.subject ? `<span class="tag tag-subject">${escapeHtml(session.subject)}</span>` : ''}
        </div>
        <p class="question-text">${escapeHtml(q.question)}</p>
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
  } else if (!correct) {
    const paper = { id: session.paperId, title: session.title, subject: session.subject };
    upsertWrong(paper, q, userAnswer);
  }

  if (session.mode === 'paper') savePaperProgress();
  else saveDB();
  updateBadge();
  renderPractice();
  scheduleAutoNextIfCorrect(st);
}

function nextQuestion() {
  if (!session) return;
  if (session.index + 1 < session.items.length) {
    session.index += 1;
    if (session.mode === 'paper') savePaperProgress();
    renderPractice();
  } else {
    renderReport();
  }
}

/* ============================== 答题报告 ============================== */
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

  if (session.mode === 'paper' && session.paperId) {
    const paper = db.papers.find((p) => p.id === session.paperId);
    if (paper) {
      paper.lastResult = { score, accuracy, total, correct, date: Date.now() };
      clearPaperProgress(session.paperId);
    }
  }

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

function openBackupModal() {
  $('#backupTextarea').value = '';
  $('#backupOverlay').classList.remove('hidden');
}

function closeBackupModal() {
  $('#backupOverlay').classList.add('hidden');
}

function generateBackup() {
  $('#backupTextarea').value = JSON.stringify({ papers: db.papers, wrongBook: db.wrongBook, exportedAt: formatDate(Date.now()) }, null, 2);
  toast('已生成备份，可复制或下载');
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
  if (!$('#backupTextarea').value) generateBackup();
  const data = $('#backupTextarea').value;
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shuatiben-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('备份文件已下载');
}

function importBackup() {
  const raw = $('#backupTextarea').value.trim();
  if (!raw) { toast('请先粘贴要导入的备份内容'); return; }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    toast('导入失败：不是有效的 JSON');
    return;
  }
  const papers = Array.isArray(data.papers) ? data.papers : [];
  const wrongBook = Array.isArray(data.wrongBook) ? data.wrongBook : [];
  if (!papers.length && !wrongBook.length) { toast('没有可导入的数据'); return; }
  if (!confirm('导入将覆盖当前设备的全部数据，是否继续？')) return;
  db = { papers, wrongBook };
  saveDB();
  closeBackupModal();
  renderPapers();
  renderWrongBook();
  updateBadge();
  toast('数据导入成功');
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
  else if (action === 'start-paper') startPaper(id, false);
  else if (action === 'jump-question') goToQuestion(Number(id));
  else if (action === 'start-paper-wrong') startPaper(id, true);
  else if (action === 'restart-paper') {
    if (confirm('重新开始会清除该试卷的答题进度，确定吗？')) {
      clearPaperProgress(id);
      renderPapers();
      startPaper(id, false);
    }
  }
  else if (action === 'edit-paper') openEditPaper(id);
  else if (action === 'delete-paper') {
    const p = db.papers.find((x) => x.id === id);
    if (!p) return;
    if (confirm(`确定删除「${p.title}」吗？其错题记录也会一并删除。`)) {
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

$('#openBackupBtn').addEventListener('click', openBackupModal);
$('#backupClose').addEventListener('click', closeBackupModal);
$('#backupGenerateBtn').addEventListener('click', generateBackup);
$('#backupCopyBtn').addEventListener('click', copyBackup);
$('#backupDownloadBtn').addEventListener('click', downloadBackup);
$('#backupImportBtn').addEventListener('click', importBackup);
$('#backupOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'backupOverlay') closeBackupModal();
});

$$('.theme-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
});

/* ============================== 初始化 ============================== */
initTheme();
renderPapers();
updateBadge();
