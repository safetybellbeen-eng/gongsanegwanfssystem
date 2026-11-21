/* ---------- 관리자 > 공지·알림 / 초기화 ---------- */
document.querySelectorAll('#adminPanel .admin-block').forEach(b=>{
  if(b.querySelector('#saveNoticeBtn') || b.querySelector('#resetDateVotesBtn')) b.dataset.cat = 'hidden';
});
function nrSheet(html, onClick){
  const old = document.getElementById('nrSheet'); if(old) old.remove();
  const el = document.createElement('div'); el.id = 'nrSheet'; el.className = 'mh-dim';
  el.innerHTML = `<div class="mh-sheet sh-sheet" role="dialog">${html}</div>`;
  el.addEventListener('click', (e)=>{ if(e.target===el){ el.remove(); return; } onClick(e, el); });
  document.body.appendChild(el); return el;
}
function nrClose(){ const o = document.getElementById('nrSheet'); if(o) o.remove(); }

/* ===== 공지·알림 ===== */
function renderNoticeHub(){
  const root = document.getElementById('noticeHub'); if(!root) return;
  const n = appData.notice || {};
  const has = !!(n.title || n.body);
  let nd = 0, uv = 0, uvLabel = '';
  try{ nd = getNudgeTargets().length; }catch(_){}
  try{ uv = getUnvotedNames(0).length; }catch(_){}
  root.innerHTML = `
    <button type="button" class="nr-lc" data-a="notice"><i>📢</i><div><b>공지사항</b><small>${has?escapeHtml(n.title||n.body):'등록된 공지가 없습니다'}</small></div><span>›</span></button>
    <button type="button" class="nr-lc" data-a="nudge"><i>🔔</i><div><b>참여 독려 알림</b><small>연속 ${typeof NUDGE_MIN!=='undefined'?NUDGE_MIN:5}경기 이상 불참 · 대상 ${nd}명</small></div><em>보내기</em></button>
    <button type="button" class="nr-lc" data-a="vote"><i>🗳️</i><div><b>투표 독려 알림</b><small>이번 주 미투표 ${uv}명</small></div><em>보내기</em></button>`;
}
function openNoticeSheet(){
  const n = appData.notice || {};
  const el = nrSheet(`<h3>공지사항</h3><div class="sh-sub">홈 화면에 보이는 모양을 확인하며 작성하세요</div>
    <div class="nr-pv" id="nrPv"></div>
    <div class="sh-hd" style="margin-top:0">제목</div><input type="text" id="nrTitle" class="sh-date" maxlength="60" value="${escapeHtml(n.title||'')}">
    <div class="sh-hd">내용</div><textarea id="nrBody" class="sh-date" rows="4" style="resize:vertical;font-family:inherit">${escapeHtml(n.body||'')}</textarea>
    <div class="sh-btns" style="margin-top:12px"><button type="button" class="sh-ghost nr-del" data-a="del">공지 삭제</button><button type="button" class="sh-save" data-a="save">공지 저장</button></div>`, async (e)=>{
    const b = e.target.closest('[data-a]'); if(!b) return;
    if(!requireAdmin()) return;
    const title = el.querySelector('#nrTitle').value.trim(), body = el.querySelector('#nrBody').value.trim();
    if(b.dataset.a==='save'){
      if(!title && !body){ toast('제목이나 내용을 입력해 주시기 바랍니다.'); return; }
      await mutateAppData(d=>{ d.notice = { title, body, updatedAt: Date.now() }; });
      renderNoticeCard(); renderNoticeHub(); nrClose(); toast('공지사항을 저장했습니다.');
    } else if(b.dataset.a==='del'){
      if(!confirm('공지사항을 삭제하시겠습니까?')) return;
      await mutateAppData(d=>{ d.notice = { title:'', body:'', updatedAt:null }; });
      renderNoticeCard(); renderNoticeHub(); nrClose(); toast('공지사항을 삭제했습니다.');
    }
  });
  const pv = ()=>{ const t = el.querySelector('#nrTitle').value.trim(), b = el.querySelector('#nrBody').value.trim();
    el.querySelector('#nrPv').innerHTML = (t||b) ? `<div class="nr-tg">📢 공지</div><h4>${escapeHtml(t||'공지사항')}</h4>${b?`<p>${escapeHtml(b)}</p>`:''}` : '<div class="sh-empty">내용을 입력하면 여기에 미리 보입니다</div>'; };
  el.addEventListener('input', pv); pv();
}

/* ===== 초기화 ===== */
const NR = { wk:null };
function nrWeekChips(){
  const cur = getWeekStart(todayStr()); const out = [];
  for(let i=1;i>=-3;i--){ const d = parseYMD(cur); d.setDate(d.getDate()+7*i); out.push({ wk: fmtDate(d), tag: i===1?'다음 주':(i===0?'이번 주':'') }); }
  return out;
}
function nrWeekLabel(wk){ const d = getWeekDates(wk); const s = parseYMD(d[0]), e = parseYMD(d[6]); return `${s.getMonth()+1}/${s.getDate()} ~ ${e.getMonth()+1}/${e.getDate()}`; }
function nrWeekImpact(wk){ return { voters: Object.keys((appData.weekAvailability||{})[wk]||{}).length, absent: Object.keys((appData.weekAbsence||{})[wk]||{}).filter(n=>appData.weekAbsence[wk][n]).length }; }
function renderResetHub(){
  const root = document.getElementById('resetHub'); if(!root) return;
  const chips = nrWeekChips(); if(!NR.wk || !chips.some(c=>c.wk===NR.wk)) NR.wk = getWeekStart(todayStr());
  const im = nrWeekImpact(NR.wk);
  root.innerHTML = `
    <div class="nr-zone nr-neutral"><h5>주간 투표 초기화</h5><p>선택한 주의 가능일 투표와 확정 변경이 삭제됩니다. 경기장 정보는 유지됩니다.</p>
      <div class="sh-chips">${chips.map(c=>`<button type="button" data-wk="${c.wk}" class="${c.wk===NR.wk?'on':''}">${c.tag||nrWeekLabel(c.wk).split(' ~ ')[0]+'주'}</button>`).join('')}</div>
      <div class="sh-res">${nrWeekLabel(NR.wk)} · 투표 <b style="color:#ff8a8e">${im.voters}명</b> 삭제 · 불참표시 <b style="color:#ff8a8e">${im.absent}명</b></div>
      <button type="button" class="nr-dbtn" data-a="week" ${im.voters||im.absent?'':'disabled'}>${im.voters||im.absent?'이 주 투표 초기화':'초기화할 투표가 없습니다'}</button></div>
    <div class="nr-zone"><h5>⚠️ 전체 초기화</h5><p>모든 주간 투표와 확정 기록이 삭제되며 복구할 수 없습니다.</p><button type="button" class="nr-dbtn" data-a="all">전체 투표 초기화</button></div>`;
}
async function nrAfterReset(msg){
  renderCalendar(); if(typeof selectedDate!=='undefined' && selectedDate) await renderMatchPanel();
  computeAttendanceStats(); renderMatchStats(); renderResetHub(); nrClose(); toast(msg);
}
function openWeekResetSheet(){
  const wk = NR.wk, im = nrWeekImpact(wk);
  nrSheet(`<h3>${nrWeekLabel(wk)} 주 투표 초기화</h3><div class="sh-sub">되돌릴 수 없습니다</div>
    <div class="sh-res">· 투표한 <b style="color:#ff8a8e">${im.voters}명</b>의 가능일 삭제<br>· 불참 표시 <b style="color:#ff8a8e">${im.absent}명</b> 삭제<br>· 확정 변경 삭제<br>· 경기장 정보 <b style="color:#b6f23a">유지</b></div>
    <div class="sh-btns"><button type="button" class="sh-ghost" data-a="cancel">취소</button><button type="button" class="nr-go" data-a="go">초기화 실행</button></div>`, async (e)=>{
    const b = e.target.closest('[data-a]'); if(!b) return;
    if(b.dataset.a==='cancel'){ nrClose(); return; }
    if(!requireAdmin()) return;
    b.disabled = true;
    await mutateAppData(data=>{
      if(data.weekAvailability) delete data.weekAvailability[wk];
      if(data.weekAbsence) delete data.weekAbsence[wk];
      if(data.weekOverride) delete data.weekOverride[wk];
      resyncWeekDerivedVotes(data, wk);
    });
    await nrAfterReset('선택한 주의 투표를 초기화했습니다.');
  });
}
function openAllResetSheet(){
  const weeks = new Set([...Object.keys(appData.weekAvailability||{}), ...Object.keys(appData.weekAbsence||{})]).size;
  const matches = Object.keys(appData.votes||{}).length;
  const KEY = '전체 초기화';
  const el = nrSheet(`<h3 style="color:#ff8a8e">⚠️ 전체 투표 초기화</h3><div class="sh-sub">모든 주간 투표·확정 기록이 삭제되고 복구할 수 없습니다</div>
    <div class="sh-res">삭제 대상: 주간 투표 <b style="color:#ff8a8e">${weeks}주</b> · 확정 경기 기록 <b style="color:#ff8a8e">${matches}건</b><br>유지: 회원 · 경기장 · 공지</div>
    <div class="sh-hd" style="margin-top:0">계속하려면 <b style="color:#fff">${KEY}</b> 를 입력하세요</div>
    <input type="text" id="nrConfirm" class="sh-date" style="border-color:rgba(255,90,95,.5)" autocomplete="off">
    <div class="sh-btns" style="margin-top:12px"><button type="button" class="sh-ghost" data-a="cancel">취소</button><button type="button" class="nr-go" id="nrGoAll" data-a="go" disabled>초기화 실행</button></div>`, async (e)=>{
    const b = e.target.closest('[data-a]'); if(!b) return;
    if(b.dataset.a==='cancel'){ nrClose(); return; }
    if(b.disabled) return;
    if(!requireAdmin()) return;
    b.disabled = true;
    await mutateAppData(data=>{
      data.weekAvailability = {}; data.weekAbsence = {}; data.weekOverride = {}; data.votes = {};
      data.votedDates = Object.keys(data.venues||{});
    });
    await nrAfterReset('모든 투표 기록을 초기화했습니다.');
  });
  el.addEventListener('input', (e)=>{ if(e.target.id==='nrConfirm') el.querySelector('#nrGoAll').disabled = (e.target.value.trim()!==KEY); });
}
(function(){
  const nh = document.getElementById('noticeHub'), rh = document.getElementById('resetHub'); if(!nh || !rh) return;
  nh.addEventListener('click', (e)=>{
    const b = e.target.closest('[data-a]'); if(!b) return;
    if(!isAdminUser()){ toast('관리자만 사용할 수 있습니다.'); return; }
    if(b.dataset.a==='notice') openNoticeSheet();
    else if(b.dataset.a==='nudge') openNudgeSheet();
    else if(b.dataset.a==='vote') openVoteAlertSheet();
  });
  rh.addEventListener('click', (e)=>{
    const c = e.target.closest('[data-wk]'); if(c){ NR.wk = c.dataset.wk; renderResetHub(); return; }
    const b = e.target.closest('[data-a]'); if(!b || b.disabled) return;
    if(!requireAdmin()) return;
    if(b.dataset.a==='week') openWeekResetSheet(); else if(b.dataset.a==='all') openAllResetSheet();
  });
  const o = window.openAdminCat;
  if(typeof o==='function') window.openAdminCat = function(id){ const r = o.apply(this, arguments); if(id==='notice') renderNoticeHub(); if(id==='danger') renderResetHub(); return r; };
})();
