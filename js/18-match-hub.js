/* ---------- 관리자 > 경기: 한 화면 편집 (날짜 칩 · 시간 칩 · 형식 버튼 · 하단 고정 저장) ----------
   기존 입력란 ID(#matchVenue*)와 저장 핸들러(07-admin.js)를 그대로 사용하고, 칩/버튼은 값을 그 입력란에 동기화합니다. */
const MV_TIMES = ['19:00~21:00','20:00~22:00','21:00~23:00','22:00~24:00'];
function mvConfirmedDates(){
  const t = todayStr();
  return Object.keys(appData.votes||{}).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=t && (appData.votes[d]||[]).length>0).sort();
}
function mvRenderDates(){
  const box = document.getElementById('mvDateChips'); const inp = document.getElementById('matchVenueDateInput');
  if(!box || !inp) return;
  const cur = inp.value; const ds = mvConfirmedDates();
  if(cur && !ds.includes(cur)) ds.push(cur), ds.sort();
  if(!ds.length){ box.innerHTML = '<div class="mv-empty">확정된 예정 경기가 없습니다. 캘린더에서 주간 투표를 확정하거나 아래에서 날짜를 직접 선택하세요.</div>'; return; }
  box.innerHTML = ds.map(d=>{
    const o = parseYMD(d); const reg = !!(typeof getVenueInfo==='function' && getVenueInfo(d));
    const conf = (appData.votes[d]||[]).length>0;
    return `<button type="button" class="mv-d${d===cur?' on':''}${reg?'':' no'}" data-d="${d}"><b>${o.getMonth()+1}/${o.getDate()}</b><small>${weekdayKR[o.getDay()]} · ${reg?'등록됨':(conf?'미등록':'미확정')}</small></button>`;
  }).join('');
}
function mvRenderTimes(){
  const box = document.getElementById('mvTimeChips'); const t = document.getElementById('matchVenueTimeInput');
  if(!box || !t) return;
  const v = t.value.trim();
  const custom = v && !MV_TIMES.includes(v);
  box.innerHTML = MV_TIMES.map(x=>`<button type="button" class="mv-c${x===v?' on':''}" data-t="${x}">${x.split('~')[0]}</button>`).join('')
    + `<button type="button" class="mv-c${custom?' on':''}" data-t="__custom">직접입력</button>`;
  const row = document.querySelector('.mv-timeRow'); if(row) row.style.display = (custom || box.dataset.open==='1') ? '' : 'none';
}
function mvRenderFormat(){
  const sel = document.getElementById('matchVenueFormatSelect'); const seg = document.getElementById('mvFormatSeg');
  if(!sel || !seg) return;
  seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.v===sel.value));
}
function mvRefresh(){ mvRenderDates(); mvRenderTimes(); mvRenderFormat(); }
(function(){
  const dateInp = document.getElementById('matchVenueDateInput');
  const timeInp = document.getElementById('matchVenueTimeInput');
  const sel = document.getElementById('matchVenueFormatSelect');
  if(!dateInp) return;
  document.getElementById('mvDateChips').addEventListener('click', (e)=>{
    const b = e.target.closest('.mv-d'); if(!b) return;
    dateInp.value = b.dataset.d; loadMatchVenueTimeEditorForDate(b.dataset.d);
    document.getElementById('mvTimeChips').dataset.open = ''; mvRefresh();
  });
  dateInp.addEventListener('change', ()=>{ document.getElementById('mvTimeChips').dataset.open=''; mvRefresh(); });
  document.getElementById('mvTimeChips').addEventListener('click', (e)=>{
    const b = e.target.closest('.mv-c'); if(!b) return;
    const box = document.getElementById('mvTimeChips');
    if(b.dataset.t==='__custom'){ box.dataset.open='1'; mvRenderTimes(); timeInp.focus(); return; }
    timeInp.value = (timeInp.value.trim()===b.dataset.t) ? '' : b.dataset.t; box.dataset.open=''; mvRenderTimes();
  });
  timeInp.addEventListener('input', mvRenderTimes);
  document.getElementById('mvFormatSeg').addEventListener('click', (e)=>{
    const b = e.target.closest('button'); if(!b) return; sel.value = b.dataset.v; mvRenderFormat();
  });
  // 기존 로더/저장 후 화면 동기화
  const origLoad = window.loadMatchVenueTimeEditorForDate;
  window.loadMatchVenueTimeEditorForDate = function(){ const r = origLoad.apply(this, arguments); try{ mvRefresh(); }catch(_){} return r; };
  const origHint = window.renderMatchVenueConfirmedHint;
  window.renderMatchVenueConfirmedHint = function(){ const r = origHint.apply(this, arguments); try{ mvRefresh(); }catch(_){} return r; };
  mvRefresh();
})();
