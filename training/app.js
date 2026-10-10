import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://dsgzqdznntsriaezmlbn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HxWnLtIFqNZRRg1O1QFWHg_Lkrw-TSv';
const STORAGE_TUS = 'https://dsgzqdznntsriaezmlbn.storage.supabase.co/storage/v1/upload/resumable';
const BUCKET = 'exercise-videos';
const FREE_PLAN_MAX_MB = 50;
const PAGE_URL = location.origin + location.pathname;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const state = { session: null, profile: null, program: null, logs: null, exercises: null };

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = (d) => new Date(d + 'T00:00:00').toLocaleDateString('ar', { day: 'numeric', month: 'short' });
const fmtSet = (w, r) => `${w != null ? +w + 'kg' : '—'} × ${r ?? '—'}`;
const e1rm = (w, r) => (w && r ? w * (1 + r / 30) : 0); // Epley
const isCoach = () => state.profile?.role === 'coach';
const uid = () => state.session?.user.id;

function newPassword() {
  const a = 'abcdefghjkmnpqrstuvwxyz', d = '23456789';
  const r = (set, n) => Array.from(crypto.getRandomValues(new Uint32Array(n)), (x) => set[x % set.length]).join('');
  return `${r(a, 4)}-${r(d, 4)}-${r(a, 3)}`;
}

let toastTimer;
function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast' + (err ? ' err' : ''); t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
}
function fail(error) { console.error(error); toast(error?.message || 'صار خطأ، جرّب مرة تانية', true); }
const draftKey = (dayId) => `draft:${uid()}:${dayId}`;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

function parseRange(reps) {
  const m = String(reps).match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { lo: +m[1], hi: +m[2] };
  const n = String(reps).match(/^\s*(\d+)\s*$/);
  return n ? { lo: +n[1], hi: +n[1] } : null;
}
function setsLabel(pe) {
  const s = pe.sets === 1 ? 'جولة وحدة' : pe.sets === 2 ? 'جولتين' : `${pe.sets} جولات`;
  return `${s} × ${pe.reps}`;
}

/* ---------- data ---------- */
async function loadProfile() {
  const { data, error } = await sb.from('profiles').select('*').eq('id', uid()).maybeSingle();
  if (error) throw error;
  state.profile = data;
}
async function loadProgram(programId) {
  if (!programId) return null;
  const { data, error } = await sb.from('programs')
    .select('id,name,description,program_days(id,day_order,name,notes,program_exercises(id,position,sets,reps,rest_seconds,notes,exercise:exercises(id,name,muscle_group,description,video_path)))')
    .eq('id', programId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  data.program_days.sort((a, b) => a.day_order - b.day_order);
  data.program_days.forEach((d) => d.program_exercises.sort((a, b) => a.position - b.position));
  return data;
}
async function loadLogs(traineeId, limit = 400) {
  const { data, error } = await sb.from('workout_logs')
    .select('id,performed_on,day_id,day_name,rpe,notes,created_at,set_logs(exercise_id,set_number,weight,reps,exercise:exercises(name))')
    .eq('trainee_id', traineeId)
    .order('performed_on', { ascending: false }).order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  data.forEach((l) => l.set_logs.sort((a, b) => a.set_number - b.set_number));
  return data;
}
async function myProgram() {
  if (state.program === null || state.program?.id !== state.profile.program_id) state.program = await loadProgram(state.profile.program_id);
  return state.program;
}
async function myLogs(force = false) {
  if (!state.logs || force) state.logs = await loadLogs(uid());
  return state.logs;
}
async function allExercises(force = false) {
  if (!state.exercises || force) {
    const { data, error } = await sb.from('exercises').select('*').order('created_at');
    if (error) throw error;
    state.exercises = data;
  }
  return state.exercises;
}
function lastFor(logs, exerciseId) {
  for (const l of logs) {
    const sets = l.set_logs.filter((s) => s.exercise_id === exerciseId && (s.weight != null || s.reps != null));
    if (sets.length) return { date: l.performed_on, sets };
  }
  return null;
}
function bestFor(logs, exerciseId) {
  let best = 0;
  for (const l of logs) for (const s of l.set_logs) if (s.exercise_id === exerciseId) best = Math.max(best, e1rm(+s.weight, +s.reps));
  return best;
}
async function signedUrl(path) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 3);
  if (error) throw error;
  return data.signedUrl;
}

/* ---------- layout ---------- */
const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M16 4a4 4 0 010 8M22 21c0-3-2-5-4-5.5"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l-5-5 5-5M5 12h12"/></svg>',
};
function renderNav() {
  let tabbar = document.querySelector('.tabbar');
  if (!state.profile) { nav.hidden = true; tabbar?.remove(); return; }
  const items = [['#/', 'الرئيسية', 'home'], ['#/progress', 'تقدّمي', 'chart']];
  if (isCoach()) items.push(['#/coach/exercises', 'التمارين', 'dumbbell'], ['#/coach/programs', 'الجداول', 'list'], ['#/coach/trainees', 'المتدربين', 'users']);
  const route = location.hash || '#/';
  const on = (href) => (href === '#/' ? route === '#/' || route.startsWith('#/day') : route.startsWith(href)) ? 'on' : '';
  nav.innerHTML = items.map(([h, t]) => `<a href="${h}" class="${on(h)}">${t}</a>`).join('') + '<button data-logout>خروج</button>';
  nav.hidden = false;
  if (!tabbar) { tabbar = document.createElement('nav'); tabbar.className = 'tabbar'; document.body.appendChild(tabbar); }
  tabbar.innerHTML = items.map(([h, t, i]) => `<a href="${h}" class="${on(h)}">${ICONS[i]}<span>${t}</span></a>`).join('')
    + `<button data-logout>${ICONS.out}<span>خروج</span></button>`;
}
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-logout]')) {
    await sb.auth.signOut();
    Object.assign(state, { profile: null, program: null, logs: null, exercises: null });
    location.hash = '#/login';
  }
});

/* ---------- auth screens ---------- */
function viewLogin() {
  app.innerHTML = `
  <div class="auth">
    <div class="center" style="margin-bottom:20px">
      <h1>أهلاً فيك 💪</h1>
      <p class="muted">سجّل دخول لتشوف جدولك وتسجّل أوزانك</p>
    </div>
    <form class="card stack" id="pwForm">
      <label class="field"><span>الإيميل</span><input type="email" name="email" required autocomplete="email" dir="ltr" /></label>
      <label class="field"><span>كلمة السر</span><input type="password" name="password" required autocomplete="current-password" dir="ltr" /></label>
      <button class="btn block">دخول</button>
    </form>
    <p class="muted small center" style="margin-top:16px">الحساب بيعطيك ياه المدرب. نسيت كلمة السر؟ تواصل معه ليعطيك وحدة جديدة.</p>
  </div>`;
  const form = $('#pwForm');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const btn = form.querySelector('button'); btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: fd.get('email').trim(), password: fd.get('password') });
    btn.disabled = false;
    if (error) return toast(error.message.includes('Invalid') ? 'الإيميل أو كلمة السر غلط' : error.message, true);
  };
}

function viewAccount() {
  app.innerHTML = `
  <div class="auth">
    <a href="#/" class="small">→ رجوع</a>
    <h1 style="margin-top:8px">حسابي</h1>
    <div class="card"><div class="small muted">الإيميل</div><div dir="ltr" style="text-align:right">${esc(state.session.user.email)}</div></div>
    <form class="card stack" id="setPw">
      <h3>تغيير كلمة السر</h3>
      <label class="field"><span>كلمة السر الجديدة (8 أحرف على الأقل)</span><input type="password" name="p" minlength="8" required autocomplete="new-password" dir="ltr" /></label>
      <button class="btn block">حفظ</button>
    </form>
  </div>`;
  $('#setPw').onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: e.target.p.value });
    if (error) return fail(error);
    toast('تم تغيير كلمة السر ✅');
    location.hash = '#/';
  };
}

function viewNoProfile() {
  app.innerHTML = `
  <div class="auth card center">
    <h2>حسابك لسا مش مفعّل</h2>
    <p class="muted">تواصل مع المدرب ليضيفك على المنصة.</p>
    <button class="btn ghost" data-logout>خروج</button>
  </div>`;
}

/* ---------- home ---------- */
function nextDay(program, logs) {
  const ids = program.program_days.map((d) => d.id);
  const last = logs.find((l) => ids.includes(l.day_id));
  if (!last) return program.program_days[0];
  const i = ids.indexOf(last.day_id);
  return program.program_days[(i + 1) % ids.length];
}
function weekStrip(logs) {
  const done = new Set(logs.map((l) => l.performed_on));
  const days = [];
  const t = new Date(today() + 'T00:00:00');
  for (let i = 27; i >= 0; i--) {
    const d = new Date(t); d.setDate(t.getDate() - i);
    const iso = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    days.push(`<i class="${done.has(iso) ? 'on' : ''} ${i === 0 ? 'today' : ''}" title="${iso}"></i>`);
  }
  return `<div class="weeks" aria-label="آخر 4 أسابيع">${days.join('')}</div>`;
}

async function viewHome() {
  const [program, logs] = await Promise.all([myProgram(), myLogs()]);
  const name = state.profile.full_name || '';
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const thisWeek = logs.filter((l) => l.performed_on > weekAgo).length;

  if (!program) {
    app.innerHTML = `
      <h1>أهلاً ${esc(name)} 👋</h1>
      <div class="card"><p>ما في جدول معيّن إلك لسا.</p>
      ${isCoach() ? '<a class="btn" href="#/coach/trainees">عيّن جدول لحالك أو لمتدرب</a>' : '<p class="muted">المدرب رح يعيّنلك جدولك قريباً.</p>'}</div>`;
    return;
  }
  const next = nextDay(program, logs);
  const doneToday = logs.some((l) => l.performed_on === today());
  app.innerHTML = `
    <h1>أهلاً ${esc(name)} 👋</h1>
    <div class="card hero">
      <div class="small muted">${doneToday ? 'تمرّنت اليوم ✅ — الحصة الجاية' : 'تمرين اليوم'}</div>
      <h2 style="margin:4px 0 2px">${esc(next.name)}</h2>
      <div class="small muted">${next.program_exercises.length} تمرين · ${next.program_exercises.reduce((a, p) => a + p.sets, 0)} جولة</div>
      <a class="btn" style="margin-top:14px" href="#/day/${next.id}">ابدأ التمرين</a>
    </div>

    <div class="stats" style="margin-top:12px">
      <div class="stat"><div class="v">${thisWeek}<span class="small muted"> / ${program.program_days.length}</span></div><div class="l">حصص هالأسبوع</div></div>
      <div class="stat"><div class="v">${logs.length}</div><div class="l">كل الحصص</div></div>
      <div class="stat"><div class="v">${logs[0] ? fmtShort(logs[0].performed_on) : '—'}</div><div class="l">آخر حصة</div></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row between small muted" style="margin-bottom:8px"><span>آخر 4 أسابيع</span><span>كل مربع = يوم</span></div>
      ${weekStrip(logs)}
    </div>

    <div class="section-title"><h2>${esc(program.name)}</h2></div>
    ${program.description ? `<div class="card"><p style="margin:0;white-space:pre-line">${esc(program.description)}</p></div>` : ''}
    ${program.program_days.map((d) => `
      <a class="card link day-card" href="#/day/${d.id}">
        <div class="row between"><h3 style="margin:0">${esc(d.name)}</h3><span class="pill accent">ابدأ ←</span></div>
        <div class="meta">
          <span class="pill">${d.program_exercises.length} تمرين</span>
          <span class="pill">${d.program_exercises.reduce((a, p) => a + p.sets, 0)} جولة</span>
          ${d.notes ? `<span class="pill">${esc(d.notes)}</span>` : ''}
        </div>
        <ol class="ex-list">
          ${d.program_exercises.map((pe) => `<li><span class="grow" dir="auto">${esc(pe.exercise.name)}</span><span class="muted small">${setsLabel(pe)}</span>${pe.exercise.video_path ? '<span title="فيه فيديو">🎬</span>' : ''}</li>`).join('')}
        </ol>
      </a>`).join('')}
    <p class="center small" style="margin-top:20px"><a href="#/account">حسابي وتغيير كلمة السر</a></p>
  `;
}

/* ---------- workout day ---------- */
let timerInt;
function startTimer(seconds) {
  stopTimer();
  if (!seconds) return;
  let left = seconds;
  const el = document.createElement('div');
  el.className = 'timer'; el.id = 'timer';
  el.innerHTML = `<div class="grow"><div class="small" style="opacity:.75">راحة</div><div class="progress-bar" style="background:rgba(127,127,127,.3)"><i></i></div></div>
    <div class="t"></div><button data-add>+15</button><button data-stop>تخطّي</button>`;
  document.body.appendChild(el);
  const tick = () => {
    $('.t', el).textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    $('i', el).style.width = `${100 - (left / seconds) * 100}%`;
    if (left <= 0) { stopTimer(); navigator.vibrate?.([200, 100, 200]); toast('خلصت الراحة، يلا 🔥'); }
    left--;
  };
  tick(); timerInt = setInterval(tick, 1000);
  $('[data-add]', el).onclick = () => { left += 15; seconds += 15; };
  $('[data-stop]', el).onclick = stopTimer;
}
function stopTimer() { clearInterval(timerInt); document.getElementById('timer')?.remove(); }

async function viewDay(dayId) {
  const [program, logs] = await Promise.all([myProgram(), myLogs()]);
  let day = program?.program_days.find((d) => d.id === dayId);
  if (!day) {
    // coach previewing a day from another program
    const { data } = await sb.from('program_days').select('id,name,notes,program_id').eq('id', dayId).maybeSingle();
    if (!data) { app.innerHTML = '<p class="center pad muted">اليوم مش موجود</p>'; return; }
    const p = await loadProgram(data.program_id);
    day = p.program_days.find((d) => d.id === dayId);
  }
  const draft = store.get(draftKey(dayId)) || { sets: {}, done: {}, rpe: null, notes: '', date: today(), bw: '' };
  const save = () => store.set(draftKey(dayId), draft);

  const exHtml = day.program_exercises.map((pe) => {
    const ex = pe.exercise;
    const last = lastFor(logs, ex.id);
    const range = parseRange(pe.reps);
    let hint = '';
    if (last) {
      const top = last.sets.reduce((a, s) => (e1rm(+s.weight, +s.reps) > e1rm(+a.weight, +a.reps) ? s : a), last.sets[0]);
      if (range && top.reps >= range.hi) hint = `<div class="hint-up">🔼 وصلت لأعلى العدّات — زيد الوزن شوي هالمرة</div>`;
      else hint = `<div>🎯 الهدف: تتجاوز <b class="num">${fmtSet(top.weight, top.reps)}</b> (وزن أكتر أو عدّة زيادة)</div>`;
    }
    const rows = Array.from({ length: pe.sets }, (_, i) => {
      const n = i + 1; const k = `${pe.id}:${n}`;
      const prev = last?.sets.find((s) => s.set_number === n) || last?.sets[last.sets.length - 1];
      const v = draft.sets[k] || {};
      return `<div class="set ${draft.done[k] ? 'ok' : ''}" data-k="${k}" data-rest="${pe.rest_seconds || 0}">
        <div class="n">${n}</div>
        <input inputmode="decimal" data-f="weight" aria-label="الوزن جولة ${n}" placeholder="${prev?.weight != null ? +prev.weight : 'كغ'}" value="${esc(v.weight ?? '')}" />
        <input inputmode="numeric" data-f="reps" aria-label="العدّات جولة ${n}" placeholder="${prev?.reps ?? 'عدّات'}" value="${esc(v.reps ?? '')}" />
        <button type="button" class="check" aria-label="خلصت الجولة">✓</button>
      </div>`;
    }).join('');
    return `<section class="ex" data-pe="${pe.id}" data-ex="${ex.id}">
      <div class="ex-head">
        <div class="grow">
          <div class="ex-name">${esc(ex.name)}</div>
          <div class="ex-target">${esc(ex.muscle_group || '')}${ex.muscle_group ? ' · ' : ''}${setsLabel(pe)}${pe.rest_seconds ? ` · راحة ${pe.rest_seconds >= 60 ? Math.round(pe.rest_seconds / 60) + ' د' : pe.rest_seconds + ' ث'}` : ''}</div>
        </div>
        ${ex.video_path ? `<button type="button" class="btn soft sm video-btn" data-video="${esc(ex.video_path)}">▶ الفيديو</button>` : ''}
      </div>
      ${ex.description || pe.notes ? `<div class="ex-desc">${esc([ex.description, pe.notes].filter(Boolean).join('\n'))}</div>` : ''}
      <div class="video-slot"></div>
      <div class="last">${last ? `آخر مرة (${fmtShort(last.date)}): ${last.sets.map((s) => `<b class="num">${fmtSet(s.weight, s.reps)}</b>`).join(' · ')}${hint}` : 'أول مرة بتعمل هالتمرين — سجّل وزنك لنبلّش نتابع تقدّمك'}</div>
      <div class="set-labels" style="margin-top:10px"><span>#</span><span>الوزن (كغ)</span><span>العدّات</span><span></span></div>
      <div class="sets">${rows}</div>
      <div class="pr-slot"></div>
    </section>`;
  }).join('');

  app.innerHTML = `
    <div class="row between"><a href="#/" class="small">→ رجوع</a><span class="small muted">${esc(program?.name || '')}</span></div>
    <h1 style="margin-top:8px">${esc(day.name)}</h1>
    ${day.notes ? `<p class="muted">${esc(day.notes)}</p>` : ''}
    <div class="progress-bar" style="margin:8px 0 4px"><i id="prog"></i></div>
    <div class="small muted" id="progTxt"></div>
    ${exHtml}
    <div class="card" style="margin-top:16px">
      <h3>كيف كان التمرين؟</h3>
      <div class="small muted" style="margin-bottom:6px">الصعوبة (1 = سهل جداً، 10 = لحد الفشل الكامل)</div>
      <div class="rpe">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}" class="${draft.rpe === i + 1 ? 'on' : ''}">${i + 1}</button>`).join('')}</div>
      <div class="form-grid" style="margin-top:12px">
        <label class="field"><span>التاريخ</span><input type="date" id="date" value="${esc(draft.date)}" max="${today()}" /></label>
        <label class="field"><span>وزن الجسم اليوم (اختياري)</span><input inputmode="decimal" id="bw" placeholder="كغ" value="${esc(draft.bw)}" dir="ltr" /></label>
      </div>
      <label class="field" style="margin-top:12px"><span>ملاحظات</span><textarea id="notes" placeholder="شو حسّيت؟ ألم؟ نوم؟ أكل؟">${esc(draft.notes)}</textarea></label>
    </div>
    <div class="sticky-save row">
      <button class="btn grow" id="saveBtn">حفظ التمرين ✅</button>
      <button class="btn ghost" id="clearBtn" title="مسح">مسح</button>
    </div>`;

  const best = {};
  day.program_exercises.forEach((pe) => (best[pe.exercise.id] = bestFor(logs, pe.exercise.id)));

  const updateProgress = () => {
    const total = $$('.set').length; const done = $$('.set.ok').length;
    $('#prog').style.width = `${total ? (done / total) * 100 : 0}%`;
    $('#progTxt').textContent = `${done} من ${total} جولة`;
    $$('.ex').forEach((sec) => {
      sec.classList.toggle('done', $$('.set', sec).every((s) => s.classList.contains('ok')));
      const exId = sec.dataset.ex;
      let top = 0;
      $$('.set', sec).forEach((s) => { const v = draft.sets[s.dataset.k] || {}; top = Math.max(top, e1rm(+v.weight, +v.reps)); });
      $('.pr-slot', sec).innerHTML = best[exId] && top > best[exId] + 0.01 ? '<span class="pr">🏆 رقم قياسي جديد!</span>' : '';
    });
  };
  updateProgress();

  app.oninput = (e) => {
    const row = e.target.closest('.set');
    if (row) { (draft.sets[row.dataset.k] ||= {})[e.target.dataset.f] = e.target.value.replace(',', '.'); save(); updateProgress(); }
  };
  $('#notes').oninput = (e) => { draft.notes = e.target.value; save(); };
  $('#bw').oninput = (e) => { draft.bw = e.target.value.replace(',', '.'); save(); };
  $('#date').oninput = (e) => { draft.date = e.target.value; save(); };

  app.onclick = async (e) => {
    const check = e.target.closest('.check');
    if (check) {
      const row = check.closest('.set'); const k = row.dataset.k;
      const v = (draft.sets[k] ||= {});
      // empty fields take last time's values
      $$('input', row).forEach((inp) => { if (!inp.value && /^\d/.test(inp.placeholder)) { inp.value = inp.placeholder; v[inp.dataset.f] = inp.placeholder; } });
      draft.done[k] = !draft.done[k];
      row.classList.toggle('ok', draft.done[k]);
      save(); updateProgress();
      if (draft.done[k]) startTimer(+row.dataset.rest);
      return;
    }
    const rpe = e.target.closest('[data-rpe]');
    if (rpe) { draft.rpe = +rpe.dataset.rpe; save(); $$('[data-rpe]').forEach((b) => b.classList.toggle('on', b === rpe)); return; }
    const vb = e.target.closest('[data-video]');
    if (vb) {
      const slot = $('.video-slot', vb.closest('.ex'));
      if (slot.innerHTML) { slot.innerHTML = ''; vb.textContent = '▶ الفيديو'; return; }
      vb.disabled = true;
      try {
        const url = await signedUrl(vb.dataset.video);
        slot.innerHTML = `<div class="video-wrap"><video src="${esc(url)}" controls playsinline preload="auto"></video></div>`;
        $('video', slot).play().catch(() => {});
        vb.textContent = '✕ إخفاء';
      } catch (err) { fail(err); }
      vb.disabled = false;
    }
  };

  $('#clearBtn').onclick = () => {
    if (!confirm('تمسح كل اللي كتبته بهالتمرين؟')) return;
    store.del(draftKey(dayId)); stopTimer(); viewDay(dayId);
  };
  $('#saveBtn').onclick = async () => {
    const sets = [];
    day.program_exercises.forEach((pe) => {
      for (let n = 1; n <= pe.sets; n++) {
        const v = draft.sets[`${pe.id}:${n}`];
        if (!v) continue;
        const weight = v.weight === '' || v.weight == null ? null : Number(v.weight);
        const reps = v.reps === '' || v.reps == null ? null : parseInt(v.reps, 10);
        if (weight == null && reps == null) continue;
        if ((weight != null && Number.isNaN(weight)) || (reps != null && Number.isNaN(reps))) return;
        sets.push({ exercise_id: pe.exercise.id, set_number: n, weight, reps });
      }
    });
    if (!sets.length) return toast('سجّل جولة وحدة على الأقل', true);
    const btn = $('#saveBtn'); btn.disabled = true; btn.textContent = 'جاري الحفظ…';
    try {
      const { data: log, error } = await sb.from('workout_logs').insert({
        trainee_id: uid(), day_id: day.id, day_name: day.name, performed_on: draft.date || today(),
        rpe: draft.rpe, notes: draft.notes || null,
      }).select().single();
      if (error) throw error;
      const { error: e2 } = await sb.from('set_logs').insert(sets.map((s) => ({ ...s, log_id: log.id })));
      if (e2) { await sb.from('workout_logs').delete().eq('id', log.id); throw e2; }
      if (draft.bw && !Number.isNaN(+draft.bw)) {
        await sb.from('body_weights').upsert({ trainee_id: uid(), measured_on: draft.date || today(), weight: +draft.bw }, { onConflict: 'trainee_id,measured_on' });
      }
      store.del(draftKey(dayId)); stopTimer();
      await myLogs(true);
      toast('انحفظ التمرين، عاش 💪');
      location.hash = '#/progress';
    } catch (err) { fail(err); btn.disabled = false; btn.textContent = 'حفظ التمرين ✅'; }
  };
}

/* ---------- charts ---------- */
function lineChart(points, { label = (p) => `${p.y}kg` } = {}) {
  if (points.length < 2) return `<p class="muted small">${points.length ? 'بدنا حصتين على الأقل لنرسم المنحنى.' : 'ما في بيانات لسا.'}</p>`;
  const W = 360, H = 200, L = 34, R = 10, T = 12, B = 24;
  const xs = points.map((p) => +new Date(p.x)); const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.15 || 2; y0 = Math.max(0, y0 - pad); y1 += pad;
  const sx = (x) => L + ((x - x0) / (x1 - x0 || 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - y0) / (y1 - y0 || 1)) * (H - T - B);
  const ticks = 4; const yt = Array.from({ length: ticks + 1 }, (_, i) => y0 + ((y1 - y0) * i) / ticks);
  const xt = [0, Math.floor(points.length / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${sx(+new Date(p.x)).toFixed(1)},${sy(p.y).toFixed(1)}`).join('');
  const area = `${path}L${sx(x1).toFixed(1)},${H - B}L${sx(x0).toFixed(1)},${H - B}Z`;
  const showDots = points.length <= 40;
  const id = 'c' + Math.random().toString(36).slice(2, 8);
  const html = `<div class="chart" id="${id}">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="منحنى التقدّم">
      <g class="grid">${yt.map((y) => `<line x1="${L}" x2="${W - R}" y1="${sy(y)}" y2="${sy(y)}"/>`).join('')}</g>
      <g class="axis">${yt.map((y) => `<text x="${L - 6}" y="${sy(y) + 4}" text-anchor="end">${y1 - y0 < 8 ? y.toFixed(1) : Math.round(y)}</text>`).join('')}
        ${xt.map((i) => `<text x="${sx(+new Date(points[i].x))}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}">${fmtShort(points[i].x)}</text>`).join('')}</g>
      <path class="area" d="${area}"/>
      <path class="line" d="${path}"/>
      ${showDots ? points.map((p) => `<circle class="dot" r="4" cx="${sx(+new Date(p.x))}" cy="${sy(p.y)}"/>`).join('') : ''}
      <line class="cross" y1="${T}" y2="${H - B}" x1="0" x2="0" visibility="hidden"/>
      <circle class="dot hl" r="5" cx="0" cy="0" visibility="hidden"/>
      <rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent" class="hit"/>
    </svg>
    <div class="tip" hidden></div>
  </div>
  <details class="table-view"><summary>عرض كجدول</summary><table><thead><tr><th>التاريخ</th><th>القيمة</th></tr></thead><tbody>
    ${points.slice().reverse().map((p) => `<tr><td>${fmtShort(p.x)}</td><td class="num">${esc(label(p))}</td></tr>`).join('')}</tbody></table></details>`;
  queueMicrotask(() => {
    const root = document.getElementById(id); if (!root) return;
    const svg = $('svg', root); const tip = $('.tip', root); const cross = $('.cross', root); const hl = $('.hl', root);
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const cx = ((ev.touches?.[0]?.clientX ?? ev.clientX) - r.left) * (W / r.width);
      let bi = 0, bd = Infinity;
      points.forEach((p, i) => { const d = Math.abs(sx(+new Date(p.x)) - cx); if (d < bd) { bd = d; bi = i; } });
      const p = points[bi]; const px = sx(+new Date(p.x)); const py = sy(p.y);
      cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
      hl.setAttribute('cx', px); hl.setAttribute('cy', py); hl.setAttribute('visibility', 'visible');
      tip.hidden = false; tip.innerHTML = `${fmtShort(p.x)} · <b class="num">${esc(label(p))}</b>`;
      tip.style.left = `${(px / W) * r.width}px`; tip.style.top = `${(py / H) * r.height}px`;
    };
    const leave = () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); hl.setAttribute('visibility', 'hidden'); };
    svg.addEventListener('pointermove', move); svg.addEventListener('touchmove', move, { passive: true });
    svg.addEventListener('pointerleave', leave);
  });
  return html;
}

/* ---------- progress ---------- */
async function viewProgress(traineeId = uid()) {
  const self = traineeId === uid();
  const [logs, bwRes, prof] = await Promise.all([
    self ? myLogs() : loadLogs(traineeId),
    sb.from('body_weights').select('measured_on,weight').eq('trainee_id', traineeId).order('measured_on'),
    self ? Promise.resolve({ data: state.profile }) : sb.from('profiles').select('*').eq('id', traineeId).maybeSingle(),
  ]);
  if (bwRes.error) return fail(bwRes.error);
  const bw = bwRes.data; const who = prof.data;

  // per-exercise series: best set (by e1rm) per session
  const exMap = new Map();
  [...logs].reverse().forEach((l) => {
    const byEx = {};
    l.set_logs.forEach((s) => {
      if (s.weight == null) return;
      const cur = byEx[s.exercise_id];
      if (!cur || e1rm(+s.weight, +s.reps) > e1rm(+cur.weight, +cur.reps)) byEx[s.exercise_id] = s;
    });
    Object.entries(byEx).forEach(([id, s]) => {
      if (!exMap.has(id)) exMap.set(id, { name: s.exercise?.name || '؟', pts: [] });
      exMap.get(id).pts.push({ x: l.performed_on, y: +s.weight, reps: s.reps });
    });
  });
  const exList = [...exMap.entries()].sort((a, b) => b[1].pts.length - a[1].pts.length);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  const avgRpe = logs.filter((l) => l.rpe).slice(0, 10);

  app.innerHTML = `
    ${self ? '' : '<a href="#/coach/trainees" class="small">→ المتدربين</a>'}
    <h1 style="margin-top:8px">${self ? 'تقدّمي' : `تقدّم ${esc(who?.full_name || who?.email || '')}`}</h1>
    <div class="stats">
      <div class="stat"><div class="v">${logs.filter((l) => l.performed_on > monthAgo).length}</div><div class="l">حصص آخر 30 يوم</div></div>
      <div class="stat"><div class="v">${bw.length ? +bw[bw.length - 1].weight : '—'}</div><div class="l">وزن الجسم (كغ)</div></div>
      <div class="stat"><div class="v">${avgRpe.length ? (avgRpe.reduce((a, l) => a + l.rpe, 0) / avgRpe.length).toFixed(1) : '—'}</div><div class="l">معدّل الصعوبة</div></div>
    </div>

    <div class="section-title"><h2>تطوّر الأوزان</h2></div>
    <div class="card">
      ${exList.length ? `<label class="field"><span>التمرين</span><select id="exSel">${exList.map(([id, v]) => `<option value="${id}">${esc(v.name)} (${v.pts.length})</option>`).join('')}</select></label>
      <div class="small muted" style="margin-top:6px">أفضل جولة بكل حصة (الوزن، والعدّات بالتفاصيل)</div>
      <div id="exChart"></div>` : '<p class="muted" style="margin:0">لما تسجّل أول تمرين، رح يطلع هون منحنى تقدّمك.</p>'}
    </div>

    <div class="section-title"><h2>وزن الجسم</h2></div>
    <div class="card">
      ${self ? `<form class="row" id="bwForm" style="margin-bottom:8px">
        <input inputmode="decimal" name="w" placeholder="وزنك اليوم (كغ)" required class="grow" style="width:auto" dir="ltr" />
        <button class="btn">سجّل</button></form>` : ''}
      ${lineChart(bw.map((b) => ({ x: b.measured_on, y: +b.weight })))}
    </div>

    <div class="section-title"><h2>سجل الحصص</h2><span class="small muted">${logs.length} حصة</span></div>
    <div class="card">
      ${logs.length ? logs.map((l) => {
        const byEx = {};
        l.set_logs.forEach((s) => (byEx[s.exercise?.name || '؟'] ||= []).push(s));
        return `<div class="log">
          <div class="row between"><div><b>${fmtDate(l.performed_on)}</b> <span class="muted small">· ${esc(l.day_name || '')}</span></div>
            <div class="row">${l.rpe ? `<span class="pill">صعوبة ${l.rpe}/10</span>` : ''}${self ? `<button class="icon-btn" data-del="${l.id}" title="حذف" aria-label="حذف الحصة">🗑</button>` : ''}</div></div>
          <div class="log-sets">${Object.entries(byEx).map(([n, ss]) => `<span><span dir="auto">${esc(n)}</span>: <b class="num">${ss.map((s) => fmtSet(s.weight, s.reps)).join(', ')}</b></span>`).join('')}</div>
          ${l.notes ? `<div class="small" style="margin-top:4px">📝 ${esc(l.notes)}</div>` : ''}
        </div>`;
      }).join('') : '<p class="muted" style="margin:0">ما في حصص مسجّلة لسا.</p>'}
    </div>`;

  const drawEx = () => {
    const sel = $('#exSel'); if (!sel) return;
    const s = exMap.get(sel.value);
    $('#exChart').innerHTML = lineChart(s.pts, { label: (p) => fmtSet(p.y, p.reps) });
  };
  if ($('#exSel')) { $('#exSel').onchange = drawEx; drawEx(); }

  const f = $('#bwForm');
  if (f) f.onsubmit = async (e) => {
    e.preventDefault();
    const w = +f.w.value.replace(',', '.');
    if (!w) return;
    const { error } = await sb.from('body_weights').upsert({ trainee_id: uid(), measured_on: today(), weight: w }, { onConflict: 'trainee_id,measured_on' });
    if (error) return fail(error);
    toast('انحفظ ✅'); viewProgress();
  };
  app.onclick = async (e) => {
    const d = e.target.closest('[data-del]');
    if (!d || !confirm('تحذف هالحصة؟')) return;
    const { error } = await sb.from('workout_logs').delete().eq('id', d.dataset.del);
    if (error) return fail(error);
    await myLogs(true); viewProgress();
  };
}

/* ---------- coach: exercises & videos ---------- */
async function viewExercises() {
  const exs = await allExercises(true);
  app.innerHTML = `
    <div class="row between"><h1>مكتبة التمارين</h1><button class="btn sm" id="addEx">+ تمرين جديد</button></div>
    <p class="muted small">ارفع فيديو لكل تمرين بأعلى جودة (MP4 أو MOV). الفيديو بينرفع بدون ضغط، والرفع بيكمّل لو انقطع النت. الحد بالخطة المجانية ${FREE_PLAN_MAX_MB}MB للفيديو.</p>
    <div id="exForm"></div>
    ${exs.map((ex) => `
      <div class="card" data-id="${ex.id}">
        <div class="row" style="align-items:flex-start">
          <div class="thumb ${ex.video_path ? 'has' : ''}">${ex.video_path ? '🎬' : '📹'}</div>
          <div class="grow">
            <div class="ex-name">${esc(ex.name)}</div>
            <div class="small muted">${esc(ex.muscle_group || '')} · ${ex.video_path ? 'فيه فيديو ✅' : 'بدون فيديو'}</div>
            ${ex.description ? `<div class="ex-desc">${esc(ex.description)}</div>` : ''}
          </div>
        </div>
        <div class="row" style="margin-top:10px">
          <label class="btn soft sm">${ex.video_path ? 'استبدال الفيديو' : '⬆ رفع فيديو'}<input type="file" accept="video/*" data-upload="${ex.id}" hidden /></label>
          ${ex.video_path ? `<button class="btn ghost sm" data-play="${esc(ex.video_path)}">▶ شوف</button><button class="btn ghost sm" data-rmvid="${ex.id}">حذف الفيديو</button>` : ''}
          <button class="btn ghost sm" data-edit="${ex.id}">تعديل</button>
        </div>
        <div class="upload" hidden><div class="row between small"><span class="up-txt">جاري الرفع…</span><button class="btn ghost sm" data-cancel>إلغاء</button></div><div class="progress-bar"><i></i></div></div>
        <div class="video-slot"></div>
      </div>`).join('')}`;

  const form = (ex = {}) => {
    $('#exForm').innerHTML = `<form class="card stack" id="exF" style="border-color:var(--accent)">
      <h3>${ex.id ? 'تعديل التمرين' : 'تمرين جديد'}</h3>
      <div class="form-grid">
        <label class="field"><span>الاسم</span><input name="name" required value="${esc(ex.name || '')}" dir="auto" /></label>
        <label class="field"><span>العضلة</span><input name="muscle_group" value="${esc(ex.muscle_group || '')}" /></label>
      </div>
      <label class="field"><span>الشرح (طريقة الأداء، نصائح)</span><textarea name="description">${esc(ex.description || '')}</textarea></label>
      <div class="row"><button class="btn">حفظ</button><button type="button" class="btn ghost" id="exCancel">إلغاء</button>
      ${ex.id ? '<button type="button" class="btn danger" id="exDel" style="margin-inline-start:auto">حذف التمرين</button>' : ''}</div>
    </form>`;
    $('#exF').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#exCancel').onclick = () => ($('#exForm').innerHTML = '');
    $('#exF').onsubmit = async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const q = ex.id ? sb.from('exercises').update(fd).eq('id', ex.id) : sb.from('exercises').insert(fd);
      const { error } = await q;
      if (error) return fail(error);
      state.program = null; toast('انحفظ ✅'); viewExercises();
    };
    const del = $('#exDel');
    if (del) del.onclick = async () => {
      if (!confirm('حذف التمرين بيشيله من كل الجداول وبيحذف سجلّاته. متأكد؟')) return;
      if (ex.video_path) await sb.storage.from(BUCKET).remove([ex.video_path]);
      const { error } = await sb.from('exercises').delete().eq('id', ex.id);
      if (error) return fail(error);
      state.program = null; viewExercises();
    };
  };
  $('#addEx').onclick = () => form();

  app.onclick = async (e) => {
    const t = e.target.closest('[data-edit],[data-play],[data-rmvid]');
    if (!t) return;
    const card = t.closest('.card');
    if (t.dataset.edit) return form(exs.find((x) => x.id === t.dataset.edit));
    if (t.dataset.play) {
      const slot = $('.video-slot', card);
      if (slot.innerHTML) { slot.innerHTML = ''; return; }
      try { slot.innerHTML = `<div class="video-wrap" style="margin-top:10px"><video src="${esc(await signedUrl(t.dataset.play))}" controls playsinline autoplay></video></div>`; } catch (err) { fail(err); }
    }
    if (t.dataset.rmvid) {
      if (!confirm('تحذف الفيديو؟')) return;
      const ex = exs.find((x) => x.id === t.dataset.rmvid);
      await sb.storage.from(BUCKET).remove([ex.video_path]);
      const { error } = await sb.from('exercises').update({ video_path: null }).eq('id', ex.id);
      if (error) return fail(error);
      state.program = null; viewExercises();
    }
  };
  app.onchange = (e) => {
    const inp = e.target.closest('[data-upload]');
    if (inp?.files[0]) uploadVideo(exs.find((x) => x.id === inp.dataset.upload), inp.files[0], inp.closest('.card'));
  };
}

function uploadVideo(ex, file, card) {
  if (file.size > FREE_PLAN_MAX_MB * 1024 * 1024 && !confirm(`حجم الفيديو ${(file.size / 1048576).toFixed(0)}MB وحد الخطة المجانية ${FREE_PLAN_MAX_MB}MB. إذا ما رقّيت الخطة رح يفشل الرفع. تكمّل؟`)) return;
  const ext = (file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
  const objectName = `${ex.id}/${Date.now()}.${ext}`;
  const box = $('.upload', card); const bar = $('.progress-bar i', box); const txt = $('.up-txt', box);
  box.hidden = false;
  window.addEventListener('beforeunload', warnLeave);
  const upload = new tus.Upload(file, {
    endpoint: STORAGE_TUS,
    retryDelays: [0, 3000, 5000, 10000, 20000, 30000],
    headers: { authorization: `Bearer ${state.session.access_token}`, apikey: SUPABASE_KEY, 'x-upsert': 'true' },
    uploadDataDuringCreation: true,
    removeFingerprintOnSuccess: true,
    metadata: { bucketName: BUCKET, objectName, contentType: file.type || 'video/mp4', cacheControl: '31536000' },
    chunkSize: 6 * 1024 * 1024,
    onBeforeRequest: async (req) => {
      const { data } = await sb.auth.getSession();
      req.setHeader('authorization', `Bearer ${data.session.access_token}`);
    },
    onProgress: (sent, total) => {
      const pct = (sent / total) * 100;
      bar.style.width = `${pct}%`;
      txt.textContent = `جاري الرفع… ${pct.toFixed(0)}% (${(sent / 1048576).toFixed(0)} / ${(total / 1048576).toFixed(0)} MB)`;
    },
    onError: (err) => {
      window.removeEventListener('beforeunload', warnLeave);
      box.hidden = true;
      const tooBig = /413|too large|exceeded|maximum/i.test(String(err));
      toast(tooBig ? `الفيديو أكبر من الحد المسموح (${FREE_PLAN_MAX_MB}MB بالخطة المجانية)` : 'فشل الرفع: ' + (err.message || err), true);
    },
    onSuccess: async () => {
      window.removeEventListener('beforeunload', warnLeave);
      const old = ex.video_path;
      const { error } = await sb.from('exercises').update({ video_path: objectName }).eq('id', ex.id);
      if (error) return fail(error);
      if (old) await sb.storage.from(BUCKET).remove([old]);
      state.program = null;
      toast('انرفع الفيديو ✅'); viewExercises();
    },
  });
  $('[data-cancel]', box).onclick = () => { upload.abort(true); box.hidden = true; window.removeEventListener('beforeunload', warnLeave); };
  upload.findPreviousUploads().then((prev) => { if (prev.length) upload.resumeFromPreviousUpload(prev[0]); upload.start(); });
}
function warnLeave(e) { e.preventDefault(); e.returnValue = ''; }

/* ---------- coach: programs ---------- */
async function viewPrograms(openId) {
  const [{ data: programs, error }, exs] = await Promise.all([
    sb.from('programs').select('id,name,description,created_at').order('created_at'),
    allExercises(),
  ]);
  if (error) return fail(error);
  const current = openId || programs[0]?.id;
  const prog = current ? await loadProgram(current) : null;

  app.innerHTML = `
    <div class="row between"><h1>الجداول</h1><button class="btn sm" id="newProg">+ جدول جديد</button></div>
    <div class="row" style="margin:8px 0 16px">${programs.map((p) => `<a class="btn sm ${p.id === current ? '' : 'ghost'}" href="#/coach/programs/${p.id}">${esc(p.name)}</a>`).join('')}</div>
    ${prog ? `
    <form class="card stack" id="progF">
      <label class="field"><span>اسم الجدول</span><input name="name" value="${esc(prog.name)}" required /></label>
      <label class="field"><span>شرح الجدول (بيشوفه المتدرب)</span><textarea name="description" rows="4">${esc(prog.description || '')}</textarea></label>
      <div class="row"><button class="btn sm">حفظ</button><button type="button" class="btn ghost sm" id="dupProg">نسخ الجدول</button><button type="button" class="btn danger sm" id="delProg" style="margin-inline-start:auto">حذف الجدول</button></div>
    </form>
    ${prog.program_days.map((d) => `
      <div class="card" data-day="${d.id}">
        <div class="day-head">
          <input data-dayname value="${esc(d.name)}" style="font-weight:700" aria-label="اسم اليوم" />
          <a class="btn ghost sm" href="#/day/${d.id}">معاينة</a>
          <button class="icon-btn" data-delday title="حذف اليوم" aria-label="حذف اليوم">🗑</button>
        </div>
        <input data-daynotes value="${esc(d.notes || '')}" placeholder="ملاحظة لليوم (اختياري)" style="margin-top:8px" />
        <div style="margin-top:10px">
          ${d.program_exercises.map((pe, i) => `
            <div class="pe-row" data-pe="${pe.id}">
              <span class="nm">${esc(pe.exercise.name)}</span>
              <label><small>جولات</small><input type="number" min="1" max="10" data-f="sets" value="${pe.sets}" /></label>
              <label><small>عدّات</small><input data-f="reps" value="${esc(pe.reps)}" /></label>
              <label><small>راحة (ث)</small><input type="number" min="0" step="15" data-f="rest_seconds" value="${pe.rest_seconds ?? ''}" /></label>
              <span class="pe-tools">
                <button class="icon-btn" data-move="-1" ${i === 0 ? 'disabled' : ''} aria-label="لفوق">↑</button>
                <button class="icon-btn" data-move="1" ${i === d.program_exercises.length - 1 ? 'disabled' : ''} aria-label="لتحت">↓</button>
                <button class="icon-btn" data-rmpe aria-label="شيل">✕</button>
              </span>
            </div>`).join('')}
        </div>
        <div class="row" style="margin-top:10px">
          <select data-addsel class="grow" style="width:auto"><option value="">+ زيد تمرين لهاليوم…</option>${exs.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>
        </div>
      </div>`).join('')}
    <button class="btn soft block" id="addDay" style="margin-top:12px">+ زيد يوم</button>` : '<div class="card muted">ما في جداول. اعمل جدول جديد.</div>'}`;

  $('#newProg').onclick = async () => {
    const name = prompt('اسم الجدول الجديد'); if (!name) return;
    const { data, error: e } = await sb.from('programs').insert({ name }).select().single();
    if (e) return fail(e);
    location.hash = `#/coach/programs/${data.id}`;
  };
  if (!prog) return;
  const reload = () => { state.program = null; viewPrograms(prog.id); };

  $('#progF').onsubmit = async (e) => {
    e.preventDefault();
    const { error: er } = await sb.from('programs').update(Object.fromEntries(new FormData(e.target))).eq('id', prog.id);
    if (er) return fail(er);
    toast('انحفظ ✅'); reload();
  };
  $('#delProg').onclick = async () => {
    if (!confirm(`تحذف "${prog.name}"؟ المتدربين المعيّنين عليه بيصيروا بدون جدول. سجلّاتهم بتضل.`)) return;
    const { error: er } = await sb.from('programs').delete().eq('id', prog.id);
    if (er) return fail(er);
    state.program = null; location.hash = '#/coach/programs';
  };
  $('#dupProg').onclick = async () => {
    const { data: np, error: er } = await sb.from('programs').insert({ name: prog.name + ' (نسخة)', description: prog.description }).select().single();
    if (er) return fail(er);
    for (const d of prog.program_days) {
      const { data: nd, error: e2 } = await sb.from('program_days').insert({ program_id: np.id, day_order: d.day_order, name: d.name, notes: d.notes }).select().single();
      if (e2) return fail(e2);
      if (d.program_exercises.length) {
        const { error: e3 } = await sb.from('program_exercises').insert(d.program_exercises.map((pe) => ({ day_id: nd.id, exercise_id: pe.exercise.id, position: pe.position, sets: pe.sets, reps: pe.reps, rest_seconds: pe.rest_seconds, notes: pe.notes })));
        if (e3) return fail(e3);
      }
    }
    toast('انعملت نسخة ✅'); location.hash = `#/coach/programs/${np.id}`;
  };
  $('#addDay').onclick = async () => {
    const order = (prog.program_days.at(-1)?.day_order || 0) + 1;
    const { error: er } = await sb.from('program_days').insert({ program_id: prog.id, day_order: order, name: `اليوم ${order}` });
    if (er) return fail(er);
    reload();
  };

  app.onchange = async (e) => {
    const dayEl = e.target.closest('[data-day]'); if (!dayEl) return;
    const dayId = dayEl.dataset.day;
    let q;
    if (e.target.matches('[data-dayname]')) q = sb.from('program_days').update({ name: e.target.value }).eq('id', dayId);
    else if (e.target.matches('[data-daynotes]')) q = sb.from('program_days').update({ notes: e.target.value || null }).eq('id', dayId);
    else if (e.target.matches('[data-addsel]') && e.target.value) {
      const day = prog.program_days.find((d) => d.id === dayId);
      const pos = (day.program_exercises.at(-1)?.position || 0) + 1;
      const { error: er } = await sb.from('program_exercises').insert({ day_id: dayId, exercise_id: e.target.value, position: pos, sets: 1, reps: 'للفشل العضلي', rest_seconds: 120 });
      if (er) return fail(er);
      return reload();
    } else if (e.target.dataset.f) {
      const peId = e.target.closest('[data-pe]').dataset.pe;
      let v = e.target.value;
      if (e.target.dataset.f !== 'reps') v = v === '' ? null : parseInt(v, 10);
      if (e.target.dataset.f === 'sets' && !(v >= 1)) return toast('عدد الجولات لازم يكون 1 أو أكتر', true);
      q = sb.from('program_exercises').update({ [e.target.dataset.f]: v }).eq('id', peId);
    }
    if (!q) return;
    const { error: er } = await q;
    if (er) return fail(er);
    state.program = null; toast('انحفظ ✅');
  };
  app.onclick = async (e) => {
    const dayEl = e.target.closest('[data-day]'); if (!dayEl) return;
    const day = prog.program_days.find((d) => d.id === dayEl.dataset.day);
    if (e.target.closest('[data-delday]')) {
      if (!confirm(`تحذف "${day.name}"؟`)) return;
      const { error: er } = await sb.from('program_days').delete().eq('id', day.id);
      if (er) return fail(er);
      return reload();
    }
    const peEl = e.target.closest('[data-pe]'); if (!peEl) return;
    const idx = day.program_exercises.findIndex((p) => p.id === peEl.dataset.pe);
    if (e.target.closest('[data-rmpe]')) {
      const { error: er } = await sb.from('program_exercises').delete().eq('id', peEl.dataset.pe);
      if (er) return fail(er);
      return reload();
    }
    const mv = e.target.closest('[data-move]');
    if (mv) {
      const j = idx + +mv.dataset.move;
      const a = day.program_exercises[idx], b = day.program_exercises[j];
      if (!b) return;
      const r1 = await sb.from('program_exercises').update({ position: b.position }).eq('id', a.id);
      const r2 = await sb.from('program_exercises').update({ position: a.position === b.position ? b.position + 1 : a.position }).eq('id', b.id);
      if (r1.error || r2.error) return fail(r1.error || r2.error);
      reload();
    }
  };
}

/* ---------- coach: trainees ---------- */
async function viewTrainees() {
  const [{ data: people, error }, { data: programs }, { data: recent }] = await Promise.all([
    sb.from('profiles').select('*').order('created_at'),
    sb.from('programs').select('id,name').order('created_at'),
    sb.from('workout_logs').select('trainee_id,performed_on').order('performed_on', { ascending: false }).limit(500),
  ]);
  if (error) return fail(error);
  const lastBy = {}; const countBy = {};
  recent.forEach((l) => { lastBy[l.trainee_id] ||= l.performed_on; countBy[l.trainee_id] = (countBy[l.trainee_id] || 0) + 1; });
  const progOpts = (sel) => `<option value="">— بدون جدول —</option>` + programs.map((p) => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.name)}</option>`).join('');

  app.innerHTML = `
    <h1>المتدربين</h1>
    <div id="creds"></div>
    <form class="card stack" id="invite">
      <h3>إضافة متدرب جديد</h3>
      <p class="small muted" style="margin:0">بنعمله حساب بكلمة سر، وبتبعتله معلومات الدخول عالواتساب بكبسة.</p>
      <div class="form-grid">
        <label class="field"><span>الاسم</span><input name="full_name" required /></label>
        <label class="field"><span>الإيميل</span><input type="email" name="email" required dir="ltr" /></label>
        <label class="field"><span>الجدول</span><select name="program_id">${progOpts(programs[0]?.id)}</select></label>
      </div>
      <button class="btn">اعمل الحساب</button>
    </form>
    ${people.map((p) => `
      <div class="card" data-id="${p.id}">
        <div class="row between">
          <div><b>${esc(p.full_name || p.email)}</b> ${p.role === 'coach' ? '<span class="pill gold">مدرب</span>' : ''}
            <div class="small muted" dir="ltr" style="text-align:right">${esc(p.email || '')}</div></div>
          <a class="btn ghost sm" href="#/coach/trainee/${p.id}">التقدّم ←</a>
        </div>
        <div class="row small muted" style="margin-top:6px">
          <span>آخر حصة: ${lastBy[p.id] ? fmtShort(lastBy[p.id]) : '—'}</span><span>·</span><span>${countBy[p.id] || 0} حصة</span>
        </div>
        <div class="form-grid" style="margin-top:10px">
          <label class="field"><span>الجدول</span><select data-assign>${progOpts(p.program_id)}</select></label>
          <label class="field"><span>الاسم</span><input data-name value="${esc(p.full_name || '')}" /></label>
        </div>
        ${p.role === 'coach' ? '' : '<button class="btn ghost sm" data-resetpw style="margin-top:10px">كلمة سر جديدة</button>'}
      </div>`).join('')}`;

  const manage = async (body) => {
    const { data, error: er } = await sb.functions.invoke('manage-trainee', { body });
    if (!er) return data;
    let msg = er.message;
    try { msg = (await er.context.json()).error || msg; } catch {}
    throw new Error(msg === 'email already registered' ? 'هالإيميل إله حساب من قبل' : msg);
  };
  const showCreds = (name, email, password) => {
    const msg = `أهلاً ${name} 💪\nهاد حسابك على موقع التمارين:\n${PAGE_URL}\nالإيميل: ${email}\nكلمة السر: ${password}\n(فيك تغيّرها من "حسابي" بعد ما تدخل)`;
    $('#creds').innerHTML = `<div class="card stack" style="border-color:var(--accent);margin-bottom:12px">
      <h3>معلومات الدخول لـ${esc(name)} ✅</h3>
      <div class="small">الإيميل: <b dir="ltr">${esc(email)}</b><br>كلمة السر: <b dir="ltr" class="num">${esc(password)}</b></div>
      <p class="small muted" style="margin:0">انسخها هلق، كلمة السر ما رح تنعرض مرة تانية.</p>
      <div class="row">
        <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">ابعت عالواتساب</a>
        <button class="btn ghost" id="copyCreds">نسخ</button>
      </div></div>`;
    $('#copyCreds').onclick = () => navigator.clipboard.writeText(msg).then(() => toast('انتسخ ✅'), () => toast('ما زبط النسخ', true));
    $('#creds').scrollIntoView({ behavior: 'smooth' });
  };
  $('#invite').onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    const password = newPassword();
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try {
      await manage({ action: 'create', ...body, password });
      await viewTrainees();
      showCreds(body.full_name, body.email.trim().toLowerCase(), password);
    } catch (err) { fail(err); btn.disabled = false; }
  };
  app.onclick = async (e) => {
    const b = e.target.closest('[data-resetpw]'); if (!b) return;
    const p = people.find((x) => x.id === b.closest('[data-id]').dataset.id);
    if (!confirm(`تعطي ${p.full_name || p.email} كلمة سر جديدة؟ القديمة بتبطل تشتغل.`)) return;
    const password = newPassword();
    b.disabled = true;
    try { await manage({ action: 'reset_password', user_id: p.id, password }); showCreds(p.full_name || '', p.email, password); }
    catch (err) { fail(err); }
    b.disabled = false;
  };
  app.onchange = async (e) => {
    const card = e.target.closest('[data-id]'); if (!card) return;
    let patch;
    if (e.target.matches('[data-assign]')) patch = { program_id: e.target.value || null };
    else if (e.target.matches('[data-name]')) patch = { full_name: e.target.value || null };
    if (!patch) return;
    const { error: er } = await sb.from('profiles').update(patch).eq('id', card.dataset.id);
    if (er) return fail(er);
    if (card.dataset.id === uid()) { Object.assign(state.profile, patch); state.program = null; }
    toast('انحفظ ✅');
  };
}

/* ---------- router ---------- */
async function route() {
  stopTimer();
  app.onclick = null; app.onchange = null; app.oninput = null; // drop the previous view's handlers
  const h = location.hash.replace(/^#/, '') || '/';
  if (!state.session) { renderNav(); return viewLogin(); }
  if (!state.profile) await loadProfile();
  renderNav();
  if (!state.profile) return viewNoProfile();
  window.scrollTo(0, 0);
  try {
    let m;
    if (h === '/' || h === '/login') return await viewHome();
    if ((m = h.match(/^\/day\/([\w-]+)/))) return await viewDay(m[1]);
    if (h === '/progress') return await viewProgress();
    if (h === '/account') return viewAccount();
    if (isCoach()) {
      if (h === '/coach/exercises') return await viewExercises();
      if ((m = h.match(/^\/coach\/programs(?:\/([\w-]+))?/))) return await viewPrograms(m[1]);
      if (h === '/coach/trainees') return await viewTrainees();
      if ((m = h.match(/^\/coach\/trainee\/([\w-]+)/))) return await viewProgress(m[1]);
    }
    location.hash = '#/';
  } catch (err) {
    fail(err);
    app.innerHTML = '<p class="center pad muted">صار خطأ بالتحميل. <a href="javascript:location.reload()">جرّب مرة تانية</a></p>';
  }
}
window.addEventListener('hashchange', route);
sb.auth.onAuthStateChange((event, session) => {
  const had = !!state.session;
  state.session = session;
  if (event === 'SIGNED_OUT') { Object.assign(state, { profile: null, program: null, logs: null, exercises: null }); }
  if (event === 'SIGNED_IN' && !had) setTimeout(route, 0);
});
const { data: { session } } = await sb.auth.getSession();
state.session = session;
if (!/^#\//.test(location.hash)) history.replaceState(null, '', PAGE_URL + '#/');
route();
