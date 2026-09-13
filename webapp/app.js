window.ME_API = window.location.origin;
/* ================= state ================= */
const state = {
  meds: [],
  bloodTests: [],
  scans: [],
  visits: [],
  chatContextEvents: []
};
let pendingVisit = {};
const visitQuestions = [
  { key: 'doctorType', q: 'У какого врача ты был?' },
  { key: 'notes', q: 'Что сказал врач?' },
  { key: 'prescribed', q: 'Что он тебе назначил?' },
  { key: 'labs', q: 'Нужно ли сдать анализы?' },
  { key: 'followUp', q: 'Когда нужно прийти снова?' }
];
let visitQIndex = 0;

/* ================= API helper ================= */
function meInitData(){
  var tg = window.Telegram && window.Telegram.WebApp;
  return (tg && tg.initData) || '';
}
/* все запросы к backend: initData уходит в заголовке X-Init-Data, не в теле/URL */
async function apiFetch(path, opts){
  opts = opts || {};
  var id = meInitData();
  if (!id) throw new Error('offline');
  var headers = Object.assign({ 'X-Init-Data': id }, opts.headers || {});
  if (opts.body != null) headers['Content-Type'] = 'application/json';
  var r = await fetch((window.ME_API || '') + path, {
    method: opts.method || 'GET',
    headers: headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined
  });
  var data = null; try { data = await r.json(); } catch(e){}
  if (!r.ok || (data && data.error)) {
    var err = new Error((data && data.error) || ('HTTP ' + r.status));
    err.status = r.status; throw err;
  }
  return data || {};
}
async function claudeMessage(content, maxTokens, system){
  var data = await apiFetch('/api/llm', { method:'POST', body:{ content: content, maxTokens: maxTokens || 700, system: system } });
  return (data.text || '').trim();
}
/* сообщить владельцу о сбое распознавания (fire-and-forget) */
function reportFail(kind, detail){
  try {
    apiFetch('/api/report', { method:'POST', body:{ kind: kind, detail: String(detail && detail.message || detail || '').slice(0, 400) } }).catch(function(){});
  } catch(e){}
}

/* экранирование для вставки строк ИИ/данных в innerHTML */
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}
function stripFence(t){ return t.replace(/^```json/i,'').replace(/^```/,'').replace(/```$/,'').trim(); }

/* терпимый парсер: модель иногда добавляет текст до/после JSON или оборачивает объектом */
function parseJSONLoose(raw){
  var t = stripFence(String(raw || ''));
  try { return JSON.parse(t); } catch(e){}
  var a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a !== -1 && b > a){ try { return JSON.parse(t.slice(a, b+1)); } catch(e){} }
  var c = t.indexOf('{'), d = t.lastIndexOf('}');
  if (c !== -1 && d > c){ try { return JSON.parse(t.slice(c, d+1)); } catch(e){} }
  throw new Error('bad json');
}
/* достаёт массив препаратов из ответа любой формы */
function pickMeds(parsed){
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.meds)) return parsed.meds;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

/* файл (фото или PDF) -> массив image-частей для claudeMessage. PDF рендерим через pdf.js. */
var PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadScriptOnce(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=function(){ rej(new Error('script '+src)); }; document.head.appendChild(s); }); }
async function pdfToImageParts(file, maxPages){
  if (!window.pdfjsLib){ await loadScriptOnce(PDFJS_BASE+'pdf.min.js'); window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_BASE+'pdf.worker.min.js'; }
  var buf = await file.arrayBuffer();
  var pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  var n = Math.min(pdf.numPages, maxPages || 8);
  var parts = [];
  for (var i=1; i<=n; i++){
    var page = await pdf.getPage(i);
    var vp = page.getViewport({ scale: 2.6 });
    var c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    parts.push({ type:'image', source:{ type:'base64', media_type:'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] } });
  }
  return parts;
}
/* фото телефона -> JPEG, ужатый до maxDim. Решает HEIC (iPhone) и гигантские снимки. */
async function imageToJpegPart(file, maxDim){
  maxDim = maxDim || 1800;
  var url = URL.createObjectURL(file);
  try {
    var img = await new Promise(function(res, rej){
      var i = new Image();
      i.onload = function(){ res(i); };
      i.onerror = function(){ rej(new Error('image decode failed')); };
      i.src = url;
    });
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('empty image');
    var s = Math.min(1, maxDim / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { type:'image', source:{ type:'base64', media_type:'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] } };
  } finally {
    URL.revokeObjectURL(url);
  }
}
/* согласие на обработку данных о здоровье — один раз, перед первой загрузкой документа */
function hasPdConsent(){ try { return localStorage.getItem('me_pd_consent') === '1'; } catch(e){ return false; } }
function requirePdConsent(){
  return new Promise(function(resolve, reject){
    if (hasPdConsent()) return resolve();
    var ov = document.createElement('div');
    ov.className = 'pd-consent-ov';
    ov.innerHTML =
      '<div class="pd-consent">' +
      '<h3>Согласие на обработку данных о здоровье</h3>' +
      '<p>Загружаемый документ и распознанный из него текст — это данные о вашем здоровье. Для распознавания и объяснения они отправляются сервису искусственного интеллекта (Google, Groq или OpenRouter), в том числе за пределы РФ, и сохраняются в вашем профиле до удаления вами.</p>' +
      '<label class="pd-check"><input type="checkbox" id="pdChk"> <span>Это мои данные или у меня есть согласие их владельца. Я даю <a href="privacy.html" target="_blank" rel="noopener">согласие на обработку</a> на условиях <a href="terms.html" target="_blank" rel="noopener">Условий использования</a>.</span></label>' +
      '<button class="cta accent" id="pdOk" disabled>Продолжить</button>' +
      '<button class="cta secondary" id="pdCancel" style="margin-top:8px;">Отмена</button>' +
      '</div>';
    document.body.appendChild(ov);
    var chk = ov.querySelector('#pdChk'), ok = ov.querySelector('#pdOk');
    chk.addEventListener('change', function(){ ok.disabled = !chk.checked; });
    ok.addEventListener('click', function(){
      try { localStorage.setItem('me_pd_consent', '1'); } catch(e){}
      ov.remove(); resolve();
    });
    ov.querySelector('#pdCancel').addEventListener('click', function(){ ov.remove(); reject(new Error('consent declined')); });
  });
}

async function fileToImageParts(file){
  await requirePdConsent();
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) return pdfToImageParts(file, 8);
  try {
    return [ await imageToJpegPart(file) ];
  } catch (e) {
    // запасной путь: как есть (но HEIC модели не примут — лучше чем ничего)
    var b64 = await new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ res(String(r.result).split(',')[1]); }; r.onerror = rej; r.readAsDataURL(file); });
    return [{ type:'image', source:{ type:'base64', media_type: /heic|heif/i.test(file.type) ? 'image/jpeg' : (file.type || 'image/jpeg'), data: b64 } }];
  }
}

function baseHealthContext(){
  var tgu = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || {};
  var nm = (tgu.first_name || '').trim();
  let ctx = (nm ? 'Пользователя зовут ' + nm + '. ' : '') + `Me — персональный ИИ-помощник по здоровью: помогает понимать анализы, рецепты и визиты к врачу простыми словами.`;
  if (state.bloodTests.length){
    const bt = state.bloodTests[state.bloodTests.length-1];
    ctx += `\n- Последний анализ крови (${bt.date}): ${bt.markersTotal} показателей, ${bt.needsAttention.length} требуют внимания: ${bt.needsAttention.map(m=>m.name+' '+m.from+'→'+m.to).join(', ') || 'нет'}`;
  }
  if (state.visits.length){
    const v = state.visits[state.visits.length-1];
    ctx += `\n- Последний визит к врачу (${v.date}, ${v.doctorType}): ${(v.notes||[]).join('; ')}${v.medication ? '; назначено: '+v.medication : ''}${v.labs ? '; анализы: '+v.labs : ''}${v.followUp ? '; повторно: '+v.followUp : ''}`;
  }
  if (state.scans && state.scans.length){
    const sc = state.scans[state.scans.length-1];
    ctx += `\n- Последнее исследование (${sc.study}${sc.area ? ', '+sc.area : ''}): ${sc.conclusion || ''}${sc.recommendation ? ' Рекомендация: '+sc.recommendation : ''}`;
  }
  if (state.meds.length){
    ctx += `\n- Текущие лекарства: ${state.meds.map(function(m){
      var a = (typeof activeStage === 'function') ? activeStage(m, todayISO()) : null;
      var st = a ? a.stage : (m.stages && m.stages[0]);
      return m.name + (st && st.dose ? ' ' + st.dose : '');
    }).join(', ')}`;
  }
  return ctx;
}

/* ================= root navigation ================= */
var askReturn = 'today';   // section to keep behind the Ask panel
function openAsk(){
  var p = document.getElementById('screen-ask');
  p.classList.add('active');
  document.getElementById('askScrim').classList.add('show');
  document.getElementById('chatInputBar').style.display = 'flex';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.nav === 'ask'));
  if (window.fnSync) window.fnSync('ask');
  setTimeout(function(){ if (typeof fitAskPanel === 'function') fitAskPanel(); }, 30);
}
function closeAsk(){
  document.getElementById('screen-ask').classList.remove('active');
  document.getElementById('askScrim').classList.remove('show');
  document.getElementById('chatInputBar').style.display = 'none';
}
(function(){ var s = document.getElementById('askScrim'); if (s) s.addEventListener('click', function(){ goTo(askReturn); }); })();
function goTo(name){
  if (name === 'ask'){ openAsk(); return; }     // lightweight panel, keep current section + tab bar
  closeAsk();
  askReturn = name;
  document.querySelectorAll('.screen').forEach(s => { if (s.id !== 'screen-ask') s.classList.remove('active'); });
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.nav === name));
  document.getElementById('tabbar').style.display = 'flex';
  if (window.fnSync) window.fnSync(name);
  // hide any lingering toast when switching screens
  if (typeof toastTimer !== 'undefined' && toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  const toast = document.getElementById('toast');
  if (toast) toast.classList.remove('show');
  if (name === 'today' && typeof refreshStatusCards === 'function') refreshStatusCards();
}
document.querySelectorAll('[data-nav]').forEach(function(el) {
  el.addEventListener('click', function() { goTo(el.dataset.nav); });
});
var todayUploadBloodEl = document.getElementById('todayUploadBlood');
if (todayUploadBloodEl) todayUploadBloodEl.addEventListener('click', function() {
  goTo('health'); renderBloodTestsList(); openDetail('detail-bloodtests');
});
var todayOpenHealthEl = document.getElementById('todayOpenHealth');
if (todayOpenHealthEl) todayOpenHealthEl.addEventListener('click', function() {
  if (typeof processInbox === 'function') processInbox({ notify: true });
});

var askBackBtnEl = document.getElementById('askBackBtn');
if (askBackBtnEl) askBackBtnEl.addEventListener('click', function() { goTo('today'); });

/* ================= onboarding (early — must not depend on later code) ================= */
var obStep = 0;
var obSteps = document.querySelectorAll('.ob-step');
var obDots = document.querySelectorAll('.ob-dot');
var obNextBtn = document.getElementById('obNext');
/* анимация появления главного экрана — каждый вход */
function playTodayIntro(delay){
  var today = document.getElementById('screen-today');
  if (!today) return;
  setTimeout(function(){ today.classList.add('intro'); }, delay || 60);
  setTimeout(function(){ today.classList.remove('intro'); }, (delay || 60) + 1700);
}

/* сброс после /restart confirm — чистим локальные флаги, показываем онбординг */
try {
  var _sp = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.start_param) || '';
  if (/(^|[?&])fresh=1/.test(location.search) || _sp === 'fresh' || _sp === '1') {
    ['me_ob_done','me_showInjury'].forEach(function(k){ try { localStorage.removeItem(k); } catch(e){} });
  }
} catch(e){}

/* онбординг только при первом входе */
try {
  if (localStorage.getItem('me_ob_done')) {
    var obEl = document.getElementById('onboarding');
    if (obEl) obEl.style.display = 'none';
    playTodayIntro(80);
  }
} catch(e){}
if (obNextBtn) {
  obNextBtn.addEventListener('click', function() {
    if (obStep < obSteps.length - 1){
      obSteps[obStep].classList.remove('active');
      if (obDots[obStep]) obDots[obStep].classList.remove('active');
      obStep++;
      obSteps[obStep].classList.add('active');
      if (obDots[obStep]) obDots[obStep].classList.add('active');
      obNextBtn.textContent = obStep === obSteps.length - 1 ? 'Начать' : 'Продолжить';
    } else {
      try { localStorage.setItem('me_ob_done', '1'); } catch(e){}
      var ob = document.getElementById('onboarding');
      var today = document.getElementById('screen-today');
      if (ob){
        ob.classList.add('leaving');
        setTimeout(function(){ ob.style.display = 'none'; }, 460);
      }
      if (today) playTodayIntro(120);
    }
  });
}

/* ================= Main screen status cards ================= */
function updateGreeting(){
  const h = new Date().getHours();
  let greet = 'Доброе утро';
  if (h >= 12 && h < 17) greet = 'Добрый день';
  else if (h >= 17) greet = 'Добрый вечер';
  const el = document.getElementById('greetLine');
  var tgu = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || null;
  var nm = tgu && tgu.first_name ? tgu.first_name.trim() : '';
  if (el) el.textContent = nm ? (greet + ', ' + nm) : greet;
}

function currentHHMM(){
  var d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

function refreshStatusCards(){
  updateGreeting();
  // Card 1: Кровь и биохимия
  var bloodMain = document.getElementById('cardBloodMain');
  var bloodSub = document.getElementById('cardBloodSub');
  var bloodCard = document.getElementById('cardBlood');
  if (bloodMain && bloodSub) {
    bloodCard.classList.toggle('is-empty', !state.bloodTests.length);
    if (state.bloodTests.length){
      var bt = state.bloodTests[state.bloodTests.length - 1];
      var att = bt.needsAttention || [];
      if (att.length === 0){
        bloodMain.textContent = 'Все показатели в норме';
        bloodSub.textContent = bt.date;
      } else if (att.length === 1){
        var m = att[0];
        var arrow = m.flag === 'high' ? ' ↑' : (m.flag === 'low' ? ' ↓' : '');
        bloodMain.innerHTML = esc(m.name) + '<span class="trend" style="color:var(--accent)">' + arrow + '</span>';
        bloodSub.textContent = m.to;
      } else {
        bloodMain.textContent = att.length + ' отклонения';
        bloodSub.textContent = bt.date;
      }
    } else {
      bloodMain.textContent = 'Добавить';
      bloodSub.textContent = '';
    }
  }

  // Card 3: Приём лекарств
  var medsMain = document.getElementById('cardMedsMain');
  var medsSub = document.getElementById('cardMedsSub');
  var medsCard = document.getElementById('cardMeds');
  if (medsMain && medsSub) {
    medsCard.classList.toggle('is-empty', !state.meds.length);
    if (state.meds.length){
      var doses = (typeof todayDoses === 'function') ? todayDoses() : [];
      var now = currentHHMM();
      var taken = doses.filter(function(d){ return d.taken; }).length;
      var total = doses.length;
      var next = null;
      doses.forEach(function(d){ if (!d.taken && (!next || d.time < next.time)) next = d; });
      var clockSvg = '<span class="sc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg></span>';
      if (!total){
        medsMain.textContent = 'Курс идёт';
        medsSub.textContent = state.meds.length + ' препарат(ов)';
      } else if (next) {
        medsMain.innerHTML = clockSvg + esc(next.time + " — " + next.name);
        medsSub.textContent = 'Принято: ' + taken + ' из ' + total;
      } else {
        medsMain.textContent = 'На сегодня всё принято';
        medsSub.textContent = 'Принято: ' + taken + ' из ' + total;
      }
      medsSub.classList.add('muted');
    } else {
      medsMain.textContent = 'Добавить';
      medsSub.textContent = '';
      medsSub.classList.add('muted');
    }
  }
}

function periodLabel(key){
  var map = {
    every_day: 'Каждый день',
    every_other: 'Через день',
    every_2: 'Раз в 2 дня',
    every_3: 'Раз в 3 дня'
  };
  return map[key] || 'Каждый день';
}

/* Injury card: reversible hide (long-press → X), restore from Profile toggle */
function safeGetPref(key, fallback){
  try {
    var v = localStorage.getItem(key);
    if (v === null || v === undefined) return fallback;
    return v;
  } catch (err) { return fallback; }
}
function safeSetPref(key, value){
  try { localStorage.setItem(key, value); } catch (err) {}
}

var prefs = {
  showInjuryCard: safeGetPref('me_showInjury', '0') === '1'
};

function syncInjuryGridLayout(){
  var grid = document.getElementById('statusGrid');
  if (!grid) return;
  if (prefs.showInjuryCard) grid.classList.remove('injury-gone');
  else grid.classList.add('injury-gone');
}

function applyInjuryCardVisibility(){
  var card = document.getElementById('cardInjury');
  var toggle = document.getElementById('toggleInjuryCard');
  if (!card) return;
  if (prefs.showInjuryCard) {
    card.classList.remove('is-hidden');
    card.style.opacity = '';
    card.style.transform = '';
  } else {
    card.classList.add('is-hidden');
  }
  syncInjuryGridLayout();
  if (toggle) toggle.checked = prefs.showInjuryCard;
}

function setInjuryCardVisible(visible){
  prefs.showInjuryCard = !!visible;
  safeSetPref('me_showInjury', visible ? '1' : '0');
  var card = document.getElementById('cardInjury');
  var meds = document.getElementById('cardMeds');
  var ask = document.getElementById('cardAsk');
  var grid = document.getElementById('statusGrid');
  if (!card || !grid) return;

  var easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
  var duration = 600;

  // FLIP: capture first positions
  var first = {};
  if (meds) first.meds = meds.getBoundingClientRect();
  if (ask) first.ask = ask.getBoundingClientRect();
  first.injury = card.getBoundingClientRect();

  card.classList.remove('show-close');

  if (visible) {
    card.classList.remove('is-hidden');
    card.style.visibility = '';
    card.style.position = '';
    card.style.width = '';
    card.style.height = '';
    card.style.opacity = '0';
    grid.classList.remove('injury-gone');
  } else {
    card.style.transition = 'opacity 0.35s ease, transform 0.5s ' + easing;
    card.style.opacity = '0';
    card.style.transform = 'scale(0.94)';
    // apply layout after short fade start
    grid.classList.add('injury-gone');
    card.classList.add('is-hidden');
  }

  // Force layout
  void grid.offsetWidth;

  // Last positions
  var last = {};
  if (meds) last.meds = meds.getBoundingClientRect();
  if (ask) last.ask = ask.getBoundingClientRect();

  function flipEl(el, f, l){
    if (!el || !f || !l) return;
    var dx = f.left - l.left;
    var dy = f.top - l.top;
    var sx = f.width / (l.width || 1);
    var sy = f.height / (l.height || 1);
    el.style.transition = 'none';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
    el.style.transformOrigin = 'top left';
    void el.offsetWidth;
    el.style.transition = 'transform ' + duration + 'ms ' + easing;
    el.style.transform = 'translate(0,0) scale(1,1)';
    setTimeout(function(){
      el.style.transition = '';
      el.style.transform = '';
      el.style.transformOrigin = '';
    }, duration + 40);
  }

  if (meds) flipEl(meds, first.meds, last.meds);
  if (ask) flipEl(ask, first.ask, last.ask);

  if (visible) {
    requestAnimationFrame(function(){
      card.style.transition = 'opacity 0.45s ease, transform 0.55s ' + easing;
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
      setTimeout(function(){
        card.style.transition = '';
        card.style.transform = '';
        card.style.opacity = '';
      }, 560);
    });
  }

  var toggle = document.getElementById('toggleInjuryCard');
  if (toggle) toggle.checked = prefs.showInjuryCard;
}

(function setupInjuryLongPress(){
  var card = document.getElementById('cardInjury');
  var closeBtn = document.getElementById('injuryClose');
  if (!card || !closeBtn) return;
  var pressTimer = null;
  var start = function(e) {
    if (e.target === closeBtn) return;
    pressTimer = setTimeout(function(){
      card.classList.add('show-close');
    }, 520);
  };
  var cancel = function() { clearTimeout(pressTimer); };
  card.addEventListener('touchstart', start, { passive: true });
  card.addEventListener('mousedown', start);
  card.addEventListener('touchend', cancel);
  card.addEventListener('mouseup', cancel);
  card.addEventListener('mouseleave', cancel);
  card.addEventListener('touchmove', cancel);
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    setInjuryCardVisible(false);
  });
  document.addEventListener('click', function(e) {
    if (!card.contains(e.target)) card.classList.remove('show-close');
  });
  applyInjuryCardVisibility();
})();

// Card clicks
var cardBloodEl = document.getElementById('cardBlood');
if (cardBloodEl) {
  cardBloodEl.addEventListener('click', function() {
    goTo('health');
    renderBloodTestsList();
    openDetail('detail-bloodtests');
  });
}
var cardMedsEl = document.getElementById('cardMeds');
if (cardMedsEl) cardMedsEl.addEventListener('click', function() { goTo('meds'); });
var cardInjuryEl = document.getElementById('cardInjury');
if (cardInjuryEl) cardInjuryEl.addEventListener('click', function(e) {
  if (e.target.closest('.sc-close')) return;
  goTo('health');
  if (state.scans.length){ renderScansList(); openDetail('detail-scans'); openScanResult(state.scans[state.scans.length-1].id); }
  else { renderScansList(); openDetail('detail-scans'); }
});
var cardAskEl = document.getElementById('cardAsk');
if (cardAskEl) cardAskEl.addEventListener('click', function() { goTo('ask'); });

// Profile: restore injury card
var toggleInjuryEl = document.getElementById('toggleInjuryCard');
if (toggleInjuryEl) {
  toggleInjuryEl.addEventListener('change', function(e) {
    setInjuryCardVisible(e.target.checked);
  });
}

var eraseAllBtn = document.getElementById('eraseAllBtn');
if (eraseAllBtn) eraseAllBtn.addEventListener('click', function(){
  openSheet(
    '<p class="sheet-title">Стереть все данные?</p>' +
    '<p class="sheet-sub">Безвозвратно удалятся анализы, снимки, расписание лекарств и напоминания — и на сервере, и на устройстве.</p>' +
    '<button class="cta accent" id="eraseYes" style="background:var(--bad);">Да, стереть всё</button>' +
    '<button class="cta secondary" id="eraseNo" style="margin-top:8px;">Отмена</button>'
  );
  var yes = document.getElementById('eraseYes'), no = document.getElementById('eraseNo');
  if (no) no.addEventListener('click', closeSheet);
  if (yes) yes.addEventListener('click', async function(){
    yes.disabled = true; yes.textContent = 'Удаляю…';
    try {
      if (window.__meErase) await window.__meErase();
    } catch(e){
      // сервер не подтвердил удаление — не притворяемся, что стёрли, если это не так
      yes.disabled = false; yes.textContent = 'Стереть';
      if (typeof showToast === 'function') showToast('Не получилось удалить — проверьте связь и попробуйте ещё раз');
      return;
    }
    try { ['me_ob_done','me_showInjury','me_pd_consent','me_inbox_tries'].forEach(function(k){ localStorage.removeItem(k); }); } catch(e){}
    state.bloodTests = []; state.scans = []; state.meds = []; state.visits = [];
    closeSheet();
    if (typeof showToast === 'function') showToast('Все данные удалены');
    setTimeout(function(){ location.reload(); }, 600);
  });
});

// Initial paint
updateGreeting();
refreshStatusCards();
applyInjuryCardVisibility();
if (typeof refreshInjuryCard === 'function') refreshInjuryCard();

/* ================= detail layer (push/back) ================= */
function openDetail(id){
  var layer = document.getElementById('detailLayer');
  var el = document.getElementById(id);
  if (layer) layer.style.pointerEvents = 'auto';
  if (el) el.classList.add('active');
}
function closeDetail(id){
  var el = document.getElementById(id);
  if (el) el.classList.remove('active');
  var layer = document.getElementById('detailLayer');
  if (layer && !document.querySelector('.detail-screen.active')) {
    layer.style.pointerEvents = '';
  }
}
document.querySelectorAll('[data-close]').forEach(function(btn){
  btn.addEventListener('click', function(){ closeDetail(btn.getAttribute('data-close')); });
});

/* ================= timeline ================= */
function renderTimeline(){
  const items = [];
  state.visits.forEach(v => items.push({ date:v.date, title:'Приём врача', sub:v.doctorType, action:() => openVisitResult(v.id) }));
  state.bloodTests.forEach(b => items.push({ date:b.date, title:'Анализ крови', sub:`${b.changed} изменились`, action:() => openBloodResult(b.id) }));
  state.meds.forEach(m => items.push({ date:'СЕЙЧАС', title:'Новый рецепт', sub:m.name, action:() => goTo('meds') }));
  const list = document.getElementById('timelineList');
  const section = document.getElementById('timelineSection');
  const hint = document.getElementById('healthHint');
  if (!items.length){
    list.innerHTML = '';
    if (section) section.style.display = 'none';
    if (hint) hint.style.display = '';
    return;
  }
  if (section) section.style.display = '';
  if (hint) hint.style.display = 'none';
  list.innerHTML = items.map((t,i) => `
    <div class="timeline-item" data-idx="${i}">
      <div class="t-date">${t.date}</div>
      <div class="t-dot-col"><div class="t-dot"></div>${i < items.length-1 ? '<div class="t-line"></div>' : ''}</div>
      <div class="t-body"><p class="t-title">${esc(t.title)}</p><p class="t-sub">${esc(t.sub)}</p></div>
    </div>`).join('');
  list.querySelectorAll('.timeline-item').forEach((el,i) => { if (items[i].action) el.addEventListener('click', items[i].action); });
}
renderTimeline();

function refreshHealthSubtitles(){
  document.getElementById('bloodTestsSub').textContent = state.bloodTests.length ? `${state.bloodTests.length} анализ(ов) · последний ${state.bloodTests[state.bloodTests.length-1].date}` : 'Добавить анализ';
  document.getElementById('visitsSub').textContent = state.visits.length ? `${state.visits.length} визит(ов) · последний ${state.visits[state.visits.length-1].date}` : 'Добавить визит';
  var ss = document.getElementById('scansSub');
  if (ss) ss.textContent = state.scans.length ? `${state.scans.length} исследование(й)` : 'Загрузить исследование';
  document.getElementById('medsSub').textContent = state.meds.length ? `${state.meds.length} препарат(ов) в расписании` : 'Добавить лекарство';
}
refreshHealthSubtitles();

/* ================= bottom sheet ================= */
const sheetOverlay = document.getElementById('sheetOverlay');
const sheetContent = document.getElementById('sheetContent');
function openSheet(html){ sheetContent.innerHTML = html; sheetOverlay.classList.add('show'); }
function closeSheet(){ sheetOverlay.classList.remove('show'); }
sheetOverlay.addEventListener('click', e => { if (e.target === sheetOverlay) closeSheet(); });

/* ================= BLOOD TESTS ================= */
document.getElementById('rowBloodTests').addEventListener('click', () => { renderBloodTestsList(); openDetail('detail-bloodtests'); });

function renderBloodTestsList(){
  const wrap = document.getElementById('bloodTestsList');
  const label = document.getElementById('bloodListLabel');
  if (!state.bloodTests.length){ wrap.innerHTML = ''; label.style.display = 'none'; return; }
  label.style.display = 'flex';
  wrap.innerHTML = state.bloodTests.slice().reverse().map(b => `
    <div class="row" data-id="${b.id}">
      <div class="r-main"><p class="r-title">${esc(b.date)}</p><p class="r-sub">${b.markersTotal} показателей · ${b.changed} изменились${b.outOfRange ? ' · '+b.outOfRange+' вне нормы' : ''}</p></div>
      <span class="chevron">›</span>
    </div>`).join('');
  wrap.querySelectorAll('.row').forEach(el => el.addEventListener('click', () => openBloodResult(el.dataset.id)));
}

var BLOOD_PROMPT = 'Это результаты анализа крови/биохимии (фото, скан, PDF или почерк, возможно несколько страниц). Распознай все показатели со всех страниц. Верни СТРОГО JSON без markdown, на русском:\n{"date":"дата как ДД МЕС ГГГГ или СЕГОДНЯ","lab":"лаборатория или пусто","markers":[{"name":"короткое понятное название показателя","value":"значение с единицами","ref":"норма с бланка или пусто","flag":"high"|"low"|"normal","plain":"объяснение для человека без медицинского образования"}],"summary":"общий вывод по-человечески"}\n\nОЧЕНЬ ВАЖНО — язык:\n- Пиши так, будто объясняешь другу или бабушке, которые НИЧЕГО не знают про медицину.\n- ЗАПРЕЩЕНО использовать медицинские термины и аббревиатуры (эритроциты, гематокрит, MCHC, MCV, СОЭ, ретикулоциты и т.п.) без объяснения. Если без термина никак — сразу простыми словами в скобках, что это.\n- В "name" давай короткое бытовое название (например: "Красные клетки крови", "Белые клетки крови", "Свёртывание крови", "Гемоглобин (белок, переносящий кислород)"). Не пиши длинные лабораторные формулировки и латинские буквы.\n- В "plain": 1-2 коротких предложения. Что этот показатель показывает + что означает именно это значение. Если отклонение — спокойно объясни, из-за чего так бывает в обычной жизни (питьё, спорт, еда, недосып). НИКАКОЙ паники, НИКАКИХ страшных слов, НЕ пугай, НЕ ставь диагноз.\n- "summary": КОРОТКО, 1 предложение (максимум 2). Спокойно: в целом нормально или что показать врачу. Без терминов, без перечисления всех показателей.\nНе выдумывай показатели, которых нет на изображении. Только JSON.';

document.getElementById('bloodFileInput').addEventListener('change', async () => {
  const input = document.getElementById('bloodFileInput');
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const box = document.getElementById('bloodAnalyzing');
  const listWrap = document.getElementById('bloodTestsListWrap');
  box.style.display = 'block';
  box.innerHTML = '<div class="analyzing-box"><div class="analyzing-spinner"></div><p class="a-strong">Распознаю анализ…</p><p style="font-size:13px;color:var(--ink-2);margin-top:6px;">ИИ читает бланк и объясняет каждый показатель простыми словами</p></div>';
  if (listWrap) listWrap.style.display = 'none';
  try {
    const imgs = await fileToImageParts(file);
    const raw = await claudeMessage(imgs.concat([
      { type:'text', text:BLOOD_PROMPT }
    ]), 7000, '');
    const parsed = parseJSONLoose(raw);
    if (!parsed.markers || !parsed.markers.length) throw new Error('no markers');
    const bt = addBloodTest(parsed);
    box.style.display = 'none';
    if (listWrap) listWrap.style.display = 'block';
    showToast('Анализ распознан');
    openBloodResult(bt.id);
    if (window.__meSave) window.__meSave(parsed, 'upload');
  } catch (err) {
    reportFail('blood', err);
    box.innerHTML = '<div class="error-box">Не получилось распознать. Сфотографируйте бланк крупнее, при хорошем свете, без бликов — и попробуйте ещё раз.</div>';
    setTimeout(() => { box.style.display = 'none'; if (listWrap) listWrap.style.display = 'block'; }, 3500);
  }
});

/* ================= СНИМКИ: МРТ / КТ / УЗИ / рентген ================= */
var SCAN_PROMPT = 'Это заключение врача по снимку (МРТ, КТ, УЗИ, рентген). Разбери КОРОТКО и ПРОСТЫМ языком.\n' +
'СТРОГО JSON без markdown:\n' +
'{"study":"ТОЛЬКО короткая аббревиатура: МРТ / КТ / УЗИ / рентген / ПЭТ-КТ / ЭКГ (не пиши полное название)","area":"что смотрели, 1-3 слова","date":"дата или пусто",' +
'"findings":[{"name":"находка бытовыми словами, 2-5 слов, БЕЗ латыни и терминов","plain":"ОДНО простое предложение: что это значит и насколько серьёзно"}],' +
'"plain_conclusion":"1-2 коротких предложения простым языком: что нашли, стоит ли волноваться",' +
'"recommendation":"1 предложение: что делать дальше (по тексту протокола)"}\n' +
'ПРАВИЛА: как для человека без медицинского образования. Никакой латыни и терминов (трабекулярный, остеосклероз, гленоид и т.п.) — только обычные слова («отёк кости», «износ хряща», «повреждение хрящевого кольца сустава»). НЕ объясняй, что такое МРТ. «Обратитесь к врачу» — только в recommendation, один раз. Только JSON.';

function scanDate(p){ return (p.date && String(p.date).trim()) ? p.date : ''; }
function shortStudy(s){
  s = String(s || '').trim();
  var low = s.toLowerCase();
  if (/магнитно|мрт|mri/.test(low)) return 'МРТ';
  if (/компьютерн|\bкт\b|\bct\b|пэт/.test(low)) return /пэт/.test(low) ? 'ПЭТ-КТ' : 'КТ';
  if (/ультразв|узи|\bus\b/.test(low)) return 'УЗИ';
  if (/рентген|rg|r-граф|рг\b/.test(low)) return 'Рентген';
  if (/электрокард|экг|ecg|ekg/.test(low)) return 'ЭКГ';
  if (/маммогра/.test(low)) return 'Маммография';
  if (s.length > 22) return s.slice(0, 20) + '…';
  return s;
}

function addScan(parsed){
  var sc = {
    id: 'sc' + Math.random().toString(36).slice(2,8),
    serverId: parsed._serverId || null,
    study: shortStudy(parsed.study) || 'Исследование',
    area: parsed.area || '',
    date: scanDate(parsed),
    findings: Array.isArray(parsed.findings) ? parsed.findings : [],
    conclusion: parsed.plain_conclusion || parsed.conclusion || '',
    recommendation: parsed.recommendation || ''
  };
  state.scans.push(sc);
  renderScansList();
  if (typeof refreshHealthSubtitles === 'function') refreshHealthSubtitles();
  // МРТ/КТ → блок «Травмы и реабилитация» появляется автоматически
  if (typeof setInjuryCardVisible === 'function' && !prefs.showInjuryCard) setInjuryCardVisible(true);
  refreshInjuryCard();
  return sc;
}

function refreshInjuryCard(){
  var main = document.getElementById('cardInjuryMain');
  var sub = document.getElementById('cardInjurySub');
  if (!main) return;
  if (state.scans.length){
    var last = state.scans[state.scans.length - 1];
    main.textContent = [last.study, last.area].filter(Boolean).join(' · ');
    if (sub) sub.textContent = 'Разбор готов';
  } else {
    main.textContent = 'Нет данных';
    if (sub) sub.textContent = '';
  }
}

function renderScansList(){
  var wrap = document.getElementById('scansList');
  var label = document.getElementById('scansListLabel');
  if (!wrap) return;
  if (!state.scans.length){ wrap.innerHTML = ''; if (label) label.style.display = 'none'; return; }
  if (label) label.style.display = 'block';
  wrap.innerHTML = state.scans.slice().reverse().map(function(sc){
    return '<div class="row" data-scan="' + esc(sc.id) + '"><div class="r-main"><p class="r-title">' + esc(sc.study) + '</p>' +
      '<p class="r-sub">' + esc([sc.area, sc.date].filter(Boolean).join(' · ')) + '</p></div><span class="chevron">›</span></div>';
  }).join('');
  wrap.querySelectorAll('[data-scan]').forEach(function(el){
    el.addEventListener('click', function(){ openScanResult(el.dataset.scan); });
  });
}

function openScanResult(id){
  var sc = state.scans.find(function(s){ return s.id === id; });
  if (!sc) return;
  var body = document.getElementById('scanResultBody');
  var findings = (sc.findings || []).map(function(f){
    return '<div class="marker-brief"><div class="mb-head"><div class="mb-left"><span class="mb-dot ok"></span><p class="mb-name">' + esc(f.name || '') + '</p></div></div>' +
      '<p class="mb-meaning">' + esc(f.plain || '') + '</p></div>';
  }).join('');
  body.innerHTML =
    '<h1 class="title" style="margin-top:2px;">' + esc(sc.study) + '</h1>' +
    '<p class="subtitle" style="margin-bottom:14px;">' + esc([sc.area, sc.date].filter(Boolean).join(' · ')) + '</p>' +
    (sc.conclusion ? '<div class="ai-summary" style="margin-top:0;margin-bottom:16px;"><div class="dot"></div><p>' + esc(sc.conclusion) + '</p></div>' : '') +
    (findings ? '<p class="section-label">Что нашли</p>' + findings : '') +
    (sc.recommendation ? '<p class="section-label">Что делать дальше</p><div class="card"><p style="font-size:14px;margin:0;line-height:1.5;">' + esc(sc.recommendation) + '</p></div>' : '') +
    '<button class="cta accent" id="scanAskMe" style="margin-top:16px;">Спросить Me про это</button>' +
    '<p class="disclaimer">Это не диагноз.</p>';
  var ask = document.getElementById('scanAskMe');
  if (ask) ask.addEventListener('click', function(){
    askAbout('Объясни коротко про моё исследование (' + sc.study + '): ' + (sc.conclusion || '') + ' Что это значит и какие дальнейшие действия?', true);
  });
  openDetail('detail-scanresult');
}

var scanFileInputEl = document.getElementById('scanFileInput');
if (scanFileInputEl) scanFileInputEl.addEventListener('change', async () => {
  var input = scanFileInputEl;
  var file = input.files[0];
  if (!file) return;
  input.value = '';
  var box = document.getElementById('scanAnalyzing');
  var listWrap = document.getElementById('scansListWrap');
  box.style.display = 'block';
  box.innerHTML = '<div class="analyzing-box"><div class="analyzing-spinner"></div><p class="a-strong">Читаю заключение…</p><p style="font-size:13px;color:var(--ink-2);margin-top:6px;">Me разбирает исследование и объясняет простыми словами</p></div>';
  if (listWrap) listWrap.style.display = 'none';
  try {
    var imgs = await fileToImageParts(file);
    var raw = await claudeMessage(imgs.concat([{ type:'text', text:SCAN_PROMPT }]), 6000, '');
    var parsed = parseJSONLoose(raw);
    if (!parsed.plain_conclusion && !(parsed.findings && parsed.findings.length)) throw new Error('empty');
    var sc = addScan(parsed);
    box.style.display = 'none';
    if (listWrap) listWrap.style.display = 'block';
    showToast('Снимок разобран');
    openScanResult(sc.id);
    if (window.__meSave) window.__meSave(parsed, 'scan');
  } catch (err) {
    reportFail('scan', err);
    box.innerHTML = '<div class="error-box">Не получилось разобрать. Загрузите текст заключения (описание врача) крупнее и чётче.</div>';
    setTimeout(function(){ box.style.display = 'none'; if (listWrap) listWrap.style.display = 'block'; }, 3500);
  }
});

var rowScansEl = document.getElementById('rowScans');
if (rowScansEl) rowScansEl.addEventListener('click', function(){ renderScansList(); openDetail('detail-scans'); });

/* семейный доступ — ждёт бэкенда, пока недоступно */
(function(){
  var b = document.getElementById('familyInvite');
  if (b) b.addEventListener('click', function(){ if (typeof showToast === 'function') showToast('Семейный доступ скоро появится'); });
})();

function isCriticalMarker(m){
  // Simple critical thresholds for demo safety alerts (not diagnoses)
  // имя без скобок и уточнений: "Средняя концентрация гемоглобина (MCHC)" -> "средняя концентрация гемоглобина"
  const name = (m.name || '').replace(/\(.*?\)/g, '').trim().toLowerCase();
  const raw = String(m.value || m.to || '').replace(',', '.').match(/[\d.]+/);
  const num = raw ? parseFloat(raw[0]) : NaN;
  if (isNaN(num)) return false;
  // только сам показатель, не производные индексы (MCH, MCHC, тромбокрит, PDW и т.п.)
  if (name === 'гемоглобин' && num < 70) return true;
  if ((name === 'тромбоциты' || name === 'тромбоцит') && num < 20) return true;
  if (name === 'глюкоза' && num > 25) return true;
  if (name === 'калий' && (num < 2.5 || num > 6.5)) return true;
  return false;
}

function buildStep1Summary(bt){
  if (bt.aiSummary) return bt.aiSummary;
  const att = bt.needsAttention.length;
  if (att === 0) {
    return 'Я посмотрел ваш анализ крови. Все основные показатели в пределах нормы — это хорошая новость. Ниже — полный список того, что удалось распознать.';
  }
  if (att === 1) {
    return `Я посмотрел ваш анализ крови. Один показатель (${bt.needsAttention[0].name}) немного выходит за привычные границы — остальные выглядят спокойно. Ниже краткий список.`;
  }
  return `Я посмотрел ваш анализ крови. ${bt.markersTotal} показателей обработано, ${att} из них стоит внимательнее посмотреть вместе с врачом. Ниже — спокойный обзор без лишних деталей.`;
}

function addBloodTest(parsed){
  const needsAttention = [], stable = [], critical = [];
  (parsed.markers||[]).forEach(m => {
    if (isCriticalMarker(m)) {
      critical.push({ name:m.name, value:m.value || m.to, flag:m.flag || 'high' });
    }
    if (m.flag === 'high' || m.flag === 'low') needsAttention.push({ name:m.name, from:'—', to:m.value, flag:m.flag, ref:m.ref || '' });
    else stable.push({ name:m.name, value:m.value, ref:m.ref || '' });
  });
  const bt = {
    id:'bt'+Math.random().toString(36).slice(2,8),
    serverId: parsed._serverId || null,
    date: (parsed.date && parsed.date !== 'СЕГОДНЯ') ? parsed.date : (ruDate(todayISO()).toUpperCase() + ' ' + new Date().getFullYear()),
    markersTotal: (parsed.markers||[]).length,
    changed: needsAttention.length,
    outOfRange: needsAttention.length,
    aiSummary: parsed.summary || '',
    plainByName: Object.fromEntries((parsed.markers||[]).filter(m=>m.plain).map(m=>[String(m.name).toLowerCase(), m.plain])),
    needsAttention, stable, critical,
    step: 1
  };
  state.bloodTests.push(bt);
  renderBloodTestsList();
  renderTimeline();
  refreshHealthSubtitles();
  if (typeof refreshStatusCards === 'function') refreshStatusCards();
  return bt;
}

/* Ultra-brief medical translator (vrach.info style: 1 sentence each) */
const MARKER_SIMPLE = {
  'гемоглобин': {
    what: 'Переносит кислород от лёгких к тканям.',
    statusOk: 'Уровень кислорода в норме.',
    statusHi: 'Повышение — иногда при обезвоживании.',
    statusLo: 'Снижение — признак анемии.',
    norm: '120–160 г/л',
    full: 'Гемоглобин — белок в эритроцитах. Низкие значения часто связаны с дефицитом железа; высокие — с обезвоживанием или другими состояниями. Интерпретацию делает врач.'
  },
  'эритроциты': {
    what: 'Красные клетки, переносящие кислород.',
    statusOk: 'Количество в норме.',
    statusHi: 'Повышение — возможна сгущение крови.',
    statusLo: 'Снижение — может влиять на самочувствие.',
    norm: '3.8–5.5 ×10¹²/л',
    full: 'Эритроциты доставляют кислород. Отклонения оценивают вместе с гемоглобином и клиникой.'
  },
  'лейкоциты': {
    what: 'Клетки иммунитета, защищают от инфекций.',
    statusOk: 'Иммунный ответ в обычном режиме.',
    statusHi: 'Повышение — часто при воспалении.',
    statusLo: 'Снижение — защита может быть слабее.',
    norm: '4–9 ×10⁹/л',
    full: 'Лейкоциты реагируют на инфекции и воспаление. Одна цифра не ставит диагноз — важен контекст.'
  },
  'тромбоциты': {
    what: 'Участвуют в свёртывании крови.',
    statusOk: 'Свёртываемость в обычном диапазоне.',
    statusHi: 'Повышение — иногда при воспалении.',
    statusLo: 'Снижение — кровь может сворачиваться медленнее.',
    norm: '150–400 ×10⁹/л',
    full: 'Тромбоциты останавливают кровотечение. Критически низкие значения требуют срочной оценки врачом.'
  },
  'соэ': {
    what: 'Общий сигнал возможного воспаления.',
    statusOk: 'Сигнал спокойный.',
    statusHi: 'Повышение — бывает при воспалении или простуде.',
    statusLo: 'Снижение обычно не тревожит.',
    norm: '2–15 мм/ч',
    full: 'СОЭ — неспецифический маркер. Смотрят вместе с другими анализами и симптомами.'
  },
  'глюкоза': {
    what: 'Сахар в крови — топливо для клеток.',
    statusOk: 'Уровень топлива в норме.',
    statusHi: 'Повышение — важно обсудить с врачом.',
    statusLo: 'Снижение — может давать слабость.',
    norm: '3.3–5.5 ммоль/л',
    full: 'Глюкозу интерпретируют с учётом того, натощак ли сдан анализ. Повтор и консультация врача при отклонениях.'
  },
  'холестерин': {
    what: 'Участвует в обмене жиров и строении клеток.',
    statusOk: 'Уровень в спокойных границах.',
    statusHi: 'Повышение — повод обсудить риски для сосудов.',
    statusLo: 'Снижение само по себе редко проблема.',
    norm: '< 5.2 ммоль/л',
    full: 'Общий холестерин — ориентир. Для полной картины смотрят липидный профиль.'
  },
  'алт': {
    what: 'Фермент, связанный с работой печени.',
    statusOk: 'Печёночный маркер в норме.',
    statusHi: 'Повышение — печень может быть нагружена.',
    statusLo: 'Снижение обычно не вызывает опасений.',
    norm: '< 41 Ед/л',
    full: 'АЛТ оценивают вместе с АСТ и клиникой. Однократное небольшое повышение не всегда патология.'
  },
  'аст': {
    what: 'Фермент печени и мышц.',
    statusOk: 'В привычных границах.',
    statusHi: 'Повышение — смотрят вместе с другими анализами.',
    statusLo: 'Снижение, как правило, не тревожный знак.',
    norm: '< 40 Ед/л',
    full: 'АСТ неспецифичен: растёт при нагрузке на печень или мышцы. Решение — за врачом.'
  },
  'креатинин': {
    what: 'Маркер фильтрации почек.',
    statusOk: 'Почки справляются в обычном режиме.',
    statusHi: 'Повышение — стоит проверить работу почек.',
    statusLo: 'Снижение часто связано с мышечной массой.',
    norm: '62–106 мкмоль/л',
    full: 'Креатинин зависит от мышц и гидратации. При отклонениях врач может назначить доп. обследования.'
  }
};

function simpleExplain(name, value, flag, plain){
  var key = Object.keys(MARKER_SIMPLE).find(function(k){ return (name || '').toLowerCase().includes(k); });
  var info = key ? MARKER_SIMPLE[key] : null;
  var what = info ? info.what : 'Показатель из вашего анализа.';
  var statusText;
  if (flag === 'high') statusText = info ? info.statusHi : 'Значение выше привычных границ.';
  else if (flag === 'low') statusText = info ? info.statusLo : 'Значение ниже привычных границ.';
  else statusText = info ? info.statusOk : 'Значение в обычном диапазоне.';
  var norm = info && info.norm ? info.norm : '';
  var full = info && info.full ? info.full : 'Обсудите показатель с врачом в контексте остальных анализов.';
  if (plain) {            // объяснение от ИИ по этому конкретному значению — приоритетнее словаря
    statusText = plain;
    full = plain;
  }
  return { what: what, statusText: statusText, norm: norm, full: full, flag: flag || 'normal' };
}

function buildMarkerBriefCard(name, value, flag, plain, ref){
  var ex = simpleExplain(name, value, flag, plain);
  if (ref) ex.norm = ref;   // норма с бланка приоритетнее словарной
  var isAtt = flag === 'high' || flag === 'low';
  var dotClass = flag === 'high' ? 'att' : (flag === 'low' ? 'warn' : 'ok');
  var valClass = flag === 'high' ? 'att' : (flag === 'low' ? 'warn' : 'ok');
  var uid = 'mb_' + Math.random().toString(36).slice(2, 8);
  return (
    '<div class="marker-brief" id="' + uid + '">' +
      '<div class="mb-head">' +
        '<div class="mb-left"><span class="mb-dot ' + dotClass + '"></span><p class="mb-name">' + esc(name) + '</p></div>' +
        '<div class="mb-val-col"><p class="mb-val ' + valClass + '">' + esc(value) + '</p>' +
          (ex.norm ? '<p class="mb-norm">норма ' + esc(ex.norm) + '</p>' : '') +
        '</div>' +
      '</div>' +
      (plain ? '' : '<p class="mb-what">' + esc(ex.what) + '</p>') +
      '<p class="mb-meaning">' + esc(ex.statusText) + '</p>' +
      (plain ? '' :
        '<button type="button" class="mb-link" data-expand="' + uid + '"><span class="mb-link-label">Показать полный разбор →</span></button>' +
        '<div class="mb-full">' + esc(ex.full) + '</div>') +
    '</div>'
  );
}

function openBloodResult(id){
  const bt = state.bloodTests.find(b => b.id === id);
  if (!bt) return;
  // open straight into the plain-language breakdown (критическое — баннером сверху, не тупик)
  if (bt.step === 3) { renderBloodStep3(bt); return; }
  renderBloodStep2(bt);
}

function renderBloodStep1(bt){
  const body = document.getElementById('bloodResultBody');

  // CRITICAL ALERT — overrides the 3-step sequence
  if (bt.critical && bt.critical.length) {
    const names = bt.critical.map(c => c.name + ' (' + c.value + ')').join(', ');
    body.innerHTML = `
      <h1 class="title" style="margin-top:2px;">Анализ крови</h1>
      <p class="subtitle" style="margin-bottom:6px;">${esc(bt.date)}</p>
      <div class="critical-alert">
        <div class="ca-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4"><path d="M12 9v4M12 17h.01M10.3 3.9L2.7 17.5a1.9 1.9 0 001.66 2.8h15.28a1.9 1.9 0 001.66-2.8L13.7 3.9a1.9 1.9 0 00-3.4 0z"/></svg></div>
        <p class="ca-title">ВНИМАНИЕ</p>
        <p class="ca-text">Данный показатель критически отклонён: ${esc(names)}. Пожалуйста, немедленно обратитесь к врачу.</p>
      </div>
      <p class="disclaimer" style="margin-top:16px;">Это не диагноз.</p>
    `;
    openDetail('detail-bloodresult');
    return;
  }

  const summary = buildStep1Summary(bt);
  // CTA наверху — главная фишка, чтобы пользователь сразу видел следующий шаг
  body.innerHTML = `
    <h1 class="title" style="margin-top:2px;">Анализ крови</h1>
    <p class="subtitle" style="margin-bottom:8px;">${esc(bt.date)}</p>

    <div class="step-cta-box">
      <p>Хотите, я разберу эти показатели простыми словами и покажу динамику?</p>
      <div class="step-cta-row">
        <button class="cta accent" id="step1Yes">Да</button>
        <button class="cta secondary" id="step1Next" style="margin-top:0;">Дальше</button>
      </div>
    </div>

    <div class="ai-summary" style="margin-top:0; margin-bottom:16px;">
      <div class="dot"></div>
      <p>${esc(summary)}</p>
    </div>

    <div class="card" style="margin-bottom:8px; padding:14px 16px;">
      <p style="margin:0 0 6px; font-size:14px;"><strong>${bt.markersTotal}</strong> показателей обработано</p>
      <p style="margin:0 0 6px; font-size:14px;"><strong>${bt.changed}</strong> показателя требуют внимания</p>
      <p style="margin:0; font-size:14px; color:var(--ink-2);">Краткий список ниже — без сложных терминов</p>
    </div>

    ${bt.needsAttention.length ? `
      <div class="group-title"><span class="group-dot bad"></span>Стоит обратить внимание</div>
      <div class="card">${bt.needsAttention.map(m => `
        <div class="marker-row" data-marker="${esc(m.name)}" data-from="${esc(m.from)}" data-to="${esc(m.to)}">
          <span class="mk-name">${esc(m.name)}</span><span class="mk-val ${m.flag===`high`?`flag-high`:`flag-low`}">${esc(m.to)}</span>
        </div>`).join('')}</div>
    ` : ''}
    ${bt.stable.length ? `
      <div class="group-title"><span class="group-dot good"></span>В норме</div>
      <div class="card">${bt.stable.map(m => `
        <div class="marker-row" data-marker="${esc(m.name)}" data-from="" data-to="${esc(m.value)}">
          <span class="mk-name">${esc(m.name)}</span><span class="mk-val">${esc(m.value)}</span>
        </div>`).join('')}</div>
    ` : ''}

    <p class="disclaimer">Это не диагноз.</p>
  `;
  body.querySelectorAll('.marker-row').forEach(function(el){
    el.addEventListener('click', function(){
      var valEl = el.querySelector('.mk-val');
      var flag = 'normal';
      if (valEl && valEl.classList.contains('flag-high')) flag = 'high';
      else if (valEl && valEl.classList.contains('flag-low')) flag = 'low';
      openMarkerSheet(el.dataset.marker, el.dataset.to, bt.date, flag, (bt.plainByName || {})[String(el.dataset.marker).toLowerCase()]);
    });
  });
  const goStep2 = () => {
    bt.step = 2;
    renderBloodStep2(bt);
  };
  const btnYes = document.getElementById('step1Yes');
  const btnNext = document.getElementById('step1Next');
  if (btnYes) btnYes.addEventListener('click', goStep2);
  if (btnNext) btnNext.addEventListener('click', goStep2);
  openDetail('detail-bloodresult');
}

function renderBloodStep2(bt){
  var body = document.getElementById('bloodResultBody');
  var pbn = bt.plainByName || {};
  var attentionBlocks = (bt.needsAttention || []).map(function(m){
    return buildMarkerBriefCard(m.name, m.to, m.flag, pbn[String(m.name).toLowerCase()], m.ref);
  }).join('');

  var stableBlocks = (bt.stable || []).map(function(m){
    return buildMarkerBriefCard(m.name, m.value, 'normal', pbn[String(m.name).toLowerCase()], m.ref);
  }).join('');

  var summary = (typeof buildStep1Summary === 'function') ? buildStep1Summary(bt) : '';

  var critBanner = '';
  if (bt.critical && bt.critical.length) {
    var cn = esc(bt.critical.map(function(c){ return String(c.name).replace(/\s*\(.*$/, ''); }).join(', '));
    critBanner =
      '<div class="critical-alert" style="text-align:left; padding:14px 16px; margin-bottom:16px;">' +
        '<p class="ca-title" style="text-align:left; margin-bottom:6px;">Стоит показать врачу</p>' +
        '<p class="ca-text">Один показатель (' + cn + ') сильно отличается от нормы. Это не срочно, но покажите этот анализ врачу на ближайшем приёме. Ниже — разбор всех показателей простыми словами.</p>' +
      '</div>';
  }

  body.innerHTML =
    '<h1 class="title" style="margin-top:2px;">Анализ крови</h1>' +
    '<p class="subtitle" style="margin-bottom:12px;">' + esc(bt.date) + '</p>' +
    critBanner +
    (summary ? '<div class="ai-summary" style="margin-top:0; margin-bottom:18px;"><div class="dot"></div><p>' + esc(summary) + '</p></div>' : '') +
    (bt.needsAttention.length ? '<p class="section-label" style="margin-top:4px;">Требуют внимания</p>' + attentionBlocks : '') +
    (bt.stable.length ? '<p class="section-label">В норме</p>' + stableBlocks : '') +
    '<button class="cta accent has-ic" id="step2Yes" style="margin-top:18px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>Подготовить отчёт для врача</button>' +
    '<p class="disclaimer">Это не диагноз.</p>';

  body.querySelectorAll('[data-expand]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var card = document.getElementById(btn.getAttribute('data-expand'));
      if (!card) return;
      var open = card.classList.toggle('expanded');
      var label = btn.querySelector('.mb-link-label');
      if (label) label.textContent = open ? 'Скрыть полный разбор' : 'Показать полный разбор →';
    });
  });

  var goStep3 = function(){ bt.step = 3; renderBloodStep3(bt); };
  var btnYes = document.getElementById('step2Yes');
  if (btnYes) btnYes.addEventListener('click', goStep3);
  openDetail('detail-bloodresult');
}

/* body zone tags for future 3D human */
function bodyZoneForMarker(name){
  const n = (name || '').toLowerCase();
  if (n.includes('лейкоцит') || n.includes('соэ')) return { system: 'иммунная система', zone: 'кровь' };
  if (n.includes('гемоглобин') || n.includes('эритроцит') || n.includes('тромбоцит')) return { system: 'система крови', zone: 'кровь' };
  if (n.includes('глюкоз')) return { system: 'эндокринная система', zone: 'поджелудочная' };
  if (n.includes('холестерин')) return { system: 'сердечно-сосудистая система', zone: 'сосуды' };
  if (n.includes('алт') || n.includes('аст')) return { system: 'пищеварительная система', zone: 'печень' };
  if (n.includes('креатинин')) return { system: 'мочевыделительная система', zone: 'почки' };
  return { system: 'общее', zone: 'кровь' };
}

function renderBloodStep3(bt){
  const body = document.getElementById('bloodResultBody');
  const filters = [
    { id: 'f_all', label: 'Поделиться всем' },
    { id: 'f_blood', label: 'Анализы крови' },
    { id: 'f_liver', label: 'Печень' },
    { id: 'f_kidney', label: 'Почки' },
    { id: 'f_endo', label: 'Эндокринная система' },
    { id: 'f_immune', label: 'Иммунитет' },
    { id: 'f_meds', label: 'Текущая терапия' }
  ];
  body.innerHTML = `
    <h1 class="title" style="margin-top:2px;">Отчёт для врача</h1>
    <p class="subtitle" style="margin-bottom:8px;">Профессиональная выписка · ${esc(bt.date)}</p>

    <p class="section-label" style="margin-top:8px;">Что включить</p>
    <div class="card" id="exportFilters" style="padding:8px 12px;">
      ${filters.map((f,i) => `
        <label class="question-check ${i===0||i===1?'checked':''}" data-fid="${f.id}" style="margin-bottom:6px; border:none; padding:10px 4px;">
          <div class="qc-box">${i===0||i===1?'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>':''}</div>
          <div class="qc-text">${f.label}</div>
        </label>`).join('')}
    </div>

    <div id="doctorReportPreview" style="display:none; margin-top:16px;"></div>

    <button class="cta accent" id="exportPreviewBtn" style="margin-top:18px;">Открыть предпросмотр</button>
    <button class="cta secondary" id="exportPdfBtn" style="margin-top:10px;">Скачать PDF</button>
    <button class="cta secondary" id="step3Back" style="margin-top:10px;">← К разбору</button>
    <p class="disclaimer">Не диагноз — справка для врача.</p>
  `;

  const filterWrap = document.getElementById('exportFilters');
  filterWrap.querySelectorAll('.question-check').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('checked');
      const box = el.querySelector('.qc-box');
      if (el.classList.contains('checked')) {
        box.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>';
      } else {
        box.innerHTML = '';
      }
    });
  });

  function selectedFilters(){
    return [...filterWrap.querySelectorAll('.question-check.checked')].map(el => el.dataset.fid);
  }

  function buildDoctorReport(selected){
    const all = selected.includes('f_all');
    const lines = [];
    lines.push('МЕДИЦИНСКАЯ ВЫПИСКА (сформировано приложением Me)');
    var _tgu = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) || {};
    var _pn = [( _tgu.first_name||'').trim(), (_tgu.last_name||'').trim()].filter(Boolean).join(' ');
    lines.push('Пациент: ' + (_pn || '—'));
    lines.push('Дата анализа: ' + bt.date);
    lines.push('');
    lines.push('1. АНАМНЕЗ');
    if (state.visits.length) {
      const v = state.visits[state.visits.length-1];
      lines.push('Последний приём: ' + v.doctorType + ' (' + v.date + ')');
      (v.notes||[]).forEach(n => lines.push('— ' + n));
      if (v.medication) lines.push('Назначения: ' + v.medication);
      if (v.labs) lines.push('Рекомендованные анализы: ' + v.labs);
      if (v.followUp) lines.push('Повторный визит: ' + v.followUp);
    } else {
      lines.push('Жалобы и визиты в приложении пока не зафиксированы.');
    }
    lines.push('');
    lines.push('2. ДИНАМИКА ПОКАЗАТЕЛЕЙ');
    const includeMarker = (m) => {
      if (all || selected.includes('f_blood')) return true;
      const z = bodyZoneForMarker(m.name);
      if (selected.includes('f_liver') && z.zone === 'печень') return true;
      if (selected.includes('f_kidney') && z.zone === 'почки') return true;
      if (selected.includes('f_endo') && z.zone === 'поджелудочная') return true;
      if (selected.includes('f_immune') && z.system === 'иммунная система') return true;
      return false;
    };
    const rows = [];
    (bt.needsAttention||[]).forEach(m => { if (includeMarker(m)) rows.push({ name:m.name, value:m.to, flag:m.flag, zone: bodyZoneForMarker(m.name) }); });
    (bt.stable||[]).forEach(m => { if (includeMarker(m)) rows.push({ name:m.name, value:m.value, flag:'normal', zone: bodyZoneForMarker(m.name) }); });
    if (!rows.length) lines.push('По выбранным фильтрам показателей нет.');
    else {
      lines.push('Показатель | Значение | Оценка | Зона');
      rows.forEach(r => {
        const est = r.flag === 'high' ? 'выше референса' : r.flag === 'low' ? 'ниже референса' : 'в пределах референса';
        lines.push(r.name + ' | ' + r.value + ' | ' + est + ' | ' + r.zone.system + ' / ' + r.zone.zone);
      });
    }
    lines.push('');
    lines.push('3. ТЕКУЩАЯ ТЕРАПИЯ');
    if (all || selected.includes('f_meds')) {
      if (state.meds.length) state.meds.forEach(function(m){
        var act = (typeof activeStage === 'function') ? activeStage(m, todayISO()) : null;
        var st = act ? act.stage : (m.stages && m.stages[0]);
        lines.push('— ' + m.name + (st && st.dose ? ' ' + st.dose : (m.dosage ? ' ' + m.dosage : '')) + (st && st.times ? ' · ' + st.times.join(', ') : ''));
      });
      else lines.push('Активные препараты в приложении не указаны.');
    } else {
      lines.push('(терапия не включена в выбор)');
    }
    lines.push('');
    lines.push('Примечание: документ сформирован автоматически и не заменяет заключение врача.');
    return lines.join('\n');
  }

  document.getElementById('exportPreviewBtn').addEventListener('click', () => {
    const report = buildDoctorReport(selectedFilters());
    const prev = document.getElementById('doctorReportPreview');
    prev.style.display = 'block';
    prev.innerHTML = `<div class="card" style="padding:16px; font-family:ui-monospace,Menlo,monospace; font-size:12.5px; line-height:1.55; white-space:pre-wrap; color:var(--ink);">${esc(report)}</div>`;
    prev.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  document.getElementById('exportPdfBtn').addEventListener('click', () => {
    const report = buildDoctorReport(selectedFilters());
    const w = window.open('', '_blank');
    if (!w) { showToast('Разрешите всплывающие окна для PDF'); return; }
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Выписка Me</title><style>body{font-family:Georgia,serif;padding:32px;color:#111;line-height:1.5;max-width:720px;margin:0 auto}h1{font-size:18px}pre{white-space:pre-wrap;font-family:Georgia,serif;font-size:13px}</style></head><body><h1>Медицинская выписка</h1><pre>'+esc(report)+'</pre></body></html>');
    setTimeout(function(){ try { w.print(); } catch(e){} }, 300);
    w.document.close();
    showToast('Отчёт готов к печати / PDF');
  });

  document.getElementById('step3Back').addEventListener('click', () => { bt.step = 2; renderBloodStep2(bt); });
  openDetail('detail-bloodresult');
}

function openMarkerSheet(name, value, date, flag, plain){
  var ex = simpleExplain(name, value, flag || 'normal', plain);
  openSheet(
    '<p class="sheet-title">' + esc(name) + '</p>' +
    '<p class="sheet-sub">' + esc(value) + (date ? ' · ' + esc(date) : '') + '</p>' +
    (plain ? '' : '<p style="font-size:14px;line-height:1.45;color:var(--ink);margin:0 0 6px;">' + esc(ex.what) + '</p>') +
    '<p style="font-size:14px;line-height:1.5;color:var(--ink-2);margin:0 0 12px;">' + esc(ex.statusText) + '</p>' +
    (ex.norm ? '<p style="font-size:12.5px;color:var(--ink-3);margin:0;">норма ' + esc(ex.norm) + '</p>' : '')
  );
}

/* ================= DOCTOR VISITS ================= */
document.getElementById('rowDoctorVisits').addEventListener('click', () => { renderVisitsList(); openDetail('detail-visits'); });

function renderVisitsList(){
  const empty = document.getElementById('visitsEmpty');
  const list = document.getElementById('visitsList');
  empty.style.display = state.visits.length ? 'none' : 'block';
  list.innerHTML = state.visits.slice().reverse().map(v => `
    <div class="row" data-id="${v.id}">
      <div class="r-main"><p class="r-title">${esc(v.doctorType)}</p><p class="r-sub">${esc(v.date)}${v.medication ? ' · назначено лекарство' : ''}</p></div>
      <span class="chevron">›</span>
    </div>`).join('');
  list.querySelectorAll('.row').forEach(el => el.addEventListener('click', () => openVisitResult(el.dataset.id)));
}

function showVisitQuestion(){
  const q = visitQuestions[visitQIndex];
  document.getElementById('visitAiQuestion').textContent = q.q;
  document.getElementById('visitProgress').textContent = `Вопрос ${visitQIndex + 1} из ${visitQuestions.length}`;
  document.getElementById('visitAnswerInput').value = pendingVisit[q.key] || '';
  document.getElementById('qNextBtn').textContent = visitQIndex === visitQuestions.length - 1 ? 'Сохранить' : 'Далее';
  document.getElementById('visitStatus').style.display = 'none';
  document.getElementById('voiceHint').textContent = 'Нажмите и ответьте голосом';
  // «Что назначил» (index 2): показать загрузку рецепта
  const rxBox = document.getElementById('visitRxUpload');
  if (rxBox) rxBox.style.display = (visitQuestions[visitQIndex] && visitQuestions[visitQIndex].key === 'prescribed') ? 'block' : 'none';
  const rxStatus = document.getElementById('visitRxStatus');
  if (rxStatus) rxStatus.style.display = 'none';
}

document.getElementById('addVisitBtn').addEventListener('click', () => {
  pendingVisit = {};
  visitQIndex = 0;
  showVisitQuestion();
  openDetail('detail-addvisit');
});
document.getElementById('shareHistoryBtn').addEventListener('click', () => {
  if (state.bloodTests.length) {
    const bt = state.bloodTests[state.bloodTests.length - 1];
    bt.step = 3;
    renderBloodStep3(bt);
  } else {
    showToast('Сначала добавьте анализ крови');
  }
});


/* voice input — fills current answer */
const voiceBtn = document.getElementById('voiceBtn');
const voiceHint = document.getElementById('voiceHint');
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null, isRecording = false;
if (!SpeechRec){
  document.getElementById('voiceUnsupported').style.display = 'block';
  voiceBtn.style.opacity = '0.4'; voiceBtn.style.cursor = 'default';
} else {
  recognizer = new SpeechRec();
  recognizer.lang = 'ru-RU'; recognizer.interimResults = false;
  recognizer.onstart = () => { isRecording = true; voiceBtn.classList.add('recording'); voiceHint.textContent = 'Слушаю…'; };
  recognizer.onerror = () => { isRecording = false; voiceBtn.classList.remove('recording'); voiceHint.textContent = 'Не расслышал — попробуйте ещё раз'; };
  recognizer.onend = () => { isRecording = false; voiceBtn.classList.remove('recording'); };
  recognizer.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    document.getElementById('visitAnswerInput').value = transcript;
    voiceHint.textContent = 'Ответ записан — нажмите «Далее»';
  };
  voiceBtn.addEventListener('click', () => { if (!isRecording) recognizer.start(); });
}


/* Prescription upload during visit Q3/Q4 */
const visitRxInput = document.getElementById('visitRxInput');
if (visitRxInput) {
  visitRxInput.addEventListener('change', async () => {
    const file = visitRxInput.files && visitRxInput.files[0];
    if (!file) return;
    const status = document.getElementById('visitRxStatus');
    if (status) status.style.display = 'flex';
    try {
      const imgs = await fileToImageParts(file);
      const raw = await claudeMessage(imgs.concat([{ type:'text', text:RX_PROMPT }]), 7000, '');
      const parsed = parseJSONLoose(raw);
      const meds = pickMeds(parsed);
      if (meds.length) {
        const summary = meds.map(m => m.name).join('; ');
        document.getElementById('visitAnswerInput').value = summary;
        const key = visitQuestions[visitQIndex].key;
        pendingVisit[key] = summary;
        if (status) status.style.display = 'none';
        confirmRxMeds(meds, parsed.raw_text || '');
      } else {
        showToast('Не удалось прочитать рецепт');
      }
    } catch(e) {
      reportFail('visit', e);
      showToast('Не получилось распознать — введите текстом');
    } finally {
      if (status) status.style.display = 'none';
      visitRxInput.value = '';
    }
  });
}

document.getElementById('qNextBtn').addEventListener('click', async () => {
  const answer = document.getElementById('visitAnswerInput').value.trim();
  const key = visitQuestions[visitQIndex].key;
  pendingVisit[key] = answer || null;

  if (visitQIndex < visitQuestions.length - 1) {
    visitQIndex++;
    showVisitQuestion();
    return;
  }

  // last question — structure with AI then save
  document.getElementById('visitStatus').style.display = 'flex';
  document.getElementById('qNextBtn').style.display = 'none';
  try {
    const answersText = visitQuestions.map(q => `${q.q} → ${pendingVisit[q.key] || '—'}`).join('\n');
    const raw = await claudeMessage(`Структурируй ответы пациента после приёма врача в JSON без markdown, на русском:\n{"doctorType":"тип врача (например: дерматолог, травматолог)","notes":["краткое резюме того, что сказал врач"],"medication":"препараты и частота или null","labs":"какие анализы сдать или null","followUp":"когда прийти снова, словами, или null","followUpDays":число дней до следующего визита или null (через 2 месяца = 60, через неделю = 7)}\nОтветы:\n${answersText}`, 1800, '');
    const parsed = parseJSONLoose(raw);
    saveVisit(parsed);
  } catch (err) {
    // fallback without API
    saveVisit({
      doctorType: pendingVisit.doctorType || 'Врач',
      notes: pendingVisit.notes ? [pendingVisit.notes] : [],
      medication: [pendingVisit.prescribed, pendingVisit.medication].filter(Boolean).join('. ') || null,
      labs: pendingVisit.labs || null,
      followUp: pendingVisit.followUp || null
    });
  } finally {
    document.getElementById('visitStatus').style.display = 'none';
    document.getElementById('qNextBtn').style.display = 'block';
  }
});

function saveVisit(v){
  const record = {
    id: 'v' + Math.random().toString(36).slice(2, 8),
    date: ruDate(todayISO()).toUpperCase() + ' ' + new Date().getFullYear(),
    doctorType: v.doctorType || 'Врач',
    notes: Array.isArray(v.notes) ? v.notes : (v.notes ? [v.notes] : []),
    medication: v.medication || null,
    labs: v.labs || null,
    followUp: v.followUp || null
  };
  state.visits.push(record);
  if (window.__meSaveVisit) window.__meSaveVisit(record);

  // напоминание за неделю до следующего визита
  var fd = Number(v.followUpDays);
  if (window.__meSaveReminder && isFinite(fd) && fd > 3){
    var due = isoPlusDays(todayISO(), fd);
    var who = record.doctorType && record.doctorType !== 'Врач' ? record.doctorType : 'врач';
    window.__meSaveReminder(due, 'Скоро визит к ' + who + '. Врач просил прийти ' + (record.followUp || ('через ' + fd + ' дн.')) + '.');
  }

  renderTimeline();
  refreshHealthSubtitles();
  showToast('Приём врача сохранён');
  closeDetail('detail-addvisit');
  renderVisitsList();
  openVisitResult(record.id);
}

function openVisitResult(id){
  const v = state.visits.find(x => x.id === id);
  if (!v) return;
  const body = document.getElementById('visitResultBody');
  body.innerHTML = `
    <h1 class="title" style="margin-top:2px;">Приём врача</h1>
    <p class="subtitle">${esc(v.date)}</p>
    <div class="card" style="margin-bottom:12px; padding:14px 16px;">
      <p style="margin:0 0 4px; font-size:13px; color:var(--ink-2);">Врач</p>
      <p style="margin:0; font-size:15.5px; font-weight:600;">${esc(v.doctorType)}</p>
    </div>
    ${v.notes && v.notes.length ? `<p class="section-label">Что сказал врач</p><div class="card">${v.notes.map(n => `<p style="font-size:14.5px; margin:8px 0; line-height:1.45;">${esc(n)}</p>`).join('')}</div>` : ''}
    ${v.medication ? `<p class="section-label">Назначения</p><div class="card"><p style="font-size:14.5px; margin:0; line-height:1.45;">${esc(v.medication)}</p></div>` : ''}
    ${v.labs ? `<p class="section-label">Анализы</p><div class="card"><p style="font-size:14.5px; margin:0; line-height:1.45;">${esc(v.labs)}</p></div>` : ''}
    ${v.followUp ? `<p class="section-label">Следующий приём</p><div class="card"><p style="font-size:14.5px; margin:0; line-height:1.45;">${esc(v.followUp)}</p></div>` : ''}
  `;
  openDetail('detail-visitresult');
}

/* ================= MEDICATIONS ================= */
const fileInput = document.getElementById('fileInput');
const fileInputFile = document.getElementById('fileInputFile');
const uploadPreviewWrap = document.getElementById('uploadPreviewWrap');
const uploadPreviewImg = document.getElementById('uploadPreviewImg');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzeStatus = document.getElementById('analyzeStatus');
const analyzeError = document.getElementById('analyzeError');
const medScheduleCard = document.getElementById('medScheduleCard');
const medScheduleList = document.getElementById('medScheduleList');
const medEmptyState = document.getElementById('medEmptyState');
let uploadedParts = null;

function refreshMedEmptyState(){
  const has = state.meds.length > 0;
  medEmptyState.style.display = has ? 'none' : 'block';
  medScheduleCard.style.display = has ? 'block' : 'none';
  var d = document.getElementById('medAddDetails');
  if (d && !d.dataset.touched) d.open = !has;
}
refreshMedEmptyState();
/* ensure no residual toast from other flows when opening meds */
document.querySelectorAll('[data-nav="meds"]').forEach(el => {
  el.addEventListener('click', () => {
    const t = document.getElementById('toast');
    if (t) t.classList.remove('show');
  });
});

async function handleMedFile(file){
  if (!file) return;
  analyzeError.style.display = 'none';
  uploadedParts = null;
  analyzeBtn.style.display = 'none';
  uploadPreviewWrap.style.display = 'none';
  analyzeStatus.style.display = 'flex';
  try {
    uploadedParts = await fileToImageParts(file);
    if (file.type.startsWith('image/')) {
      uploadPreviewImg.src = URL.createObjectURL(file);
      uploadPreviewWrap.style.display = 'block';
    }
    analyzeBtn.style.display = 'block';
  } catch(e){
    reportFail('image', e);
    analyzeError.style.display = 'block';
    analyzeError.textContent = 'Не получилось открыть файл. Попробуйте фото.';
  } finally {
    analyzeStatus.style.display = 'none';
  }
}

fileInput.addEventListener('change', () => handleMedFile(fileInput.files[0]));
fileInputFile.addEventListener('change', () => handleMedFile(fileInputFile.files[0]));

function suggestTimes(freq){
  const table = { 1:['09:00'], 2:['09:00','21:00'], 3:['08:00','14:00','20:00'], 4:['08:00','12:00','16:00','20:00'], 5:['08:00','11:00','14:00','17:00','20:00'], 6:['08:00','10:30','13:00','15:30','18:00','20:30'] };
  return table[freq] || table[3];
}

analyzeBtn.addEventListener('click', async () => {
  if (!uploadedParts || !uploadedParts.length) return;
  analyzeBtn.style.display = 'none'; analyzeStatus.style.display = 'flex'; analyzeError.style.display = 'none';
  try {
    const raw = await claudeMessage(uploadedParts.concat([
      { type:'text', text:RX_PROMPT }
    ]), 7000, '');
    const parsed = parseJSONLoose(raw);
    const meds = pickMeds(parsed);
    if (!meds.length) throw new Error('no meds');
    uploadPreviewWrap.style.display = 'none';
    confirmRxMeds(meds, parsed.raw_text || '');
  } catch(err){
    reportFail('rx', err);
    analyzeError.style.display = 'block';
    analyzeError.textContent = 'Не получилось распознать автоматически. Попробуйте ввести вручную.';
    analyzeBtn.style.display = 'block';
  } finally {
    analyzeStatus.style.display = 'none';
  }
});

/* Manual medication wizard */
var MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
var manualMedState = {
  step: 0, name: '', freq: 2, dose: '', unit: 'мг', period: 'every_day',
  startDate: null, endDate: null, calYear: 0, calMonth: 0
};

function periodStepDays(period){
  if (period === 'every_other' || period === 'every_2') return 2;
  if (period === 'every_3') return 3;
  return 1;
}

function dateKey(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function parseDateKey(key){
  if (!key) return null;
  var p = key.split('-');
  return new Date(parseInt(p[0],10), parseInt(p[1],10)-1, parseInt(p[2],10));
}

function isDoseDay(d, start, end, period){
  if (!start || !end) return false;
  var t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  var s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  var e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  if (t < s || t > e) return false;
  var step = periodStepDays(period);
  var days = Math.round((t - s) / 86400000);
  return days % step === 0;
}

function renderMedCalendar(){
  var grid = document.getElementById('calGrid');
  var label = document.getElementById('calMonthLabel');
  var hint = document.getElementById('calHint');
  if (!grid) return;
  var y = manualMedState.calYear;
  var m = manualMedState.calMonth;
  if (label) label.textContent = MONTHS_RU[m];
  var first = new Date(y, m, 1);
  var startWeekday = (first.getDay() + 6) % 7; // Mon=0
  var daysInMonth = new Date(y, m + 1, 0).getDate();
  var start = parseDateKey(manualMedState.startDate);
  var end = parseDateKey(manualMedState.endDate);
  var html = '';
  for (var i = 0; i < startWeekday; i++) html += '<button type="button" class="cal-day muted" disabled></button>';
  for (var day = 1; day <= daysInMonth; day++) {
    var d = new Date(y, m, day);
    var key = dateKey(d);
    var cls = 'cal-day';
    if (start && end) {
      var st = start.getTime(), et = end.getTime(), ct = d.getTime();
      if (ct >= st && ct <= et) cls += ' in-range';
    }
    if (key === manualMedState.startDate || key === manualMedState.endDate) cls += ' selected';
    if (isDoseDay(d, start, end, manualMedState.period)) cls += ' dose-day';
    html += '<button type="button" class="' + cls + '" data-date="' + key + '">' + day + '</button>';
  }
  grid.innerHTML = html;
  grid.querySelectorAll('.cal-day[data-date]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var key = btn.getAttribute('data-date');
      if (!manualMedState.startDate || (manualMedState.startDate && manualMedState.endDate)) {
        manualMedState.startDate = key;
        manualMedState.endDate = null;
      } else {
        var a = parseDateKey(manualMedState.startDate);
        var b = parseDateKey(key);
        if (b < a) {
          manualMedState.endDate = manualMedState.startDate;
          manualMedState.startDate = key;
        } else {
          manualMedState.endDate = key;
        }
      }
      renderMedCalendar();
    });
  });
  if (hint) {
    if (manualMedState.startDate && manualMedState.endDate) {
      var s = parseDateKey(manualMedState.startDate);
      var e = parseDateKey(manualMedState.endDate);
      var count = 0;
      for (var t = s.getTime(); t <= e.getTime(); t += 86400000) {
        if (isDoseDay(new Date(t), s, e, manualMedState.period)) count++;
      }
      hint.textContent = 'Приёмов в периоде: ' + count + ' · ' + periodLabel(manualMedState.period);
    } else if (manualMedState.startDate) {
      hint.textContent = 'Выберите дату окончания';
    } else {
      hint.textContent = 'Выберите дату начала и окончания. Точки — дни приёма.';
    }
  }
}

function openManualMedWizard(){
  var now = new Date();
  manualMedState = {
    step: 0, name: '', freq: 2, dose: '', unit: 'мг', period: 'every_day',
    startDate: null, endDate: null,
    calYear: now.getFullYear(), calMonth: now.getMonth()
  };
  var track = document.getElementById('manualMedTrack');
  var nameInput = document.getElementById('manualMedName');
  var doseInput = document.getElementById('manualMedDose');
  var progress = document.getElementById('manualMedProgress');
  if (track) track.setAttribute('data-step', '0');
  if (nameInput) nameInput.value = '';
  if (doseInput) doseInput.value = '';
  if (progress) progress.textContent = 'Шаг 1 из 4';
  document.querySelectorAll('#manualMedFreqRow .freq-chip').forEach(function(c){
    c.classList.toggle('selected', c.getAttribute('data-freq') === '2');
  });
  document.querySelectorAll('#manualMedPeriodRow .period-chip').forEach(function(c){
    c.classList.toggle('selected', c.getAttribute('data-period') === 'every_day');
  });
  document.querySelectorAll('#manualMedUnits .unit-chip').forEach(function(c){
    c.classList.toggle('selected', c.getAttribute('data-unit') === 'мг');
  });
  openDetail('detail-manualmed');
  setTimeout(function(){ if (nameInput) nameInput.focus(); }, 400);
}

function setManualMedStep(step){
  manualMedState.step = step;
  var track = document.getElementById('manualMedTrack');
  var progress = document.getElementById('manualMedProgress');
  if (track) track.setAttribute('data-step', String(step));
  if (progress) progress.textContent = 'Шаг ' + (step + 1) + ' из 4';
  if (step === 2) {
    var doseInput = document.getElementById('manualMedDose');
    setTimeout(function(){ if (doseInput) doseInput.focus(); }, 450);
  }
  if (step === 3) renderMedCalendar();
}

function bindManualMedBtn(){
  var manualBtnEl = document.getElementById('manualBtn');
  if (!manualBtnEl || manualBtnEl._meBound) return;
  manualBtnEl._meBound = true;
  manualBtnEl.addEventListener('click', function(e){
    e.preventDefault();
    e.stopPropagation();
    openManualMedWizard();
  });
}
bindManualMedBtn();
document.querySelectorAll('[data-nav="meds"]').forEach(function(el){
  el.addEventListener('click', function(){ setTimeout(bindManualMedBtn, 50); });
});

var manualMedBackEl = document.getElementById('manualMedBack');
if (manualMedBackEl) {
  manualMedBackEl.addEventListener('click', function(){
    if (manualMedState.step > 0) setManualMedStep(manualMedState.step - 1);
    else closeDetail('detail-manualmed');
  });
}

function manualMedGoStep2(){
  var nameInput = document.getElementById('manualMedName');
  var name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    showToast('Введите название');
    if (nameInput) nameInput.focus();
    return;
  }
  manualMedState.name = name;
  setManualMedStep(1);
}
var manualMedNext1 = document.getElementById('manualMedNext1');
if (manualMedNext1) manualMedNext1.addEventListener('click', manualMedGoStep2);
var manualMedNameEl = document.getElementById('manualMedName');
if (manualMedNameEl) {
  manualMedNameEl.addEventListener('keydown', function(e){
    if (e.key === 'Enter') { e.preventDefault(); manualMedGoStep2(); }
  });
}

document.querySelectorAll('#manualMedFreqRow .freq-chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    document.querySelectorAll('#manualMedFreqRow .freq-chip').forEach(function(c){ c.classList.remove('selected'); });
    chip.classList.add('selected');
    manualMedState.freq = parseInt(chip.getAttribute('data-freq'), 10) || 2;
  });
});

document.querySelectorAll('#manualMedPeriodRow .period-chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    document.querySelectorAll('#manualMedPeriodRow .period-chip').forEach(function(c){ c.classList.remove('selected'); });
    chip.classList.add('selected');
    manualMedState.period = chip.getAttribute('data-period') || 'every_day';
  });
});

var manualMedNext2 = document.getElementById('manualMedNext2');
if (manualMedNext2) {
  manualMedNext2.addEventListener('click', function(){ setManualMedStep(2); });
}

document.querySelectorAll('#manualMedUnits .unit-chip').forEach(function(chip){
  chip.addEventListener('click', function(){
    document.querySelectorAll('#manualMedUnits .unit-chip').forEach(function(c){ c.classList.remove('selected'); });
    chip.classList.add('selected');
    manualMedState.unit = chip.getAttribute('data-unit') || 'мг';
  });
});

var manualMedNext3 = document.getElementById('manualMedNext3');
if (manualMedNext3) {
  manualMedNext3.addEventListener('click', function(){
    var doseInput = document.getElementById('manualMedDose');
    manualMedState.dose = doseInput ? doseInput.value.trim() : '';
    setManualMedStep(3);
  });
}

var calPrev = document.getElementById('calPrev');
var calNext = document.getElementById('calNext');
if (calPrev) {
  calPrev.addEventListener('click', function(){
    manualMedState.calMonth--;
    if (manualMedState.calMonth < 0) { manualMedState.calMonth = 11; manualMedState.calYear--; }
    renderMedCalendar();
  });
}
if (calNext) {
  calNext.addEventListener('click', function(){
    manualMedState.calMonth++;
    if (manualMedState.calMonth > 11) { manualMedState.calMonth = 0; manualMedState.calYear++; }
    renderMedCalendar();
  });
}

var manualMedDone = document.getElementById('manualMedDone');
if (manualMedDone) {
  manualMedDone.addEventListener('click', function(){
    if (!manualMedState.startDate || !manualMedState.endDate) {
      showToast('Выберите период лечения');
      return;
    }
    var dose = manualMedState.dose || '';
    var dosage = dose ? (dose + ' ' + manualMedState.unit) : manualMedState.unit;
    addMedication({
      name: manualMedState.name || 'Без названия',
      dosage: dosage,
      frequency_per_day: manualMedState.freq || 2,
      period: manualMedState.period || 'every_day',
      startDate: manualMedState.startDate,
      endDate: manualMedState.endDate,
      suggested_times: suggestTimes(manualMedState.freq || 2)
    });
    closeDetail('detail-manualmed');
    goTo('meds');
    showToast('Препарат добавлен');
    if (window.__meSaveMeds) window.__meSaveMeds();
  });
}

function todayISO(){
  // локальная календарная дата, не UTC — иначе для часовых поясов восточнее UTC
  // "сегодня" ещё несколько часов после полуночи считалось бы "вчера"
  var d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
}
function dayNum(s){ return Math.floor(Date.parse(s + 'T00:00:00Z') / 86400000); }
function isoPlusDays(s, n){ return new Date((dayNum(s) + n) * 86400000).toISOString().slice(0,10); }
function ruDate(s){
  var m = ['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  var d = new Date(s + 'T00:00:00Z');
  return d.getUTCDate() + ' ' + m[d.getUTCMonth()];
}

var RX_PROMPT = 'Это фото/скан/PDF рецепта или назначения врача (часто рукописный, почерк трудный, может быть несколько страниц). Полностью разбери ВСЮ схему лечения.\n\n' +
'Правила распознавания:\n' +
'- Читай по контексту. Неуверенное слово — наиболее вероятный вариант + "?" в конце.\n' +
'- СВЕРЯЙ названия с реальными препаратами и добавками. Если распознанное слово не совпадает ни с одним реальным препаратом — подставь ближайший по написанию РЕАЛЬНЫЙ препарат (напр. "Сортрет"→"Сотрет", "Фелаицин"→"Фолацин") и добавь "?".\n' +
'- НЕ выдумывай препараты, которых нет на листе. НЕ выдумывай ФИО.\n' +
'- Числа и единицы — ровно как в рецепте.\n\n' +
'Правила схемы (ГЛАВНОЕ):\n' +
'- ОДИН препарат = ОДИН объект в "meds", даже если доза меняется. НЕ создавай отдельные препараты "Метипред 30", "Метипред 20" — это ОДИН "Метипред" с несколькими "stages".\n' +
'- Снижение/повышение дозы по этапам (например: 30 мг 1 месяц, затем 20 мг 1 месяц, затем 10 мг 1 месяц) = один препарат, массив "stages" по порядку, у каждого этапа своя "duration_days". Месяц = 30, неделя = 7.\n' +
'- Приём одинаковый весь курс — один элемент "stages".\n' +
'- Для каждого этапа: если в рецепте НАПИСАНО, сколько принимать — поставь duration_days и duration_source:"prescription". Если НЕ написано — duration_days: null и duration_source:"unknown".\n' +
'- "при необходимости" / "при обострении" — as_needed: true.\n' +
'- times: разумное время (утро 08:00, день 14:00, вечер 20:00) по числу приёмов в день.\n\n' +
'Ответь СТРОГО JSON без markdown:\n' +
'{"raw_text":"весь распознанный текст построчно",' +
'"meds":[{"name":"препарат без дозы (? если неточно)","purpose":"зачем назначен, короткая простая фраза",' +
'"as_needed":false,' +
'"stages":[{"dose":"30 мг","per_day":1,"times":["08:00"],"duration_text":"1 месяц или пусто","duration_days":30,"duration_source":"prescription","note":""}]}]}\n' +
'Если рецепта нет — {"raw_text":"...","meds":[]}. Только JSON.';

/* нормализуем один stage из ответа модели */
function normStage(s){
  var times = (Array.isArray(s.times) ? s.times : []).filter(function(t){ return /^\d{1,2}:\d{2}$/.test(t); })
    .map(function(t){ return t.length === 4 ? '0' + t : t; });
  var per = Number(s.per_day || s.perDay) || times.length || 1;
  if (!times.length) times = suggestTimes(per);
  var dd = Number(s.duration_days != null ? s.duration_days : s.durationDays);
  return {
    dose: String(s.dose || s.dosage || '').trim(),
    perDay: per,
    times: times,
    durationDays: (isFinite(dd) && dd > 0) ? Math.round(dd) : null,
    durationText: String(s.duration_text || s.durationText || '').trim(),
    durationSource: String(s.duration_source || s.durationSource || '').trim(),
    estimated: !!s.estimated,
    estWhy: String(s.estWhy || '').trim(),
    note: String(s.note || '').trim()
  };
}
function medStages(m){
  var st = (Array.isArray(m.stages) && m.stages.length) ? m.stages.map(normStage) : null;
  if (!st){
    var per = Number(m.frequency_per_day || m.perDay) || (m.suggested_times || []).length || 2;
    st = [ normStage({ dose: m.dosage || m.dose || '', per_day: per, times: m.suggested_times, note: m.schedule || '' }) ];
  }
  return st.slice(0, 12);
}

/* базовое имя без дозы/единиц — для объединения дублей одного препарата */
function baseMedName(n){
  return String(n || '').toLowerCase()
    .replace(/[\d]+[.,]?[\d]*\s*(мг|мкг|мл|гр|ме|iu|ед|%|таб|табл|капс)\.?/gi, ' ')
    .replace(/["'?()·,\-–—]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
/* если модель разбила один препарат с меняющейся дозой на несколько — склеиваем в этапы */
function mergeSameName(list){
  var out = [], byName = {};
  list.forEach(function(m){
    var key = baseMedName(m.name);
    if (key && byName[key] && !m.asNeeded && !byName[key].asNeeded){
      byName[key].stages = byName[key].stages.concat(m.stages);
      if (!byName[key].purpose && m.purpose) byName[key].purpose = m.purpose;
    } else {
      var copy = { name: m.name, purpose: m.purpose, asNeeded: m.asNeeded, startDate: m.startDate || null, stages: m.stages.slice() };
      byName[key] = copy; out.push(copy);
    }
  });
  // у склеенных препаратов подчистим название от дозы
  out.forEach(function(m){
    if (m.stages.length > 1){
      var b = baseMedName(m.name);
      if (b) m.name = b.charAt(0).toUpperCase() + b.slice(1);
    }
  });
  return out;
}

/* если врач не указал длительность — спрашиваем у ИИ типичный курс, помечаем как «оценка» */
async function fillMissingDurations(norm){
  var need = norm.filter(function(m){ return !m.asNeeded && m.stages.some(function(s){ return !s.durationDays; }); });
  if (!need.length) return norm;
  try {
    var q = 'В рецепте для некоторых препаратов НЕ указана длительность приёма. Для КАЖДОГО препарата дай реалистичную длительность курса.\n' +
      'Список:\n' + norm.map(function(m, i){
        return (i+1) + ') ' + m.name + ' — этапы: ' + m.stages.map(function(s){ return (s.dose || 'доза') + (s.durationDays ? ' (' + s.durationDays + ' дн, указано врачом)' : ' (не указано)'); }).join('; ');
      }).join('\n') + '\n\n' +
      'Правила:\n' +
      '- ВСЕГДА дай конкретное число дней для каждого этапа. НИКОГДА не ставь 0 и не пиши «постоянно».\n' +
      '- Многоэтапный курс (снижение/повышение дозы) — реальные дни на этап (обычно 14-30).\n' +
      '- Витамины / БАД / добавки (Омега-3, магний, железо, витамины) — ставь МАКСИМАЛЬНЫЙ безопасный срок непрерывного приёма (обычно 30-90 дней), после которого нужен перерыв или контроль. В why напиши это.\n' +
      '- Безопасность: сосудосуживающие капли в нос — не дольше 5-7 дней; антибиотики — 5-10 дней; НПВС (обезболивающие) — 5-14 дней; и т.п.\n\n' +
      'Верни СТРОГО JSON-массив, по одному объекту на препарат В ТОМ ЖЕ ПОРЯДКЕ:\n' +
      '[{"stage_days":[число дней на каждый этап; для указанных врачом — то же число],"why":"короткое пояснение простыми словами, до какого срока безопасно"}]\n' +
      'Только JSON.';
    var raw = await claudeMessage(q, 2200, '');
    var arr = parseJSONLoose(raw);
    if (Array.isArray(arr)){
      norm.forEach(function(m, i){
        var info = arr[i];
        if (!info || !Array.isArray(info.stage_days)) return;
        m.stages.forEach(function(s, j){
          if (s.durationDays) return; // врач указал — не трогаем
          var d = Number(info.stage_days[j] != null ? info.stage_days[j] : info.stage_days[info.stage_days.length - 1]);
          if (isFinite(d) && d > 0){
            s.durationDays = Math.min(Math.max(Math.round(d), 1), 365);
            s.estimated = true;
            s.estWhy = String(info.why || '').slice(0, 240);
          }
        });
      });
    }
  } catch(e){}
  return norm;
}

/* у каждого курса ДОЛЖЕН быть конец — бесконечного приёма не бывает */
function finalizeMed(m){
  if (m.asNeeded) return m;
  var multi = m.stages.length > 1;
  m.stages.forEach(function(s){
    if (!s.durationDays){
      s.durationDays = multi ? 30 : 60;
      s.estimated = true;
      if (!s.estWhy) s.estWhy = multi
        ? 'В рецепте не указан срок этапа — Me поставил 30 дней. Уточните у врача.'
        : 'В рецепте не указан срок — Me поставил максимальный безопасный: 60 дней, дальше нужен перерыв или контроль врача.';
    }
  });
  return m;
}

/* единый вход: нормализация → склейка дублей → досбор длительностей → в state */
async function ingestMeds(rawList, opts){
  opts = opts || {};
  var norm = (rawList || []).map(function(m){
    return {
      name: m.name || 'Без названия',
      purpose: m.purpose || '',
      asNeeded: !!(m.as_needed || m.asNeeded),
      startDate: m.startDate || null,
      stages: medStages(m)
    };
  });
  norm = mergeSameName(norm);
  var before = JSON.stringify(norm);
  norm = await fillMissingDurations(norm);
  norm.forEach(finalizeMed);
  var today = todayISO();
  norm.forEach(function(m){
    addMedication({ name: m.name, purpose: m.purpose, asNeeded: m.asNeeded, stages: m.stages, startDate: m.startDate || today });
  });
  var changed = JSON.stringify(norm) !== before;
  if ((opts.save || changed) && window.__meSaveMeds) window.__meSaveMeds();
  return norm;
}

/* активный этап курса на дату (или null — курс завершён / ещё не начат) */
function activeStage(med, dateStr){
  var stages = med.stages || [];
  if (!stages.length) return null;
  var elapsed = dayNum(dateStr) - dayNum(med.startDate || dateStr);
  if (elapsed < 0) return null;
  var acc = 0;
  for (var i = 0; i < stages.length; i++){
    var d = stages[i].durationDays;
    // средний этап без длительности не должен «зависать» навсегда — даём 30 дней по умолчанию
    if (!d && i < stages.length - 1) d = 30;
    if (!d) return { stage: stages[i], index: i, startsOn: isoPlusDays(med.startDate, acc), endsOn: null };
    if (elapsed < acc + d) return { stage: stages[i], index: i, startsOn: isoPlusDays(med.startDate, acc), endsOn: isoPlusDays(med.startDate, acc + d - 1) };
    acc += d;
  }
  return null;
}
function stageStart(med, idx){
  var acc = 0;
  for (var i = 0; i < idx; i++){ acc += (med.stages[i].durationDays || (i < med.stages.length - 1 ? 30 : 0)); }
  return isoPlusDays(med.startDate, acc);
}
function courseDone(med){ return med.startDate && !activeStage(med, todayISO()) && dayNum(todayISO()) >= dayNum(med.startDate); }

function stageLabel(st){
  var parts = [];
  if (st.dose) parts.push(st.dose);
  parts.push(st.perDay === 1 ? '1 раз в день' : st.perDay + ' раза в день');
  return parts.join(' · ');
}

var __rxEstNotes = {};
async function confirmRxMeds(meds, rawText){
  var norm = meds.map(function(m){ return { name: m.name || 'Без названия', purpose: m.purpose || '', asNeeded: !!m.as_needed, stages: medStages(m) }; });
  norm = mergeSameName(norm);

  openSheet('<p class="sheet-title">Врач назначил</p><div class="inline-status"><div class="spinner"></div><span>Собираю план приёма…</span></div>');
  norm = await fillMissingDurations(norm);
  norm.forEach(finalizeMed);

  __rxEstNotes = {};
  var rows = norm.map(function(m, mi){
    var stageHtml = m.stages.map(function(st, i){
      var dur, est = '';
      if (st.durationDays){
        dur = (st.durationText && !st.estimated) ? st.durationText : (st.durationDays + ' дн.');
        if (st.estimated){
          var nid = 'e' + mi + '_' + i;
          __rxEstNotes[nid] = st.estWhy || 'В рецепте не указано, сколько принимать — взяли типичный курс.';
          est = ' <button class="est-badge" data-est="' + nid + '">≈ оценка</button>';
        }
      } else {
        dur = 'постоянно';
      }
      return '<div style="font-size:12.5px;color:var(--ink-2);margin-top:3px;">' +
        (m.stages.length > 1 ? '<b>Этап ' + (i+1) + ':</b> ' : '') + esc(stageLabel(st)) + ' · ' + esc(dur) + est +
        ' <span style="color:var(--ink-3);">(' + esc(st.times.join(', ')) + ')</span></div>';
    }).join('');
    return '<div style="padding:11px 0;border-bottom:1px solid var(--border-soft);">' +
      '<p style="margin:0;font-weight:600;font-size:15px;">' + esc(m.name) + (m.asNeeded ? ' <span style="font-weight:400;color:var(--ink-3);">(при необходимости)</span>' : '') + '</p>' +
      (m.purpose ? '<p style="margin:2px 0 0;font-size:12.5px;color:var(--ink-3);">' + esc(m.purpose) + '</p>' : '') +
      stageHtml + '</div>';
  }).join('');
  var rawBlock = rawText
    ? '<details style="margin:12px 0 4px;"><summary style="font-size:13px;color:var(--ink-2);cursor:pointer;">Показать распознанный текст</summary>' +
      '<pre style="white-space:pre-wrap;font-size:12px;color:var(--ink-3);margin:8px 0 0;font-family:inherit;line-height:1.5;">' + esc(rawText) + '</pre></details>'
    : '';
  openSheet(
    '<p class="sheet-title">Врач назначил</p>' +
    '<p class="sheet-sub">Сверьте названия и дозы с рецептом — почерк распознан примерно.</p>' + rows + rawBlock +
    '<p style="font-size:13px;color:var(--ink-2);line-height:1.5;margin:14px 0 12px;">Внести курс в календарь? Me будет напоминать в Telegram, а при смене дозы — сам обновит этап.</p>' +
    '<button class="cta accent" id="rxYes">Да, внести курс</button>' +
    '<button class="cta secondary" id="rxNo" style="margin-top:8px;">Не сейчас</button>'
  );
  document.querySelectorAll('#sheetContent [data-est]').forEach(function(b){
    b.addEventListener('click', function(){
      showToast(__rxEstNotes[b.dataset.est] || 'Оценка длительности');
    });
  });
  var apply = function(){
    var today = todayISO();
    norm.forEach(function(m){ addMedication({ name: m.name, purpose: m.purpose, asNeeded: m.asNeeded, stages: m.stages, startDate: today }); });
    closeSheet(); goTo('meds'); showToast('Курс внесён в календарь');
    if (window.__meSaveMeds) window.__meSaveMeds();
  };
  var y = document.getElementById('rxYes'), n = document.getElementById('rxNo');
  if (y) y.addEventListener('click', apply);
  if (n) n.addEventListener('click', function(){ apply(); });
}

function addMedication(m){
  var stages = (Array.isArray(m.stages) && m.stages.length && m.stages[0].times) ? m.stages : medStages(m);
  var first = stages[0] || { dose:'', perDay:1, times:['09:00'] };
  state.meds.push({
    id: 'm' + Math.random().toString(36).slice(2, 8),
    name: m.name || 'Без названия',
    purpose: m.purpose || '',
    asNeeded: !!m.asNeeded,
    dosage: first.dose || m.dosage || '',
    startDate: m.startDate || todayISO(),
    endDate: m.endDate || null,
    stages: stages,
    taken: {}
  });
  renderMeds(); renderTimeline(); refreshHealthSubtitles();
  if (typeof refreshStatusCards === 'function') refreshStatusCards();
}

/* приёмы на сегодня по всем препаратам */
function todayDoses(){
  var today = todayISO();
  var list = [];
  state.meds.forEach(function(med){
    if (med.asNeeded) return;
    var act = activeStage(med, today);
    if (!act) return;
    act.stage.times.forEach(function(tm){
      var key = today + '|' + act.index + '|' + tm;
      list.push({ medId: med.id, name: med.name, dose: act.stage.dose, time: tm, key: key, taken: !!med.taken[key] });
    });
  });
  list.sort(function(a,b){ return a.time.localeCompare(b.time); });
  return list;
}

var medsDoneOpen = false; // раскрыт ли свёрнутый список уже принятых доз (сбрасывается при перезагрузке)

function doseRowHtml(d, cls){
  return '<div class="dose-row ' + cls + '" data-dose="' + esc(d.key) + '" data-med="' + esc(d.medId) + '">' +
    '<span class="dose-time">' + d.time + '</span>' +
    '<span class="dose-name">' + esc(d.name) + (d.dose ? ' <span class="dose-dose">' + esc(d.dose) + '</span>' : '') + '</span>' +
    '<span class="dose-check">' + (cls === 'done' ? '✓' : '') + '</span></div>';
}

function renderMeds(){
  refreshMedEmptyState();
  if (!state.meds.length){ medScheduleList.innerHTML = ''; return; }
  var now = currentHHMM();
  var doses = todayDoses();

  var todayHtml = '<p class="med-block-label">Сегодня</p>';
  if (!doses.length){
    todayHtml += '<div class="med-today-empty">На сегодня приёмов по расписанию нет</div>';
  } else {
    var pending = doses.filter(function(d){ return !d.taken; });
    var done = doses.filter(function(d){ return d.taken; });
    var allDone = doses.length > 0 && pending.length === 0;

    var rowsHtml = pending.map(function(d){ return doseRowHtml(d, d.time <= now ? 'due' : 'later'); }).join('');

    if (done.length){
      if (medsDoneOpen){
        rowsHtml += '<div class="dose-group-header" id="doseDoneToggle">Принято сегодня' +
          '<span class="dgh-count">' + done.length + '</span><span class="dgh-arrow">︿</span></div>';
        rowsHtml += done.map(function(d){ return doseRowHtml(d, 'done'); }).join('');
      } else if (allDone){
        rowsHtml += '<div class="med-all-done" id="doseDoneToggle">' +
          '<span class="adn-badge"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path class="adn-check" d="M5 13l4 4L19 7"/></svg></span>' +
          '<span class="adn-text">Всё принято на сегодня</span></div>';
      } else {
        var names = done.map(function(d){ return d.name; }).join(', ');
        rowsHtml += '<div class="dose-done-summary" id="doseDoneToggle">' +
          '<span class="dds-badge">✓</span><span class="dds-text">Принято: ' + esc(names) + '</span>' +
          '<span class="dds-count">' + done.length + '</span></div>';
      }
    }

    todayHtml += '<div class="med-today">' + rowsHtml + '</div>';
  }

  var cardsHtml = '<p class="med-block-label" style="margin-top:18px;">Курс</p>' + state.meds.map(function(med){
    var act = activeStage(med, todayISO());
    var done = courseDone(med);
    var head = '<div class="mc-top"><p class="mc-name" data-explain="' + esc(med.id) + '">' + esc(med.name) +
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:5px;vertical-align:-1px;opacity:.5;"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg></p>' +
      '<button class="mc-del" data-del="' + med.id + '" aria-label="Удалить">×</button></div>';
    var body;
    var durText = courseDurationText(med); // «до 6 окт» / «постоянно»
    var left = daysLeft(med);              // сколько дней до конца курса (или null — бессрочно)
    if (med.asNeeded){
      body = '<p class="mc-now">При необходимости' + (med.dosage ? ' · ' + esc(med.dosage) : '') + '</p>';
    } else if (done){
      body = '<p class="mc-now mc-done">Курс завершён</p>';
    } else if (act){
      var multi = med.stages.length > 1;
      body = '<p class="mc-now">' + (multi ? 'Сейчас: ' : '') + esc(stageLabel(act.stage)) + '</p>' +
        '<p class="mc-times">' + act.stage.times.join(' · ') + '</p>';
      if (left != null){
        body += '<p class="mc-left">осталось ' + plur(left, ['день','дня','дней']) + ' · до ' + ruDate(courseEndISO(med)) + '</p>';
      } else {
        body += '<p class="mc-times">принимать постоянно</p>';
      }
      if (med.stages[act.index + 1]){
        var nx = med.stages[act.index + 1];
        body += '<p class="mc-next">→ дальше: ' + esc(stageLabel(nx)) + ' с ' + ruDate(stageStart(med, act.index + 1)) + '</p>';
      }
    } else {
      body = '<p class="mc-now">Начало ' + ruDate(med.startDate) + '</p>';
    }
    var estStage = med.stages.filter(function(s){ return s.estimated; })[0];
    if (estStage && !done && !med.asNeeded){
      body += '<p class="mc-next"><button class="est-badge" data-estmed="' + med.id + '">≈ срок примерный</button></p>';
    }
    var courseEl = '';
    if (med.stages.length > 1){
      courseEl = '<details class="mc-course"><summary>Весь курс (' + med.stages.length + ' этапа)</summary>' +
        med.stages.map(function(st, i){
          var from = ruDate(stageStart(med, i));
          var dur = (st.durationText && !st.estimated) ? st.durationText : (st.durationDays ? st.durationDays + ' дн.' + (st.estimated ? ' (оценка)' : '') : 'постоянно');
          var cur = act && act.index === i;
          return '<div class="cs-stage' + (cur ? ' cur' : '') + '"><b>' + (i+1) + '.</b> ' + esc(stageLabel(st)) +
            '<span class="cs-meta">c ' + from + ' · ' + dur + ' · ' + st.times.join(', ') + '</span></div>';
        }).join('') + '</details>';
    }
    return '<div class="med-card">' + head + body + courseEl + '</div>';
  }).join('');

  var hasCourse = state.meds.some(function(m){ return !m.asNeeded; });
  var calBtn = hasCourse
    ? '<button class="course-btn" id="openCourseCal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Календарь курса — что пить по дням</button>'
    : '';

  medScheduleList.innerHTML = todayHtml + cardsHtml + calBtn;

  var ocb = document.getElementById('openCourseCal');
  if (ocb) ocb.addEventListener('click', function(){ openCourseCalendar(); });

  medScheduleList.querySelectorAll('[data-estmed]').forEach(function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();
      var med = state.meds.find(function(m){ return m.id === b.dataset.estmed; });
      var st = med && med.stages.filter(function(s){ return s.estimated; })[0];
      showToast((st && st.estWhy) ? st.estWhy : 'В рецепте не указано, сколько принимать — Me поставил типичный курс. Уточните у врача.', 4000);
    });
  });

  medScheduleList.querySelectorAll('.dose-row').forEach(function(row){
    row.addEventListener('click', function(){
      var med = state.meds.find(function(m){ return m.id === row.dataset.med; });
      if (!med) return;
      var willBeTaken = !med.taken[row.dataset.dose];
      med.taken[row.dataset.dose] = willBeTaken;
      // мгновенная обратная связь на самой строке — полный перерендер (со сборкой в свёрнутую
      // строку) идёт следом, чтобы сначала отыграла анимация галочки
      row.classList.remove('due', 'later');
      row.classList.toggle('done', willBeTaken);
      var chk = row.querySelector('.dose-check');
      if (chk) chk.textContent = willBeTaken ? '✓' : '';
      if (typeof __haptic === 'function') __haptic('light');
      if (typeof refreshStatusCards === 'function') refreshStatusCards();
      if (typeof window.__meSaveMeds === 'function') window.__meSaveMeds();

      var doses = todayDoses();
      if (willBeTaken && doses.length && doses.every(function(d){ return d.taken; })){
        try { var _tg = window.Telegram && window.Telegram.WebApp; if (_tg && _tg.HapticFeedback) _tg.HapticFeedback.notificationOccurred('success'); } catch(e){}
      }
      setTimeout(renderMeds, willBeTaken ? 550 : 0);
    });
  });
  var doseDoneToggle = document.getElementById('doseDoneToggle');
  if (doseDoneToggle) doseDoneToggle.addEventListener('click', function(){
    medsDoneOpen = !medsDoneOpen;
    renderMeds();
  });
  medScheduleList.querySelectorAll('[data-explain]').forEach(function(el){
    el.addEventListener('click', function(){ openMedExplain(el.dataset.explain); });
  });
  medScheduleList.querySelectorAll('[data-del]').forEach(function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();
      state.meds = state.meds.filter(function(m){ return m.id !== b.dataset.del; });
      renderMeds(); renderTimeline(); refreshHealthSubtitles();
      if (typeof refreshStatusCards === 'function') refreshStatusCards();
      if (window.__meSaveMeds) window.__meSaveMeds();
    });
  });
}

/* длительность курса препарата: сумма конечных этапов от startDate */
function courseTotalDays(med){
  if (!med.stages || !med.stages.length) return null;
  var total = 0;
  for (var i = 0; i < med.stages.length; i++){
    var d = med.stages[i].durationDays;
    if (!d) return null; // есть бессрочный этап → курс без конца
    total += d;
  }
  return total;
}
function courseEndISO(med){
  var t = courseTotalDays(med);
  return t ? isoPlusDays(med.startDate, t - 1) : null;
}
function courseDurationText(med){
  var end = courseEndISO(med);
  if (!end) return 'постоянно';
  return 'до ' + ruDate(end);
}
function daysLeft(med){
  var end = courseEndISO(med);
  if (!end) return null;
  return Math.max(0, dayNum(end) - dayNum(todayISO()) + 1);
}
function plur(n, forms){
  var a = Math.abs(n) % 100, b = a % 10;
  var w = (a > 10 && a < 20) ? forms[2] : (b > 1 && b < 5) ? forms[1] : (b === 1) ? forms[0] : forms[2];
  return n + ' ' + w;
}

/* что принимать в конкретную дату (все препараты) */
function dosesForDate(dateStr){
  var out = [];
  state.meds.forEach(function(med){
    if (med.asNeeded) return;
    var act = activeStage(med, dateStr);
    if (!act) return;
    out.push({ name: med.name, dose: act.stage.dose, times: act.stage.times.slice(), estimated: !!act.stage.estimated });
  });
  return out;
}

var courseCal = { y: 0, m: 0, sel: null };
function openCourseCalendar(){
  var t = new Date();
  courseCal = { y: t.getFullYear(), m: t.getMonth(), sel: todayISO() };
  renderCourseCal();
  openDetail('detail-course');
}
function renderCourseCal(){
  var grid = document.getElementById('courseCalGrid');
  var label = document.getElementById('courseCalMonth');
  if (!grid) return;
  var MO = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  label.textContent = MO[courseCal.m] + ' ' + courseCal.y;
  var first = new Date(Date.UTC(courseCal.y, courseCal.m, 1));
  var startWd = (first.getUTCDay() + 6) % 7; // Пн=0
  var days = new Date(Date.UTC(courseCal.y, courseCal.m + 1, 0)).getUTCDate();
  var html = '';
  for (var i = 0; i < startWd; i++) html += '<button class="cal-day muted" disabled></button>';
  for (var d = 1; d <= days; d++){
    var iso = courseCal.y + '-' + String(courseCal.m + 1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    var has = dosesForDate(iso).length > 0;
    var cls = 'cal-day' + (has ? ' dose-day' : '') + (iso === courseCal.sel ? ' selected' : '') + (iso === todayISO() ? ' today-mark' : '');
    html += '<button class="' + cls + '" data-date="' + iso + '">' + d + '</button>';
  }
  grid.innerHTML = html;
  grid.querySelectorAll('[data-date]').forEach(function(b){
    b.addEventListener('click', function(){ courseCal.sel = b.dataset.date; renderCourseCal(); });
  });
  var panel = document.getElementById('courseDayPanel');
  var sel = courseCal.sel;
  var list = sel ? dosesForDate(sel) : [];
  var MOG = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  var human = sel ? (new Date(sel + 'T00:00:00Z').getUTCDate() + ' ' + MOG[Number(sel.slice(5,7)) - 1]) : '';
  panel.innerHTML = '<div class="course-day-panel"><h4>' + esc(human) + (sel === todayISO() ? ' · сегодня' : '') + '</h4>' +
    (list.length
      ? list.map(function(x){ return '<div class="cdp-item"><b>' + esc(x.name) + '</b>' + (x.dose ? ' · ' + esc(x.dose) : '') + ' — ' + esc(x.times.join(', ')) + (x.estimated ? ' <span style="color:var(--ink-3);font-size:11px;">≈ срок оценён</span>' : '') + '</div>'; }).join('')
      : '<div class="cdp-empty">В этот день приёма нет</div>') +
    '</div>';
}
(function(){
  var p = document.getElementById('courseCalPrev'), n = document.getElementById('courseCalNext');
  if (p) p.addEventListener('click', function(){ courseCal.m--; if (courseCal.m < 0){ courseCal.m = 11; courseCal.y--; } renderCourseCal(); });
  if (n) n.addEventListener('click', function(){ courseCal.m++; if (courseCal.m > 11){ courseCal.m = 0; courseCal.y++; } renderCourseCal(); });
})();

async function openMedExplain(medId){
  const med = state.meds.find(m => m.id === medId); if (!med) return;
  openSheet(`<p class="sheet-title">${esc(med.name)}</p><p class="sheet-sub">${esc(med.dosage)}</p><div class="inline-status"><div class="spinner"></div><span>Me объясняет назначение…</span></div>`);
  try {
    const raw = await claudeMessage(`Объясни простыми словами, для чего обычно назначают "${med.name}"${med.purpose ? ' (врач указал цель: ' + med.purpose + ')' : ''}: что это за препарат, при каких состояниях помогает, как действует. 3-5 предложений. Не меняй дозировку и не советуй отменять приём. Если название неточное — скажи об этом.`, 500);
    openSheet(`<p class="sheet-title">${esc(med.name)}</p><p class="sheet-sub">${esc(med.dosage)}</p><p style="font-size:14px; line-height:1.55;">${esc(raw)}</p>`);
  } catch(err){
    openSheet(`<p class="sheet-title">${esc(med.name)}</p><p class="sheet-sub">${esc(med.dosage)}</p><p style="font-size:14px; color:var(--ink-2);">Не получилось получить объяснение сейчас.</p>`);
  }
}

/* ================= CHAT ================= */
const chatScroll = document.getElementById('chatScroll');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatFileInput = document.getElementById('chatFileInput');
const chatAttachRow = document.getElementById('chatAttachRow');
var chatAttachments = []; // [{name, parts:[imageParts]}]

function renderChatAttachRow(){
  if (!chatAttachRow) return;
  if (!chatAttachments.length){ chatAttachRow.style.display = 'none'; chatAttachRow.innerHTML = ''; return; }
  chatAttachRow.style.display = 'flex';
  chatAttachRow.innerHTML = chatAttachments.map(function(a, i){
    return '<span class="chat-chip">' + esc(a.name.length > 18 ? a.name.slice(0,16) + '…' : a.name) + ' <button data-rm="' + i + '">×</button></span>';
  }).join('');
  chatAttachRow.querySelectorAll('[data-rm]').forEach(function(b){
    b.addEventListener('click', function(){ chatAttachments.splice(+b.dataset.rm, 1); renderChatAttachRow(); });
  });
}
if (chatFileInput) chatFileInput.addEventListener('change', async function(){
  var files = Array.from(chatFileInput.files || []);
  chatFileInput.value = '';
  for (var f of files){
    try {
      var parts = await fileToImageParts(f);
      chatAttachments.push({ name: f.name || 'файл', parts: parts });
    } catch(e){ showToast('Не удалось прикрепить файл'); }
  }
  renderChatAttachRow();
});

function fitAskPanel(){
  var p = document.getElementById('screen-ask');
  if (!p || !p.classList.contains('active')) return;
  var vh = window.innerHeight || 700;
  var prev = p.style.maxHeight;
  p.style.maxHeight = 'none';
  var need = p.scrollHeight;
  p.style.maxHeight = prev || Math.round(vh * 0.42) + 'px';
  // форсируем reflow, затем плавно тянемся к нужной высоте (в пределах 32%–82% экрана)
  void p.offsetHeight;
  var target = Math.max(vh * 0.32, Math.min(need + 2, vh * 0.82));
  p.style.maxHeight = Math.round(target) + 'px';
}
function addBubble(role, text){
  const div = document.createElement('div'); div.className = 'bubble ' + role; div.textContent = text;
  chatScroll.appendChild(div); chatScroll.scrollTop = chatScroll.scrollHeight;
  fitAskPanel();
  setTimeout(function(){ chatScroll.scrollTop = chatScroll.scrollHeight; }, 460);
  return div;
}
async function sendChat(text){
  text = (text || '').trim();
  var atts = chatAttachments.slice();
  if (!text && !atts.length) return;
  document.getElementById('suggestedChips').style.display = 'none';
  addBubble('user', text + (atts.length ? (text ? '\n' : '') + '📎 ' + atts.map(function(a){ return a.name; }).join(', ') : ''));
  chatInput.value = '';
  chatAttachments = []; renderChatAttachRow();
  const loadingBubble = addBubble('ai', '…');
  try {
    var imgParts = [];
    atts.forEach(function(a){ imgParts = imgParts.concat(a.parts); });
    var wantsLong = /подробн|развернут|все вариант|какие вариант|расскажи про|поэтапно|по шагам/i.test(text || '');
    var promptText = 'Данные пользователя (используй, если уместно):\n' + baseHealthContext() +
      '\n\nВопрос пользователя: ' + (text || 'Посмотри прикреплённый документ/снимок и очень коротко скажи, что здесь важно.') +
      (wantsLong ? '' : '\n\nОтветь ОЧЕНЬ КРАТКО — 2-4 предложения.');
    var content = imgParts.length ? imgParts.concat([{ type:'text', text: promptText }]) : promptText;
    var raw = await claudeMessage(content, wantsLong ? 2500 : 700);
    raw = String(raw).replace(/\*\*/g, '').replace(/^\s{0,3}#{1,6}\s*/gm, '').replace(/^\s*[-*•]\s+/gm, '— ').trim();
    loadingBubble.textContent = raw;
    fitAskPanel();
  } catch(err){ loadingBubble.textContent = 'Что-то пошло не так. Попробуйте снова.'; fitAskPanel(); }
}
chatSend.addEventListener('click', () => sendChat(chatInput.value));
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(chatInput.value); });
document.querySelectorAll('#suggestedChips .chip').forEach(chip => chip.addEventListener('click', () => sendChat(chip.textContent)));

/* открыть чат с готовым вопросом (из разбора снимка/анализа) — без промежуточных экранов */
function askAbout(text, autosend){
  document.querySelectorAll('.detail-screen.active').forEach(function(el){ closeDetail(el.id); });
  askReturn = 'health';
  goTo('ask');
  if (chatInput) chatInput.value = text || '';
  if (autosend && text) setTimeout(function(){ sendChat(text); }, 150);
  else if (chatInput) setTimeout(function(){ chatInput.focus(); }, 200);
}

/* ================= toast ================= */
let toastTimer = null;
function showToast(msg, duration){
  const toast = document.getElementById('toast');
  if (!toast) return;
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  toast.textContent = msg;
  // force reflow so fade restarts if already visible
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toastTimer = null;
  }, duration || 1000);
}
// ensure toast is hidden on load
(function(){ const t = document.getElementById('toast'); if (t) t.classList.remove('show'); })();

/* ================= float tab bar (blue pill + sagging row) ================= */
(function(){
  var nav = document.getElementById('tabbar'), bg = document.getElementById('fnBg'),
      path = document.getElementById('fnBgPath'), pill = document.getElementById('fnPill'),
      shadow = document.getElementById('fnPillShadow');
  if (!nav || !bg || !path || !pill) return;
  var tabs = [].slice.call(nav.querySelectorAll('.tab'));
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 62, R = 31, NW = 40, REST_D = 3, MAX_D = 14, PW = 54;
  var cx = 0, depth = REST_D, raf = 0, current = 0;

  function centre(i){ return W / tabs.length * (i + 0.5); }
  var easeOut = function(t){ return 1 - Math.pow(1 - t, 3); };
  var easeInOut = function(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; };
  function measure(){ W = nav.clientWidth; if (W) bg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); }

  function barPath(x, d){
    var lo = R + NW, hi = W - R - NW; x = Math.max(lo, Math.min(hi, x));
    return 'M' + R + ',0L' + (x-NW) + ',0'
      + 'C' + (x-NW*0.42) + ',0 ' + (x-NW*0.52) + ',' + d + ' ' + x + ',' + d
      + 'C' + (x+NW*0.52) + ',' + d + ' ' + (x+NW*0.42) + ',0 ' + (x+NW) + ',0'
      + 'L' + (W-R) + ',0A' + R + ',' + R + ' 0 0 1 ' + W + ',' + R
      + 'L' + W + ',' + (H-R) + 'A' + R + ',' + R + ' 0 0 1 ' + (W-R) + ',' + H
      + 'L' + R + ',' + H + 'A' + R + ',' + R + ' 0 0 1 0,' + (H-R)
      + 'L0,' + R + 'A' + R + ',' + R + ' 0 0 1 ' + R + ',0Z';
  }

  function render(){
    if (!W) return;
    path.setAttribute('d', barPath(cx, depth));
    var seatY = depth * 0.72;
    pill.style.transform   = 'translate(' + Math.round(cx - PW/2) + 'px,' + seatY + 'px)';
    shadow.style.transform = 'translate(' + Math.round(cx - PW/2) + 'px,' + (seatY*0.4) + 'px) scaleX(' + (1 + depth/80) + ')';
    for (var k = 0; k < tabs.length; k++){
      var dist = Math.abs(centre(k) - cx);
      var push = Math.max(0, depth * (1 - dist/118));
      tabs[k].querySelector('svg').style.transform = 'translateY(' + (push*0.55).toFixed(2) + 'px)';
    }
  }

  function place(i){ cx = centre(i); depth = REST_D; render(); }

  function swapIcon(){
    var svg = pill.querySelector('svg'), src = tabs[current].querySelector('svg');
    var a = svg.animate([{opacity:1},{opacity:0}], {duration:110, fill:'forwards'});
    a.onfinish = function(){
      svg.innerHTML = src.innerHTML;
      svg.animate([{opacity:0},{opacity:1}], {duration:170, easing:'ease-out', fill:'forwards'});
    };
  }

  function jump(to){
    var c0 = cx, c1 = centre(to), dur = reduce ? 1 : 320, t0 = performance.now();
    cancelAnimationFrame(raf);
    function frame(now){
      var p = Math.min(1, (now - t0) / dur);
      cx = c0 + (c1 - c0) * easeOut(p);
      depth = REST_D + (MAX_D - REST_D) * easeInOut(Math.min(1, p / 0.5));
      render();
      if (p < 1) raf = requestAnimationFrame(frame); else settle();
    }
    function settle(){
      var st = performance.now(), d0 = depth;
      (function relax(now){
        var p = Math.min(1, (now - st) / 280);
        depth = d0 + (REST_D - d0) * easeOut(p); render();
        if (p < 1) raf = requestAnimationFrame(relax);
      })(st);
    }
    raf = requestAnimationFrame(frame);
    setTimeout(swapIcon, dur * 0.34);
  }

  window.fnSync = function(name){
    var i = tabs.findIndex(function(t){ return t.dataset.nav === name; });
    if (i < 0) return;
    measure();
    var prev = current; current = i;
    if (!W || nav.style.display === 'none') return;        // bar hidden (Ask Me) — sync later
    if (!cx) cx = centre(prev >= 0 ? prev : 0);            // was hidden: start from previous slot
    if (i === prev) { place(i); return; }
    jump(i);
  };

  addEventListener('resize', function(){ measure(); place(current); });
  measure(); place(0);
})();

/* ================= inbox: файлы, присланные боту / пересланные из почты ================= */
async function inboxParts(it){
  var bin = atob(it.b64), u8 = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  var f = new File([u8], it.name || 'file', { type: it.mime || 'image/jpeg' });
  return fileToImageParts(f);   // reuse PDF-рендер + HEIC/downscale
}

async function classifyInboxDoc(parts){
  try {
    var r = await claudeMessage(parts.concat([{ type:'text', text:'Что это за медицинский документ? Ответь ОДНИМ словом: blood (анализ крови/мочи/биохимия), scan (заключение МРТ/КТ/УЗИ/рентген/ЭКГ), rx (рецепт, назначение лекарств), other.' }]), 16, '');
    var w = String(r || '').toLowerCase().match(/blood|scan|rx|other/);
    return w ? w[0] : 'other';
  } catch(e){ return 'other'; }
}

var inboxRunning = false;
async function processInbox(opts){
  if (inboxRunning) return;
  inboxRunning = true;
  try {
    var list;
    try { list = (await apiFetch('/api/inbox')).items || []; } catch(e){ return; }
    if (!list.length){ if (opts && opts.notify) showToast('Новых файлов нет'); return; }
    showToast('Разбираю файлы из чата…');
    for (var k = 0; k < list.length; k++){
      var meta = list[k], got;
      try { got = (await apiFetch('/api/inbox?id=' + encodeURIComponent(meta.id))).item; } catch(e){ got = null; }
      if (!got){ continue; }
      var done = false;
      try {
        var parts = await inboxParts(got);
        var kind = await classifyInboxDoc(parts);
        if (kind === 'blood'){
          var p = parseJSONLoose(await claudeMessage(parts.concat([{ type:'text', text:BLOOD_PROMPT }]), 7000, ''));
          if (p.markers && p.markers.length){ var bt = addBloodTest(p); if (window.__meSave) window.__meSave(p, 'upload'); goTo('health'); openBloodResult(bt.id); showToast('Анализ из чата добавлен'); }
          else throw new Error('no markers');
        } else if (kind === 'scan'){
          var s = parseJSONLoose(await claudeMessage(parts.concat([{ type:'text', text:SCAN_PROMPT }]), 6000, ''));
          if (s.plain_conclusion || (s.findings && s.findings.length)){ var sc = addScan(s); if (window.__meSave) window.__meSave(s, 'scan'); goTo('health'); openScanResult(sc.id); showToast('Снимок из чата добавлен'); }
          else throw new Error('empty scan');
        } else if (kind === 'rx'){
          var rx = parseJSONLoose(await claudeMessage(parts.concat([{ type:'text', text:RX_PROMPT }]), 7000, ''));
          var meds = pickMeds(rx);
          if (meds.length){ goTo('meds'); confirmRxMeds(meds, rx.raw_text || ''); showToast('Рецепт из чата — проверьте и подтвердите'); }
          else throw new Error('no meds');
        } else {
          showToast('Файл не похож на анализ, снимок или рецепт');
        }
        done = true;
      } catch(e){ console.warn('inbox item', e); reportFail('inbox', e); showToast('Один файл не удалось разобрать'); }
      // не удаляем файл сразу при первом неуспехе — даём второй шанс при следующем открытии
      var tries = {}; try { tries = JSON.parse(localStorage.getItem('me_inbox_tries') || '{}'); } catch(e){}
      tries[meta.id] = (tries[meta.id] || 0) + 1;
      if (done || tries[meta.id] >= 2){
        try { await apiFetch('/api/inbox', { method:'POST', body:{ id: meta.id } }); } catch(e){}
        delete tries[meta.id];
      }
      try { localStorage.setItem('me_inbox_tries', JSON.stringify(tries)); } catch(e){}
    }
  } finally { inboxRunning = false; }
}

/* ================= Telegram Mini App integration ================= */
(function(){
  var tg = window.Telegram && window.Telegram.WebApp;
  var API = window.ME_API || '';
  var initData = (tg && tg.initData) || '';
  var LIVE = !!initData;

  if (tg){
    document.body.classList.add('tg');
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor('#F0E7D5'); tg.setBackgroundColor('#E4D9C1'); } catch(e){}
    // никаких подтверждений при закрытии — вкладка должна закрываться сразу
    var killClose = function(){
      try { tg.disableClosingConfirmation(); } catch(e){}
      try { if (tg.isClosingConfirmationEnabled) tg.disableClosingConfirmation(); } catch(e){}
    };
    killClose();
    setTimeout(killClose, 400);
    setTimeout(killClose, 1600);
    document.addEventListener('visibilitychange', killClose);
    // реальное имя пользователя Telegram
    var u = (tg.initDataUnsafe && tg.initDataUnsafe.user) || {};
    var name = (u.first_name || '').trim();
    if (name) {
      var greetEl = document.getElementById('greetLine');
      if (greetEl) {
        var h = new Date().getHours();
        var g = h < 12 ? 'Доброе утро' : (h < 17 ? 'Добрый день' : 'Добрый вечер');
        greetEl.textContent = g + ', ' + name;
      }
      var pName = document.getElementById('profileName');
      if (pName) pName.textContent = name + (u.last_name ? ' ' + u.last_name : '');
      var pAva = document.getElementById('profileAva');
      if (pAva) pAva.textContent = name[0].toUpperCase();
      var pCity = document.getElementById('profileCity');
      if (pCity) pCity.textContent = u.username ? '@' + u.username : 'Telegram';
    }
  }
  function haptic(kind){ try { tg && tg.HapticFeedback.impactOccurred(kind || 'light'); } catch(e){} }
  window.__haptic = haptic;

  /* ---- BackButton mirrors detail screens / Ask panel ---- */
  function detailOpen(){ return document.querySelector('.detail-screen.active'); }
  function askOpen(){ var s = document.getElementById('screen-ask'); return s && s.classList.contains('active'); }
  function syncBack(){
    if (!tg) return;
    if (detailOpen() || askOpen()) tg.BackButton.show(); else tg.BackButton.hide();
  }
  if (tg){
    tg.BackButton.onClick(function(){
      var d = detailOpen();
      if (d) closeDetail(d.id);
      else if (askOpen()) goTo(typeof askReturn !== 'undefined' ? askReturn : 'today');
      haptic('light');
      setTimeout(syncBack, 80);
    });
    var mo = new MutationObserver(function(){ syncBack(); });
    mo.observe(document.body, { subtree:true, attributes:true, attributeFilter:['class'] });
    document.querySelectorAll('.tab, .status-card, .cta, .chip, .row, .fam-add, .mail-collect').forEach(function(el){
      el.addEventListener('click', function(){ haptic('light'); });
    });
  }

  /* ---- persistence + deep link ---- */
  window.__meSave = LIVE ? function(analysis, source){
    apiFetch('/api/save', { method:'POST', body:{ analysis: analysis, source: source || 'upload' } })
      .then(function(j){
        if (!j || !j.id) return;
        var list = source === 'scan' ? state.scans : state.bloodTests;
        if (list && list.length) list[list.length - 1].serverId = j.id;
      })
      .catch(function(e){ console.warn('save', e); });
  } : null;

  var _medsSaving = false, _medsSaveAgain = false;
  window.__meSaveMeds = LIVE ? function(){
    if (_medsSaving) { _medsSaveAgain = true; return; }
    _medsSaving = true;
    var payload = (state.meds || []).map(function(m){
      return {
        name:m.name, dosage:m.dosage, purpose:m.purpose || '', asNeeded:!!m.asNeeded,
        startDate:m.startDate || null, endDate:m.endDate || null, taken:m.taken || {},
        stages:(m.stages||[]).map(function(s){ return { dose:s.dose, perDay:s.perDay, times:s.times, durationDays:s.durationDays, durationText:s.durationText||'', estimated:!!s.estimated, estWhy:s.estWhy||'', note:s.note||'' }; })
      };
    });
    apiFetch('/api/meds', { method:'POST', body:{ meds:payload, tzOffset: -new Date().getTimezoneOffset() } })
      .catch(function(e){ console.warn('meds save', e); }).finally(function(){
        _medsSaving = false;
        // пока предыдущий save летел, состояние успело измениться ещё раз — досохраняем его
        if (_medsSaveAgain){ _medsSaveAgain = false; window.__meSaveMeds(); }
      });
  } : null;

  window.__meSaveReminder = LIVE ? function(dueDate, text){
    apiFetch('/api/reminder', { method:'POST', body:{ dueDate:dueDate, text:text, kind:'visit', leadDays:7, tzOffset: -new Date().getTimezoneOffset() } })
      .catch(function(e){ console.warn('reminder save', e); });
  } : null;

  window.__meSaveVisit = LIVE ? function(v){
    apiFetch('/api/visit', { method:'POST', body:{ date:v.date, doctorType:v.doctorType, notes:v.notes, medication:v.medication, labs:v.labs, followUp:v.followUp } })
      .then(function(j){ if (j && j.id) v.serverId = j.id; })
      .catch(function(e){ console.warn('visit save', e); });
  } : null;

  window.__meErase = LIVE ? function(){ return apiFetch('/api/erase', { method:'POST', body:{} }); } : null;

  function startParam(){
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) return tg.initDataUnsafe.start_param;
    var u = new URL(location.href);
    return u.searchParams.get('startapp') || u.searchParams.get('tgWebAppStartParam') || '';
  }

  if (LIVE){
    apiFetch('/api/analyses')
      .then(function(j){
        (j.items || []).forEach(function(it){
          var p = it.analysis || {}; p._serverId = it.id;
          try {
            if (it.source === 'scan') addScan(p);
            else addBloodTest(p);
          } catch(e){}
        });
        var sp = startParam();
        if (sp && sp.indexOf('blood_') === 0){
          var sid = sp.slice(6);
          var bt = (state.bloodTests || []).filter(function(b){ return b.serverId === sid; })[0];
          if (bt){ goTo('health'); if (typeof renderBloodTestsList === 'function') renderBloodTestsList(); openDetail('detail-bloodtests'); openBloodResult(bt.id); }
        }
        if (sp && sp.indexOf('scan_') === 0){
          var ssid = sp.slice(5);
          var scn = (state.scans || []).filter(function(s){ return s.serverId === ssid; })[0];
          if (scn){ goTo('health'); openDetail('detail-scans'); openScanResult(scn.id); }
        }
      })
      .catch(function(e){ console.warn('load analyses', e); });

    apiFetch('/api/meds')
      .then(function(j){
        // ранее сохранённые лекарства восстанавливаем как есть (включая taken) —
        // без повторной склейки дублей/досбора длительностей: это уже финальные записи,
        // не свежераспознанный рецепт (для того есть отдельный путь через ingestMeds)
        (j.items || []).forEach(function(it){
          state.meds.push({
            id: 'm' + Math.random().toString(36).slice(2, 8),
            name: it.name || 'Без названия',
            purpose: it.purpose || '',
            asNeeded: !!it.asNeeded,
            dosage: (it.stages && it.stages[0] && it.stages[0].dose) || '',
            startDate: it.startDate || todayISO(),
            endDate: it.endDate || null,
            stages: (Array.isArray(it.stages) && it.stages.length) ? it.stages : medStages(it),
            taken: it.taken || {}
          });
        });
        if ((j.items || []).length){ renderMeds(); renderTimeline(); refreshHealthSubtitles(); if (typeof refreshStatusCards === 'function') refreshStatusCards(); }
      })
      .catch(function(e){ console.warn('load meds', e); });

    apiFetch('/api/visit')
      .then(function(j){
        (j.items || []).forEach(function(it){
          state.visits.push({
            id: 'v' + Math.random().toString(36).slice(2, 8),
            serverId: it.id,
            date: it.date || '', doctorType: it.doctorType || 'Врач',
            notes: Array.isArray(it.notes) ? it.notes : [],
            medication: it.medication || null, labs: it.labs || null, followUp: it.followUp || null
          });
        });
        if ((j.items || []).length){ renderTimeline(); refreshHealthSubtitles(); if (typeof renderVisitsList === 'function') renderVisitsList(); }
      })
      .catch(function(e){ console.warn('load visits', e); })
      .finally(function(){
        // ponytail: 800мс задержка вместо цепочки промисов — ждём, пока state прогрузится.
        // не дёргаем во время онбординга (модалка согласия перекрыла бы его).
        var obDone = false; try { obDone = !!localStorage.getItem('me_ob_done'); } catch(e){}
        if (obDone || startParam() === 'inbox') {
          setTimeout(function(){ processInbox().catch(function(e){ console.warn('inbox', e); }); }, 800);
        }
      });
  }
})();
