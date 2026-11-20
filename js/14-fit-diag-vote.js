/* ---------- 홈: 한 화면에 맞추기 (스크롤 없이) ---------- */
/* 폰 화면: 문서 스크롤 대신 .wrap 안에서 스크롤 (하단 탭바를 항상 화면 맨 아래에 고정) */
function isPhoneShell(){ return window.matchMedia('(max-width:768px)').matches; }
function pageScrollTop(behavior){
  const w = document.querySelector('.wrap');
  try{ if(w) w.scrollTo({top:0, behavior}); }catch(e){ if(w) w.scrollTop = 0; }
  try{ window.scrollTo({top:0, behavior}); }catch(e){}
}
/* 아이폰 홈 화면 앱: 화면 전체 높이를 직접 지정해서 상·하단 여백이 생기지 않게 합니다 */
function fitAppShell(){
  /* iOS 홈 화면 앱은 화면(예: 844) 중 일부(예: 797)까지만 그려줍니다.
     예전에는 높이를 화면 전체로 강제로 늘려 탭바 아래쪽이 잘렸으므로, 이제는 강제 지정을 하지 않고
     "실제로 그려지는 높이(innerHeight)"에 맞춥니다. 대신 html에 ios-short 클래스를 달아 아래 빈 공간을 탭바 색으로 채웁니다. */
  const root = document.documentElement;
  try{
    root.style.removeProperty('--app-h');
    const phone = window.matchMedia('(max-width:768px)').matches;
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    const portrait = window.innerHeight >= window.innerWidth;
    const sh = portrait ? Math.max(screen.height, screen.width) : Math.min(screen.height, screen.width);
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent||'');
    root.classList.toggle('ios-short', !!(ios && phone && standalone && portrait && sh - window.innerHeight >= 1 && sh - window.innerHeight <= 90));
  }catch(e){}
}
window.addEventListener('resize', fitAppShell);
window.addEventListener('orientationchange', ()=>setTimeout(fitAppShell,200));
fitAppShell();
function fitHomeToScreen(){
  /* 모든 탭이 하단 탭바 바로 위까지 화면을 꽉 채우도록 현재 탭의 높이를 맞춥니다.
     - 홈: 한 화면에 딱 맞게(넘치지 않게) 높이 고정
     - 그 외: 최소 높이만 지정(내용이 더 길면 스크롤) */
  fitAppShell();
  const sec = document.querySelector('.app-section.mobile-active');
  document.querySelectorAll('.app-section').forEach(x=>{ if(x!==sec){ x.style.height=''; x.style.minHeight=''; } });
  if(!sec) return;
  const isHome = sec.id === 'sectionHome';
  const wrap = document.querySelector('.wrap');
  const padB = wrap ? parseFloat(getComputedStyle(wrap).paddingBottom) || 96 : 96;
  const prevH = sec.style.height, prevMin = sec.style.minHeight;
  let top, avail;
  if(isPhoneShell() && wrap){
    top = sec.getBoundingClientRect().top - wrap.getBoundingClientRect().top + wrap.scrollTop;
    avail = wrap.clientHeight;
  }else{
    top = sec.getBoundingClientRect().top + window.scrollY;
    avail = window.innerHeight;
  }
  const h = Math.max(320, Math.floor(avail - top - padB));
  sec.style.minHeight = h + 'px'; sec.style.height = '';   // 내용이 더 길면(작은 화면) 잘리지 않고 스크롤되도록 최소 높이만 지정
  if(sec.style.minHeight !== prevMin && sec.id === 'sectionMap'){
    try{ if(map) map.relayout(); }catch(e){}
  }
}
window.addEventListener('resize', fitHomeToScreen);
window.addEventListener('orientationchange', ()=>setTimeout(fitHomeToScreen,200));
/* 높이 재계산: 예전에는 1초마다 강제로 계산해 버벅임의 원인이 됐습니다.
   이제는 탭 전환·화면 크기 변화·이미지 로딩 직후에만 계산하고, 보이는 동안 6초 간격으로만 보정합니다. */
function scheduleFit(){ [150,600,1500].forEach(ms=>setTimeout(fitHomeToScreen, ms)); }
window.addEventListener('load', scheduleFit);
setInterval(()=>{ if(!document.hidden) fitHomeToScreen(); }, 6000);



/* ---------- 화면 진단 (기종별 화면 잘림 원인 파악용) ---------- */

async function refreshDiagPush(){
  const box = document.getElementById('diagPush');
  if(!box) return;
  const rows = [];
  const add = (k, v, bad)=>rows.push(`<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span style="flex:0 0 150px;color:#8fa0a8">${k}</span><b style="font-weight:600;word-break:break-all;color:${bad?'#ff8f8f':'#fff'}">${String(v).replace(/</g,'&lt;')}</b></div>`);
  try{
    const perm = ('Notification' in window) ? Notification.permission : '지원 안 함';
    add('알림 권한', perm === 'granted' ? '허용됨' : perm === 'denied' ? '차단됨 (폰 설정에서 허용 필요)' : perm === 'default' ? '아직 선택 안 함' : perm, perm !== 'granted');
    add('앱 알림 설정', notifyIsOn() ? '켜짐' : '꺼짐', !notifyIsOn());
    add('로그인 이름', myName || '(없음)', !myName);
    let sub = null;
    if('serviceWorker' in navigator && 'PushManager' in window){
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r=>setTimeout(()=>r(null), 3000))]);
      add('서비스워커', reg ? '작동 중' : '준비 안 됨', !reg);
      if(reg){ try{ sub = await reg.pushManager.getSubscription(); }catch(_){} }
    }else{
      add('푸시 지원', '이 브라우저/모드는 푸시를 지원하지 않음 (아이폰은 홈 화면 앱에서만 가능)', true);
    }
    add('기기 푸시 구독', sub ? '있음' : '없음', !sub);
    let who = null;
    if(sub && supabaseClient){
      try{ const r = await supabaseClient.rpc('push_registered', { p_endpoint: sub.endpoint }); who = r && r.data; }catch(_){}
    }
    add('서버 등록', sub ? (who ? who + ' 이름으로 등록됨' : '미등록') : '-', !!sub && !who);
    const okAll = perm==='granted' && notifyIsOn() && sub && who;
    rows.push(`<div style="margin-top:8px;font-weight:800;color:${okAll?'#b6f23a':'#ffd76b'}">${okAll?'✅ 알림 받을 준비가 끝났어요':'⚠️ 위에서 빨간 항목을 먼저 해결하세요 (더보기 > 알림 설정에서 켜기)'}</div>`);
  }catch(e){ add('점검 오류', String(e && e.message || e), true); }
  box.innerHTML = rows.join('');
}

function openDiag(){
  let ov = document.getElementById('diagOverlay');
  if(ov) ov.remove();
  ov = document.createElement('div');
  ov.id = 'diagOverlay';
  ov.style.cssText = 'position:fixed;left:0;right:0;top:0;height:100%;z-index:99999;background:rgba(8,12,16,.94);color:#fff;font:12px/1.5 -apple-system,monospace;overflow:auto;padding:calc(env(safe-area-inset-top) + 12px) 14px 14px;box-sizing:border-box;';
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:1px;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const inset = { top: cs.paddingTop, bottom: cs.paddingBottom };
  probe.remove();
  const R = (el)=>{ if(!el) return '없음'; const r = el.getBoundingClientRect(); return `top ${Math.round(r.top)} / bottom ${Math.round(r.bottom)} / h ${Math.round(r.height)}`; };
  const vv = window.visualViewport;
  const lines = [
    ['기기/브라우저', (navigator.userAgent||'').replace(/Mozilla\/5.0 /,'').slice(0,110)],
    ['홈화면 앱(standalone)', String((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true)],
    ['screen (가로×세로)', screen.width + ' × ' + screen.height],
    ['innerWidth × innerHeight', window.innerWidth + ' × ' + window.innerHeight],
    ['visualViewport 높이', vv ? Math.round(vv.height) + ' (offsetTop ' + Math.round(vv.offsetTop) + ')' : '없음'],
    ['documentElement.clientHeight', document.documentElement.clientHeight],
    ['safe-area 위/아래', inset.top + ' / ' + inset.bottom],
    ['--app-h', document.documentElement.style.getPropertyValue('--app-h') || '(미설정)'],
    ['html', R(document.documentElement)],
    ['body', R(document.body)],
    ['하단 탭바', R(document.querySelector('nav.mobile-tabbar'))],
    ['스크롤 영역(.wrap)', R(document.querySelector('.wrap'))],
    ['devicePixelRatio', window.devicePixelRatio],
    ['앱 버전', (document.querySelector('script[src*="01-core.js"]')||{}).src ? (document.querySelector('script[src*="01-core.js"]').src.split('?')[1]||'') : '']
  ];
  ov.innerHTML = '<div style="font-size:15px;font-weight:800;color:#b6f23a;margin-bottom:8px">화면 진단 — 이 화면을 캡처해서 보내주세요</div>' +
    lines.map(l=>`<div style="display:flex;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.08)"><span style="flex:0 0 150px;color:#8fa0a8">${l[0]}</span><b style="font-weight:600;word-break:break-all">${String(l[1]).replace(/</g,'&lt;')}</b></div>`).join('') +
    '<div style="margin:14px 0 4px;font-size:14px;font-weight:800;color:#b6f23a">알림 점검</div><div id="diagPush" style="color:#8fa0a8">확인 중…</div>' +
    '<div style="display:flex;gap:8px;margin-top:8px"><button id="diagPushTest" style="flex:1;height:40px;border-radius:12px;border:1px solid #b6f23a;background:rgba(182,242,58,.12);color:#b6f23a;font-weight:800;font-size:13px">내게 테스트 알림 보내기</button><button id="diagPushReg" style="flex:1;height:40px;border-radius:12px;border:1px solid #3a4a54;background:#16212a;color:#fff;font-weight:700;font-size:13px">알림 다시 등록</button></div><div id="diagPushMsg" style="margin-top:6px;color:#ffd76b;min-height:16px"></div>' +
    '<div style="margin-top:10px;color:#8fa0a8">화면 아래쪽 색 선: <b style="color:#ff5252">빨강=innerHeight</b> · <b style="color:#4aa3ff">파랑=screen 높이</b> · <b style="color:#35d07f">초록=100vh</b> · <b style="color:#ffb020">주황=100dvh</b></div>' +
    '<button id="diagClose" style="margin-top:12px;height:42px;padding:0 22px;border-radius:12px;border:0;background:#b6f23a;color:#111;font-weight:800;font-size:14px">닫기</button>';
  document.body.appendChild(ov);
  const mk = (color, topCss, label)=>{ const d = document.createElement('div'); d.className='diag-line'; d.style.cssText = `position:fixed;left:0;right:0;top:${topCss};height:3px;background:${color};z-index:100000;pointer-events:none;`; const t = document.createElement('span'); t.textContent = label; t.style.cssText = `position:absolute;right:6px;bottom:3px;font:10px/1 monospace;color:${color};`; d.appendChild(t); document.body.appendChild(d); return d; };
  const lns = [
    mk('#ff5252', (window.innerHeight - 3) + 'px', 'innerHeight ' + window.innerHeight),
    mk('#4aa3ff', (screen.height - 3) + 'px', 'screen ' + screen.height),
    mk('#35d07f', 'calc(100vh - 3px)', '100vh'),
    mk('#ffb020', 'calc(100dvh - 3px)', '100dvh')
  ];
  refreshDiagPush();
  document.getElementById('diagPushTest').addEventListener('click', async (e)=>{
    const b = e.currentTarget, msg = document.getElementById('diagPushMsg');
    if(!myName){ msg.textContent = '로그인 후 이용해 주세요.'; return; }
    b.disabled = true; msg.textContent = '테스트 알림을 보내는 중…';
    msg.textContent = await sendMatchAlert('🔔 공생관 테스트 알림', '이 알림이 보이면 푸시가 정상 작동하는 거예요.', { kind:'test', targets:[myName] }) + ' · 몇 초 안에 알림이 오는지 확인하세요.';
    b.disabled = false;
  });
  document.getElementById('diagPushReg').addEventListener('click', async ()=>{
    const msg = document.getElementById('diagPushMsg');
    msg.textContent = '다시 등록하는 중…';
    try{ await ensurePushSubscription(); }catch(e){ console.error(e); }
    await refreshDiagPush();
    msg.textContent = '다시 등록을 시도했어요. 위 "서버 등록"이 이름으로 바뀌었는지 확인하세요.';
  });
  document.getElementById('diagClose').addEventListener('click', ()=>{ ov.remove(); lns.forEach(d=>d.remove()); });
}

/* ================= 투표 팝업(바텀시트) & 이번 주 투표 현황 ================= */
function openVoteSheet(){
  const sh = document.getElementById('voteSheet');
  if(!sh) return;
  window.__voteDraft = null;
  sh.hidden = false;
  document.body.classList.add('sheet-open');
  renderMatchPanel();
  requestAnimationFrame(()=>sh.classList.add('open'));
}
function closeVoteSheet(){
  const sh = document.getElementById('voteSheet');
  if(!sh || sh.hidden) return;
  sh.classList.remove('open');
  document.body.classList.remove('sheet-open');
  window.__voteDraft = null;
  setTimeout(()=>{ if(!sh.classList.contains('open')) sh.hidden = true; }, 220);
}
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeVoteSheet(); });
(function(){
  const dim = document.getElementById('voteSheetDim');
  if(dim) dim.addEventListener('click', closeVoteSheet);
  const tg = document.getElementById('wsToggle');
  if(tg) tg.addEventListener('click', ()=>{
    const body = document.getElementById('wsBody');
    if(!body) return;
    body.hidden = !body.hidden;
    tg.classList.toggle('open', !body.hidden);
    const t = tg.querySelector('span'); if(t) t.textContent = body.hidden ? '투표 현황' : '투표 현황 닫기';
    if(!body.hidden) renderWeekStatus();
  });
})();

/* ---------- 투표 알림: 이번 주(현황에서 선택한 주) 미투표 회원에게만 푸시 ---------- */
function getWsWeekInfo(off){
  const offset = (off===0||off===1) ? off : (window.__wsWeek === 1 ? 1 : 0);
  const base = parseYMD(getWeekStart(todayStr()));
  base.setDate(base.getDate() + offset*7);
  const end = new Date(base); end.setDate(end.getDate()+6);
  return { key: fmtDate(base), start: base, end };
}
function getUnvotedNames(off){
  if(!appData) return [];
  const { key } = getWsWeekInfo(off);
  const avail = (appData.weekAvailability && appData.weekAvailability[key]) || {};
  const absence = (appData.weekAbsence && appData.weekAbsence[key]) || {};
  return getApprovedNonAdminNames().filter(n=> !isCurrentlyInjured(n) && !(absence[n] || (avail[n]||[]).length)); // 부상자는 투표 대상이 아니므로 제외
}
function updateVoteAlertBtn(){
  const cnt = document.getElementById('voteAlertCnt');
  if(!cnt) return;
  cnt.textContent = '미투표 ' + getUnvotedNames().length + '명';
}
/* 투표 알림 버튼 → 이번 주 / 다음 주 선택 시트 */
function openVoteAlertSheet(){
  const old = document.getElementById('vaSheet'); if(old) old.remove();
  const rows = [0,1].map(off=>{
    const w = getWsWeekInfo(off);
    const names = getUnvotedNames(off);
    const label = `${w.start.getMonth()+1}/${w.start.getDate()}~${w.end.getMonth()+1}/${w.end.getDate()}`;
    return { off, label, names, tag: off===0?'이번 주':'다음 주' };
  });
  const el = document.createElement('div');
  el.id = 'vaSheet'; el.className = 'va-dim';
  el.innerHTML = `<div class="va-sheet" role="dialog" aria-label="투표 알림 보내기">
    <div class="va-grip"></div><div class="va-hd"><b>투표 알림 보내기</b><button type="button" class="va-x" aria-label="닫기">✕</button></div>
    <p class="va-sub">아직 투표하지 않은 회원에게만 푸시가 갑니다.</p>
    ${rows.map(r=>`<button type="button" class="va-row ${r.off?'next':'this'}" data-off="${r.off}" ${r.names.length?'':'disabled'}>
      <span class="va-tag">${r.tag}</span><span class="va-mid"><b>${r.label}</b><small>${r.names.length?'미투표 '+r.names.length+'명에게 알림':'모두 투표 완료'}</small></span><span class="va-go">${r.names.length?'보내기 ›':'✓'}</span></button>`).join('')}
  </div>`;
  const close = ()=> el.remove();
  el.addEventListener('click', async (e)=>{
    if(e.target===el || e.target.closest('.va-x')){ close(); return; }
    const row = e.target.closest('.va-row'); if(!row || row.disabled) return;
    const r = rows[+row.dataset.off];
    if(!confirm(`[${r.tag}] 아직 투표하지 않은 ${r.names.length}명에게 투표 알림을 보낼까요?\n\n대상 주간: ${r.label}\n${r.names.join(', ')}`)) return;
    row.disabled = true;
    try{
      const msg = await sendMatchAlert('🗳️ 공생관 투표 알림', `${r.tag}(${r.label}) 경기 투표를 아직 안 하셨어요. 지금 참석 투표해 주세요!`, { kind:'vote', targets: r.names });
      toast(msg); close();
    }catch(err){ console.error(err); toast('알림 전송에 실패했습니다.'); row.disabled = false; }
  });
  document.body.appendChild(el);
}
(function(){
  const btn = document.getElementById('voteAlertBtn');
  if(!btn) return;
  btn.addEventListener('click', openVoteAlertSheet);
  setInterval(()=>{ if(!document.hidden) updateVoteAlertBtn(); }, 6000);
  setTimeout(updateVoteAlertBtn, 600);
})();

/* 이번 주(또는 다음 주)의 참여·불참·미투표 명단을 세 칸으로 보여줍니다. 버튼을 눌러 펼친 경우에만 그립니다. */
function renderWeekStatus(){
  const body = document.getElementById('wsBody');
  if(!body || body.hidden || !appData) return;
  const offset = window.__wsWeek === 1 ? 1 : 0;
  const base = parseYMD(getWeekStart(todayStr()));
  base.setDate(base.getDate() + offset*7);
  const weekKey = fmtDate(base);
  const end = new Date(base); end.setDate(end.getDate()+6);
  const names = getApprovedNonAdminNames();
  const avail = (appData.weekAvailability && appData.weekAvailability[weekKey]) || {};
  const absence = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
  const yes = [], no = [], none = [];
  names.forEach(n=>{
    const picks = avail[n] || [];
    if(absence[n]) no.push(n);
    else if(picks.length) yes.push(n);
    else none.push(n);
  });
  const total = names.length || 1;
  const pc = (x)=>Math.round(x/total*100);
  const dayLetters = (n)=> (avail[n]||[]).map(d=>weekdayKR[parseYMD(d).getDay()]).join('');
  const col = (cls, title, arr, withDays)=>`
    <div class="ws-col ${cls}"><h4>${title} ${arr.length}</h4>
      ${arr.length ? arr.map(n=>`<div class="ws-nm ${n===myName?'me':''} ${isCurrentlyInjured(n)?'inj':''}"><span>${escapeHtml(n)}${isCurrentlyInjured(n)?' <em class="inj-tag" title="부상">🤕</em>':''}</span>${withDays?`<small>${escapeHtml(dayLetters(n))}</small>`:''}</div>`).join('') : '<div class="ws-empty">없음</div>'}
    </div>`;
  body.innerHTML = `
    <div class="ws-head"><div><b>${offset?'다음 주':'이번 주'} 투표 현황</b><small>${base.getMonth()+1}월 ${base.getDate()}일 ~ ${end.getMonth()+1}월 ${end.getDate()}일</small></div>
      <div class="ws-pills"><button type="button" data-ws="0" class="${offset?'':'on'}">이번 주</button><button type="button" data-ws="1" class="${offset?'on':''}">다음 주</button></div></div>
    <div class="ws-stack"><i style="width:${pc(yes.length)}%;background:var(--lime)"></i><i style="width:${pc(no.length)}%;background:#ff8a8a"></i><i style="width:${pc(none.length)}%;background:#ffc857"></i></div>
    <div class="ws-leg"><span>${names.length}명 중 <b>${yes.length+no.length}명</b> 응답</span><span>미투표 <b>${none.length}명</b></span></div>
    <div class="ws-cols">${col('y','참여',yes,true)}${col('a','불참',no,false)}${col('m','미투표',none,false)}</div>`;
  body.querySelectorAll('.ws-pills button').forEach(b=>b.addEventListener('click', ()=>{ window.__wsWeek = Number(b.dataset.ws); renderWeekStatus(); }));
}
