/* ---------- Init ---------- */
$('#prevMonth').addEventListener('click', ()=>{ if(window.__calWeekMode && selectedDate){ const d=parseYMD(selectedDate); d.setDate(d.getDate()-7); setSelectedDate(fmtDate(d)); return; } viewMonth--; if(viewMonth<0){viewMonth=11; viewYear--;} renderCalendar(); });
$('#nextMonth').addEventListener('click', ()=>{ if(window.__calWeekMode && selectedDate){ const d=parseYMD(selectedDate); d.setDate(d.getDate()+7); setSelectedDate(fmtDate(d)); return; } viewMonth++; if(viewMonth>11){viewMonth=0; viewYear++;} renderCalendar(); });
(function(){
  const b = document.getElementById('calWeekModeBtn');
  if(!b) return;
  b.addEventListener('click', ()=>{
    window.__calWeekMode = !window.__calWeekMode;
    b.classList.toggle('on', !!window.__calWeekMode);
    const span = b.querySelector('span'); if(span) span.textContent = window.__calWeekMode ? '월간보기' : '주간보기';
    if(window.__calWeekMode && !selectedDate) selectedDate = todayStr();
    if(selectedDate) syncCalendarWithDate(selectedDate); else renderCalendar();
  });
})();

function shiftSelectedDate(days){
  const base = selectedDate ? parseYMD(selectedDate) : new Date();
  base.setDate(base.getDate()+days);
  setSelectedDate(fmtDate(base));
}
$('#dateNavPrev').addEventListener('click', ()=>shiftSelectedDate(-1));
$('#dateNavToday').addEventListener('click', ()=>setSelectedDate(todayStr()));
$('#dateNavNext').addEventListener('click', ()=>shiftSelectedDate(1));

$('#logoutBtn').addEventListener('click', async ()=>{
  if(!confirm('로그아웃하시겠습니까?\n자동 로그인은 해제되며, "아이디 및 참석코드 저장"을 체크해 두었다면 아이디와 참석코드는 그대로 유지됩니다.')) return;
  if(myName){
    await mutateAppData(data=>{
      if(!data.members) data.members = {};
      if(data.members[myName]) data.members[myName].status = 'offline';
    });
  }
  try{ clearLoginSessionOnly(); }catch(e){}
  window.location.reload();
});

async function initLogin(){
  // 저장된 아이디/참석코드를 화면에 먼저 채워둡니다 (자동 로그인 성공 여부와 무관하게 항상 표시)
  const rememberPref = getLocalRememberPref();
  $('#rememberIdChk').checked = rememberPref;
  const savedCode = getLocalCode();
  if(savedCode) $('#loginAccessCode').value = savedCode;
  const stored = getLocalName();
  if(stored) $('#loginId').value = stored;

  const storedBirth = getLocalBirth();
  if(stored && storedBirth){
    const result = await loginOrValidate(stored, storedBirth);
    if(!result.ok){
      $('#loginId').value = stored;
      if(result.pending){
        // 승인 대기 중: 기기에 저장된 정보는 유지하고 안내만 표시
        $('#loginError').style.color = 'var(--amber)';
        $('#loginError').textContent = result.message;
      } else {
        // 저장된 정보가 더 이상 유효하지 않음 → 다시 로그인하도록 안내
        clearLocalLogin();
        $('#loginError').style.color = 'var(--danger)';
        $('#loginError').textContent = '저장된 로그인 정보가 유효하지 않습니다. 다시 로그인해 주십시오.';
      }
      return;
    }
    myName = stored;
    myBirth = storedBirth;
    appData = result.data;
    $('#loginId').value = stored;
    $('#nameTag').textContent = myName;
    $('#birthTag').textContent = `(${myBirth})`;
    $('#adminBadge').style.display = isAdmin() ? 'inline-block' : 'none';
    $('#loginOverlay').classList.add('hidden');
    await initAppUI();
  }
}
/* 모든 js 파일이 불러와진 뒤(DOMContentLoaded)에 시작해야, 뒤쪽 파일의 함수를 앞쪽 코드가 부를 때 오류가 나지 않습니다. */
document.addEventListener('DOMContentLoaded', initLogin);

/* ---------- 홈 섹션(모바일 첫 화면) 미니 위젯 렌더링 ---------- */
function renderHomeTab(){
  if(typeof appData==='undefined' || !appData || !myName) return;

  const voteCard = document.getElementById('homeVoteCard');
  if(voteCard){
    const thisWeekKey = getWeekStart(todayStr());
    const weekKey = thisWeekKey;
    const info = getWeekInfo(weekKey);
    const sorted = info.dates.map(d=>({d, c: info.counts[d]||0})).filter(x=>x.c>0).sort((a,b)=>b.c-a.c).slice(0,3);
    const label = getWeekLabel(weekKey);
    let rowsHtml;
    if(!sorted.length){
      rowsHtml = `<div class="rank-empty">아직 ${escapeHtml(label)} 투표가 없습니다.</div>`;
    } else {
      const maxC = sorted[0].c || 1;
      rowsHtml = sorted.map(x=>{
        const o = parseYMD(x.d);
        const isConf = info.confirmedDates.includes(x.d);
        return `<div class="home-vote-row"><span class="hv-date">${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]})${isConf?' 🏆':''}</span><div class="hv-bar-wrap"><div class="hv-bar" style="width:${Math.round(x.c/maxC*100)}%;"></div></div><span class="hv-count">${x.c}표</span></div>`;
      }).join('');
    }
    // 투표 참여율: 그 주에 날짜를 하나라도 고르거나 "불참"을 선언한 사람 / 승인된 선수(관리자·부상 기간 제외)
    const weekAvail = (appData.weekAvailability && appData.weekAvailability[weekKey]) || {};
    const weekAbs = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
    const eligible = getApprovedNonAdminNames().filter(n=>!isInjuredDuringWeek(n, weekKey));
    const votedCount = eligible.filter(n=>(weekAvail[n] && weekAvail[n].length>0) || weekAbs[n]).length;
    const ratePct = eligible.length ? Math.round(votedCount/eligible.length*100) : 0;
    let subText;
    const pickDate = info.confirmedDates.length ? [...info.confirmedDates].sort()[0] : (sorted.length ? sorted[0].d : null);
    if(pickDate){
      const o = parseYMD(pickDate);
      const vi = (typeof getVenueInfo==='function') ? getVenueInfo(pickDate) : null;
      subText = `(${weekdayKR[o.getDay()]})${vi && vi.time ? ' '+String(vi.time).slice(0,5) : ''} 경기`;
    } else {
      subText = '아직 투표가 없습니다';
    }
    voteCard.innerHTML = `
      <div class="hv-head">
        <div class="hv-title">
          <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.6 2.9-6 6.500-6s6.500 2.4 6.500 6z"/><circle cx="17" cy="9" r="2.6"/><path d="M16.300 14.100c3-.3 5.200 1.600 5.200 5.900h-4.400c0-2.200-.3-4.200-.8-5.900z"/></svg>
          <div><b>이번 주 참석 투표</b><small>${escapeHtml(subText)}</small></div>
        </div>
        <div class="hv-rate"><div class="hv-rate-top"><small>참여율</small><b>${ratePct}%</b></div><div class="hv-progress"><div class="hv-progress-bar" style="width:${ratePct}%;"></div></div><div class="hv-people">${votedCount} / ${eligible.length}명</div></div>
      </div>
      <button class="home-goto-btn" id="homeGotoCalBtn"><span class="gt-chk"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg></span>지금 참석 투표하기<span class="gt-arrow">›</span></button>
    `;
    const gotoBtn = document.getElementById('homeGotoCalBtn');
    if(gotoBtn && isCurrentlyInjured(myName)){
      const end = (appData.members[myName]||{}).injuryEnd || '';
      gotoBtn.disabled = true; gotoBtn.classList.add('is-injured');
      gotoBtn.innerHTML = '🤕 부상 중 · ' + escapeHtml(end ? fmtKDate(end) : '') + ' 복귀 예정';
    }
    if(gotoBtn && !gotoBtn.disabled) gotoBtn.addEventListener('click', ()=>{
      const calBtn = document.querySelector('.mobile-tabbar .tab-btn[data-tab="calendar"]');
      if(calBtn) calBtn.click();
      if(typeof setAttendPane==='function') setAttendPane('vote');
      if(typeof setSelectedDate==='function') setSelectedDate(weekKey);
      openVoteSheet();
    });
  }

  const teamStat = document.getElementById('homeTeamStat');
  if(teamStat){
    const st = computeMatchStats();
    const thisMonthKey = todayStr().slice(0,7);
    const thisMonthCount = st.byMonth[thisMonthKey] || 0;
    const rate = (typeof window.__teamAttendanceRate==='number') ? window.__teamAttendanceRate : null;
    const sv = (d)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
    teamStat.innerHTML = `
      <div class="hts-title">팀 현황<small>(누적 기준)</small></div>
      <div class="hts-grid">
        <div class="hts-cell"><div class="lb">${sv('<circle cx="12" cy="12" r="9"/><path d="m12 8 3.2 2.3-1.2 3.8H10L8.8 10.3z"/>')}누적 경기</div><div class="v">${st.totalPlayed}<small>회</small></div></div>
        <div class="hts-cell"><div class="lb">${sv('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>')}이번 달</div><div class="v">${thisMonthCount}<small>회</small></div></div>
        <div class="hts-cell"><div class="lb">${sv('<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>')}예정 경기</div><div class="v">${st.upcomingCount}<small>회</small></div></div>
        <div class="hts-cell"><div class="lb">${sv('<path d="M5 20V12M12 20V5M19 20v-9"/>')}참가율</div><div class="v">${rate===null?'-':rate+'<small>%</small>'}</div></div>
      </div>
    `;
  }

  const wMini = document.getElementById('homeWeatherMini');
  if(wMini){
    if(typeof weekData!=='undefined' && weekData.thisWeek && weekData.thisWeek.length){
      const today = weekData.thisWeek[0];
      const amIcon = typeof weatherIconFromCode==='function' ? weatherIconFromCode(today.amCode!=null?today.amCode:today.code) : '☀️';
      const pmIcon = typeof weatherIconFromCode==='function' ? weatherIconFromCode(today.pmCode!=null?today.pmCode:today.code) : '☀️';
      wMini.innerHTML = `
        <div class="hm-label">날씨 정보 <span>›</span></div>
        <div class="hm-ampm-row">
          <div class="hm-ampm-col"><span class="hm-ampm-lb">오전</span><span class="hm-ampm-ico">${amIcon}</span><span class="hm-ampm-pop">${today.amPop||0}%</span></div>
          <div class="hm-ampm-col"><span class="hm-ampm-lb">오후</span><span class="hm-ampm-ico">${pmIcon}</span><span class="hm-ampm-pop">${today.pmPop||0}%</span></div>
        </div>
        <div class="hm-sub">${isFinite(today.tmax)?Math.round(today.tmax):'-'}° / ${isFinite(today.tmin)?Math.round(today.tmin):'-'}°</div>
      `;
    } else {
      wMini.innerHTML = `<div class="hm-label">날씨 정보 <span>›</span></div><div class="hm-sub">불러오는 중...</div>`;
    }
    wMini.onclick = ()=>setActiveMobileSection('weather');
  }

  const bMini = document.getElementById('homeBdayMini');
  if(bMini){
    const now = new Date();
    const curMonth = now.getMonth()+1;
    const curDay = now.getDate();
    const approvedNames = Object.keys(appData.members||{}).filter(n=>appData.members[n].approved);
    const monthBdays = approvedNames.map(n=>{
      const b = appData.members[n].birth;
      if(!b || b.length!==6) return null;
      const mm = parseInt(b.slice(2,4),10);
      const dd = parseInt(b.slice(4,6),10);
      if(mm !== curMonth) return null;
      return { n, day: dd };
    }).filter(Boolean).sort((a,b)=>a.day-b.day);

    if(monthBdays.length){
      const upcoming = monthBdays.find(x=>x.day>=curDay) || monthBdays[0];
      const isToday = upcoming.day===curDay;
      bMini.innerHTML = `
        <div class="hm-label">이번 달 생일 <span>›</span></div>
        <div class="hm-main" style="font-size:16px;">🎂🎉 ${escapeHtml(upcoming.n)}</div>
        <div class="hm-sub">${curMonth}.${upcoming.day}${monthBdays.length>1?` 외 ${monthBdays.length-1}명`:''}</div>
        <div class="hm-bday-msg">${isToday?`${escapeHtml(upcoming.n)}님, 생일을 축하합니다! 🎂🎉`:'생일을 축하합니다! 🎉'}</div>
      `;
    } else {
      bMini.innerHTML = `<div class="hm-label">이번 달 생일 <span>›</span></div><div class="hm-sub">이번 달 생일자가 없습니다</div>`;
    }
    bMini.onclick = ()=>setActiveMobileSection('records');
  }

  const recentCard = document.getElementById('homeRecentCard');
  if(recentCard){
    const todayS = todayStr();
    const played = Object.keys(appData.votes||{})
      .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d<=todayS && (appData.votes[d]||[]).length>0)
      .sort().reverse().slice(0,5);
    if(!played.length){
      recentCard.innerHTML = '<div class="rank-empty">아직 진행된 경기가 없습니다.</div>';
    } else {
      recentCard.innerHTML = played.map(d=>{
        const o = parseYMD(d);
        const venue = getVenueInfo(d);
        const venueLabel = venue ? `${escapeHtml(venue.name)}${venue.time?` · ${escapeHtml(venue.time)}`:''}` : '경기장 미등록';
        return `<div class="home-recent-row"><span class="hr-date">${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]})</span><span class="hr-venue" title="${escapeHtml(venueLabel)}">${venueLabel}</span></div>`;
      }).join('');
    }
  }
}
function tryRenderHomeTab(){
  try{ renderHomeTab(); }catch(e){ console.error(e); }
  try{ updateBellState(); updateUserMenuLabel(); }catch(e){ console.error(e); }
}

/* ---------- 홈 상단: 알림 벨 / 내 메뉴 / 퀵 버튼 ---------- */
/* 홈 '알림 설정' 타일: 알림 허용 + 푸시 구독 등록 */
const NOTIFY_OFF_KEY = 'gsg-notify-off';
const BELL_ON_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>';
const BELL_OFF_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13.7 21a2 2 0 0 1-3.4 0"/><path d="M18.6 14.6C18 13 18 10 18 8a6 6 0 0 0-9.9-4.6"/><path d="M6 8c0 7-3 9-3 9h13"/><path d="M2 2l20 20"/></svg>';
/* 알림 상태: 기기 알림 허용 + 앱에서 끄지 않음 */
function notifyIsOn(){
  try{ return typeof Notification!=='undefined' && Notification.permission==='granted' && localStorage.getItem(NOTIFY_OFF_KEY)!=='1'; }catch(e){ return false; }
}
function updateNotifyTile(){
  const on = notifyIsOn();
  const b=document.getElementById('homeNotifyBtn'), lb=document.getElementById('homeNotifyLb');
  if(b && lb){
    b.classList.toggle('notify-on', on);
    b.classList.toggle('notify-off', !on);
    lb.textContent = on ? '알림 켜짐' : '알림 꺼짐';
    const ic = b.querySelector('svg'); if(ic){ const t=document.createElement('div'); t.innerHTML = on ? BELL_ON_SVG : BELL_OFF_SVG; const n=t.firstChild; n.setAttribute('width','30'); n.setAttribute('height','30'); ic.replaceWith(n); }
  }
  const bs = document.getElementById('moreBellSub'); if(bs) bs.textContent = (on ? '켜짐' : '꺼짐') + ' · 눌러서 ' + (on ? '끄기' : '켜기');
}
async function disablePushSubscription(){
  try{
    if(!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub){
      try{ if(supabaseClient) await supabaseClient.rpc('unregister_push', { p_endpoint: sub.endpoint }); }catch(e){ console.error(e); }
      try{ await sub.unsubscribe(); }catch(e){}
    }
    pushEnsuredFor = null;
  }catch(e){ console.error('push unsubscribe', e); }
}
/* 홈 '알림' 타일 / 더보기 '알림 설정': 눌러서 켜기 ↔ 끄기 */
async function enableAppNotifications(){
  if(typeof Notification==='undefined'){
    const ua=navigator.userAgent||'';
    if(/iPhone|iPad|iPod/i.test(ua) && !isStandaloneApp()){
      toast('아이폰은 홈 화면에 추가한 앱에서만 알림을 켤 수 있습니다.');
      showInstallGuide();
    } else toast('이 기기·브라우저에서는 알림을 지원하지 않습니다.');
    return;
  }
  if(Notification.permission==='denied'){
    alert('알림이 차단되어 있습니다.\n\n[아이폰] 설정 → 알림 → 공생관 → 알림 허용\n[안드로이드] 앱 길게 누르기 → 앱 정보 → 알림 허용\n\n허용한 뒤 앱을 다시 열어 주세요.');
    updateNotifyTile();
    return;
  }
  if(notifyIsOn()){            // 켜져 있음 → 끄기
    try{ localStorage.setItem(NOTIFY_OFF_KEY,'1'); }catch(e){}
    updateNotifyTile(); updateBellState();
    await disablePushSubscription();
    toast('알림을 껐습니다. 경기·투표 알림이 오지 않습니다.');
    return;
  }
  let perm = Notification.permission;   // 꺼져 있음 → 켜기
  if(perm==='default'){
    try{ perm = await Notification.requestPermission(); }catch(e){ console.error(e); }
  }
  if(perm==='granted'){
    try{ localStorage.removeItem(NOTIFY_OFF_KEY); }catch(e){}
    updateNotifyTile(); updateBellState();
    await ensurePushSubscription();
    toast('알림을 켰습니다. 경기 알림·투표 알림을 받을 수 있어요.');
  } else if(perm==='denied'){
    toast('알림이 차단되었습니다. 기기 설정에서 허용해 주세요.');
  }
  updateNotifyTile(); updateBellState();
  if(typeof updateNotifyBanner==='function') updateNotifyBanner();
}
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) try{ updateNotifyTile(); }catch(e){} });
window.addEventListener('focus', ()=>{ try{ updateNotifyTile(); }catch(e){} });
function updateBellState(){
  const b = document.getElementById('bellBtn');
  if(!b) return;
  b.classList.toggle('on', notifyIsOn());
  try{ updateNotifyTile(); }catch(e){}
}
function updateUserMenuLabel(){
  const b = document.getElementById('userMenuBtn');
  if(b && myName) b.textContent = myName.charAt(0);
}
(function initHomeHeaderControls(){
  const bell = document.getElementById('bellBtn');
  if(bell) bell.addEventListener('click', ()=>{
    if(typeof Notification==='undefined'){ toast('이 기기에서는 알림을 지원하지 않습니다.'); return; }
    if(Notification.permission==='granted'){ toast('알림이 켜져 있습니다. 경기 확정·투표 마감 소식을 알려드려요.'); }
    else if(Notification.permission==='denied'){ toast('알림이 차단되어 있습니다. 브라우저(앱) 설정에서 허용해 주세요.'); }
    else {
      const en = document.getElementById('notifyEnableBtn');
      if(en) en.click();
      setTimeout(updateBellState, 1500);
      setTimeout(updateBellState, 5000);
    }
  });
  const menuBtn = document.getElementById('userMenuBtn');
  const box = document.getElementById('userBox');
  if(menuBtn && box){
    menuBtn.addEventListener('click', (e)=>{ e.stopPropagation(); box.classList.toggle('open'); });
    box.addEventListener('click', (e)=>{ if(e.target.closest('button')) box.classList.remove('open'); });
    document.addEventListener('click', (e)=>{ if(!box.contains(e.target) && e.target!==menuBtn) box.classList.remove('open'); });
  }
  document.querySelectorAll('.home-quick-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const go = btn.dataset.go;
      if(go==='vote'){
        setActiveMobileSection('calendar');
        if(typeof setAttendPane==='function') setAttendPane('vote');
        if(typeof setSelectedDate==='function') setSelectedDate(getWeekStart(todayStr()));
        openVoteSheet();
      } else if(go==='notify'){
        enableAppNotifications();
      } else if(go==='install'){
        installToHomeScreen();
      } else {
        setActiveMobileSection(go);
      }
    });
  });
})();

/* ---------- 홈 화면 추가 (PWA 설치) ---------- */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredInstallPrompt = e; });
window.addEventListener('appinstalled', ()=>{ deferredInstallPrompt = null; try{ toast('홈 화면에 추가되었습니다.'); }catch(_){} });
function isStandaloneApp(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}
function showInstallGuide(){
  const ua = navigator.userAgent || '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const inApp = /KAKAOTALK|NAVER|Line\/|FBAN|FBAV|Instagram/i.test(ua);
  let steps;
  if(inApp){
    steps = ['오른쪽 위(또는 아래) 메뉴(⋯)를 누르세요.', isIOS ? '"Safari로 열기"를 선택하세요.' : '"다른 브라우저로 열기" → Chrome을 선택하세요.', '열린 화면에서 이 버튼을 다시 눌러 주세요.'];
  } else if(isIOS){
    steps = ['Safari 하단의 공유 버튼(□↑)을 누르세요.', '"홈 화면에 추가"를 선택하세요.', '오른쪽 위 "추가"를 누르면 완료됩니다.'];
  } else {
    steps = ['브라우저 오른쪽 위 메뉴(⋮)를 누르세요.', '"홈 화면에 추가" 또는 "앱 설치"를 선택하세요.', '"설치"를 누르면 완료됩니다.'];
  }
  const old = document.getElementById('installGuide'); if(old) old.remove();
  const el = document.createElement('div');
  el.id = 'installGuide'; el.className = 'install-guide';
  el.innerHTML = `<div class="ig-box" role="dialog" aria-label="홈 화면 추가 방법">
    <b>홈 화면에 추가하기</b>
    <ol>${steps.map(t=>`<li>${t}</li>`).join('')}</ol>
    <button type="button" class="ig-close">확인</button></div>`;
  el.addEventListener('click', (e)=>{ if(e.target===el || e.target.closest('.ig-close')) el.remove(); });
  document.body.appendChild(el);
}
async function installToHomeScreen(){
  if(isStandaloneApp()){ toast('이미 홈 화면에서 실행 중입니다.'); return; }
  if(deferredInstallPrompt){
    const dp = deferredInstallPrompt; deferredInstallPrompt = null;
    try{ dp.prompt(); await dp.userChoice; }catch(e){ console.error(e); showInstallGuide(); }
    return;
  }
  showInstallGuide();
}

