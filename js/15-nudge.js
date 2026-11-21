/* ================= 연속 불참 독려 =================
   기준: 경기(확정된 날 + 투표가 있었던 지난 날) 중, 최근부터 거꾸로 세어 연속으로 참석하지 않은 횟수. 불참 투표·미투표 모두 불참으로 봅니다.
   - 가입 전 경기, 부상 기간 중 경기는 세지 않고(건너뜀) 연속 기록도 끊지 않습니다.
   - 5경기 이상 연속 불참이면 로그인 때 팝업 / 5·10·15…경기째가 되면 자동 푸시 / 관리자는 더보기에서 수동 발송. */
const NUDGE_MIN = 5;
const NUDGE_HIDE_KEY = 'gsw_nudge_hide_date';

/* 경기일: 관리자가 확정한 날 + 아직 확정 전이지만 지난 날 중 투표가 있었던 날(오늘 경기는 확정된 경우만).
   참석 판정: 확정된 날은 실제 참석자 명단, 미확정 날은 '참석' 투표자. 그 외(불참 투표·미투표)는 모두 불참으로 셉니다. */
function getMatchDatesDesc(){
  const t = todayStr();
  const ex = new Set((appData && appData.excludedWeeks) || []);
  const act = (appData && appData.actualAttendance) || {};
  const votes = (appData && appData.votes) || {};
  const ok = /^\d{4}-\d{2}-\d{2}$/;
  const set = new Set();
  Object.keys(act).forEach(d=>{ if(ok.test(d) && d<=t && act[d] && act[d].finalized) set.add(d); });
  Object.keys(votes).forEach(d=>{ if(ok.test(d) && d<t && (votes[d]||[]).length>0) set.add(d); });
  return [...set].filter(d=>!ex.has(getWeekStart(d))).sort().reverse();
}
function attendedOn(name, d){
  const a = appData.actualAttendance && appData.actualAttendance[d];
  if(a && a.finalized) return (a.attendees||[]).includes(name);
  return ((appData.votes && appData.votes[d])||[]).some(v=>v.name===name && v.choice==='yes');
}
function computeSkipStreaks(){
  const out = {};
  if(!appData) return out;
  const dates = getMatchDatesDesc();
  getApprovedNonAdminNames().forEach(n=>{
    let streak = 0, last = '', ended = false;
    for(const d of dates){
      if(isBeforeJoin(n, d)) continue;
      if(isInjuredOnDate(n, d)) continue;
      if(attendedOn(n, d)){ last = d; ended = true; break; }
      streak++;
    }
    out[n] = { streak, last, everAttended: ended };
  });
  return out;
}
function getNudgeTargets(){
  const s = computeSkipStreaks();
  return Object.keys(s).filter(n=> s[n].streak>=NUDGE_MIN && !isCurrentlyInjured(n)).map(n=>({ name:n, streak:s[n].streak, last:s[n].last })).sort((a,b)=>b.streak-a.streak);
}
function nextMatchInfo(){
  const t = todayStr();
  const d = Object.keys((appData && appData.venues) || {}).filter(k=>k>=t).sort()[0];
  if(!d) return null;
  const v = getVenueInfo(d); const o = parseYMD(d);
  return { date:d, label:`${o.getMonth()+1}/${o.getDate()}(${weekdayKR[o.getDay()]})`, time:(v && v.time)||'', venue: v ? String(v.name).replace(/^플랩\s*스타디움\s+/,'') : '' };
}
function hasVotedSoon(name){
  const av = (appData.weekAvailability)||{};
  return [0,1].some(off=>{ try{ const k = getWsWeekInfo(off).key; return ((av[k]||{})[name]||[]).length>0; }catch(e){ return false; } });
}

/* ---------- 로그인 팝업 ---------- */
function showNudgePopup(info){
  if(document.getElementById('ndSheet')) return;
  const nx = nextMatchInfo();
  const lastTxt = info.last ? fmtShortMD(info.last) : '기록 없음';
  const el = document.createElement('div');
  el.id = 'ndSheet'; el.className = 'nd-dim';
  el.innerHTML = `<div class="nd-card" role="dialog" aria-label="경기 참여 안내">
    <div class="nd-em">⚽</div>
    <div class="nd-t">${escapeHtml(myName)}님, <b>${info.streak}경기째</b> 못 뵈었어요</div>
    <div class="nd-s">${info.last ? `마지막 참여는 <b>${lastTxt}</b>이었어요.<br>` : ''}팀원들이 기다리고 있습니다!</div>
    <div class="nd-st"><div><b>${info.streak}</b><small>연속 미참가</small></div><div><b>${lastTxt}</b><small>마지막 참여</small></div></div>
    ${nx ? `<div class="nd-nx">📅 다음 경기 <b>${nx.label}${nx.time?' '+escapeHtml(nx.time):''}</b>${nx.venue?`<br>${escapeHtml(nx.venue)}`:''}</div>` : ''}
    <button type="button" class="nd-go">이번주 투표하러 가기</button>
    <button type="button" class="nd-skip">오늘은 그만 보기</button></div>`;
  const close = ()=>{ try{ localStorage.setItem(NUDGE_HIDE_KEY, todayStr()); }catch(e){} el.remove(); };
  el.addEventListener('click', (e)=>{
    if(e.target.closest('.nd-skip') || e.target===el){ close(); return; }
    if(e.target.closest('.nd-go')){ close(); setActiveMobileSection('calendar'); try{ document.querySelector('#sectionCalendar .seg-btn[data-pane="vote"]').click(); }catch(_){} }
  });
  document.body.appendChild(el);
}
function fmtShortMD(d){ const o = parseYMD(d); return `${o.getMonth()+1}/${o.getDate()}(${weekdayKR[o.getDay()]})`; }
function maybeShowNudgePopup(){
  try{
    if(!appData || !myName || myName===ADMIN_NAME) return;
    try{ if(localStorage.getItem(NUDGE_HIDE_KEY)===todayStr()) return; }catch(e){}
    if(isCurrentlyInjured(myName) || hasVotedSoon(myName)) return;
    const mine = getNudgeTargets().find(x=>x.name===myName);
    if(mine) showNudgePopup(mine);
  }catch(e){ console.warn('[독려 팝업]', e); }
}

/* ---------- 자동 푸시 (5·10·15…경기째, 1회씩) ---------- */
const NUDGE_BODY = '연속으로 경기에 참여하지 못하고 있어요. 이번 경기에서 같이 뛰어요! ⚽';
async function autoSendNudge(){
  try{
    if(!appData || !myName || typeof supabaseClient==='undefined' || !supabaseClient) return;
    let claimed = [];
    await mutateAppData(d=>{
      const saved = appData; appData = d;                       // 최신 데이터 기준으로 계산
      let streaks; try{ streaks = computeSkipStreaks(); } finally { appData = saved; }
      d.nudgeLog = d.nudgeLog || {};
      Object.keys(d.nudgeLog).forEach(n=>{ if(!streaks[n] || streaks[n].streak<NUDGE_MIN) delete d.nudgeLog[n]; });   // 참석해서 끊기면 초기화
      claimed = [];
      Object.keys(streaks).forEach(n=>{
        const s = streaks[n].streak; if(s<NUDGE_MIN) return;
        const m = Math.floor(s/NUDGE_MIN)*NUDGE_MIN;
        const done = (d.nudgeLog[n]||{}).milestone||0;
        if(m>done && !isCurrentlyInjured(n)){ d.nudgeLog[n] = { milestone:m, at:Date.now() }; claimed.push(n); }
      });
    });
    if(!claimed.length) return;
    const msg = await sendMatchAlert('⚽ 공생관 참여 독려', NUDGE_BODY, { kind:'nudge', targets: claimed });
    if(/^(방금|알림을 보내지 못|네트워크)/.test(msg)){       // 전송 실패 → 다음 로그인 때 다시 시도하도록 되돌림
      await mutateAppData(d=>{ (claimed||[]).forEach(n=>{ if(d.nudgeLog) delete d.nudgeLog[n]; }); });
    }
  }catch(e){ console.warn('[독려 자동발송]', e); }
}

/* ---------- 관리자 수동 발송 (더보기) ---------- */
function openNudgeSheet(){
  if(!isAdminUser()){ toast('관리자만 사용할 수 있습니다.'); return; }
  const old = document.getElementById('vaSheet'); if(old) old.remove();
  const list = getNudgeTargets();
  const el = document.createElement('div');
  el.id = 'vaSheet'; el.className = 'va-dim';
  el.innerHTML = `<div class="va-sheet" role="dialog" aria-label="참여 독려 알림 보내기">
    <div class="va-grip"></div><div class="va-hd"><b>참여 독려 알림 보내기</b><button type="button" class="va-x" aria-label="닫기">✕</button></div>
    <p class="va-sub">${NUDGE_MIN}경기 이상 연속 불참한 회원에게만 갑니다. (부상 기간 제외)</p>
    ${list.length ? `<div class="nd-list">${list.map(x=>`<div class="nd-li"><b>${escapeHtml(x.name)}</b><span>${x.streak}경기 연속</span><small>${x.last?'마지막 '+fmtShortMD(x.last):'참여 기록 없음'}</small></div>`).join('')}</div>
    <button type="button" class="va-row this nd-send"><span class="va-tag">전체</span><span class="va-mid"><b>${list.length}명에게 알림 보내기</b><small>자동 알림과 별개로 지금 바로 발송</small></span><span class="va-go">보내기 ›</span></button>` : '<div class="va-sub" style="padding:18px 0;">대상자가 없습니다. 모두 참여 중이에요 👏</div>'}
  </div>`;
  const close = ()=> el.remove();
  el.addEventListener('click', async (e)=>{
    if(e.target===el || e.target.closest('.va-x')){ close(); return; }
    const b = e.target.closest('.nd-send'); if(!b || b.disabled) return;
    if(!confirm(`연속 ${NUDGE_MIN}경기 이상 불참한 ${list.length}명에게 독려 알림을 보낼까요?\n\n${list.map(x=>x.name).join(', ')}`)) return;
    b.disabled = true;
    try{ const msg = await sendMatchAlert('⚽ 공생관 참여 독려', NUDGE_BODY, { kind:'nudge', targets:list.map(x=>x.name) }); toast(msg); close(); }
    catch(err){ console.error(err); toast('알림 전송에 실패했습니다.'); b.disabled = false; }
  });
  document.body.appendChild(el);
}
document.addEventListener('click', (e)=>{ const r = e.target.closest('#sectionMore .more-row[data-act="nudge"]'); if(r) openNudgeSheet(); });

(function(){
  const orig = initAppUI;
  initAppUI = async function(){
    const r = await orig.apply(this, arguments);
    setTimeout(()=>{ maybeShowNudgePopup(); autoSendNudge(); }, 1800);
    return r;
  };
})();
