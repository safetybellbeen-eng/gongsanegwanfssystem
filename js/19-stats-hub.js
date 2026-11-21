/* ---------- 관리자 > 통계: 요약 카드 + 제외 주간 카드 + 회원별 ± 조정 시트 ----------
   저장 구조(appData.excludedWeeks, appData.statAdjustments)는 기존 그대로입니다. 기존 두 카드는 숨기고 이 화면이 대신합니다. */
const SH = { q:'', yes:0, missed:0, no:0, name:null };
function shAdj(n){ const a = (appData.statAdjustments||{})[n]; return a ? { yes:a.yes||0, missed:a.missed||0, no:a.no||0 } : { yes:0, missed:0, no:0 }; }
function shNat(n){ return { yes:(lastNaturalStats[n]&&lastNaturalStats[n].yes)||0, no:(lastNaturalStats[n]&&lastNaturalStats[n].no)||0, missed:lastNaturalMissCounts[n]||0 }; }
function shHasAdj(n){ const a = shAdj(n); return !!(a.yes||a.missed||a.no); }
function shWeekLabel(wk){ const d = getWeekDates(wk); const s = parseYMD(d[0]), e = parseYMD(d[6]); return `${s.getMonth()+1}/${s.getDate()} ~ ${e.getMonth()+1}/${e.getDate()}`; }
function shSigned(v){ return v>0?`+${v}`:(v<0?`−${Math.abs(v)}`:''); }
function shCell(nat, adj, key){
  const fin = nat + adj; const cls = adj>0 ? 'p' : (adj<0 ? 'm' : '');
  return `<div><b class="${cls}">${fin}</b>${adj?`<small>${shSigned(adj)}</small>`:''}</div>`;
}
function renderStatsHub(){
  const root = document.getElementById('statsHub'); if(!root) return;
  if(typeof requireAdminSilent==='function' && !requireAdminSilent()){ root.innerHTML=''; return; }
  const p = lastStatPeriodInfo || {};
  const rng = p.matchCount
    ? `참석/불참 · 확정 <b>${p.matchCount}경기</b> (${escapeHtml(p.earliestMatchDate||'')} ~ ${escapeHtml(p.latestMatchDate||'')})<br>미투표 · <b>${p.weekCount}주간</b> (${escapeHtml(p.earliestWeek||'')}주 ~ 이번 주)`
    : '아직 집계할 확정 경기가 없습니다.';
  const weeks = [...(appData.excludedWeeks||[])].sort();
  const names = getApprovedNonAdminNames().sort((a,b)=>{ const x = shHasAdj(a), y = shHasAdj(b); if(x!==y) return x?-1:1; return a.localeCompare(b,'ko'); });
  const q = SH.q.trim();
  const list = q ? names.filter(n=>n.includes(q)) : names;
  const adjCnt = names.filter(shHasAdj).length;
  root.innerHTML = `
    <div class="sh-rng"><div class="h">📅 집계 범위 (오늘 ${escapeHtml(p.today||todayStr())} 기준)</div>${rng}</div>
    <div class="sh-hd">통계 제외 주간 · ${weeks.length}건</div>
    ${weeks.map(wk=>`<div class="sh-wk"><span>${shWeekLabel(wk)}</span><button type="button" class="sh-x" data-wk="${wk}" aria-label="제외 해제">✕</button></div>`).join('') || '<div class="sh-empty">제외된 주간이 없습니다.</div>'}
    <button type="button" class="sh-add" id="shAddWeek">＋ 제외할 주간 추가</button>
    <div class="sh-hd">횟수 조정 · 전체 ${names.length}명 <small>● 조정됨 ${adjCnt}명</small></div>
    <input type="search" id="shSearch" class="sh-search" placeholder="🔍 회원 검색" value="${escapeHtml(SH.q)}">
    <div class="sh-th"><i></i><span>참석</span><span>미투표</span><span>불참</span></div>
    ${list.map(n=>{ const nt = shNat(n), a = shAdj(n); return `<button type="button" class="sh-mr" data-n="${escapeHtml(n)}"><b>${escapeHtml(n)}${shHasAdj(n)?'<i class="sh-dot"></i>':''}</b><div class="sh-mi">${shCell(nt.yes,a.yes)}${shCell(nt.missed,a.missed)}${shCell(nt.no,a.no)}</div></button>`; }).join('') || '<div class="sh-empty">해당하는 회원이 없습니다.</div>'}`;
}
function shCloseSheet(){ const o = document.getElementById('shSheet'); if(o) o.remove(); }
function shOpenSheet(html, onClick){
  shCloseSheet();
  const el = document.createElement('div'); el.id = 'shSheet'; el.className = 'mh-dim';
  el.innerHTML = `<div class="mh-sheet sh-sheet" role="dialog">${html}</div>`;
  el.addEventListener('click', (e)=>{ if(e.target===el){ shCloseSheet(); return; } onClick(e); });
  document.body.appendChild(el);
}
function shRenderAdjSheet(){
  const el = document.querySelector('#shSheet .sh-sheet'); if(!el) return;
  const n = SH.name, nt = shNat(n);
  const row = (k,l)=>`<div class="sh-st"><span class="l">${l}</span><span class="n">자동 ${nt[k]}</span><div class="c"><button type="button" data-d="${k}:-1">−</button><b class="${SH[k]>0?'p':(SH[k]<0?'m':'')}">${SH[k]>0?'+':''}${SH[k]}</b><button type="button" data-d="${k}:1">＋</button></div></div>`;
  el.innerHTML = `<h3>${escapeHtml(n)}</h3><div class="sh-sub">자동 집계에 더하거나 뺍니다 · 투표 기록은 바뀌지 않음</div>
    ${row('yes','참석')}${row('missed','미투표')}${row('no','불참')}
    <div class="sh-res">최종 <b>참석 ${Math.max(0,nt.yes+SH.yes)} · 미투표 ${Math.max(0,nt.missed+SH.missed)} · 불참 ${Math.max(0,nt.no+SH.no)}</b></div>
    <div class="sh-btns"><button type="button" class="sh-ghost" data-act="reset">조정 초기화</button><button type="button" class="sh-save" data-act="save">저장</button></div>`;
}
function shOpenAdjSheet(n){
  const a = shAdj(n); SH.name = n; SH.yes = a.yes; SH.missed = a.missed; SH.no = a.no;
  shOpenSheet('', async (e)=>{
    const d = e.target.closest('[data-d]');
    if(d){ const [k,v] = d.dataset.d.split(':'); SH[k] += Number(v); shRenderAdjSheet(); return; }
    const b = e.target.closest('[data-act]'); if(!b) return;
    if(b.dataset.act==='reset'){ SH.yes = SH.missed = SH.no = 0; shRenderAdjSheet(); return; }
    if(b.dataset.act==='save'){
      const name = SH.name, yes = SH.yes, missed = SH.missed, no = SH.no;
      await mutateAppData(data=>{
        if(!data.statAdjustments) data.statAdjustments = {};
        if(!yes && !missed && !no) delete data.statAdjustments[name]; else data.statAdjustments[name] = { yes, missed, no };
      });
      shCloseSheet(); computeAttendanceStats(); if(typeof renderMatchStats==='function') renderMatchStats(); renderStatsHub();
      toast(`'${name}' 님의 순위 조정값을 저장했습니다.`);
    }
  });
  shRenderAdjSheet();
}
function shOpenWeekSheet(){
  const ex = new Set(appData.excludedWeeks||[]);
  const cur = getWeekStart(todayStr()); const chips = [];
  for(let i=0;i<8;i++){ const d = parseYMD(cur); d.setDate(d.getDate()-7*i); const wk = fmtDate(d); if(!ex.has(wk)) chips.push(wk); }
  let sel = chips[0] || '';
  const draw = ()=>{
    const el = document.querySelector('#shSheet .sh-sheet'); if(!el) return;
    el.innerHTML = `<h3>제외할 주간 추가</h3><div class="sh-sub">날짜를 고르면 그 날짜가 속한 주(일~토) 전체가 팀 순위에서 제외됩니다</div>
      <div class="sh-hd" style="margin-top:0">최근 주간에서 선택</div>
      <div class="sh-chips">${chips.map(wk=>`<button type="button" class="${wk===sel?'on':''}" data-wk="${wk}">${shWeekLabel(wk).split(' ~ ')[0]}주</button>`).join('') || '<span class="sh-empty">최근 8주는 모두 제외됨</span>'}</div>
      <div class="sh-hd">또는 날짜 직접 선택</div>
      <input type="date" id="shWeekDate" class="sh-date" value="${sel}">
      <div class="sh-res" id="shWeekRes">${sel?`→ <b>${shWeekLabel(getWeekStart(sel))}</b> 주가 제외됩니다`:'날짜를 선택해 주세요'}</div>
      <button type="button" class="sh-save" data-act="add" style="width:100%">이 주간 제외</button>`;
    const di = el.querySelector('#shWeekDate');
    di.addEventListener('change', ()=>{ sel = di.value; draw(); });
  };
  shOpenSheet('', async (e)=>{
    const c = e.target.closest('[data-wk]'); if(c){ sel = c.dataset.wk; draw(); return; }
    const b = e.target.closest('[data-act="add"]'); if(!b) return;
    if(!sel){ toast('날짜를 선택해 주시기 바랍니다.'); return; }
    const wk = getWeekStart(sel);
    if((appData.excludedWeeks||[]).includes(wk)){ toast('이미 제외된 주간입니다.'); return; }
    await mutateAppData(data=>{ if(!data.excludedWeeks) data.excludedWeeks = []; if(!data.excludedWeeks.includes(wk)) data.excludedWeeks.push(wk); });
    shCloseSheet(); computeAttendanceStats(); renderStatsHub(); toast('해당 주간을 팀 순위 통계에서 제외했습니다.');
  });
  draw();
}
(function(){
  const root = document.getElementById('statsHub'); if(!root) return;
  root.addEventListener('click', async (e)=>{
    if(!requireAdmin()) return;
    const x = e.target.closest('.sh-x');
    if(x){ const wk = x.dataset.wk; await mutateAppData(d=>{ d.excludedWeeks = (d.excludedWeeks||[]).filter(w=>w!==wk); }); computeAttendanceStats(); renderStatsHub(); toast('제외 해제했습니다. 다시 팀 순위 통계에 포함됩니다.'); return; }
    if(e.target.closest('#shAddWeek')){ shOpenWeekSheet(); return; }
    const r = e.target.closest('.sh-mr'); if(r) shOpenAdjSheet(r.dataset.n);
  });
  root.addEventListener('input', (e)=>{ if(e.target.id==='shSearch'){ SH.q = e.target.value; const pos = e.target.selectionStart; renderStatsHub(); const s = document.getElementById('shSearch'); s.focus(); try{ s.setSelectionRange(pos,pos); }catch(_){} } });
  const o1 = window.renderStatAdjustTable;
  window.renderStatAdjustTable = function(){ const r = o1.apply(this, arguments); try{ renderStatsHub(); }catch(_){} return r; };
  const o2 = window.computeAttendanceStats;
  if(typeof o2==='function') window.computeAttendanceStats = function(){ const r = o2.apply(this, arguments); try{ if(document.getElementById('statsHub').innerHTML) renderStatsHub(); }catch(_){} return r; };
  renderStatsHub();
})();
