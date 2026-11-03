import './style.css';
import { playFeedback, speak, stopSpeech } from './sound.ts';
import { icon, gardenArt } from './art.ts';
import { choices, DEFAULT_SETTINGS, generate, isSettings, LEVELS, type Question, type Settings } from './questions.ts';
import { createSession, restoreSession, next, skip, submit, summary, assessEntry, type Session } from './session.ts';

import { createHint, hintStage, touchFruit } from './hints.ts';

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
  session = restoreSession(saved?.session);
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
function feedbackMarkup(correct: boolean, wrong: boolean, pending = false) {
  const label = correct ? '答对了' : wrong ? '再想一想，可以继续尝试' : pending ? '继续输入下一位数字' : '输入或点选答案';
  return `<span class="feedback-face" aria-hidden="true">${correct ? '😊' : wrong ? '🤔' : '🐰'}</span><span class="feedback-mark" aria-hidden="true">${correct ? '✓' : wrong ? '↻' : pending ? '…' : '✎'}</span><span class="feedback-caption">${correct ? '真棒！' : wrong ? '再试试' : pending ? '接着填' : '试一试'}</span><span class="sr-only">${label}</span>`;
}
function quiz() {
  const s = session!; const r = s.records[s.index]; const q = r.question;
  const finished = r.status === 'correct';
  const wrong = r.status === 'retry' && (!entry || assessEntry(entry, q.answer) === 'wrong');
  if (!r.options.length) { r.options = choices(q, level(s.settings).max); persist(); }
  const blooms = s.records.slice(0, s.index).filter(r => r.status === 'correct').map(() => icon('flower')).join('');
  return `${header()}<main class="quiz-main child-quiz"><div class="practice-top"><button class="picture-button" data-action="pause" aria-label="休息一下"><span aria-hidden="true">⏸</span><small>休息</small></button><div class="practice-meta"><span class="sr-only">练习进度</span><strong>${s.index + 1} / ${s.records.length}</strong></div><button class="picture-button" data-action="read-question" aria-label="读题"><span aria-hidden="true">🔊</span><small>听题</small></button></div><div class="progress-track" role="progressbar" aria-label="练习进度" aria-valuemin="0" aria-valuemax="${s.records.length}" aria-valuenow="${s.index}"><span style="width:${s.index / s.records.length * 100}%"></span></div>
  <div class="quiz-layout"><section class="question-card ${wrong ? 'incorrect' : ''}" aria-labelledby="question-heading"><h1 id="question-heading" class="sr-only">${q.a} ${q.op === '+' ? '加' : '减'} ${q.b} 等于多少</h1><div class="equation" aria-hidden="true"><span>${q.a}</span><span class="math-op">${q.op}</span><span>${q.b}</span><span class="math-op">=</span><output id="answer-display" class="answer-box ${finished ? 'settled' : ''} ${wrong ? 'incorrect' : ''}">${finished ? q.answer : entry || '?'}</output></div><p id="answer-spoken" class="sr-only" aria-live="polite">${finished ? '答对了' : entry ? `已输入${entry}` : '请作答'}</p>
  <div class="answer-feedback child-feedback ${finished ? 'correct' : wrong ? 'incorrect' : 'answering'}" role="status">${feedbackMarkup(finished, wrong, !!entry && !wrong && !finished)}</div>
  ${!finished ? `<div class="child-tools"><button class="help-button rabbit-help ${r.attempts >= 2 ? 'needs-help' : ''}" data-action="help" aria-label="小兔帮忙，动手数一数"><span aria-hidden="true">🐰 🧺</span><small>帮帮我</small></button><button class="picture-button skip-button" data-action="skip" aria-label="跳过这道题"><span aria-hidden="true">⏭</span><small>先跳过</small></button></div>` : ''}<div class="little-garden" aria-label="已完成的小花">${blooms || icon('seed')}</div></section>
  <section class="input-card" aria-label="作答区域">${finished ? `<div class="reward-flower">${icon('flower')}<span class="reward-emoji" aria-hidden="true">💧 ✨</span></div>` : s.settings.input === 'keypad' ? `<div class="keypad">${[1,2,3,4,5,6,7,8,9,'clear',0,'delete'].map(n => `<button data-action="key" data-value="${n}" class="key ${typeof n === 'string' ? 'utility-key' : ''}" aria-label="${n === 'clear' ? '清空答案' : n === 'delete' ? '删除一位' : n}">${n === 'clear' ? '↺' : n === 'delete' ? '⌫' : n}</button>`).join('')}</div>` : `<div class="answer-choices">${r.options.map(n => `<button class="choice ${entry === String(n) && wrong ? 'wrong-choice' : ''}" data-action="choose" data-value="${n}" aria-label="答案 ${n}"><span>${n}</span><small aria-hidden="true">${entry === String(n) && wrong ? '↻' : ''}</small></button>`).join('')}</div>`}
  ${finished ? `<button class="button primary check-button picture-next" data-action="next" aria-label="${s.index === s.records.length - 1 ? '看看我的小花园' : '下一题'}"><span aria-hidden="true">${s.index === s.records.length - 1 ? '🌸' : '➜'}</span><small>${s.index === s.records.length - 1 ? '小花园' : '下一题'}</small></button>` : ''}</section></div></main>`;
}
function results() {
  const stats = summary(session!);
  return `${header()}<main class="results-main child-results"><div class="celebration" role="img" aria-label="小兔为你的努力庆祝">🐰 🎉</div><div class="result-bouquet">${icon('sprout')}${icon('flower')}${icon('flower')}${icon('sprout')}</div><h1>小花园，长大啦！</h1><p class="result-subtitle">${stats.solved ? '🌸 💧 ✨' : '🌱 ☀️ 💛'}</p><div class="child-result-actions"><button class="button primary picture-action" data-action="again" aria-label="再练一轮"><span aria-hidden="true">🔁</span><small>再玩</small></button>${stats.review.length ? '<button class="button secondary picture-action" data-action="review" aria-label="复习需要再练的题"><span aria-hidden="true">🐰</span><small>再数数</small></button>' : ''}<button class="button secondary picture-action" data-action="home" aria-label="回到首页"><span aria-hidden="true">🏠</span><small>回家</small></button></div><button class="text-button" data-action="parents">${icon('heart')}家长看记录</button></main>`;
}
function parentContent() {
  const stats = session ? summary(session) : null;
  return `<p class="eyebrow">给陪伴的大人</p><h2>让练习轻松一点</h2><ul class="parent-notes"><li>可以一直尝试，不会因答错自动显示答案。</li><li>🐰 打开动手提示，🔊 听题，⏭ 跳过。</li><li>提示不会填写答案，数数语音跟随孩子的点击。</li><li>右上角喇叭控制提示音与语音；语音由 Gemini 提前生成，播放不可用时仍可看图操作。</li></ul>${stats ? `<section class="parent-records"><h3>本轮记录 · ${session!.records.length} 题</h3><dl><div><dt>独立完成</dt><dd>${stats.independent}</dd></div><div><dt>借助提示完成</dt><dd>${stats.withHelp}</dd></div><div><dt>跳过</dt><dd>${stats.skipped}</dd></div><div><dt>首次答对</dt><dd>${stats.firstCorrect}</dd></div></dl><p>独立完成指未使用提示；重试后完成也计入。跳过不计为答对。</p>${session!.notice ? `<p>${session!.notice}</p>` : ''}<div class="review-list">${stats.review.map(r => `<div class="parent-review"><span>${r.question.a} ${r.question.op} ${r.question.b} = ${r.question.answer}</span><small>${r.status === 'skipped' ? '跳过' : r.helped ? '用过提示' : '重试'} · ${r.attempts} 次作答</small></div>`).join('')}</div><div class="dialog-actions"><button class="button secondary" data-action="print-current">${icon('print')}打印本轮与答案</button></div></section>` : ''}<p class="privacy-note">无需账号，练习记录仅保存在本浏览器。姓名只用于打印预览，不上传。</p><button class="button primary" data-close>知道了 ${icon('heart')}</button>`;
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
  const hint = createHint(q);
  const dialog = showDialog('<div id="hint-content"></div>', '小兔帮忙，动手数一数', 'explain-dialog hands-on-dialog');
  const empty = () => (q.op === '+' ? q.a + q.b : q.a - hint.removed.length) === 0;
  const instruction = () => hintStage(hint) === 'count' && empty() ? '看看空篮子，想一想，再回去填答案。' : hintStage(hint) === 'combine' ? '把两篮草莓合在一起，再点一点，数一数。' : hintStage(hint) === 'remove' ? `先拿走${q.b}颗草莓。` : '点一点，数一数。想好了，再回去填答案。';
  const draw = () => {
    const stage = hintStage(hint);
    const fruit = (index: number) => {
      const removed = hint.removed.includes(index);
      const order = hint.counted.indexOf(index) + 1;
      return `<button class="hint-fruit ${removed ? 'taken' : ''} ${order ? 'counted' : ''} ${q.op === '+' && index >= q.a ? 'second-group' : ''}" data-fruit="${index}" ${removed || stage === 'combine' ? 'disabled' : ''} aria-label="${removed ? '已拿走的草莓' : stage === 'remove' ? '拿走一颗草莓' : order ? `第${order}颗草莓，再听一次` : '数一颗草莓'}"><span aria-hidden="true">🍓</span>${order ? `<small aria-hidden="true">${order}</small>` : ''}</button>`;
    };
    const tray = (start: number, count: number) => `<div class="fruit-tray">${Array.from({length:count},(_,i)=>fruit(start+i)).join('') || '<span class="empty-basket" role="img" aria-label="空篮子">🧺</span>'}</div>`;
    const total = q.op === '+' ? q.a + q.b : q.a;
    const frames = `<div class="fruit-frames">${Array.from({length:Math.ceil(total/10)},(_,f)=>`<div class="fruit-ten-frame">${Array.from({length:10},(_,i)=>f*10+i<total?fruit(f*10+i):'<span class="fruit-empty" aria-hidden="true"></span>').join('')}</div>`).join('') || '<span class="empty-basket" role="img" aria-label="空篮子">🧺</span>'}</div>`;
    dialog.querySelector('#hint-content')!.innerHTML = `<div class="hint-bunny" aria-hidden="true">🐰</div><h2 class="hint-question">${q.a} ${q.op} ${q.b} = ?</h2><div class="hint-instruction" role="status"><span aria-hidden="true">${stage === 'combine' ? '🧺 ＋ 🧺' : stage === 'remove' ? `🍓 × ${q.b} ➜ 🧺` : empty() ? '🧺 👀' : '👆 🍓'}</span><p>${stage === 'combine' ? '合一合' : stage === 'remove' ? '拿走' : empty() ? '看一看' : '数一数'}</p><span class="sr-only">${instruction()}</span></div>${stage === 'combine' ? `<div class="two-trays">${tray(0,q.a)}<span class="tray-plus" aria-hidden="true">＋</span>${tray(q.a,q.b)}</div>` : frames}${q.op === '−' ? `<div class="taken-basket" aria-label="需要拿走${q.b}颗，已经拿走${hint.removed.length}颗"><span aria-hidden="true">🧺 ${hint.removed.length} / ${q.b}</span></div>` : ''}<div class="dialog-actions hint-actions"><button class="button secondary picture-action" data-hint-reset aria-label="重新数一遍"><span aria-hidden="true">↺</span><small>重来</small></button><button class="button secondary picture-action" data-hint-speak aria-label="听提示"><span aria-hidden="true">🔊</span><small>听一听</small></button>${stage === 'combine' ? '<button class="button primary picture-action" data-combine aria-label="把两篮草莓合在一起"><span aria-hidden="true">🧺 ➜</span><small>合一起</small></button>' : '<button class="button primary picture-action" data-close aria-label="回去自己填答案"><span aria-hidden="true">✏️ ➜</span><small>我来填</small></button>'}</div>`;
  };
  dialog.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!target || target.disabled) return;
    if (target.hasAttribute('data-combine')) { hint.combined = true; draw(); if (soundEnabled) speak(instruction()); }
    if (target.hasAttribute('data-hint-reset')) { Object.assign(hint, createHint(q)); draw(); if (soundEnabled) speak(instruction()); }
    if (target.hasAttribute('data-hint-speak') && soundEnabled) speak(instruction());
    if (target.hasAttribute('data-fruit')) {
      const stage = hintStage(hint);
      const number = touchFruit(hint, Number(target.dataset.fruit));
      if (number !== null) { draw(); (dialog.querySelector<HTMLButtonElement>(`[data-fruit="${target.dataset.fruit}"]:not(:disabled)`) || dialog.querySelector<HTMLButtonElement>('[data-fruit]:not(:disabled), [data-close].primary'))?.focus({ preventScroll: true }); if (soundEnabled) speak(stage === 'remove' ? `拿走${number}颗` : String(number)); }
    }
  });
  dialog.addEventListener('close', stopSpeech);
  draw();
  if (soundEnabled) speak(instruction());
}
function start(questions?: Question[], practiceSettings = settings, notice?: string) {
  stopSpeech();
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
    feedback.className = 'answer-feedback child-feedback answering';
    feedback.innerHTML = feedbackMarkup(false, false, !!entry);
  }
  const spoken = document.querySelector('#answer-spoken');
  if (spoken) spoken.textContent = entry ? `已输入${entry}，请继续输入` : '请作答';
}
function checkAnswer() {
  if (!entry || !session || !submit(session, Number(entry))) return;
  const r = session.records[session.index];
  if (soundEnabled) { playFeedback(r.status === 'correct'); speak(r.status === 'correct' ? '真棒！' : '再试试。'); }
  persist(); render();
  app.querySelector<HTMLButtonElement>(r.status === 'correct' ? '[data-action="next"]' : '[data-action="key"], [data-action="choose"]')?.focus({ preventScroll: true });
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
  app.querySelector<HTMLDialogElement>('dialog[open]')?.close();
  stopSpeech();
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
  if (action === 'sound') { soundEnabled = !soundEnabled; if (!soundEnabled) stopSpeech(); persist(); render(); if (soundEnabled) playFeedback(true); }
  if (action === 'home' || action === 'pause') { stopSpeech(); screen = 'home'; persist(); render(true); }
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
  if (action === 'next') { stopSpeech(); next(session!); entry = ''; if (session!.completed) { screen = 'results'; if (soundEnabled) speak('小花园长大啦！'); } persist(); render(true); }
  if (action === 'help') { const r = session!.records[session!.index]; r.helped = true; persist(); explain(r.question); }
  if (action === 'skip') { stopSpeech(); skip(session!); entry = ''; if (session!.completed) { screen = 'results'; if (soundEnabled) speak('小花园长大啦！'); } persist(); render(true); }
  if (action === 'read-question' && soundEnabled) { const q = session!.records[session!.index].question; speak(`${q.a}${q.op === '+' ? '加' : '减'}${q.b}等于多少？`); }
  if (action === 'print-new') openPrint(false);
  if (action === 'print-current') openPrint(true);
  if (action === 'print-back') { screen = printReturn; render(true); }
  if (action === 'regenerate' && worksheet) { const g = generate(worksheet.settings); worksheet.questions = g.questions; worksheet.notice = g.notice; render(); }
  if (action === 'print') { syncPrint(); window.print(); }
  if (action === 'parents') showDialog(parentContent(), '家长区域', 'parent-dialog');
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
