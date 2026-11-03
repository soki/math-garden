import './style.css';
import { playFeedback } from './sound.ts';
import { icon, gardenArt } from './art.ts';
import { choices, DEFAULT_SETTINGS, generate, isSettings, LEVELS, type Question, type Settings } from './questions.ts';
import { createSession, isSession, next, submit, summary, assessEntry, type Session } from './session.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
let settings = { ...DEFAULT_SETTINGS };
let session: Session | null = null;
let screen: 'home' | 'quiz' | 'results' | 'print' = 'home';
let entry = '';
let soundEnabled = true;
let worksheet: { questions: Question[]; settings: Settings; notice: string; date: string; name: string } | null = null;
let includeAnswers = false;
let storageUnavailable = false;
let printReturn: 'home' | 'quiz' | 'results' = 'home';
try {
  const saved = JSON.parse(localStorage.getItem('math-garden-v1') || 'null');
  if (isSettings(saved?.settings)) settings = saved.settings;
  if (isSession(saved?.session)) session = saved.session;
  if (typeof saved?.soundEnabled === 'boolean') soundEnabled = saved.soundEnabled;
} catch { /* A damaged or unavailable local save must not prevent practice. */ }
function persist() {
  try { localStorage.setItem('math-garden-v1', JSON.stringify({ settings, session, soundEnabled })); }
  catch { storageUnavailable = true; }
}
function level(s = settings) { return LEVELS.find(l => l.id === s.level)!; }
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function operationLabel(s: Settings) { return s.operation === 'mixed' ? '加减混合' : s.operation === 'add' ? '加法练习' : '减法练习'; }
function header() {
  return `<header class="site-header"><button class="brand" data-action="home" aria-label="数学小花园首页">${icon('flower')}<span>数学小花园<small>MATH GARDEN</small></span></button><div class="header-actions"><button class="sound-button" data-action="sound" aria-label="${soundEnabled ? '关闭提示音' : '开启提示音'}" aria-pressed="${soundEnabled}" title="${soundEnabled ? '关闭提示音' : '开启提示音'}">${icon(soundEnabled ? 'sound' : 'silent')}</button><button class="parent-button" data-action="parents" aria-label="给陪伴的大人">${icon('heart')}<span>给陪伴的大人</span></button></div></header>`;
}
function footer() { return `<footer class="site-footer"><span>一颗小种子，一点小进步。</span><span>慢慢来，你会发现数学的美好 ${icon('sprout')}</span></footer>`; }
function radio(name: string, value: string | number, text: string, checked: boolean) {
  return `<label class="segment"><input type="radio" name="${name}" value="${value}" ${checked ? 'checked' : ''}><span>${text}</span></label>`;
}
function home() {
  const resumable = session && !session.completed;
  return `${header()}<main class="home-main"><section class="hero"><div class="hero-copy"><p class="eyebrow"><span></span> 欢迎来到你的数学小花园</p><h1>每天一点点，<br>数学<span class="pink-word">开花啦</span><span class="title-dot">。</span></h1><p class="hero-description">和小兔一起，种下加减法的小种子。<br>动动脑，数一数，每一次尝试都在长大。</p><div class="hero-notes"><span>${icon('seed')}轻松练一练</span><span>${icon('print')}也能打印哦</span></div></div><div class="hero-picture">${gardenArt()}<span class="garden-tag">今天，也要长大一点点 ♡</span></div></section>
  ${resumable ? `<aside class="resume-banner"><span>🌱 还有一朵小花等着你 · 已完成 ${session!.index}／${session!.records.length} 题</span><button data-action="resume">继续上次练习 ${icon('arrow')}</button></aside>` : ''}
  <section class="setup-card" aria-labelledby="setup-title"><div class="section-heading"><div><span class="step-label">LET’S GROW</span><h2 id="setup-title">今天，想种哪一朵？</h2></div><span class="gentle-pill">没有倒计时，按自己的节奏来</span></div>
  <fieldset class="levels"><legend class="sr-only">选择练习难度</legend>${LEVELS.map(l => `<label class="level-card ${l.id}"><input type="radio" name="level" value="${l.id}" ${settings.level === l.id ? 'checked' : ''}><span class="level-content">${icon(l.icon)}<strong>${l.name}</strong><small>${l.description}</small><span class="selected-tick">✓</span></span></label>`).join('')}</fieldset>
  <div class="practice-options"><fieldset><legend>练什么</legend><div class="segments">${radio('operation', 'mixed', '＋ − 混合', settings.operation === 'mixed')}${radio('operation', 'add', '＋ 加法', settings.operation === 'add')}${radio('operation', 'subtract', '− 减法', settings.operation === 'subtract')}</div></fieldset><fieldset><legend>练几题</legend><div class="segments">${radio('count', 15, '15 题', settings.count === 15)}${radio('count', 20, '20 题', settings.count === 20)}</div></fieldset><fieldset><legend>怎么回答</legend><div class="segments">${radio('input', 'keypad', '数字键盘', settings.input === 'keypad')}${radio('input', 'choices', '选一选', settings.input === 'choices')}</div></fieldset></div>
  <div class="setup-bottom"><p>${icon('flower')} 每轮都是新题目，让小小的进步开花。</p><div class="setup-actions"><button class="button secondary" data-action="print-new">${icon('print')}打印练习纸</button><button class="button primary" data-action="start">开始练习 ${icon('arrow')}</button></div></div></section><p class="home-undertext">不用登录 · 安心练习 · 进度保存在这台设备上</p>${storageUnavailable ? '<p class="save-warning">此浏览器暂不能保存进度，仍可正常练习。</p>' : ''}</main>${footer()}`;
}
function quiz() {
  const s = session!; const r = s.records[s.index]; const q = r.question;
  const finished = r.status === 'correct' || r.status === 'revealed';
  const wrong = r.status === 'revealed' || (r.status === 'retry' && (!entry || assessEntry(entry, q.answer) === 'wrong'));
  const max = level(s.settings).max;
  if (!r.options.length) { r.options = choices(q, max); persist(); }
  const blooms = s.records.slice(0, s.index).map(() => icon('flower')).join('');
  return `${header()}<main class="quiz-main"><div class="practice-top"><button class="text-button" data-action="pause">${icon('back')}休息一下</button><div class="practice-meta"><strong>${level(s.settings).name} · ${operationLabel(s.settings)}</strong><span>第 ${s.index + 1} / ${s.records.length} 题</span></div><button class="text-button" data-action="print-current">${icon('print')}打印本轮</button></div><div class="progress-track" role="progressbar" aria-label="练习进度" aria-valuemin="0" aria-valuemax="${s.records.length}" aria-valuenow="${s.index}"><span style="width:${s.index / s.records.length * 100}%"></span></div>
  ${s.notice ? `<p class="pool-notice">${s.notice}</p>` : ''}
  <div class="quiz-layout"><section class="question-card ${wrong ? 'incorrect' : ''}" aria-labelledby="question-heading"><p class="eyebrow">${r.status === 'retry' ? '小花不着急，再想一想' : '给小花浇一滴水吧'}</p><h1 id="question-heading" class="sr-only">${q.a} ${q.op === '+' ? '加' : '减'} ${q.b} 等于多少</h1><div class="equation" aria-hidden="true"><span>${q.a}</span><span class="math-op">${q.op}</span><span>${q.b}</span><span class="math-op">=</span><output id="answer-display" class="answer-box ${finished ? 'settled' : ''} ${wrong && !finished ? 'incorrect' : ''}">${finished ? q.answer : entry || '?'}</output></div><p id="answer-spoken" class="sr-only" aria-live="polite">${finished ? `正确答案是${q.answer}` : entry ? `已输入${entry}` : '请作答'}</p>
  <div class="answer-feedback ${r.status} ${wrong ? 'incorrect' : ''}" role="status">${r.status === 'correct' ? `${icon('check')} ${r.attempts === 1 ? '答对啦！小花又长大一点。' : '你找到答案啦！继续加油。'}` : r.status === 'retry' ? wrong ? '✕ 还不对哦，再试一次吧！' : '再输入一位数字，慢慢来。' : r.status === 'revealed' ? '✕ 这次还不对，看看正确答案，再试下一题。' : entry ? '再输入一位数字，慢慢来。' : '输入答案，就会自动判断哦。'}</div>
  <button class="help-button" data-action="help">${icon('help')}帮帮我 · 看图数一数</button><div class="little-garden" aria-label="已完成的小花">${blooms || `<span>${icon('seed')} 你的第一朵小花，马上就要发芽啦</span>`}</div></section>
  <section class="input-card" aria-label="作答区域"><p class="input-title">${finished ? '每一次尝试，都很棒' : s.settings.input === 'keypad' ? '点数字，填答案' : '选一个答案吧'}</p>${finished ? `<div class="reward-flower">${icon(r.status === 'correct' ? 'flower' : 'sprout')}<p>${r.status === 'correct' ? '收到一滴成长的水！' : '学会新方法，也是一种成长。'}</p></div>` : s.settings.input === 'keypad' ? `<div class="keypad">${[1,2,3,4,5,6,7,8,9,'clear',0,'delete'].map(n => `<button data-action="key" data-value="${n}" class="key ${typeof n === 'string' ? 'utility-key' : ''}" aria-label="${n === 'clear' ? '清空答案' : n === 'delete' ? '删除一位' : n}">${n === 'clear' ? '清空' : n === 'delete' ? '⌫' : n}</button>`).join('')}</div>` : `<div class="answer-choices">${r.options.map((n, i) => `<button class="choice ${entry === String(n) ? wrong ? 'wrong-choice' : 'chosen' : ''}" data-action="choose" data-value="${n}" aria-pressed="${entry === String(n)}"><small>${i + 1}</small>${n}<span>${entry === String(n) ? wrong ? '✕' : '✓' : ''}</span></button>`).join('')}</div>`}
  ${finished ? `<button class="button primary check-button" data-action="next">${s.index === s.records.length - 1 ? '看看我的小花园' : '下一题'} ${icon('arrow')}</button>` : ''}<p class="keyboard-note">${finished ? '准备好了再继续，不用着急' : s.settings.input === 'keypad' ? '自动判断 · 也可以用键盘数字输入' : '点选答案，就会自动判断哦'}</p></section></div></main>${footer()}`;
}
function results() {
  const s = session!; const stats = summary(s);
  return `${header()}<main class="results-main"><p class="eyebrow">A LITTLE GROWTH, A LOT OF JOY</p><div class="result-bouquet">${icon('sprout')}${icon('flower')}${icon('flower')}${icon('sprout')}</div><h1>你的小花园，开花啦！</h1><p class="result-subtitle">认真完成 ${s.records.length} 道题，每一次尝试都值得一朵小花。</p><section class="result-stats" aria-label="本轮练习结果"><div><strong>${s.records.length}</strong><span>完成题数</span></div><div><strong>${stats.firstCorrect}<small> / ${s.records.length}</small></strong><span>首次答对</span></div><div><strong>${stats.retried}</strong><span>尝试了两次</span></div><div><strong>${stats.helped}</strong><span>看图学一学</span></div></section>
  <section class="review-card"><h2>${stats.review.length ? '这些小种子，再照顾一下' : '每一朵小花都被你好好照顾了'}</h2><p>${stats.review.length ? '点开看图解，或者再练一轮这些题。' : '可以休息一下，也可以开启一轮新的练习。'}</p><div class="review-list">${stats.review.map(r => `<button data-action="review-help" data-index="${s.records.indexOf(r)}"><span>${r.question.a} ${r.question.op} ${r.question.b} = ${r.question.answer}</span><small>${r.firstAnswer !== r.question.answer ? '再练一练' : '用过图解'} ↗</small></button>`).join('')}</div></section><div class="result-actions"><button class="button secondary" data-action="home">回到首页</button><button class="button secondary" data-action="print-current">${icon('print')}打印本轮</button>${stats.review.length ? '<button class="button secondary" data-action="review">练练这些题</button>' : ''}<button class="button primary" data-action="again">再练一轮 ${icon('arrow')}</button></div><p class="privacy-note">本轮结果仅保存在这台设备上，多位小朋友可以轮流练习。</p></main>${footer()}`;
}
function paper(answers = false) {
  const w = worksheet!;
  return `<section class="paper ${answers ? 'answer-paper' : ''}" aria-label="${answers ? '练习答案页' : '练习题目页'}"><div class="paper-header"><div><p>MATH GARDEN · ${answers ? 'ANSWER SHEET' : 'PRACTICE SHEET'}</p><h1>${answers ? '数学小花园 · 答案' : '我的加减法小花园'}</h1></div>${icon('flower')}</div><div class="paper-info"><span>姓名：${esc(w.name) || '____________'}</span><span>日期：${w.date}</span></div><p class="paper-meta">${level(w.settings).name} · ${operationLabel(w.settings)} · ${w.questions.length} 题<span>${answers ? '请与对应题号核对' : '仔细想，慢慢算，你一定可以！'}</span></p><ol class="paper-questions">${w.questions.map((q, i) => `<li><small>${i + 1}.</small><span>${q.a} ${q.op} ${q.b} = <b class="${answers ? 'printed-answer' : 'blank'}">${answers ? q.answer : ''}</b></span></li>`).join('')}</ol><div class="paper-footer"><span>每一个小小的进步，都在悄悄开花。</span><span>${answers ? '答案页' : '练习页'} · 数学小花园</span></div></section>`;
}
function printPreview() {
  return `${header()}<main class="print-main"><div class="print-toolbar"><div><button class="text-button" data-action="print-back">${icon('back')}返回${printReturn === 'home' ? '首页' : printReturn === 'quiz' ? '练习' : '结果'}</button><h1>把小花园带到纸上</h1><p>题目已固定，预览与打印内容一致。</p></div><div class="print-actions"><button class="button secondary" data-action="regenerate">换一套题</button><button class="button primary" data-action="print">${icon('print')}打印 / 保存 PDF</button></div></div><div class="print-settings"><label>姓名（选填）<input id="print-name" maxlength="20" placeholder="小朋友的名字" value="${esc(worksheet!.name)}"></label><label class="answer-toggle"><input type="checkbox" id="include-answers" ${includeAnswers ? 'checked' : ''}>附上单独的答案页</label><span>A4 竖版 · 黑白友好 · ${worksheet!.questions.length} 题</span></div>${worksheet!.notice ? `<p class="pool-notice">${worksheet!.notice}</p>` : ''}<p class="print-tip">打印时选择 A4、竖向、100% 缩放，并关闭浏览器页眉页脚。平板可尝试浏览器菜单中的「打印」或「分享」。</p><div id="paper-preview">${paper()}${includeAnswers ? paper(true) : ''}</div></main>${footer()}`;
}
function render(focus = false) {
  app.innerHTML = screen === 'home' ? home() : screen === 'quiz' ? quiz() : screen === 'results' ? results() : printPreview();
  if (focus) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const heading = app.querySelector<HTMLElement>('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
}
function showDialog(content: string, label: string, extraClass = '') {
  const dialog = document.createElement('dialog');
  dialog.className = `garden-dialog ${extraClass}`;
  dialog.setAttribute('aria-label', label);
  dialog.innerHTML = `<button class="dialog-close" aria-label="关闭" data-close>${icon('close')}</button>${content}`;
  dialog.addEventListener('click', e => { if ((e.target as Element).closest('[data-close]')) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  app.append(dialog); dialog.showModal();
  return dialog;
}
function explain(q: Question) {
  const crossing = q.op === '+' ? q.a % 10 + q.b % 10 >= 10 : q.a % 10 < q.b % 10;
  const dots = (count: number, extra = false, removed = 0) => `<div class="count-frames">${Array.from({length: Math.ceil(count / 10)}, (_, frame) => `<div class="ten-frame">${Array.from({length: 10}, (_, i) => { const n = frame * 10 + i; return `<span class="count-slot ${n >= count ? 'empty' : ''} ${extra ? 'added' : ''} ${n >= count - removed ? 'removed' : ''}">${n < count ? '●' : ''}</span>`; }).join('')}</div>`).join('') || '<span class="zero-count">0</span>'}</div>`;
  let steps: string;
  if (q.op === '+') {
    const makeTen = 10 - q.a % 10;
    steps = `<div class="visual-step"><span class="step-number">1</span><span>先有 ${q.a} 颗</span>${dots(q.a)}</div><div class="visual-step"><span class="step-number">2</span><span>再添 ${q.b} 颗</span>${dots(q.b, true)}</div><div class="explain-answer"><span class="step-number">3</span><strong>${q.a} + ${q.b} = ${q.answer}</strong><span>${crossing ? `先添 ${makeTen} 颗凑成 10，再添 ${q.b - makeTen} 颗。` : `合在一起，一共 ${q.answer} 颗。`}</span></div>`;
  } else {
    const toTen = q.a % 10;
    steps = `<div class="visual-step"><span class="step-number">1</span><span>先有 ${q.a} 颗</span></div><div class="visual-step"><span class="step-number">2</span><span>划去 ${q.b} 颗，数数没划掉的</span>${dots(q.a, false, q.b)}</div><div class="explain-answer"><span class="step-number">3</span><strong>${q.a} − ${q.b} = ${q.answer}</strong><span>${crossing ? `先拿走 ${toTen} 颗剩 10，再拿走 ${q.b - toTen} 颗。` : `还剩下 ${q.answer} 颗。`}</span></div>`;
  }
  const dialog = showDialog(`<p class="eyebrow">一起数一数</p><h2>小种子会告诉你答案</h2><div class="explanation">${steps}</div><div class="dialog-actions"><button class="button secondary" data-replay>再看一次</button><button class="button primary" data-close>我知道啦 ${icon('check')}</button></div>`, '看图理解这道题', 'explain-dialog');
  dialog.querySelector('[data-replay]')!.addEventListener('click', () => {
    const visual = dialog.querySelector<HTMLElement>('.explanation')!;
    visual.classList.remove('replaying'); void visual.offsetWidth; visual.classList.add('replaying');
  });
}
function start(questions?: Question[], practiceSettings = settings, notice?: string) {
  const generated = questions ? { questions, notice: notice || '' } : generate(practiceSettings);
  session = createSession(practiceSettings, generated.questions, generated.notice);
  entry = ''; screen = 'quiz'; persist(); render(true);
}
function updateAnswer() {
  const output = document.querySelector('#answer-display');
  if (output) { output.textContent = entry || '?'; output.classList.remove('incorrect'); }
  document.querySelector('.question-card')?.classList.remove('incorrect');
  const feedback = document.querySelector('.answer-feedback');
  if (feedback) {
    feedback.className = 'answer-feedback answering';
    feedback.textContent = entry ? '再输入一位数字，慢慢来。' : '输入答案，就会自动判断哦。';
  }
  const spoken = document.querySelector('#answer-spoken');
  if (spoken) spoken.textContent = entry ? `已输入${entry}，请继续输入` : '请作答';
}
function checkAnswer() {
  if (!entry || !session || !submit(session, Number(entry))) return;
  const r = session.records[session.index];
  if (soundEnabled) playFeedback(r.status === 'correct');
  persist(); render();
  app.querySelector<HTMLButtonElement>(r.status === 'correct' || r.status === 'revealed' ? '[data-action="next"]' : '[data-action="key"], [data-action="choose"]')?.focus({ preventScroll: true });
}
function key(value: string) {
  if (!session || !['answering', 'retry'].includes(session.records[session.index].status)) return;
  const r = session.records[session.index];
  // A new digit replaces a rejected attempt; keep the wrong answer visible until then.
  if (/^\d$/.test(value) && r.status === 'retry' && assessEntry(entry, r.question.answer) === 'wrong') entry = '';
  if (value === 'delete') entry = entry.slice(0, -1);
  else if (value === 'clear') entry = '';
  else if (/^\d$/.test(value) && entry.length < 2) entry = entry === '0' ? value : entry + value;
  else return;
  updateAnswer();
  if (assessEntry(entry, r.question.answer) !== 'incomplete') checkAnswer();
}
function openPrint(current: boolean) {
  const s = current && session ? session.settings : settings;
  const generated = current && session ? { questions: session.records.map(r => r.question), notice: session.notice } : generate(s);
  worksheet = { ...generated, settings: { ...s }, date: new Intl.DateTimeFormat('zh-CN').format(new Date()), name: '' };
  printReturn = screen === 'quiz' ? 'quiz' : screen === 'results' ? 'results' : 'home';
  screen = 'print'; render(true);
}
app.addEventListener('change', e => {
  const target = e.target as HTMLInputElement;
  if (target.name && screen === 'home') {
    const value = target.name === 'count' ? Number(target.value) : target.value;
    const updated = { ...settings, [target.name]: value };
    if (isSettings(updated)) { settings = updated; persist(); }
  }
  if (target.id === 'include-answers') {
    includeAnswers = target.checked;
    document.querySelector('#paper-preview')!.innerHTML = paper() + (includeAnswers ? paper(true) : '');
  }
});
app.addEventListener('input', e => {
  const target = e.target as HTMLInputElement;
  if (target.id === 'print-name' && worksheet) {
    worksheet.name = target.value;
    document.querySelector('#paper-preview')!.innerHTML = paper() + (includeAnswers ? paper(true) : '');
  }
});
app.addEventListener('click', e => {
  const button = (e.target as Element).closest<HTMLButtonElement>('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === 'sound') { soundEnabled = !soundEnabled; persist(); render(); if (soundEnabled) playFeedback(true); }
  if (action === 'home' || action === 'pause') { screen = 'home'; persist(); render(true); }
  if (action === 'resume') { screen = 'quiz'; entry = ''; render(true); }
  if (action === 'start') {
    if (session && !session.completed) {
      const dialog = showDialog('<h2>开始一轮新的练习？</h2><p>上次没有完成的练习会被替换。</p><div class="dialog-actions"><button class="button secondary" data-close>先不换</button><button class="button primary" data-new>开始新练习</button></div>', '替换未完成练习');
      dialog.querySelector('[data-new]')!.addEventListener('click', () => { dialog.close(); start(); });
    } else start();
  }
  if (action === 'again') start(undefined, session!.settings);
  if (action === 'review') start(summary(session!).review.map(r => r.question), session!.settings);
  if (action === 'key') key(button.dataset.value!);
  if (action === 'choose') { entry = button.dataset.value!; checkAnswer(); }
  if (action === 'next') { next(session!); entry = ''; if (session!.completed) screen = 'results'; persist(); render(true); }
  if (action === 'help') { const r = session!.records[session!.index]; r.helped = true; persist(); explain(r.question); }
  if (action === 'review-help') explain(session!.records[Number(button.dataset.index)].question);
  if (action === 'print-new') openPrint(false);
  if (action === 'print-current') openPrint(true);
  if (action === 'print-back') { screen = printReturn; render(true); }
  if (action === 'regenerate' && worksheet) { const g = generate(worksheet.settings); worksheet.questions = g.questions; worksheet.notice = g.notice; render(); }
  if (action === 'print') { syncPrint(); window.print(); }
  if (action === 'parents') showDialog(`<p class="eyebrow">陪伴，是最好的养分</p><h2>让练习轻松一点</h2><ul class="parent-notes"><li>从「小花苗」开始，觉得吃力就换「小种子」。</li><li>不计时，不比较。需要休息时随时回首页。</li><li>先让孩子数一数，再一起看看图解。</li><li>结果中的「首次答对」与重试、求助分别记录。</li><li>多位孩子轮流练习时，从首页开始新的一轮。</li></ul><p class="privacy-note">没有账号、广告和上传记录。进度仅保存在本浏览器；隐私模式或清除浏览器数据后可能丢失。</p><button class="button primary" data-close>一起慢慢长大 ${icon('sprout')}</button>`, '给陪伴的大人');
});
function syncPrint() {
  if (screen !== 'print' || !worksheet) {
    const current = (screen === 'quiz' || screen === 'results') && session;
    const s = current ? current.settings : settings;
    const generated = current ? { questions: current.records.map(r => r.question), notice: current.notice } : generate(s);
    worksheet = { ...generated, settings: { ...s }, date: new Intl.DateTimeFormat('zh-CN').format(new Date()), name: '' };
  }
  document.querySelector('#print-root')!.innerHTML = paper() + (includeAnswers ? paper(true) : '');
}
window.addEventListener('beforeprint', syncPrint);
document.addEventListener('keydown', e => {
  if (screen !== 'quiz' || document.querySelector('dialog[open]') || e.ctrlKey || e.metaKey || e.altKey) return;
  if ((e.target as HTMLElement).matches('input,textarea,select')) return;
  if (session!.settings.input === 'keypad' && (/^\d$/.test(e.key) || e.key === 'Backspace' || e.key === 'Delete')) {
    e.preventDefault(); if (e.repeat) return; key(e.key === 'Backspace' ? 'delete' : e.key === 'Delete' ? 'clear' : e.key);
  }
  const focusedButton = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
  const answerControl = focusedButton?.matches('[data-action="key"], [data-action="choose"], [data-action="next"]');
  if (e.key === 'Enter' && (!focusedButton || answerControl)) {
    e.preventDefault(); if (!e.repeat) app.querySelector<HTMLButtonElement>('[data-action="next"]')?.click();
  }
});
render();
