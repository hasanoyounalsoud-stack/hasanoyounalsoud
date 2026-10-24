import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

/* ================= config ================= */
const SUPABASE_URL = 'https://dsgzqdznntsriaezmlbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HxWnLtIFqNZRRg1O1QFWHg_Lkrw-TSv';
const BUCKET = 'exercise-videos';
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const PHOTO_BUCKET = 'machine-photos';
const PAGE_URL = location.origin + location.pathname;
// accounts are a unique 4-digit PIN; it maps onto Supabase email/password auth (see the pin-login function)
const toPassword = (pin) => `hsn:${pin}:train`;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
const app = document.getElementById('app');
const state = { session: null, profile: null, program: null, logs: null, exercises: null };

/* ================= utils ================= */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const today = () => iso(new Date());
const D = (s) => new Date(s + 'T00:00:00');
const fmtDay = (s) => D(s).toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = (s) => D(s).toLocaleDateString('ar', { day: 'numeric', month: 'short' });
const wd = (s) => D(s).toLocaleDateString('ar', { weekday: 'short' });
const kgs = (w) => (w == null || w === '' ? '—' : `${+w}`);
const fmtSet = (w, r) => `${kgs(w)}kg × ${r ?? '—'}`;
const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);
const uid = () => state.session?.user.id;
const isCoach = () => state.profile?.role === 'coach';
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const restLabel = (sec) => (!sec ? '' : sec % 60 ? `${sec} ثانية` : sec === 60 ? 'دقيقة' : sec === 120 ? 'دقيقتين' : `${sec / 60} دقايق`);
const setsWord = (n) => (n === 1 ? 'جولة' : n === 2 ? 'جولتين' : `${n} جولات`);
const newPin = () => String((crypto.getRandomValues(new Uint32Array(1))[0] % 9000) + 1000);

let toastT;
function toast(msg, { err = false, undo = null, ms = 3200 } = {}) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.innerHTML = `<span></span>${undo ? '<button type="button">تراجع</button>' : ''}`;
  t.firstChild.textContent = msg;
  if (undo) t.querySelector('button').onclick = () => { t.remove(); undo(); };
  document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(() => t.remove(), undo ? 7000 : ms);
}
// failures on phones get written to client_events so they can be diagnosed later
function logEvent(kind, detail = {}) {
  try { sb.from('client_events').insert({ kind, detail: { ...detail, ua: navigator.userAgent, page: location.hash } }).then(() => {}, () => {}); } catch {}
}
window.addEventListener('error', (e) => logEvent('js_error', { msg: e.message, src: String(e.filename || '').split('/').pop(), line: e.lineno }));
window.addEventListener('unhandledrejection', (e) => logEvent('js_rejection', { msg: String(e.reason?.message || e.reason) }));
function fail(e) { console.error(e); toast(e?.message || 'صار خطأ، جرّب كمان مرة', { err: true }); }

const I = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-8M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  note: '<path d="M4 4h16v12H8l-4 4z"/>',
  back: '<path d="M9 6l6 6-6 6"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  history: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4M3 4v4h4M12 7v5l3 2"/>',
};
const ico = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ================= data ================= */
async function loadProfile() {
  const { data, error } = await sb.from('profiles').select('*').eq('id', uid()).maybeSingle();
  if (error) throw error;
  state.profile = data;
}
async function loadProgram(id) {
  if (!id) return null;
  const { data, error } = await sb.from('programs')
    .select('id,name,description,archived,program_days(id,day_order,weekday,name,notes,program_exercises(id,position,sets,reps,rest_seconds,notes,exercise:exercises(id,name,muscle_group,description,video_path,video_url)))')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  data.program_days.sort((a, b) => a.day_order - b.day_order);
  data.program_days.forEach((d) => d.program_exercises.sort((a, b) => a.position - b.position));
  return data;
}
async function myProgram(force) {
  if (force || state.program === null || state.program?.id !== state.profile.program_id) state.program = await loadProgram(state.profile.program_id);
  return state.program;
}
async function loadLogs(traineeId, limit = 300) {
  const { data, error } = await sb.from('workout_logs')
    .select('id,performed_on,day_id,day_name,status,rpe,notes,plan,sets,started_at,finished_at,updated_at,created_at')
    .eq('trainee_id', traineeId)
    .order('performed_on', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  data.forEach(normSets);
  return data;
}
// a session's sets live in workout_logs.sets (jsonb); views read them as l.set_logs
function normSets(l) {
  l.set_logs = (l.sets || []).map((x) => ({ exercise_id: x.exercise_id, set_number: +x.set_number, weight: x.weight == null || x.weight === '' ? null : +x.weight, reps: x.reps == null || x.reps === '' ? null : +x.reps, done: !!x.done }))
    .sort((a, b) => a.set_number - b.set_number);
  return l;
}
async function myLogs(force) { if (!state.logs || force) state.logs = await loadLogs(uid()); return state.logs; }
async function allExercises(force) {
  if (!state.exercises || force) {
    const { data, error } = await sb.from('exercises').select('*').order('name');
    if (error) throw error;
    state.exercises = data;
  }
  return state.exercises;
}
const exById = (id) => state.exercises?.find((e) => e.id === id);
function lastSetsFor(logs, exerciseId, skipLogId) {
  for (const l of logs) {
    if (l.id === skipLogId) continue;
    const s = l.set_logs.filter((x) => x.exercise_id === exerciseId && (x.weight != null || x.reps != null));
    if (s.length) return { date: l.performed_on, sets: s };
  }
  return null;
}
function bestFor(logs, exerciseId, skipLogId) {
  let b = 0;
  for (const l of logs) if (l.id !== skipLogId) for (const s of l.set_logs) if (s.exercise_id === exerciseId) b = Math.max(b, e1rm(+s.weight, +s.reps));
  return b;
}
function ytId(u) {
  const m = String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([\w-]{11})/);
  return m ? m[1] : null;
}
// Big originals are stored as several pieces (each under the free plan's per-file limit):
// video_path = "<base>#parts=<n>", pieces at "<base>.part0" … "<base>.part<n-1>".
const PART_MB = 45;
function videoObjects(path) {
  const [base, n] = String(path).split('#parts=');
  return n ? Array.from({ length: +n }, (_, i) => `${base}.part${i}`) : [base];
}
const videoType = (path) => (/\.mov(#|$)/i.test(path) ? 'video/quicktime' : /\.webm(#|$)/i.test(path) ? 'video/webm' : 'video/mp4');
const joined = new Map();
async function videoSrc(ex, onProgress = () => {}) {
  if (ex.video_url) return { url: ex.video_url, youtube: ytId(ex.video_url) };
  const parts = videoObjects(ex.video_path);
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrls(parts, 60 * 60 * 4);
  if (error) throw error;
  if (parts.length === 1) return { url: data[0].signedUrl };
  if (joined.has(ex.video_path)) return { url: joined.get(ex.video_path) };
  const cache = await caches?.open?.('hsn-videos').catch(() => null);
  const hit = cache && (await cache.match(ex.video_path).catch(() => null));
  let blob = hit ? await hit.blob() : null;
  if (!blob) {
    const bufs = [];
    for (let i = 0; i < parts.length; i++) {
      const r = await fetch(data[i].signedUrl);
      if (!r.ok) throw new Error('ما قدرت حمّل الفيديو');
      bufs.push(await r.blob()); onProgress((i + 1) / parts.length);
    }
    blob = new Blob(bufs, { type: videoType(ex.video_path) });
    cache?.put(ex.video_path, new Response(blob, { headers: { 'content-type': blob.type } })).catch(() => {});
  }
  const url = URL.createObjectURL(blob); joined.set(ex.video_path, url);
  return { url };
}
const hasVideo = (ex) => !!(ex?.video_path || ex?.video_url);

/* machine photos: shrunk on the phone, stored privately per trainee */
async function shrinkImage(file, max = 1600) {
  const img = await createImageBitmap(file).catch(() => null);
  if (!img) return file;
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b || file), 'image/jpeg', 0.85));
}
const photoUrls = new Map();
async function photoUrl(path) {
  if (!photoUrls.has(path)) {
    const { data, error } = await sb.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60 * 6);
    if (error) throw error;
    photoUrls.set(path, data.signedUrl);
  }
  return photoUrls.get(path);
}
async function fillPhotos(root = document) {
  for (const img of $$('img[data-photo]', root)) photoUrl(img.dataset.photo).then((u) => (img.src = u)).catch(() => {});
}
function openPhoto(path, title) {
  const sh = sheet(`<div class="row between" style="margin-bottom:10px"><div class="ex-name">${esc(title || '')}</div><button class="icon-btn" data-x aria-label="سكّر">✕</button></div><img class="photo-full" data-photo="${esc(path)}" alt="صورة الجهاز" />`);
  $('[data-x]', sh).onclick = closeSheet; fillPhotos(sh);
}

/* ================= sheets ================= */
function sheet(html, { onClose } = {}) {
  closeSheet();
  const bg = document.createElement('div'); bg.className = 'sheet-bg';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog');
  sh.innerHTML = `<div class="grip"></div>${html}`;
  const key = (e) => e.key === 'Escape' && close();
  function close() { bg.remove(); sh.remove(); document.removeEventListener('keydown', key); onClose?.(); }
  bg.onclick = close; document.addEventListener('keydown', key);
  document.body.append(bg, sh);
  sh._close = close;
  return sh;
}
function closeSheet() { document.querySelector('.sheet')?._close?.(); }

async function openVideo(ex) {
  const sh = sheet(`<div class="row between" style="margin-bottom:10px"><div class="ex-name">${esc(ex.name)}</div><button class="icon-btn" data-x aria-label="سكّر">✕</button></div>
    <div class="player"><div class="empty" style="color:#999">جاري التحميل…</div></div>
    ${ex.description ? `<p class="sm muted mt" style="white-space:pre-line">${esc(ex.description)}</p>` : ''}`);
  $('[data-x]', sh).onclick = closeSheet;
  try {
    const p = $('.player', sh);
    const v = await videoSrc(ex, (f) => { const e = $('.empty', p); if (e) e.textContent = `جاري تحميل الفيديو… ${Math.round(f * 100)}%`; });
    if (v.youtube) {
      p.classList.add('wide');
      p.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${v.youtube}?autoplay=1&playsinline=1&rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
    } else {
      p.innerHTML = `<video src="${esc(v.url)}" controls playsinline autoplay preload="auto"></video>`;
      const vid = $('video', p);
      vid.onloadedmetadata = () => { if (vid.videoWidth > vid.videoHeight) p.classList.add('wide'); };
    }
  } catch (e) { fail(e); }
}

/* ================= LET'S GO intro: animation + sound ================= */
let actx;
// iOS: Web Audio must be started inside the tap itself, and is silenced by the ring/silent switch
// unless the page asks for the "playback" audio session.
function audio() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state !== 'running') actx.resume();
    const b = actx.createBuffer(1, 1, 22050), src = actx.createBufferSource(); // unlock with one silent sample
    src.buffer = b; src.connect(actx.destination); src.start(0);
  } catch { actx = null; }
  return actx;
}
function hypeSound() {
  const ac = audio(); if (!ac) return false;
  const t = ac.currentTime + 0.05, out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination);
  // whoosh
  const len = ac.sampleRate * 0.5, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const nz = ac.createBufferSource(); nz.buffer = buf;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(3500, t + 0.42);
  const ng = ac.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.5, t + 0.25); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  nz.connect(bp).connect(ng).connect(out); nz.start(t);
  // impact
  const hit = t + 0.45, kick = ac.createOscillator(), kg = ac.createGain();
  kick.type = 'sine'; kick.frequency.setValueAtTime(150, hit); kick.frequency.exponentialRampToValueAtTime(40, hit + 0.35);
  kg.gain.setValueAtTime(1, hit); kg.gain.exponentialRampToValueAtTime(0.0001, hit + 0.45);
  kick.connect(kg).connect(out); kick.start(hit); kick.stop(hit + 0.5);
  // power-up arpeggio into a held chord
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(out);
  [261.6, 329.6, 392, 523.3].forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain(), st = hit + 0.05 + i * 0.07;
    o.type = 'sawtooth'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.12, st + 0.03); g.gain.setValueAtTime(0.12, hit + 0.75); g.gain.exponentialRampToValueAtTime(0.0001, hit + 1.4);
    o.connect(g).connect(lp); o.start(st); o.stop(hit + 1.5);
  });
  return true;
}
function sayLetsGo(name) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(`Let's go, Mister ${name}!`);
    u.lang = 'en-US'; u.rate = 1.05; u.pitch = 0.85; u.volume = 1;
    const v = speechSynthesis.getVoices().find((x) => /en[-_]US/i.test(x.lang) && /male|david|alex|daniel|google us/i.test(x.name)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u); // must be called inside the tap on iOS
  } catch {}
}
const ARM = '<div class="go-arm" aria-hidden="true"><span class="bi">💪</span></div>';
function letsGo({ sound = false } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelector('.intro')?.remove();
  const un = state.profile?.username || '';
  const name = (/^u[0-9a-z]{6,}$/.test(un) || !un ? firstName(state.profile?.full_name) : un).toUpperCase();
  const el = document.createElement('div'); el.className = 'intro'; el.setAttribute('role', 'presentation');
  const sparks = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * Math.PI * 2, r = 130 + (i % 3) * 30; return `<i class="go-spark" style="--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px;animation-delay:${0.9 + (i % 4) * 0.04}s"></i>`; }).join('');
  el.innerHTML = `<div class="go-stage"><div class="go-halo"></div><div class="go-halo h2"></div><div class="go-blob"></div>${ARM}${sparks}</div>
    <div class="go-text"><div class="go-word">LET'S GO</div><div class="go-name">MR. <b>${esc(name)}</b></div></div>
    <div class="go-bar"><span></span></div><div class="go-tap">${sound ? '' : 'اضغط لتشغيل الصوت'}</div>`;
  document.body.appendChild(el);
  let played = false;
  const play = () => { if (played) return; played = hypeSound(); if (played) sayLetsGo(name.charAt(0) + name.slice(1).toLowerCase()); };
  if (sound) play();
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 520); };
  let timer = setTimeout(close, 2600);
  el.onclick = () => { if (!played) { play(); if (played) { clearTimeout(timer); $('.go-tap', el).textContent = ''; timer = setTimeout(close, 1900); return; } } clearTimeout(timer); close(); };
}

/* ================= layout ================= */
function renderChrome() {
  document.querySelector('.top')?.remove(); document.querySelector('.tabs')?.remove();
  if (!state.profile) return;
  const items = [['#/', 'الرئيسية', 'home'], ['#/progress', 'تقدّمي', 'chart']];
  if (isCoach()) items.push(['#/coach/people', 'المتدربين', 'users'], ['#/coach/programs', 'البرنامج', 'list'], ['#/coach/library', 'المكتبة', 'video']);
  const r = location.hash || '#/';
  const on = (h) => ((h === '#/' ? r === '#/' || r.startsWith('#/w/') : r.startsWith(h)) ? 'on' : '');
  const top = document.createElement('header'); top.className = 'top';
  top.innerHTML = `<div class="top-in"><a class="brand" href="#/"><img class="logo" src="../assets/logo.svg" alt="" width="36" height="36" /><span><b>تمارين حسن</b><small>${isCoach() ? 'لوحة المدرب' : 'برنامجك'}</small></span></a>
    <nav>${items.map(([h, t]) => `<a href="${h}" class="${on(h)}">${t}</a>`).join('')}</nav>
    <button class="avatar" data-acct aria-label="حسابي">${esc(firstName(state.profile.full_name).slice(0, 1) || 'H')}</button></div>`;
  document.body.prepend(top);
  const tabs = document.createElement('nav'); tabs.className = 'tabs';
  tabs.innerHTML = items.map(([h, t, i]) => `<a href="${h}" class="${on(h)}">${ico(i)}<span>${t}</span></a>`).join('');
  document.body.appendChild(tabs);
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-acct]')) location.hash = '#/account'; });

/* ================= login: PIN only, like the ops app ================= */
async function pinLogin(pin) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/pin-login`, {
    method: 'POST', headers: { 'content-type': 'application/json', apikey: SUPABASE_KEY, authorization: `Bearer ${SUPABASE_KEY}` }, body: JSON.stringify({ pin }),
  });
  const j = await r.json().catch(() => ({}));
  return r.ok ? j : null;
}
function viewLogin() {
  app.className = '';
  document.body.style.paddingBottom = '0';
  app.innerHTML = `<div class="login"><i class="orb o1"></i><i class="orb o2"></i>
    <form class="login-card" id="lf">
      <img class="logo big" src="../assets/logo.svg" alt="" width="72" height="72" />
      <h1>تمارين حسن</h1>
      <p class="sub">اكتب رقمك السري</p>
      <div class="pin-boxes" id="pb"><input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code" aria-label="الرقم السري" />
        <i></i><i></i><i></i><i></i></div>
      <button class="btn lg block mt2" id="go">دخول</button>
      <div class="err" id="err" role="alert"></div>
    </form></div>`;
  const pinEl = $('#pin'), boxes = $$('#pb i');
  const paint = () => { const n = pinEl.value.length; boxes.forEach((b, i) => { b.classList.toggle('on', i < n); b.classList.toggle('cur', i === n && document.activeElement === pinEl); }); };
  let busy = false;
  const go = async () => {
    if (busy) return;
    if (pinEl.value.length < 4) { $('#err').textContent = 'الرقم السري 4 أرقام'; pinEl.focus(); return; }
    busy = true; $('#err').textContent = ''; $('#go').disabled = true; $('#go').textContent = 'جاري الدخول…';
    audio();
    let ok = false;
    try {
      const t = await pinLogin(pinEl.value);
      if (t?.access_token) { loginTapped = true; const { error } = await sb.auth.setSession(t); ok = !error; }
    } catch (e) { $('#err').textContent = 'ما في نت، جرّب كمان مرة'; }
    busy = false; $('#go').disabled = false; $('#go').textContent = 'دخول';
    if (!ok) {
      pinEl.value = ''; paint(); $('#pb').classList.remove('shake'); void $('#pb').offsetWidth; $('#pb').classList.add('shake');
      if (!$('#err').textContent) $('#err').textContent = 'الرقم السري غلط';
      pinEl.focus();
    }
  };
  pinEl.oninput = () => { pinEl.value = pinEl.value.replace(/\D/g, '').slice(0, 4); $('#err').textContent = ''; paint(); if (pinEl.value.length === 4) go(); };
  pinEl.onfocus = pinEl.onblur = paint;
  $('#pb').onclick = () => pinEl.focus();
  $('#lf').onsubmit = (e) => { e.preventDefault(); go(); };
  setTimeout(() => pinEl.focus(), 300);
}

function viewAccount() {
  app.innerHTML = `<div class="view">
    <div class="h1">حسابي</div>
    <div class="card mt"><div class="row"><span class="mark">${esc(firstName(state.profile.full_name).slice(0, 1))}</span>
      <div><div class="b">${esc(state.profile.full_name || '')}</div><div class="sm muted">${isCoach() ? 'مدرب' : 'متدرب'}</div></div></div></div>
    <form class="card mt" id="pinF">
      <div class="h2">تغيير الرقم السري</div>
      <div class="grid2 mt">
        <label class="field"><span>الحالي</span><input name="cur" inputmode="numeric" pattern="\\d{4}" maxlength="4" required type="password" dir="ltr" /></label>
        <label class="field"><span>الجديد (4 أرقام)</span><input name="nw" inputmode="numeric" pattern="\\d{4}" maxlength="4" required type="password" dir="ltr" /></label>
      </div>
      <button class="btn block mt">حفظ</button>
    </form>
    <button class="btn w block mt" id="out">تسجيل خروج</button>
  </div>`;
  $('#pinF').onsubmit = async (e) => {
    e.preventDefault();
    const { cur, nw } = Object.fromEntries(new FormData(e.target));
    const { error: e1 } = await sb.auth.signInWithPassword({ email: state.session.user.email, password: toPassword(cur) });
    if (e1) return toast('الرقم الحالي غلط', { err: true });
    if (!/^\d{4}$/.test(nw)) return toast('الرقم الجديد 4 أرقام', { err: true });
    const taken = await pinLogin(nw); // the PIN alone identifies a person, so it must be free
    if (taken?.access_token && JSON.parse(atob(taken.access_token.split('.')[1])).sub !== uid()) return toast('هالرقم مستعمل، اختار غيره', { err: true });
    const { error } = await sb.auth.updateUser({ password: toPassword(nw) });
    if (error) return fail(error);
    toast('تغيّر الرقم السري'); e.target.reset();
  };
  $('#out').onclick = logout;
}

// Sign out on this device right away; the server call is best effort (it can answer 403 for a stale session)
async function logout() {
  try { await Promise.race([sb.auth.signOut({ scope: 'local' }), new Promise((r) => setTimeout(r, 1500))]); } catch {}
  Object.keys(localStorage).filter((k) => k.startsWith('sb-')).forEach((k) => store.del(k));
  Object.assign(state, { session: null, profile: null, program: null, logs: null, exercises: null });
  location.hash = '#/'; location.reload();
}

/* ================= home ================= */
// with weekdays set: today's session if it's a training day and not done yet, otherwise the next training day
function nextDay(program, logs) {
  const days = program.program_days;
  const done = logs.filter((l) => l.status === 'done');
  if (days.every((d) => d.weekday != null)) {
    const t = D(today());
    for (let k = 0; k < 8; k++) {
      const dt = new Date(t); dt.setDate(t.getDate() + k);
      const day = days.find((d) => d.weekday === dt.getDay());
      if (!day) continue;
      if (k === 0 && done.some((l) => l.performed_on === today())) continue;
      return { day, when: k === 0 ? 'اليوم' : k === 1 ? 'بكرا' : WEEKDAYS[dt.getDay()], date: iso(dt) };
    }
  }
  const ids = days.map((d) => d.id);
  const last = done.find((l) => ids.includes(l.day_id));
  return { day: last ? days[(ids.indexOf(last.day_id) + 1) % ids.length] : days[0], when: null };
}
function weekStart() { const t = D(today()); t.setDate(t.getDate() - ((t.getDay() + 1) % 7)); return iso(t); } // weeks start Saturday
function weekStrip(logs, program) {
  const planned = new Set((program?.program_days || []).map((d) => d.weekday).filter((x) => x != null));
  const done = new Set(logs.filter((l) => l.status === 'done').map((l) => l.performed_on));
  const t = D(today()); const start = new Date(t); start.setDate(t.getDate() - ((t.getDay() + 1) % 7)); // week starts Saturday
  return `<div class="week">${Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); const s = iso(d);
    return `<div class="d ${done.has(s) ? 'on' : ''} ${s === today() ? 'today' : ''} ${planned.has(d.getDay()) ? 'plan' : ''}"><div class="w">${wd(s)}</div><div class="n num">${d.getDate()}</div><i class="pd"></i></div>`;
  }).join('')}</div>`;
}
function sessionRow(l, href) {
  const sets = l.set_logs.filter((s) => s.weight != null || s.reps != null);
  const exCount = new Set(sets.map((s) => s.exercise_id)).size;
  const d = D(l.performed_on);
  return `<a class="sess" href="${href}">
    <div class="date-tile"><div><b class="num">${d.getDate()}</b><span>${d.toLocaleDateString('ar', { month: 'short' })}</span></div></div>
    <div class="grow"><div class="b">${esc(l.day_name || 'تمرين')}</div><div class="sm muted">${wd(l.performed_on)} · ${exCount} تمرين · ${sets.length} جولة${l.rpe ? ` · صعوبة ${l.rpe}` : ''}</div></div>
    ${l.status === 'active' ? '<span class="tag y">مفتوح</span>' : ''}${ico('back', 's')}
  </a>`;
}

async function viewHome() {
  const [program, logs] = await Promise.all([myProgram(), myLogs()]);
  const ids = new Set(logs.map((l) => l.id));
  for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k?.startsWith('wk:') && !ids.has(k.slice(3)) && !store.get(k)?.dirty) store.del(k); }
  const active = logs.find((l) => l.status === 'active');
  const done = logs.filter((l) => l.status === 'done');
  const ws = weekStart();
  const thisWeek = done.filter((l) => l.performed_on >= ws).length;
  const perWeek = program?.program_days.length || 3;

  let hero;
  if (active) {
    const total = active.plan.reduce((a, p) => a + (p.sets || 0), 0) || 1;
    const did = active.set_logs.filter((s) => s.done).length;
    hero = `<div class="hero"><div class="kicker">تمرين مفتوح</div><div class="h1" style="margin-top:4px">${esc(active.day_name)}</div>
      <div class="muted sm mt1">${did} من ${total} جولة · ${fmtShort(active.performed_on)}</div>
      <div class="bar on-dark mt"><i style="width:${Math.min(100, (did / total) * 100)}%"></i></div>
      <a class="btn lt lg block mt" href="#/w/${active.id}">كمّل التمرين</a></div>`;
  } else if (program) {
    const nx = nextDay(program, logs); const nd = nx.day;
    hero = `<div class="hero"><div class="kicker">${nx.when === 'اليوم' ? 'تمرين اليوم' : nx.when === 'بكرا' ? `تمرين بكرا · ${WEEKDAYS[nd.weekday]}` : nx.when ? `التمرين الجاي · ${nx.when}` : 'التمرين الجاي'}</div><div class="h1" style="margin-top:4px">${esc(nd.name)}</div>
      <div class="muted sm mt1">${nd.program_exercises.length} تمارين · ${nd.program_exercises.reduce((a, p) => a + p.sets, 0)} جولات</div>
      <div class="chips mt">${nd.program_exercises.map((pe) => `<span class="chip"><span class="en">${esc(pe.exercise.name)}</span><span class="n num">${pe.sets}</span></span>`).join('')}</div>
      <button class="btn lt lg block mt" data-start="${nd.id}">ابدأ التمرين</button></div>`;
  } else {
    hero = `<div class="hero"><div class="h2">ما في برنامج معيّن إلك لسا</div><p class="muted sm mt1">${isCoach() ? 'عيّن برنامج من صفحة المتدربين.' : 'المدرب رح يعيّنلك برنامجك قريباً.'}</p></div>`;
  }

  app.innerHTML = `<div class="view">
    <div class="kicker">${fmtDay(today())}</div><div class="h1">أهلاً ${esc(firstName(state.profile.full_name))}</div>
    <div class="mt">${hero}</div>
    <div class="card mt"><div class="row between" style="margin-bottom:10px"><div class="b">هالأسبوع</div><span class="tag ${thisWeek >= perWeek ? 'g' : ''}">${thisWeek} / ${perWeek} حصص</span></div>${weekStrip(logs, program)}</div>
    ${program ? `<div class="sec"><div class="h2">${esc(program.name)}</div><span class="sm muted">${program.program_days.length} أيام</span></div>
      ${program.description ? `<p class="sm muted" style="margin:-4px 0 10px;white-space:pre-line">${esc(program.description)}</p>` : ''}
      ${program.program_days.map((d) => {
        const last = done.find((l) => l.day_id === d.id);
        return `<div class="card">
          <div class="row between"><div><div class="b">${esc(d.name)}${d.weekday != null ? ` <span class="tag g">${WEEKDAYS[d.weekday]}</span>` : ''}</div><div class="xs muted">${last ? `آخر مرة: ${wd(last.performed_on)} ${fmtShort(last.performed_on)}` : 'لسا ما انعمل'}</div></div>
          <button class="btn sm" data-start="${d.id}">ابدأ</button></div>
          ${d.notes ? `<p class="sm muted mt1">${esc(d.notes)}</p>` : ''}
          <ul class="plist">${d.program_exercises.map((pe, i) => `<li><span class="i num">${i + 1}</span><span class="ex-name grow">${esc(pe.exercise.name)}</span>${hasVideo(pe.exercise) ? `<button class="icon-btn" style="width:30px;height:30px" data-vid="${pe.exercise.id}" aria-label="فيديو">${ico('play', 's')}</button>` : ''}<span class="sets">${setsWord(pe.sets)}</span></li>`).join('')}</ul>
        </div>`;
      }).join('')}` : ''}
    <div class="sec"><div class="h2">آخر الحصص</div>${done.length ? '<a class="sm b" href="#/progress">الكل</a>' : ''}</div>
    <div class="card">${logs.length ? logs.slice(0, 5).map((l) => sessionRow(l, `#/w/${l.id}`)).join('') : '<div class="empty">ما في حصص لسا. ابدأ أول تمرين من فوق.</div>'}</div>
  </div>`;

  app.onclick = (e) => {
    const st = e.target.closest('[data-start]');
    if (st) {
      if (active && !confirm('عندك تمرين مفتوح. بدك تبلّش واحد جديد؟ (المفتوح بيضل محفوظ)')) return;
      return startWorkout(program.program_days.find((d) => d.id === st.dataset.start));
    }
    const v = e.target.closest('[data-vid]');
    if (v) openVideo(program.program_days.flatMap((d) => d.program_exercises).find((p) => p.exercise.id === v.dataset.vid).exercise);
  };
}

/* ================= workout engine (local-first + autosave, like the ops app) ================= */
const wkKey = (id) => `wk:${id}`;
let wk = null; // the open session
let syncTimer = null, syncing = false;

function startWorkout(day) {
  const s = {
    id: uuid(), day_id: day.id, day_name: day.name, performed_on: today(), status: 'active', started_at: new Date().toISOString(),
    finished_at: null, rpe: null, notes: '', dirty: true, savedAt: null, sets: {},
    plan: day.program_exercises.map((pe) => ({ exercise_id: pe.exercise.id, sets: pe.sets, reps: pe.reps, rest: pe.rest_seconds || 0, cnote: pe.notes || '', note: '' })),
  };
  s.plan.forEach((p) => (s.sets[p.exercise_id] = Array.from({ length: p.sets }, () => ({ w: '', r: '', done: false }))));
  store.set(wkKey(s.id), s);
  letsGo({ sound: true });
  location.hash = `#/w/${s.id}`;
}
function fromServer(l) {
  const s = { id: l.id, day_id: l.day_id, day_name: l.day_name, performed_on: l.performed_on, status: l.status, started_at: l.started_at, finished_at: l.finished_at, rpe: l.rpe, notes: l.notes || '', plan: l.plan || [], sets: {}, dirty: false, savedAt: l.updated_at };
  if (!s.plan.length) {
    const ids = [...new Set(l.set_logs.map((x) => x.exercise_id))];
    s.plan = ids.map((id) => ({ exercise_id: id, sets: l.set_logs.filter((x) => x.exercise_id === id).length, reps: '', rest: 0, cnote: '', note: '' }));
  }
  s.plan.forEach((p) => {
    const rows = l.set_logs.filter((x) => x.exercise_id === p.exercise_id);
    const n = Math.max(p.sets || 0, rows.reduce((a, x) => Math.max(a, x.set_number), 0));
    s.sets[p.exercise_id] = Array.from({ length: n }, (_, i) => {
      const x = rows.find((r) => r.set_number === i + 1);
      return { w: x?.weight != null ? String(+x.weight) : '', r: x?.reps != null ? String(x.reps) : '', done: !!x?.done };
    });
  });
  return s;
}
function payload(s) {
  const sets = [];
  s.plan.forEach((p) => (s.sets[p.exercise_id] || []).forEach((x, i) => {
    if (x.w === '' && x.r === '') return;
    sets.push({ exercise_id: p.exercise_id, set_number: i + 1, weight: x.w === '' ? null : +x.w, reps: x.r === '' ? null : parseInt(x.r, 10), done: x.done });
  }));
  return { id: s.id, day_id: s.day_id, day_name: s.day_name, performed_on: s.performed_on, status: s.status, started_at: s.started_at, finished_at: s.finished_at, rpe: s.rpe, notes: s.notes, plan: s.plan, sets };
}
function touch() {
  if (!wk) return;
  wk.dirty = true; store.set(wkKey(wk.id), wk); showSync();
  clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 700);
}
async function syncNow() {
  if (!wk || !wk.dirty || syncing || wk.readonly) return;
  syncing = true; showSync();
  const cur = wk; const snap = JSON.stringify(payload(cur));
  try {
    const { data, error } = await sb.rpc('save_workout', { p: JSON.parse(snap) });
    if (error) throw error;
    cur.offline = false;
    if (JSON.stringify(payload(cur)) === snap) { cur.dirty = false; cur.savedAt = data; store.set(wkKey(cur.id), cur); }
    state.logs = null;
  } catch (e) { console.warn('sync failed', e); cur.offline = true; }
  syncing = false; showSync();
  if (cur.dirty && wk === cur) { clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, cur.offline ? 8000 : 400); }
}
window.addEventListener('online', () => { syncNow(); flushPending(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncNow(); });
// sessions left unsynced on this device (closed offline) get pushed on next launch
async function flushPending() {
  const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('wk:')) keys.push(k); }
  for (const k of keys) {
    const s = store.get(k); if (!s || (wk && wk.id === s.id)) continue;
    if (!s.dirty) { if (s.status === 'done') store.del(k); continue; }
    const { error } = await sb.rpc('save_workout', { p: payload(s) });
    if (!error) { if (s.status === 'done') store.del(k); else { s.dirty = false; store.set(k, s); } state.logs = null; }
  }
}
function showSync() {
  const el = $('#sync'); if (!el || !wk) return;
  if (wk.readonly) { el.className = 'sync'; el.innerHTML = '<i style="background:var(--muted)"></i>عرض فقط'; return; }
  const off = wk.dirty && (wk.offline || !navigator.onLine);
  const busy = syncing || (wk.dirty && !off);
  el.className = 'sync' + (busy ? ' saving' : off ? ' off' : '');
  el.innerHTML = `<i></i>${busy ? 'جاري الحفظ…' : off ? 'بلا نت — محفوظ عالجهاز' : `انحفظ ${wk.savedAt ? new Date(wk.savedAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : ''}`}`;
}

let restInt;
function startRest(sec) {
  stopRest(); if (!sec) return;
  let left = sec, total = sec;
  const el = document.createElement('div'); el.className = 'rest'; el.id = 'rest';
  el.innerHTML = `<div class="grow"><div class="xs b">راحة</div><div class="bar"><i></i></div></div><div class="t"></div><button data-a="15">+15</button><button data-a="skip">تخطّي</button>`;
  ($('.wk-head') || document.body).appendChild(el);
  const tick = () => {
    const l = Math.max(left, 0);
    $('.t', el).textContent = `${Math.floor(l / 60)}:${String(l % 60).padStart(2, '0')}`;
    $('.bar i', el).style.width = `${100 - (l / total) * 100}%`;
    if (left <= 0) { stopRest(); navigator.vibrate?.([250, 120, 250]); toast('خلصت الراحة — يلا'); }
    left--;
  };
  tick(); restInt = setInterval(tick, 1000);
  el.onclick = (e) => { const a = e.target.dataset.a; if (a === '15') { left += 15; total += 15; } if (a === 'skip') stopRest(); };
}
function stopRest() { clearInterval(restInt); document.getElementById('rest')?.remove(); }

async function viewWorkout(id) {
  await allExercises();
  let s = store.get(wkKey(id));
  if (!s || !s.dirty) {
    const { data, error } = await sb.from('workout_logs').select('*').eq('id', id).maybeSingle();
    if (data) normSets(data);
    if (error && !s) throw error;
    if (data) { s = fromServer(data); s.owner = data.trainee_id; s.readonly = data.trainee_id !== uid(); if (!s.readonly) store.set(wkKey(id), s); }
  }
  if (!s) { app.innerHTML = '<div class="empty">الحصة مش موجودة</div>'; return; }
  wk = s;
  const ro = !!s.readonly;
  const logs = ro ? await loadLogs(s.owner) : await myLogs();

  const best = {}, last = {};
  const refreshRefs = () => s.plan.forEach((p) => { best[p.exercise_id] = bestFor(logs, p.exercise_id, s.id); last[p.exercise_id] = lastSetsFor(logs, p.exercise_id, s.id); });
  refreshRefs();
  const counts = () => {
    let total = 0, done = 0;
    s.plan.forEach((p) => { const r = s.sets[p.exercise_id] || []; total += r.length; done += r.filter((x) => x.done).length; });
    return { total, done };
  };

  const setRow = (exId, x, i) => {
    const prev = last[exId]?.sets[i] || last[exId]?.sets.at(-1);
    const dis = ro ? 'disabled' : '';
    return `<div class="set ${x.done ? 'done' : ''}" data-ex="${exId}" data-i="${i}">
      <div class="no num">${i + 1}</div>
      <div class="stepper"><button type="button" data-step="w:-2.5" ${dis} aria-label="نقّص الوزن">−</button><input data-f="w" inputmode="decimal" value="${esc(x.w)}" placeholder="${prev?.weight != null ? +prev.weight : 'kg'}" ${ro ? 'readonly' : ''} aria-label="الوزن"/><button type="button" data-step="w:2.5" ${dis} aria-label="زيد الوزن">+</button></div>
      <div class="stepper"><button type="button" data-step="r:-1" ${dis} aria-label="نقّص العدّات">−</button><input data-f="r" inputmode="numeric" value="${esc(x.r)}" placeholder="${prev?.reps ?? 'عدّات'}" ${ro ? 'readonly' : ''} aria-label="العدّات"/><button type="button" data-step="r:1" ${dis} aria-label="زيد العدّات">+</button></div>
      <button type="button" class="ok" data-done ${dis} aria-label="خلصت الجولة">${ico('check')}</button>
    </div>`;
  };
  const exCard = (p, idx) => {
    const ex = exById(p.exercise_id) || { name: '؟', id: p.exercise_id };
    const rows = s.sets[p.exercise_id] || [];
    const lp = last[p.exercise_id];
    return `<section class="ex ${rows.length && rows.every((x) => x.done) ? 'done' : ''}" data-card="${p.exercise_id}">
      <div class="ex-top">
        <div class="ex-idx num">${idx + 1}</div>
        <div class="grow"><div class="ex-name">${esc(ex.name)}</div>
          <div class="ex-meta">${esc(ex.muscle_group || '')}${ex.muscle_group ? ' · ' : ''}${setsWord(p.sets)}${p.reps ? ` · ${esc(p.reps)}` : ''}${p.rest ? ` · راحة ${restLabel(p.rest)}` : ''}</div></div>
        ${hasVideo(ex) ? `<button class="icon-btn dark" data-vid aria-label="فيديو">${ico('play', 's')}</button>` : ''}
        ${ro ? '' : `<button class="icon-btn" data-menu aria-label="خيارات">${ico('dots')}</button>`}
      </div>
      ${p.cnote || p.note ? `<div class="ex-note">${esc([p.cnote, p.note].filter(Boolean).join('\n'))}</div>` : ''}
      <div class="prev">${lp ? `آخر مرة ${fmtShort(lp.date)}: ${lp.sets.map((x) => `<b class="num">${fmtSet(x.weight, x.reps)}</b>`).join(' · ')}${ro ? '' : '<button class="copy" data-copy>نفس آخر مرة</button>'}` : 'أول مرة — سجّل وزنك لنبلّش نتابع'}</div>
      <div class="sets"><div class="set-h"><span>#</span><span>الوزن kg</span><span>العدّات</span><span></span></div>${rows.map((x, i) => setRow(p.exercise_id, x, i)).join('')}</div>
      <div class="pr-slot" style="padding:0 14px"></div>
      ${p.photo ? `<div class="photo-row"><img class="thumb" data-photo="${esc(p.photo)}" data-open-photo alt="صورة الجهاز" /><span class="xs muted">صورة الجهاز</span></div>` : ''}
      ${ro ? '' : `<div class="ex-foot"><button class="btn w" data-addset>${ico('plus', 's')} جولة</button>
        <label class="btn w">${ico('camera', 's')} ${p.photo ? 'صورة تانية' : 'صوّر الجهاز'}<input type="file" accept="image/*" capture="environment" data-shot hidden /></label>
        ${rows.length > 1 ? `<button class="btn ghost" data-rmset>${ico('minus', 's')} شيل جولة</button>` : ''}</div>`}
    </section>`;
  };
  const prs = () => s.plan.forEach((p) => {
    const card = $(`[data-card="${p.exercise_id}"]`); if (!card) return;
    const top = (s.sets[p.exercise_id] || []).reduce((a, x) => Math.max(a, e1rm(+x.w, +x.r)), 0);
    $('.pr-slot', card).innerHTML = best[p.exercise_id] && top > best[p.exercise_id] + 0.01 ? `<span class="pr">${ico('trophy', 's')} رقم قياسي جديد</span>` : '';
  });
  const progress = () => {
    const { total, done } = counts();
    $('.wk-head .bar i').style.width = `${total ? (done / total) * 100 : 0}%`; $('#cnt').textContent = `${done}/${total}`;
    s.plan.forEach((p) => { const r = s.sets[p.exercise_id] || []; $(`[data-card="${p.exercise_id}"]`)?.classList.toggle('done', r.length > 0 && r.every((x) => x.done)); });
  };
  const render = () => {
    const { total, done } = counts();
    const y = window.scrollY;
    app.innerHTML = `<div>
      <div class="wk-head">
        <div class="row between"><a href="#/" class="icon-btn" aria-label="رجوع">${ico('back')}</a>
          <div class="grow" style="padding:0 6px"><div class="b" style="line-height:1.2">${esc(s.day_name || 'تمرين')}</div><div class="xs muted">${fmtDay(s.performed_on)}</div></div>
          <span id="sync" class="sync"></span></div>
        <div class="row mt1"><div class="bar grow"><i style="width:${total ? (done / total) * 100 : 0}%"></i></div><span class="xs b num" id="cnt">${done}/${total}</span></div>
      </div>
      ${s.plan.map(exCard).join('')}
      ${ro ? (s.notes ? `<div class="card mt"><div class="b">ملاحظات</div><p class="sm mt1">${esc(s.notes)}</p></div>` : '') + (isCoach() ? `<button class="btn danger block mt" data-delete>${ico('trash', 's')} حذف هالحصة</button>` : '') : `
      <button class="btn w block mt" data-addex>${ico('plus', 's')} زيد تمرين لهالحصة</button>
      <div class="card mt"><label class="field"><span>تاريخ الحصة</span><input type="date" id="date" value="${esc(s.performed_on)}" max="${today()}" /></label></div>
      <div class="finish-bar"><button class="btn y lg block" data-finish>${s.status === 'done' ? 'حفظ التعديلات' : 'إنهاء التمرين'}</button></div>
      <button class="btn danger block mt" data-delete>${ico('trash', 's')} ${s.status === 'done' ? 'حذف الحصة' : 'إلغاء التمرين وحذفه'}</button>`}
    </div>`;
    window.scrollTo(0, y);
    showSync(); prs(); fillPhotos(app);
  };
  render();
  const photoClick = (e) => {
    const im = e.target.closest('[data-open-photo]'); if (!im) return false;
    const exId = im.closest('[data-card]').dataset.card; openPhoto(im.dataset.photo, exById(exId)?.name); return true;
  };
  if (ro) { app.onclick = (e) => { if (photoClick(e)) return; if (e.target.closest('[data-delete]')) deleteSession(); }; return; }
  app.onchange = async (e) => {
    const inp = e.target.closest('[data-shot]'); const f = inp?.files?.[0]; if (!f) return;
    const exId = inp.closest('[data-card]').dataset.card; const p = s.plan.find((q) => q.exercise_id === exId);
    const lbl = inp.closest('label'); lbl.classList.add('busy');
    try {
      const blob = await shrinkImage(f);
      const path = `${uid()}/${s.id}/${exId}-${Date.now()}.jpg`;
      const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      const old = p.photo; p.photo = path; touch(); render(); toast('انحفظت صورة الجهاز');
      if (old) sb.storage.from(PHOTO_BUCKET).remove([old]);
    } catch (err) { lbl.classList.remove('busy'); fail(err.message?.includes('fetch') ? new Error('ما في نت — صوّر لما يرجع النت') : err); }
  };

  app.oninput = (e) => {
    const row = e.target.closest('.set');
    if (row && e.target.dataset.f) {
      const v = e.target.value.replace(',', '.').replace(/[^\d.]/g, '');
      if (v !== e.target.value) e.target.value = v;
      s.sets[row.dataset.ex][+row.dataset.i][e.target.dataset.f] = v; touch(); prs();
    }
    if (e.target.id === 'date') { s.performed_on = e.target.value || today(); touch(); }
  };
  app.onclick = (e) => {
    if (photoClick(e)) return;
    const t = e.target;
    const row = t.closest('.set'); const card = t.closest('[data-card]'); const exId = card?.dataset.card;
    const step = t.closest('[data-step]');
    if (step && row) {
      const [f, d] = step.dataset.step.split(':'); const x = s.sets[row.dataset.ex][+row.dataset.i];
      const inp = $(`[data-f="${f}"]`, row);
      const base = x[f] !== '' ? +x[f] : (/^\d/.test(inp.placeholder) ? +inp.placeholder : 0);
      x[f] = String(Math.max(0, Math.round((base + +d) * 100) / 100)); inp.value = x[f]; touch(); prs(); return;
    }
    if (t.closest('[data-done]') && row) {
      const x = s.sets[row.dataset.ex][+row.dataset.i];
      // a set ticked without typing takes last time's numbers
      $$('input', row).forEach((inp) => { if (!inp.value && /^\d/.test(inp.placeholder)) { inp.value = inp.placeholder; x[inp.dataset.f] = inp.placeholder; } });
      x.done = !x.done; row.classList.toggle('done', x.done); touch(); progress(); prs();
      if (x.done) startRest(s.plan.find((p) => p.exercise_id === row.dataset.ex)?.rest || 0);
      return;
    }
    if (t.closest('[data-copy]') && exId) {
      const lp = last[exId]; if (!lp) return;
      s.sets[exId] = lp.sets.map((x) => ({ w: x.weight != null ? String(+x.weight) : '', r: x.reps != null ? String(x.reps) : '', done: false }));
      touch(); render(); return;
    }
    if (t.closest('[data-addset]') && exId) {
      const rows = s.sets[exId]; rows.push({ w: rows.at(-1)?.w || '', r: '', done: false }); touch(); render(); return;
    }
    if (t.closest('[data-rmset]') && exId) {
      const rows = s.sets[exId]; const removed = rows.pop(); touch(); render();
      toast('انشالت الجولة', { undo: () => { rows.push(removed); touch(); render(); } }); return;
    }
    if (t.closest('[data-vid]') && exId) return openVideo(exById(exId));
    if (t.closest('[data-menu]') && exId) return exMenu(exId);
    if (t.closest('[data-addex]')) return pickExercise('زيد تمرين', (nid) => {
      if (s.plan.some((p) => p.exercise_id === nid)) return toast('التمرين موجود بالحصة', { err: true });
      s.plan.push({ exercise_id: nid, sets: 1, reps: '', rest: 120, cnote: '', note: '' }); s.sets[nid] = [{ w: '', r: '', done: false }];
      refreshRefs(); touch(); render(); setTimeout(() => $(`[data-card="${nid}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    });
    if (t.closest('[data-finish]')) return finishSheet();
    if (t.closest('[data-delete]')) return deleteSession();
  };

  function exMenu(exId) {
    const p = s.plan.find((q) => q.exercise_id === exId); const ex = exById(exId); const i = s.plan.indexOf(p);
    const sh = sheet(`<div class="ex-name" style="margin-bottom:6px">${esc(ex.name)}</div><div class="menu">
      ${hasVideo(ex) ? `<button data-a="vid">${ico('play')} شوف الفيديو</button>` : ''}
      <button data-a="swap">${ico('swap')} بدّل بتمرين تاني (الجهاز مشغول؟)</button>
      <button data-a="note">${ico('note')} ملاحظة على التمرين</button>
      <button data-a="hist">${ico('history')} سجل هالتمرين</button>
      ${i > 0 ? `<button data-a="up">${ico('up')} لفوق</button>` : ''}
      ${i < s.plan.length - 1 ? `<button data-a="down">${ico('down')} لتحت</button>` : ''}
      <button data-a="rm" class="danger">${ico('trash')} شيل من هالحصة</button></div>`);
    sh.onclick = (e) => {
      const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
      closeSheet();
      if (a === 'vid') openVideo(ex);
      if (a === 'hist') location.hash = `#/progress/ex/${exId}`;
      if (a === 'up' || a === 'down') { const j = a === 'up' ? i - 1 : i + 1; [s.plan[i], s.plan[j]] = [s.plan[j], s.plan[i]]; touch(); render(); }
      if (a === 'note') { const v = prompt('ملاحظة (مثلاً: المقعد على 4، قبضة واسعة)', p.note || ''); if (v !== null) { p.note = v.trim(); touch(); render(); } }
      if (a === 'rm') {
        const keep = { p, rows: s.sets[exId], i };
        s.plan.splice(i, 1); delete s.sets[exId]; touch(); render();
        toast('انشال التمرين من الحصة', { undo: () => { s.plan.splice(keep.i, 0, keep.p); s.sets[exId] = keep.rows; touch(); render(); } });
      }
      if (a === 'swap') pickExercise('بدّل بـ', (nid) => {
        if (s.plan.some((q) => q.exercise_id === nid)) return toast('التمرين موجود بالحصة', { err: true });
        const n = s.sets[exId].length; delete s.sets[exId];
        p.exercise_id = nid; delete p.photo; s.sets[nid] = Array.from({ length: n }, () => ({ w: '', r: '', done: false }));
        refreshRefs(); touch(); render();
      });
    };
  }
  function finishSheet() {
    const sh = sheet(`<div class="h2">${s.status === 'done' ? 'حفظ التعديلات' : 'خلصت التمرين'}</div>
      <div class="field mt"><span>الصعوبة (10 = فشل كامل)</span><div class="rpe">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}" class="${s.rpe === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('')}</div></div>
      <label class="field mt"><span>وزن الجسم اليوم (اختياري)</span><input id="bw" inputmode="decimal" dir="ltr" placeholder="kg" /></label>
      <label class="field mt"><span>ملاحظات</span><textarea id="nt" placeholder="نوم، أكل، ألم، طاقة…">${esc(s.notes)}</textarea></label>
      <button class="btn y lg block mt" id="fin">حفظ</button>`);
    sh.onclick = (e) => { const b = e.target.closest('[data-rpe]'); if (b) { s.rpe = +b.dataset.rpe; $$('[data-rpe]', sh).forEach((x) => x.classList.toggle('on', x === b)); } };
    $('#fin', sh).onclick = async () => {
      const filled = s.plan.some((p) => (s.sets[p.exercise_id] || []).some((x) => x.w !== '' || x.r !== ''));
      if (!filled) return toast('سجّل جولة وحدة على الأقل', { err: true });
      s.notes = $('#nt', sh).value.trim(); s.status = 'done'; s.finished_at ||= new Date().toISOString();
      const bw = +($('#bw', sh).value || '').replace(',', '.');
      $('#fin', sh).disabled = true;
      touch(); clearTimeout(syncTimer); await syncNow();
      closeSheet(); stopRest();
      if (bw > 0) await sb.from('body_weights').upsert({ trainee_id: uid(), measured_on: s.performed_on, weight: bw }, { onConflict: 'trainee_id,measured_on' });
      const pending = s.dirty;
      if (!pending) store.del(wkKey(s.id));
      wk = null; state.logs = null;
      toast(pending ? 'انحفظ عالجهاز — رح يترفع لحاله لما يرجع النت' : 'انحفظ التمرين — عاش');
      location.hash = '#/';
    };
  }
  async function deleteSession() {
    if (!confirm('تحذف هالحصة نهائياً؟ كل الأوزان اللي فيها رح تنمسح.')) return;
    clearTimeout(syncTimer); s.dirty = false;
    const { data, error } = await sb.from('workout_logs').delete().eq('id', s.id).select('id');
    if (error) return fail(error);
    if (!data?.length && s.savedAt) return toast('ما قدرت احذفها', { err: true });
    store.del(wkKey(s.id)); wk = null; state.logs = null; toast('انحذفت الحصة');
    location.hash = s.readonly ? `#/coach/person/${s.owner}` : '#/';
  }
}

async function pickExercise(title, onPick) {
  const list = (await allExercises()).filter((x) => !x.archived);
  const sh = sheet(`<div class="h2">${esc(title)}</div><input class="input mt" id="q" placeholder="دوّر…" dir="auto" />
    <div class="pick">${list.map((x) => `<button data-id="${x.id}"><span><span class="ex-name">${esc(x.name)}</span><span class="xs muted" style="display:block">${esc(x.muscle_group || '')}</span></span>${hasVideo(x) ? ico('play', 's') : ''}</button>`).join('')}</div>`);
  $('#q', sh).oninput = (e) => { const q = e.target.value.toLowerCase(); $$('.pick button', sh).forEach((b) => (b.hidden = !b.textContent.toLowerCase().includes(q))); };
  $('.pick', sh).onclick = (e) => { const b = e.target.closest('[data-id]'); if (b) { closeSheet(); onPick(b.dataset.id); } };
}

/* ================= progress ================= */
function series(logs) {
  const map = new Map();
  [...logs].filter((l) => l.status === 'done').reverse().forEach((l) => {
    const byEx = {};
    l.set_logs.forEach((x) => { if (x.weight == null) return; const c = byEx[x.exercise_id]; if (!c || e1rm(+x.weight, +x.reps) > e1rm(+c.weight, +c.reps)) byEx[x.exercise_id] = x; });
    Object.entries(byEx).forEach(([id, x]) => { if (!map.has(id)) map.set(id, []); map.get(id).push({ x: l.performed_on, y: +x.weight, reps: x.reps }); });
  });
  return map;
}
function spark(pts) {
  if (pts.length < 2) return '<svg class="spark"></svg>';
  const ys = pts.map((p) => p.y); const lo = Math.min(...ys), hi = Math.max(...ys);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${((i / (pts.length - 1)) * 70 + 1).toFixed(1)},${(27 - ((p.y - lo) / (hi - lo || 1)) * 24).toFixed(1)}`).join('');
  return `<svg class="spark" viewBox="0 0 72 28" aria-hidden="true"><path d="${d}"/></svg>`;
}
function lineChart(points, label = (p) => `${p.y}kg`) {
  if (points.length < 2) return `<p class="sm muted mt">${points.length ? 'بدنا حصتين على الأقل لنرسم المنحنى.' : 'ما في بيانات لسا.'}</p>`;
  const W = 360, H = 190, L = 32, R = 8, T = 10, B = 22;
  const xs = points.map((p) => +D(p.x)); const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs); let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.18 || 2; y0 = Math.max(0, y0 - pad); y1 += pad;
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
  const yt = Array.from({ length: 5 }, (_, i) => y0 + ((y1 - y0) * i) / 4);
  const xt = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(+D(p.x)).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const id = 'c' + Math.random().toString(36).slice(2, 8);
  queueMicrotask(() => {
    const root = document.getElementById(id); if (!root) return;
    const svg = $('svg', root), tip = $('.tip', root), cx = $('.cx', root), hl = $('.hl', root);
    const move = (ev) => {
      const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * (W / r.width);
      let bi = 0, bd = Infinity; points.forEach((p, i) => { const d = Math.abs(sx(+D(p.x)) - px); if (d < bd) { bd = d; bi = i; } });
      const p = points[bi], X = sx(+D(p.x)), Y = sy(p.y);
      cx.setAttribute('x1', X); cx.setAttribute('x2', X); cx.style.visibility = hl.style.visibility = 'visible';
      hl.setAttribute('cx', X); hl.setAttribute('cy', Y);
      tip.hidden = false; tip.innerHTML = `${fmtShort(p.x)} · <span class="num">${esc(label(p))}</span>`;
      tip.style.left = `${(X / W) * r.width}px`; tip.style.top = `${(Y / H) * r.height}px`;
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', () => { tip.hidden = true; cx.style.visibility = hl.style.visibility = 'hidden'; });
  });
  return `<div class="chart" id="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="منحنى التقدّم">
    ${yt.map((y) => `<line class="gl" x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}"/><text class="ax" x="${L - 5}" y="${sy(y) + 3}" text-anchor="end">${y1 - y0 < 8 ? y.toFixed(1) : Math.round(y)}</text>`).join('')}
    ${xt.map((i) => `<text class="ax" x="${sx(+D(points[i].x))}" y="${H - 5}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}">${fmtShort(points[i].x)}</text>`).join('')}
    <path class="ar" d="${path}L${sx(x1)},${H - B}L${sx(x0)},${H - B}Z"/><path class="ln" d="${path}"/>
    ${points.length <= 40 ? points.map((p) => `<circle class="dt" r="3.5" cx="${sx(+D(p.x))}" cy="${sy(p.y)}"/>`).join('') : ''}
    <line class="cx" y1="${T}" y2="${H - B}" style="visibility:hidden"/><circle class="dt hl" r="5" style="visibility:hidden"/>
  </svg><div class="tip" hidden></div></div>`;
}

async function viewProgress(traineeId = uid()) {
  const self = traineeId === uid();
  await allExercises();
  const [logs, bwRes, prof] = await Promise.all([
    self ? myLogs() : loadLogs(traineeId),
    sb.from('body_weights').select('measured_on,weight').eq('trainee_id', traineeId).order('measured_on'),
    self ? { data: state.profile } : sb.from('profiles').select('*').eq('id', traineeId).maybeSingle(),
  ]);
  const bw = bwRes.data || []; const who = prof.data;
  const done = logs.filter((l) => l.status === 'done');
  const map = series(logs);
  const month = iso(new Date(Date.now() - 29 * 864e5));
  const rpeL = done.filter((l) => l.rpe).slice(0, 10);
  const base = self ? '#/progress' : `#/coach/person/${traineeId}`;
  const rows = [...map.entries()].map(([id, pts]) => ({ id, pts, ex: exById(id), last: pts.at(-1), first: pts[0] }))
    .sort((a, b) => (b.last.x > a.last.x ? 1 : b.last.x < a.last.x ? -1 : 0));

  app.innerHTML = `<div class="view">
    ${self ? '' : '<a href="#/coach/people" class="sm b">→ المتدربين</a>'}
    <div class="h1" style="margin-top:4px">${self ? 'تقدّمي' : esc(who?.full_name || '')}</div>
    <div class="stats mt">
      <div class="stat"><div class="v">${done.filter((l) => l.performed_on >= month).length}</div><div class="l">حصص آخر 30 يوم</div></div>
      <div class="stat"><div class="v num">${bw.length ? +bw.at(-1).weight : '—'}</div><div class="l">وزن الجسم kg</div></div>
      <div class="stat"><div class="v num">${rpeL.length ? (rpeL.reduce((a, l) => a + l.rpe, 0) / rpeL.length).toFixed(1) : '—'}</div><div class="l">معدّل الصعوبة</div></div>
    </div>
    <div class="sec"><div class="h2">التمارين</div><span class="sm muted">أفضل جولة بكل حصة</span></div>
    <div class="card">${rows.length ? rows.map((r) => {
      const dlt = r.last.y - r.first.y;
      return `<a class="ex-row" href="${base}/ex/${r.id}"><div class="grow"><div class="ex-name">${esc(r.ex?.name || '؟')}</div>
        <div class="sm muted"><span class="num">${fmtSet(r.last.y, r.last.reps)}</span> · ${fmtShort(r.last.x)}</div></div>
        ${r.pts.length > 1 ? `<span class="delta num ${dlt > 0 ? 'up' : dlt < 0 ? 'down' : ''}">${dlt > 0 ? '+' : ''}${+dlt.toFixed(2)}kg</span>` : ''}${spark(r.pts)}</a>`;
    }).join('') : '<div class="empty">لما تسجّل أول تمرين، بيطلع هون تقدّمك بكل تمرين.</div>'}</div>
    <div class="sec"><div class="h2">وزن الجسم</div></div>
    <div class="card">${self ? '<form class="row" id="bwF"><input class="input grow" name="w" inputmode="decimal" dir="ltr" placeholder="وزنك اليوم kg" required /><button class="btn">سجّل</button></form>' : ''}
      ${lineChart(bw.map((b) => ({ x: b.measured_on, y: +b.weight })))}</div>
    <div class="sec"><div class="h2">كل الحصص</div><span class="sm muted">${logs.length}</span></div>
    <div class="card">${logs.length ? logs.map((l) => sessionRow(l, `#/w/${l.id}`)).join('') : '<div class="empty">ما في حصص.</div>'}</div>
  </div>`;
  const f = $('#bwF');
  if (f) f.onsubmit = async (e) => {
    e.preventDefault(); const w = +f.w.value.replace(',', '.'); if (!(w > 0)) return;
    const { error } = await sb.from('body_weights').upsert({ trainee_id: uid(), measured_on: today(), weight: w }, { onConflict: 'trainee_id,measured_on' });
    if (error) return fail(error); toast('انحفظ'); viewProgress();
  };
}

async function viewExerciseHistory(exId, traineeId = uid()) {
  await allExercises();
  const logs = traineeId === uid() ? await myLogs() : await loadLogs(traineeId);
  const ex = exById(exId);
  const pts = series(logs).get(exId) || [];
  const sessions = logs.filter((l) => l.status === 'done' && l.set_logs.some((x) => x.exercise_id === exId));
  const bestPt = pts.reduce((a, p) => (!a || e1rm(p.y, p.reps) > e1rm(a.y, a.reps) ? p : a), null);
  app.innerHTML = `<div class="view">
    <a href="javascript:history.back()" class="sm b">→ رجوع</a>
    <div class="row between mt1"><div class="h1 ex-name" style="font-size:1.35rem">${esc(ex?.name || '')}</div>${hasVideo(ex) ? `<button class="icon-btn dark" id="pv" aria-label="فيديو">${ico('play', 's')}</button>` : ''}</div>
    <div class="stats mt">
      <div class="stat"><div class="v num">${bestPt ? +bestPt.y : '—'}</div><div class="l">أفضل وزن kg${bestPt?.reps ? ` · ${bestPt.reps} عدّة` : ''}</div></div>
      <div class="stat"><div class="v num">${pts.length ? +pts.at(-1).y : '—'}</div><div class="l">آخر وزن kg</div></div>
      <div class="stat"><div class="v">${sessions.length}</div><div class="l">حصص</div></div>
    </div>
    <div class="card mt"><div class="b">تطوّر الوزن</div>${lineChart(pts, (p) => fmtSet(p.y, p.reps))}</div>
    <div class="card mt"><table class="t"><thead><tr><th>التاريخ</th><th>الجولات</th><th>الجهاز</th></tr></thead><tbody>
      ${sessions.map((l) => { const ph = (l.plan || []).find((q) => q.exercise_id === exId)?.photo; return `<tr><td>${fmtShort(l.performed_on)}<div class="xs muted">${wd(l.performed_on)}</div></td><td class="num">${l.set_logs.filter((x) => x.exercise_id === exId).map((x) => fmtSet(x.weight, x.reps)).join('<br>')}</td><td>${ph ? `<img class="thumb" data-photo="${esc(ph)}" data-ph alt="صورة الجهاز" />` : ''}</td></tr>`; }).join('') || '<tr><td colspan="3" class="muted">ما في سجل لسا</td></tr>'}
    </tbody></table></div></div>`;
  const pv = $('#pv'); if (pv) pv.onclick = () => openVideo(ex);
  fillPhotos(app);
  app.onclick = (e) => { const im = e.target.closest('[data-ph]'); if (im) openPhoto(im.dataset.photo, ex?.name); };
}

/* ================= coach: library & videos ================= */
async function viewLibrary() {
  const exs = (await allExercises(true)).filter((x) => !x.archived);
  app.innerHTML = `<div class="view">
    <div class="row between"><div class="h1">مكتبة التمارين</div><button class="btn sm" id="add">${ico('plus', 's')} تمرين</button></div>
    <div class="card mt info">
      <div class="b">رفع الفيديوهات بجودة عالية</div>
      <p class="sm mt1"><b>رفع ملف:</b> بينرفع الفيديو الأصلي بجودته الكاملة بدون أي تعديل، مهما كان حجمه. خلّي الصفحة مفتوحة لحد ما يخلص.</p>
      <p class="sm mt1"><b>رابط يوتيوب (Unlisted):</b> للفيديوهات الطويلة أو 4K — بدون حد حجم، والجودة بتتظبط حسب نت المتدرب.</p>
    </div>
    ${exs.map((ex) => `<div class="card" data-id="${ex.id}">
      <div class="row"><div class="vid-thumb ${hasVideo(ex) ? 'has' : ''}">${ico(hasVideo(ex) ? 'play' : 'video')}</div>
        <div class="grow"><div class="ex-name">${esc(ex.name)}</div><div class="sm muted">${esc(ex.muscle_group || '')}${ex.muscle_group ? ' · ' : ''}${ex.video_url ? 'يوتيوب' : ex.video_path ? 'فيديو مرفوع' : 'بدون فيديو'}</div></div>
        <button class="icon-btn" data-edit aria-label="تعديل">${ico('dots')}</button></div>
      <div class="row wrap-ok mt">
        <label class="btn sm ${hasVideo(ex) ? 'w' : ''}">${ico('upload', 's')} ${hasVideo(ex) ? 'استبدال' : 'رفع فيديو'}<input type="file" accept="video/*" data-file hidden /></label>
        <button class="btn sm w" data-link>${ico('link', 's')} رابط يوتيوب</button>
        ${hasVideo(ex) ? `<button class="btn sm w" data-play>${ico('play', 's')} شوف</button>` : ''}
      </div>
      <div class="upbar" hidden><div class="row between xs b"><span class="up-txt"></span><button class="btn ghost sm" data-cancel>إلغاء</button></div><div class="bar"><i></i></div></div>
    </div>`).join('')}</div>`;
  const find = (el) => exs.find((x) => x.id === el.closest('[data-id]')?.dataset.id);
  $('#add').onclick = () => exForm();
  app.onclick = async (e) => {
    const ex = find(e.target); if (!ex) return;
    if (e.target.closest('[data-edit]')) exForm(ex);
    if (e.target.closest('[data-play]')) openVideo(ex);
    if (e.target.closest('[data-link]')) {
      const v = prompt('حط رابط يوتيوب (Unlisted) أو رابط فيديو مباشر — فاضي لتشيله', ex.video_url || '');
      if (v === null) return;
      const url = v.trim();
      if (url && !/^https:\/\//.test(url)) return toast('الرابط لازم يبلّش بـ https://', { err: true });
      const { error } = await sb.from('exercises').update({ video_url: url || null }).eq('id', ex.id);
      if (error) return fail(error);
      state.program = null; toast(url ? 'انحفظ الرابط' : 'انشال الرابط'); viewLibrary();
    }
  };
  app.onchange = async (e) => {
    const inp = e.target.closest('[data-file]'); if (!inp) return;
    const ex = find(inp), f = inp.files?.[0], card = inp.closest('[data-id]');
    logEvent('file_picked', { ex: ex?.name, name: f?.name, mb: f ? +(f.size / 1048576).toFixed(1) : null, type: f?.type, has_ex: !!ex, has_card: !!card });
    if (!f) return;
    const box = $('.upbar', card); box.hidden = false; $('.up-txt', box).textContent = 'اخترت الفيديو… عم جهّز الرفع';
    if (!f.size) { $('.up-txt', box).textContent = 'الآيفون لسا عم يجهّز الفيديو (ممكن عم ينزّله من iCloud). استنى شوي وجرّب كمان مرة.'; return; }
    try { await upload(ex, f, card); } catch (err) { $('.up-txt', box).textContent = 'ما انرفع: ' + (err.message || err); logEvent('upload_crash', { msg: String(err.message || err) }); }
    inp.value = ''; // so picking the same file again fires a new change event
  };

  function exForm(ex = {}) {
    const sh = sheet(`<div class="h2">${ex.id ? 'تعديل التمرين' : 'تمرين جديد'}</div><form id="exF">
      <label class="field mt"><span>الاسم</span><input name="name" required value="${esc(ex.name || '')}" dir="auto" /></label>
      <label class="field mt"><span>العضلة</span><input name="muscle_group" value="${esc(ex.muscle_group || '')}" /></label>
      <label class="field mt"><span>الشرح والنصائح (بيشوفه المتدرب)</span><textarea name="description">${esc(ex.description || '')}</textarea></label>
      <button class="btn block mt">حفظ</button>
      ${ex.id ? `${hasVideo(ex) ? '<button type="button" class="btn w block mt" id="rmv">شيل الفيديو</button>' : ''}<button type="button" class="btn danger block mt" id="del">حذف التمرين</button>` : ''}</form>`);
    $('#exF', sh).onsubmit = async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
      const { error } = ex.id ? await sb.from('exercises').update(d).eq('id', ex.id) : await sb.from('exercises').insert(d);
      if (error) return fail(error); closeSheet(); state.program = null; viewLibrary();
    };
    const rmv = $('#rmv', sh); if (rmv) rmv.onclick = async () => {
      if (!confirm('أكيد بدك تشيل الفيديو عن هالتمرين؟')) return;
      if (ex.video_path) await sb.storage.from(BUCKET).remove(videoObjects(ex.video_path));
      const { error } = await sb.from('exercises').update({ video_path: null, video_url: null }).eq('id', ex.id);
      if (error) return fail(error); closeSheet(); state.program = null; viewLibrary();
    };
    const del = $('#del', sh); if (del) del.onclick = async () => {
      if (!confirm('حذف التمرين بيشيله من البرامج وبيحذف سجلّاته. متأكد؟')) return;
      if (ex.video_path) await sb.storage.from(BUCKET).remove(videoObjects(ex.video_path));
      const { error } = await sb.from('exercises').delete().eq('id', ex.id);
      if (error) return fail(error); closeSheet(); state.program = null; viewLibrary();
    };
  }
}
function sendPart(blob, objectName, type, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectName}`);
    xhr.setRequestHeader('authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', SUPABASE_KEY);
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.setRequestHeader('cache-control', 'max-age=31536000');
    xhr.setRequestHeader('content-type', type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded);
    xhr.onerror = () => reject(Object.assign(new Error('النت انقطع'), { status: 0 }));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let m = xhr.responseText; try { m = JSON.parse(xhr.responseText).message || m; } catch {}
      reject(Object.assign(new Error(m || `خطأ ${xhr.status}`), { status: xhr.status, body: String(xhr.responseText).slice(0, 300) }));
    };
    xhr.send(blob);
  });
}
async function upload(ex, file, card) {
  const mb = file.size / 1048576;
  const box = $('.upbar', card), bar = $('.bar i', box), txt = $('.up-txt', box), cancelBtn = $('[data-cancel]', box);
  box.hidden = false; bar.style.width = '0';
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const type = file.type || ({ mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm' }[ext] || 'video/mp4');
  const n = mb > PART_MB + 3 ? Math.ceil(file.size / (PART_MB * 1048576)) : 1;
  const base = `${ex.id}/${Date.now()}.${ext}`;
  const path = n > 1 ? `${base}#parts=${n}` : base;
  const objects = videoObjects(path);
  logEvent('upload_start', { ex: ex.name, mb: +mb.toFixed(1), type, name: file.name, parts: n, v: 9 });
  let stop = false;
  cancelBtn.textContent = 'إلغاء'; cancelBtn.onclick = () => { stop = true; box.hidden = true; };
  const leave = (e) => { e.preventDefault(); e.returnValue = ''; };
  window.addEventListener('beforeunload', leave);
  const partSize = Math.ceil(file.size / n);
  let sent = 0;
  try {
    for (let i = 0; i < n; i++) {
      if (stop) throw new Error('انلغى');
      const piece = file.slice(i * partSize, Math.min(file.size, (i + 1) * partSize), type);
      for (let attempt = 1; ; attempt++) {
        try {
          // the session kept by onAuthStateChange; getSession() can block on the auth lock on iOS
          await sendPart(piece, objects[i], type, state.session.access_token, (loaded) => {
            const p = (sent + loaded) / file.size;
            bar.style.width = `${p * 100}%`;
            txt.textContent = `جاري الرفع… ${Math.round(p * 100)}% (${((sent + loaded) / 1048576).toFixed(0)}/${mb.toFixed(0)}MB) — خلّي الصفحة مفتوحة`;
          });
          break;
        } catch (err) {
          if (attempt >= 3 || stop || (err.status && err.status < 500 && err.status !== 408)) throw err;
          txt.textContent = 'النت تقطّع، عم جرّب كمان مرة…'; await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
      sent += piece.size;
    }
    const old = ex.video_path;
    const { error } = await sb.from('exercises').update({ video_path: path, video_url: null }).eq('id', ex.id);
    if (error) throw error;
    if (old) sb.storage.from(BUCKET).remove(videoObjects(old));
    logEvent('upload_ok', { ex: ex.name, mb: +mb.toFixed(1), parts: n });
    window.removeEventListener('beforeunload', leave);
    state.program = null; toast('انرفع الفيديو بجودته الأصلية ✅'); viewLibrary();
  } catch (err) {
    window.removeEventListener('beforeunload', leave);
    sb.storage.from(BUCKET).remove(objects).catch(() => {});
    if (stop) return;
    bar.style.width = '0'; txt.textContent = 'ما انرفع: ' + (err.message || err); cancelBtn.textContent = 'سكّر';
    logEvent('upload_error', { ex: ex.name, mb: +mb.toFixed(1), parts: n, msg: String(err.message || err), status: err.status, body: err.body });
  }
}

/* ================= coach: program editor ================= */
async function viewPrograms(openId) {
  const [{ data: programs, error }] = await Promise.all([sb.from('programs').select('id,name,archived,created_at').order('created_at'), allExercises()]);
  if (error) return fail(error);
  const live = programs.filter((p) => !p.archived);
  const current = openId || live.at(-1)?.id;
  const prog = current ? await loadProgram(current) : null;
  app.innerHTML = `<div class="view">
    <div class="row between"><div class="h1">البرنامج</div><button class="btn sm w" id="newP">${ico('plus', 's')} برنامج</button></div>
    ${live.length > 1 ? `<select class="input mt" id="pSel" aria-label="البرنامج">${live.map((p) => `<option value="${p.id}" ${p.id === current ? 'selected' : ''}>${esc(p.name)}${p.archived ? ' (مؤرشف)' : ''}</option>`).join('')}</select>` : ''}
    ${prog ? `<div class="card mt">
      <label class="field"><span>اسم البرنامج</span><input id="pName" value="${esc(prog.name)}" /></label>
      <label class="field mt"><span>شرح البرنامج (بيشوفه المتدرب)</span><textarea id="pDesc" rows="3">${esc(prog.description || '')}</textarea></label>
      <div class="row wrap-ok mt"><button class="btn sm w" id="dup">${ico('copy', 's')} نسخة</button><button class="btn sm w" id="arch">${prog.archived ? 'رجّعه' : 'حذف البرنامج'}</button></div></div>
    ${prog.program_days.map((d) => `<div class="card mt" data-day="${d.id}">
      <div class="row"><input class="input grow b" data-dname value="${esc(d.name)}" aria-label="اسم اليوم" /><button class="icon-btn" data-delday aria-label="حذف اليوم">${ico('trash', 's')}</button></div>
      <select class="input mt1" data-dweek aria-label="يوم الأسبوع"><option value="">— بدون يوم محدد —</option>${WEEKDAYS.map((w, i) => `<option value="${i}" ${d.weekday === i ? 'selected' : ''}>${w}</option>`).join('')}</select>
      <input class="input mt1 sm" data-dnotes value="${esc(d.notes || '')}" placeholder="ملاحظة لليوم (اختياري)" aria-label="ملاحظة اليوم" />
      <div class="mt">${d.program_exercises.map((pe) => `<div class="pe" data-pe="${pe.id}">
        <div class="grow"><div class="ex-name sm">${esc(pe.exercise.name)}</div><div class="xs muted">${esc(pe.reps || '')}${pe.rest_seconds ? ` · راحة ${restLabel(pe.rest_seconds)}` : ''}</div></div>
        <div class="mini-step"><button data-sets="-1" aria-label="نقّص">−</button><span class="num">${pe.sets}</span><button data-sets="1" aria-label="زيد">+</button></div>
        <button class="icon-btn" data-pem aria-label="خيارات">${ico('dots', 's')}</button></div>`).join('') || '<div class="sm muted">ما في تمارين</div>'}</div>
      <button class="btn sm w block mt" data-addpe>${ico('plus', 's')} زيد تمرين</button></div>`).join('')}
    <button class="btn w block mt" id="addDay">${ico('plus', 's')} زيد يوم</button>` : '<div class="empty">ما في برامج.</div>'}</div>`;
  const sel = $('#pSel'); if (sel) sel.onchange = () => (location.hash = `#/coach/programs/${sel.value}`);
  $('#newP').onclick = async () => {
    const name = prompt('اسم البرنامج'); if (!name) return;
    const { data, error: e } = await sb.from('programs').insert({ name }).select().single(); if (e) return fail(e);
    location.hash = `#/coach/programs/${data.id}`;
  };
  if (!prog) return;
  const reload = () => { state.program = null; viewPrograms(prog.id); };
  const save = async (q) => { const { error: e } = await q; if (e) { fail(e); return false; } state.program = null; return true; };
  $('#pName').onchange = (e) => save(sb.from('programs').update({ name: e.target.value }).eq('id', prog.id)).then((ok) => ok && toast('انحفظ'));
  $('#pDesc').onchange = (e) => save(sb.from('programs').update({ description: e.target.value || null }).eq('id', prog.id)).then((ok) => ok && toast('انحفظ'));
  $('#arch').onclick = async () => { if (!prog.archived && !confirm(`تشيل "${prog.name}"؟ السجلات بتضل محفوظة.`)) return; if (await save(sb.from('programs').update({ archived: !prog.archived }).eq('id', prog.id))) { state.program = null; location.hash = '#/coach/programs'; viewPrograms(); } };
  $('#dup').onclick = async () => {
    const { data: np, error: e } = await sb.from('programs').insert({ name: prog.name + ' (نسخة)', description: prog.description }).select().single(); if (e) return fail(e);
    for (const d of prog.program_days) {
      const { data: nd, error: e2 } = await sb.from('program_days').insert({ program_id: np.id, day_order: d.day_order, name: d.name, notes: d.notes }).select().single(); if (e2) return fail(e2);
      if (d.program_exercises.length) await sb.from('program_exercises').insert(d.program_exercises.map((pe) => ({ day_id: nd.id, exercise_id: pe.exercise.id, position: pe.position, sets: pe.sets, reps: pe.reps, rest_seconds: pe.rest_seconds, notes: pe.notes })));
    }
    location.hash = `#/coach/programs/${np.id}`;
  };
  $('#addDay').onclick = async () => {
    const n = (prog.program_days.at(-1)?.day_order || 0) + 1;
    if (await save(sb.from('program_days').insert({ program_id: prog.id, day_order: n, name: `اليوم ${n}` }))) reload();
  };
  app.onchange = (e) => {
    const day = e.target.closest('[data-day]'); if (!day) return;
    if (e.target.matches('[data-dname]')) save(sb.from('program_days').update({ name: e.target.value }).eq('id', day.dataset.day)).then((ok) => ok && toast('انحفظ'));
    if (e.target.matches('[data-dweek]')) save(sb.from('program_days').update({ weekday: e.target.value === '' ? null : +e.target.value }).eq('id', day.dataset.day)).then((ok) => ok && toast('انحفظ'));
    if (e.target.matches('[data-dnotes]')) save(sb.from('program_days').update({ notes: e.target.value || null }).eq('id', day.dataset.day)).then((ok) => ok && toast('انحفظ'));
  };
  app.onclick = async (e) => {
    const dayEl = e.target.closest('[data-day]'); if (!dayEl) return;
    const day = prog.program_days.find((d) => d.id === dayEl.dataset.day);
    if (e.target.closest('[data-delday]')) { if (confirm(`تحذف "${day.name}"؟`) && await save(sb.from('program_days').delete().eq('id', day.id))) reload(); return; }
    if (e.target.closest('[data-addpe]')) return pickExercise('زيد تمرين لـ' + day.name, async (id) => {
      const pos = (day.program_exercises.at(-1)?.position || 0) + 1;
      if (await save(sb.from('program_exercises').insert({ day_id: day.id, exercise_id: id, position: pos, sets: 1, reps: 'للفشل العضلي', rest_seconds: 120 }))) reload();
    });
    const peEl = e.target.closest('[data-pe]'); if (!peEl) return;
    const idx = day.program_exercises.findIndex((p) => p.id === peEl.dataset.pe); const pe = day.program_exercises[idx];
    const st = e.target.closest('[data-sets]');
    if (st) {
      const n = Math.max(1, pe.sets + +st.dataset.sets);
      if (n !== pe.sets && await save(sb.from('program_exercises').update({ sets: n }).eq('id', pe.id))) { pe.sets = n; $('.num', peEl).textContent = n; }
      return;
    }
    if (e.target.closest('[data-pem]')) {
      const sh = sheet(`<div class="ex-name">${esc(pe.exercise.name)}</div>
        <div class="grid2 mt"><label class="field"><span>العدّات</span><input id="reps" value="${esc(pe.reps)}" /></label><label class="field"><span>راحة (ثانية)</span><input id="rest" inputmode="numeric" value="${pe.rest_seconds ?? ''}" dir="ltr" /></label></div>
        <label class="field mt"><span>ملاحظة المدرب</span><input id="pn" value="${esc(pe.notes || '')}" /></label>
        <button class="btn block mt" id="ok">حفظ</button>
        <div class="menu mt">${idx > 0 ? `<button data-a="up">${ico('up')} لفوق</button>` : ''}${idx < day.program_exercises.length - 1 ? `<button data-a="down">${ico('down')} لتحت</button>` : ''}<button data-a="swap">${ico('swap')} بدّل التمرين</button><button data-a="rm" class="danger">${ico('trash')} شيل من اليوم</button></div>`);
      $('#ok', sh).onclick = async () => {
        if (await save(sb.from('program_exercises').update({ reps: $('#reps', sh).value || 'للفشل العضلي', rest_seconds: parseInt($('#rest', sh).value, 10) || null, notes: $('#pn', sh).value || null }).eq('id', pe.id))) { closeSheet(); reload(); }
      };
      $('.menu', sh).onclick = async (ev) => {
        const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; closeSheet();
        if (a === 'rm' && await save(sb.from('program_exercises').delete().eq('id', pe.id))) reload();
        if (a === 'swap') pickExercise('بدّل بـ', async (id) => { if (await save(sb.from('program_exercises').update({ exercise_id: id }).eq('id', pe.id))) reload(); });
        if (a === 'up' || a === 'down') {
          const o = day.program_exercises[a === 'up' ? idx - 1 : idx + 1];
          await save(sb.from('program_exercises').update({ position: o.position }).eq('id', pe.id));
          await save(sb.from('program_exercises').update({ position: pe.position === o.position ? o.position + 1 : pe.position }).eq('id', o.id));
          reload();
        }
      };
    }
  };
}

/* ================= coach: people ================= */
async function viewPeople() {
  const [{ data: people, error }, { data: programs }, { data: recent }] = await Promise.all([
    sb.from('profiles').select('*').order('created_at'),
    sb.from('programs').select('id,name,archived').order('created_at'),
    sb.from('workout_logs').select('trainee_id,performed_on,status').order('performed_on', { ascending: false }).limit(1000),
  ]);
  if (error) return fail(error);
  const last = {}, cnt = {}, wk7 = {}; const weekAgo = iso(new Date(Date.now() - 6 * 864e5));
  (recent || []).filter((l) => l.status === 'done').forEach((l) => {
    last[l.trainee_id] ||= l.performed_on; cnt[l.trainee_id] = (cnt[l.trainee_id] || 0) + 1;
    if (l.performed_on >= weekAgo) wk7[l.trainee_id] = (wk7[l.trainee_id] || 0) + 1;
  });
  const opts = (sel) => '<option value="">— بدون برنامج —</option>' + programs.filter((p) => !p.archived || p.id === sel).map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  app.innerHTML = `<div class="view">
    <div class="row between"><div class="h1">المتدربين</div><button class="btn sm" id="add">${ico('plus', 's')} متدرب</button></div>
    <div id="cred"></div>
    ${people.map((p) => `<div class="card mt" data-id="${p.id}">
      <div class="row"><span class="mark">${esc(firstName(p.full_name).slice(0, 1) || '?')}</span>
        <div class="grow"><div class="b">${esc(p.full_name || '')} ${p.role === 'coach' ? '<span class="tag k">مدرب</span>' : ''}</div></div>
        <a class="btn sm w" href="#/coach/person/${p.id}">التقدّم</a></div>
      <div class="row wrap-ok mt"><span class="tag">آخر حصة: ${last[p.id] ? fmtShort(last[p.id]) : '—'}</span><span class="tag">${wk7[p.id] || 0} هالأسبوع</span><span class="tag">${cnt[p.id] || 0} حصة</span></div>
      <label class="field mt"><span>البرنامج</span><select data-assign>${opts(p.program_id)}</select></label>
      ${p.role === 'coach' ? '' : '<button class="btn sm w mt" data-pin>رقم سري جديد</button>'}
    </div>`).join('')}</div>`;

  const manage = async (body) => {
    const { data, error: er } = await sb.functions.invoke('manage-trainee', { body });
    if (!er) return data;
    let m = er.message; try { m = (await er.context.json()).error || m; } catch {}
    const err = new Error(m); err.taken = m === 'pin taken'; throw err;
  };
  // PINs must be unique: retry with a fresh one if the server says it's taken
  const withPin = async (body) => { for (let i = 0; i < 6; i++) { const pin = newPin(); try { await manage({ ...body, pin }); return pin; } catch (e) { if (!e.taken) throw e; } } throw new Error('ما لقيت رقم فاضي، جرّب كمان مرة'); };
  const showCred = (name, _u, pin) => {
    const msg = `أهلاً ${name} 💪\nهاد رابط موقع التمارين:\n${PAGE_URL}\nرقمك السري للدخول: ${pin}`;
    $('#cred').innerHTML = `<div class="card cred mt"><div class="b">معلومات الدخول لـ${esc(name)}</div>
      <div class="mt"><div class="xs muted">الرقم السري للدخول</div><div class="pin num">${esc(pin)}</div></div>
      <p class="xs muted mt1">الرقم ما رح ينعرض مرة تانية — ابعته هلق.</p>
      <div class="row mt"><a class="btn grow" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">ابعت عالواتساب</a><button class="btn w" id="cp">${ico('copy', 's')} نسخ</button></div></div>`;
    $('#cp').onclick = () => navigator.clipboard.writeText(msg).then(() => toast('انتسخ'), () => toast('ما زبط النسخ', { err: true }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  $('#add').onclick = () => {
    const sh = sheet(`<div class="h2">متدرب جديد</div><form id="nf">
      <label class="field mt"><span>الاسم الكامل</span><input name="full_name" required /></label>
      <label class="field mt"><span>البرنامج</span><select name="program_id">${opts(programs.filter((p) => !p.archived).at(-1)?.id)}</select></label>
      <button class="btn block mt">اعمل الحساب</button></form>`);
    $('#nf', sh).onsubmit = async (e) => {
      e.preventDefault(); const b = Object.fromEntries(new FormData(e.target));
      const btn = $('button', e.target); btn.disabled = true;
      try { const pin = await withPin({ action: 'create', ...b }); closeSheet(); await viewPeople(); showCred(b.full_name, '', pin); }
      catch (err) { fail(err); btn.disabled = false; }
    };
  };
  app.onchange = async (e) => {
    const c = e.target.closest('[data-id]'); if (!c || !e.target.matches('[data-assign]')) return;
    const { error: er } = await sb.from('profiles').update({ program_id: e.target.value || null }).eq('id', c.dataset.id);
    if (er) return fail(er);
    if (c.dataset.id === uid()) { state.profile.program_id = e.target.value || null; state.program = null; }
    toast('انحفظ');
  };
  app.onclick = async (e) => {
    const b = e.target.closest('[data-pin]'); if (!b) return;
    const p = people.find((x) => x.id === b.closest('[data-id]').dataset.id);
    if (!confirm(`تعطي ${p.full_name} رقم سري جديد؟`)) return;
    try { const pin = await withPin({ action: 'reset_pin', user_id: p.id }); showCred(p.full_name, '', pin); } catch (err) { fail(err); }
  };
}

/* ================= router ================= */
async function route() {
  stopRest(); closeSheet();
  app.onclick = app.onchange = app.oninput = null; document.onkeydown = null;
  if (wk?.dirty) syncNow();
  if (!location.hash.startsWith('#/w/')) wk = null;
  const h = location.hash.replace(/^#/, '') || '/';
  if (!state.session) { renderChrome(); return viewLogin(); }
  document.body.style.paddingBottom = '';
  app.className = 'wrap';
  try {
    if (!state.profile) await loadProfile();
    renderChrome();
    if (!state.profile) { app.innerHTML = '<div class="empty"><div class="h2">حسابك مش مفعّل</div><p class="mt1">تواصل مع المدرب.</p><button class="btn w mt" id="out">خروج</button></div>'; $('#out').onclick = logout; return; }
    window.scrollTo(0, 0);
    if (!introShown) { introShown = true; letsGo({ sound: !!loginTapped }); }
    let m;
    if (h === '/' || h === '/login') return await viewHome();
    if ((m = h.match(/^\/w\/([\w-]+)/))) return await viewWorkout(m[1]);
    if (h === '/progress') return await viewProgress();
    if ((m = h.match(/^\/progress\/ex\/([\w-]+)/))) return await viewExerciseHistory(m[1]);
    if (h === '/account') return viewAccount();
    if (isCoach()) {
      if (h === '/coach/people') return await viewPeople();
      if ((m = h.match(/^\/coach\/person\/([\w-]+)\/ex\/([\w-]+)/))) return await viewExerciseHistory(m[2], m[1]);
      if ((m = h.match(/^\/coach\/person\/([\w-]+)/))) return await viewProgress(m[1]);
      if ((m = h.match(/^\/coach\/programs(?:\/([\w-]+))?/))) return await viewPrograms(m[1]);
      if (h === '/coach/library') return await viewLibrary();
    }
    location.hash = '#/';
  } catch (err) {
    fail(err);
    app.innerHTML = '<div class="empty">صار خطأ بالتحميل.<br><button class="btn w mt" onclick="location.reload()">جرّب كمان مرة</button></div>';
  }
}
let introShown = false, loginTapped = false;
window.addEventListener('hashchange', route);
sb.auth.onAuthStateChange((event, session) => {
  const had = !!state.session; state.session = session;
  if (event === 'SIGNED_OUT') { Object.assign(state, { profile: null, program: null, logs: null, exercises: null }); setTimeout(route, 0); }
  if (event === 'SIGNED_IN' && !had) setTimeout(() => { route(); flushPending(); }, 0);
});
const { data: { session } } = await sb.auth.getSession();
state.session = session;
if (!/^#\//.test(location.hash)) history.replaceState(null, '', PAGE_URL + '#/');
await route();
if (session) { flushPending(); logEvent('page_load', { v: 11 }); }
