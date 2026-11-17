/* ================= 전술 보드 (전술 탭) ================= */
/* 코트는 SVG viewBox 0 0 300 460 기준 좌표계를 씁니다 (세로 방향 풋살 코트, 골대가 위/아래).
   positions는 [{ name, x, y }] 형태로 Supabase tactics_boards 테이블에 저장됩니다. */
const TACTICS_COURT_W = 300, TACTICS_COURT_H = 460, TACTICS_PLAYER_R = 19;
let tacticsTabInited = false;
let tacticsSelectedDate = '';
let tacticsPositions = []; // 현재 편집 중인 배치 [{name, x, y}]
let tacticsRosterAll = [];  // 선택된 날짜의 전체 참석자 이름 목록
let tacticsDirty = false;   // 마지막 저장 이후 변경 여부
let tacticsDragState = null; // { name, svgEl }
let tacticsFormat = '5';     // '5' | '6' (5:5, 6:6)
let tacticsFormation = 'free'; // 'free' 또는 TACTICS_FORMATIONS_BY_FORMAT[tacticsFormat]의 key
let tacticsPendingRosterName = null; // 포메이션 모드에서 "배치 대기 중"인 로스터 선수 이름

/* 경기 형식(5:5/6:6)별로 완전히 다른 포메이션 이름과 필드 플레이어 슬롯 좌표를 씁니다.
   5:5는 필드 플레이어 4명, 6:6은 5명 기준입니다. (골키퍼는 별도 고정 슬롯) */
const TACTICS_FORMATIONS_BY_FORMAT = {
  '5': {
    '2-2':   [ {x:95,y:330}, {x:205,y:330}, {x:95,y:180}, {x:205,y:180} ],
    '1-2-1': [ {x:150,y:360}, {x:80,y:250}, {x:220,y:250}, {x:150,y:150} ],
    '3-1':   [ {x:60,y:320}, {x:150,y:340}, {x:240,y:320}, {x:150,y:170} ]
  },
  '6': {
    '3-2':   [ {x:60,y:340}, {x:150,y:360}, {x:240,y:340}, {x:95,y:180}, {x:205,y:180} ],
    '2-1-2': [ {x:95,y:350}, {x:205,y:350}, {x:150,y:260}, {x:80,y:150}, {x:220,y:150} ],
    '2-3':   [ {x:95,y:340}, {x:205,y:340}, {x:60,y:180}, {x:150,y:160}, {x:240,y:180} ]
  }
};
/* 골키퍼 고정 슬롯 (아래쪽 골문 앞) */
const TACTICS_GK_SLOT = { x:150, y:430 };

/* 지금 선택된 경기 형식(5:5/6:6)에서 고를 수 있는 포메이션 이름 목록입니다. */
function tacticsFormationNamesForFormat(){
  return Object.keys(TACTICS_FORMATIONS_BY_FORMAT[tacticsFormat] || {});
}

function tacticsFormationSlots(){
  if(tacticsFormation === 'free') return null;
  const fieldSlots = (TACTICS_FORMATIONS_BY_FORMAT[tacticsFormat] || {})[tacticsFormation];
  if(!fieldSlots) return null;
  return [ { role:'GK', ...TACTICS_GK_SLOT }, ...fieldSlots.map(s=>({ role:'FIELD', ...s })) ];
}

/* 형식(5:5/6:6)이 바뀔 때마다 포메이션 선택 칩을 그 형식에 맞는 이름들로 다시 그립니다. */
function renderTacticsFormationChips(){
  const wrap = $('#tacticsFormationChips');
  if(!wrap) return;
  const names = tacticsFormationNamesForFormat();
  wrap.innerHTML = names.map(n=>`<button type="button" class="tactics-chip" data-formation="${n}">${n}</button>`).join('')
    + `<button type="button" class="tactics-chip active" data-formation="free">자유 배치</button>`;
  tacticsFormation = 'free';
  wrap.querySelectorAll('.tactics-chip[data-formation]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      if(!requireAdmin()) return;
      if(chip.dataset.formation === tacticsFormation) return;
      if(tacticsPositions.length){
        if(!confirm('포메이션을 바꾸면 지금 배치가 초기화됩니다. 계속하시겠습니까?')) return;
        tacticsPositions = [];
        tacticsDirty = true;
      }
      tacticsFormation = chip.dataset.formation;
      wrap.querySelectorAll('.tactics-chip[data-formation]').forEach(c=>c.classList.toggle('active', c===chip));
      tacticsPendingRosterName = null;
      renderTacticsRoster();
      renderTacticsCourt();
      updateTacticsStatus();
    });
  });
}

/* appData.votes에 기록이 있는 모든 날짜(과거 포함)를 최신순으로 반환합니다.
   findNearestUpcomingConfirmedDate()는 미래 날짜만 보므로, 지난 경기 복기를 위해 별도로 만듭니다. */
function getAllConfirmedDatesDesc(){
  return Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && (appData.votes[d]||[]).length>0)
    .sort().reverse();
}

function populateTacticsDateSelect(){
  const sel = $('#tacticsDateSelect');
  if(!sel) return;
  const dates = getAllConfirmedDatesDesc();
  const prevValue = sel.value;
  const todayS = todayStr();
  sel.innerHTML = '<option value="">확정 경기 선택</option>' + dates.map(d=>{
    const tag = d===todayS ? ' (오늘)' : (d>todayS ? ' (예정)' : '');
    return `<option value="${d}">${d}${tag}</option>`;
  }).join('');
  if(prevValue && dates.includes(prevValue)) sel.value = prevValue;
}

async function loadTacticsBoard(dateStr){
  if(!supabaseClient) return [];
  try{
    const { data, error } = await supabaseClient.from('tactics_boards').select('positions').eq('match_date', dateStr).maybeSingle();
    if(error) throw error;
    return (data && Array.isArray(data.positions)) ? data.positions : [];
  }catch(e){
    console.error('[전술 보드] 불러오기 실패:', e);
    return [];
  }
}

async function saveTacticsBoard(dateStr, positions){
  if(!supabaseClient) return { ok:false, reason:'서버에 연결할 수 없습니다.' };
  try{
    const { error } = await supabaseClient.from('tactics_boards').upsert({ match_date: dateStr, positions, updated_at: new Date().toISOString() });
    if(error) throw error;
    return { ok:true };
  }catch(e){
    console.error('[전술 보드] 저장 실패:', e);
    let reason = e && e.message ? e.message : '알 수 없는 오류';
    if(e && e.code === '42P01') reason = 'tactics_boards 테이블이 아직 없습니다. tactics-board-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    else if(e && e.code === '42501') reason = '저장 권한이 없습니다(RLS 정책 확인 필요). tactics-board-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    return { ok:false, reason };
  }
}

/* 코트 배경(라인)을 그립니다. 선수 배치와 별개로 한 번만 그려도 되는 정적인 부분입니다. */
function drawTacticsCourtLines(){
  const w = TACTICS_COURT_W, h = TACTICS_COURT_H;
  return `
    <rect x="4" y="4" width="${w-8}" height="${h-8}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <line x1="4" y1="${h/2}" x2="${w-4}" y2="${h/2}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <circle cx="${w/2}" cy="${h/2}" r="34" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-60}" y="4" width="120" height="46" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-60}" y="${h-50}" width="120" height="46" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-24}" y="4" width="48" height="14" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="${w/2-24}" y="${h-18}" width="48" height="14" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/>
  `;
}

/* 코트 위 선수 라벨에 성을 빼고 이름만 표시합니다 (예: "김종혁" → "종혁"). 팀원 이름은 항상 성 1글자 + 이름 2글자입니다. */
function tacticsGivenName(fullName){
  const s = String(fullName||'');
  return s.length > 1 ? s.slice(1) : s;
}
function tacticsPlayerNode(p){
  const label = tacticsGivenName(p.name);
  return `
    <g class="tactics-player-node" data-name="${escapeHtml(p.name)}" transform="translate(${p.x},${p.y})">
      <circle class="tactics-player-circle${isAdminUser()?'':' readonly'}" r="${TACTICS_PLAYER_R}"></circle>
      <text class="tactics-player-label" y="4">${escapeHtml(label)}</text>
    </g>
  `;
}

function renderTacticsCourt(){
  const svg = $('#tacticsCourt');
  if(!svg) return;
  const slots = tacticsFormationSlots();
  let slotsHtml = '';
  if(slots){
    const occupiedSlots = new Set();
    // 이미 배치된 선수가 어느 슬롯에 있는지(좌표 일치) 확인해서, 빈 슬롯만 점선으로 그립니다.
    tacticsPositions.forEach(p=>{
      const idx = slots.findIndex(s=>!occupiedSlots.has(s) && s.x===p.x && s.y===p.y);
      if(idx>=0) occupiedSlots.add(slots[idx]);
    });
    slotsHtml = slots.filter(s=>!occupiedSlots.has(s)).map((s,i)=>`
      <circle class="tactics-slot-empty${tacticsPendingRosterName?' pickable':''}" data-slot-x="${s.x}" data-slot-y="${s.y}" cx="${s.x}" cy="${s.y}" r="${TACTICS_PLAYER_R}"></circle>
      <text class="tactics-slot-label" x="${s.x}" y="${s.y+4}" pointer-events="none">${s.role==='GK'?'GK':''}</text>
    `).join('');
  }
  const placedHtml = tacticsPositions.map(p=>tacticsPlayerNode(p)).join('');
  svg.innerHTML = drawTacticsCourtLines() + slotsHtml + placedHtml;
  bindTacticsCourtDrag();
  bindTacticsSlotClicks();
}

/* 포메이션 모드에서, 로스터에서 선수를 고른 뒤(tacticsPendingRosterName) 빈 슬롯을 탭하면 그 자리에 배치합니다. */
function bindTacticsSlotClicks(){
  if(!isAdminUser() || !tacticsPendingRosterName) return;
  const svg = $('#tacticsCourt');
  if(!svg) return;
  svg.querySelectorAll('.tactics-slot-empty.pickable').forEach(slot=>{
    slot.addEventListener('click', ()=>{
      const x = parseFloat(slot.dataset.slotX), y = parseFloat(slot.dataset.slotY);
      tacticsPositions.push({ name: tacticsPendingRosterName, x, y });
      tacticsPendingRosterName = null;
      tacticsDirty = true;
      renderTacticsRoster();
      renderTacticsCourt();
      updateTacticsStatus();
    });
  });
}

function renderTacticsRoster(){
  const rosterEl = $('#tacticsRoster');
  const hintEl = $('#tacticsRosterHint');
  if(!rosterEl) return;
  const placedSet = new Set(tacticsPositions.map(p=>p.name));
  const remaining = tacticsRosterAll.filter(n=>!placedSet.has(n));
  if(hintEl){
    hintEl.style.display = isAdminUser() ? 'block' : 'none';
    hintEl.textContent = tacticsFormation === 'free'
      ? '선수를 눌러 코트에 배치하세요. 코트 위 선수를 드래그해서 위치를 옮길 수 있습니다.'
      : '선수를 먼저 누르고, 이어서 코트의 빈 자리를 눌러 배치하세요.';
  }
  if(!isAdminUser()){
    // 팀원은 배치만 볼 수 있고, 남은 로스터 칩(아직 코트에 없는 사람)은 굳이 조작 대상이 아니므로 숨깁니다.
    rosterEl.innerHTML = remaining.length ? `<div class="tactics-roster-empty">코트에 배치되지 않은 인원: ${remaining.map(escapeHtml).join(', ')}</div>` : '';
    return;
  }
  if(!remaining.length){
    rosterEl.innerHTML = '<div class="tactics-roster-empty">전원 배치 완료</div>';
    return;
  }
  rosterEl.innerHTML = remaining.map(name=>`<button type="button" class="tactics-roster-chip${name===tacticsPendingRosterName?' pending':''}" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
  rosterEl.querySelectorAll('.tactics-roster-chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      const name = chip.dataset.name;
      if(tacticsFormation === 'free'){
        // 자유 배치: 탭하면 바로 코트에 놓습니다. 겹치지 않도록 이미 배치된 인원 수만큼 살짝 어긋나게 둡니다.
        const idx = tacticsPositions.length;
        const col = idx % 3, row = Math.floor(idx/3);
        tacticsPositions.push({ name, x: 70 + col*80, y: 120 + row*80 });
        tacticsDirty = true;
        renderTacticsRoster();
        renderTacticsCourt();
        updateTacticsStatus();
        return;
      }
      // 포메이션 모드: 같은 선수를 다시 누르면 배치 대기를 취소하고, 아니면 이 선수를 배치 대기 상태로 만듭니다.
      tacticsPendingRosterName = (tacticsPendingRosterName === name) ? null : name;
      renderTacticsRoster();
      renderTacticsCourt();
    });
  });
}

function updateTacticsStatus(){
  const el = $('#tacticsStatus');
  if(!el) return;
  if(!isAdminUser()){ el.textContent = ''; return; }
  el.textContent = tacticsDirty ? '변경사항이 있습니다. 저장 버튼을 눌러 반영해 주시기 바랍니다.' : '저장된 배치입니다.';
}

/* 코트 위 선수 아이콘의 드래그 이동을 처리합니다. 관리자만 동작하고, 팀원은 보기 전용입니다. */
function bindTacticsCourtDrag(){
  if(!isAdminUser()) return;
  const svg = $('#tacticsCourt');
  if(!svg) return;
  svg.querySelectorAll('.tactics-player-node').forEach(node=>{
    const name = node.dataset.name;
    const circle = node.querySelector('.tactics-player-circle');
    const startDrag = (clientX, clientY)=>{
      tacticsDragState = { name };
      circle.setAttribute('stroke', 'var(--amber)');
    };
    const moveDrag = (clientX, clientY)=>{
      if(!tacticsDragState || tacticsDragState.name !== name) return;
      const rect = svg.getBoundingClientRect();
      let x = (clientX - rect.left) / rect.width * TACTICS_COURT_W;
      let y = (clientY - rect.top) / rect.height * TACTICS_COURT_H;
      x = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_W - TACTICS_PLAYER_R, x));
      y = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_H - TACTICS_PLAYER_R, y));
      node.setAttribute('transform', `translate(${x},${y})`);
      const p = tacticsPositions.find(p=>p.name===name);
      if(p){ p.x = Math.round(x); p.y = Math.round(y); }
    };
    const endDrag = ()=>{
      if(tacticsDragState && tacticsDragState.name===name){
        tacticsDragState = null;
        tacticsDirty = true;
        updateTacticsStatus();
      }
      circle.removeAttribute('stroke');
      circle.setAttribute('stroke', '#0b1410');
    };
    // 마우스와 터치를 함께 지원합니다.
    node.addEventListener('mousedown', (e)=>{ e.preventDefault(); startDrag(e.clientX, e.clientY); });
    node.addEventListener('touchstart', (e)=>{ const t=e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive:true });
  });
  // 코트를 벗어나 놓아도 이동이 끝나도록, 이동/종료 리스너는 document에 한 번만 등록합니다.
  if(!svg.dataset.dragBound){
    svg.dataset.dragBound = '1';
    document.addEventListener('mousemove', (e)=>{
      if(!tacticsDragState) return;
      const node = svg.querySelector(`.tactics-player-node[data-name="${CSS.escape(tacticsDragState.name)}"]`);
      if(!node) return;
      const rect = svg.getBoundingClientRect();
      let x = (e.clientX - rect.left) / rect.width * TACTICS_COURT_W;
      let y = (e.clientY - rect.top) / rect.height * TACTICS_COURT_H;
      x = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_W - TACTICS_PLAYER_R, x));
      y = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_H - TACTICS_PLAYER_R, y));
      node.setAttribute('transform', `translate(${x},${y})`);
      const p = tacticsPositions.find(p=>p.name===tacticsDragState.name);
      if(p){ p.x = Math.round(x); p.y = Math.round(y); }
    });
    document.addEventListener('touchmove', (e)=>{
      if(!tacticsDragState) return;
      const t = e.touches[0];
      const node = svg.querySelector(`.tactics-player-node[data-name="${CSS.escape(tacticsDragState.name)}"]`);
      if(!node) return;
      const rect = svg.getBoundingClientRect();
      let x = (t.clientX - rect.left) / rect.width * TACTICS_COURT_W;
      let y = (t.clientY - rect.top) / rect.height * TACTICS_COURT_H;
      x = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_W - TACTICS_PLAYER_R, x));
      y = Math.max(TACTICS_PLAYER_R, Math.min(TACTICS_COURT_H - TACTICS_PLAYER_R, y));
      node.setAttribute('transform', `translate(${x},${y})`);
      const p = tacticsPositions.find(p=>p.name===tacticsDragState.name);
      if(p){ p.x = Math.round(x); p.y = Math.round(y); }
    }, { passive:true });
    const endAll = ()=>{
      if(tacticsDragState){ tacticsDragState = null; tacticsDirty = true; updateTacticsStatus(); }
    };
    document.addEventListener('mouseup', endAll);
    document.addEventListener('touchend', endAll);
  }
}

async function handleTacticsDateChange(dateStr){
  tacticsSelectedDate = dateStr;
  tacticsDirty = false;
  tacticsPendingRosterName = null;
  const emptyEl = $('#tacticsEmpty');
  const boardWrap = $('#tacticsBoardWrap');
  const formatRow = $('#tacticsFormatRow');
  const formationRow = $('#tacticsFormationRow');
  const formatLockedNote = $('#tacticsFormatLockedNote');
  if(!dateStr){
    if(emptyEl) emptyEl.style.display = 'block';
    if(boardWrap) boardWrap.style.display = 'none';
    if(formatRow) formatRow.style.display = 'none';
    if(formationRow) formationRow.style.display = 'none';
    if(formatLockedNote) formatLockedNote.style.display = 'none';
    return;
  }
  if(emptyEl) emptyEl.style.display = 'none';
  if(boardWrap) boardWrap.style.display = 'block';

  // 이 경기에 등록된 경기 형식(5:5/6:6)이 있으면 그대로 고정합니다. 관리자가 형식을 바꿀 필요가
  // 없으므로 형식 선택 칩은 숨기고, 대신 "이 경기는 6:6으로 고정되어 있습니다" 안내만 보여줍니다.
  // 형식 정보가 아직 없는 경기(예전에 확정했거나, 관리자 도구에서 형식을 지정하지 않은 경우)는
  // 기존처럼 관리자가 직접 골라야 합니다.
  const venueInfo = getVenueInfo(dateStr);
  const lockedFormat = venueInfo && venueInfo.format;
  if(lockedFormat === '5' || lockedFormat === '6'){
    tacticsFormat = lockedFormat;
    if(formatRow) formatRow.style.display = 'none';
    if(formatLockedNote){
      formatLockedNote.style.display = 'block';
      formatLockedNote.textContent = `이 경기는 ${lockedFormat}:${lockedFormat} 형식으로 등록되어 있어, 그에 맞는 포메이션만 고를 수 있습니다.`;
    }
  } else {
    if(formatRow) formatRow.style.display = 'flex';
    if(formatLockedNote) formatLockedNote.style.display = 'none';
  }
  if(formationRow) formationRow.style.display = 'flex';
  renderTacticsFormationChips(); // 고정된(또는 선택된) 형식에 맞는 포메이션 이름들을 다시 그립니다.

  const breakdown = getVoteBreakdownForDate(dateStr);
  tacticsRosterAll = breakdown.yesList.slice();
  const saved = await loadTacticsBoard(dateStr);
  // 저장된 배치 중 이제는 그 날짜 참석자가 아닌 이름은 제외합니다 (참석 명단이 나중에 바뀐 경우 대비).
  tacticsPositions = saved.filter(p=>tacticsRosterAll.includes(p.name));
  renderTacticsRoster();
  renderTacticsCourt();
  updateTacticsStatus();
}

function initTacticsTabOnce(){
  populateTacticsDateSelect();
  renderTacticsFormationChips(); // 기본 형식(5:5)에 맞는 포메이션 이름들을 먼저 그립니다.
  const sel = $('#tacticsDateSelect');
  if(sel && !sel.value){
    const dates = getAllConfirmedDatesDesc();
    const todayS = todayStr();
    const defaultDate = dates.find(d=>d<=todayS) || dates[0] || '';
    if(defaultDate){ sel.value = defaultDate; handleTacticsDateChange(defaultDate); }
  }
  const saveBtn = $('#tacticsSaveBtn');
  const resetBtn = $('#tacticsResetBtn');
  if(saveBtn) saveBtn.style.display = isAdminUser() ? 'inline-block' : 'none';
  if(resetBtn) resetBtn.style.display = isAdminUser() ? 'inline-block' : 'none';
  if(tacticsTabInited) return;
  tacticsTabInited = true;

  if(sel) sel.addEventListener('change', ()=>handleTacticsDateChange(sel.value));

  const formatRow = $('#tacticsFormatRow');
  if(formatRow) formatRow.querySelectorAll('.tactics-chip[data-format]').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      if(!requireAdmin()) return;
      if(chip.dataset.format === tacticsFormat) return;
      if(tacticsPositions.length && tacticsFormation !== 'free'){
        if(!confirm('경기 형식을 바꾸면 지금 배치가 초기화됩니다. 계속하시겠습니까?')) return;
        tacticsPositions = [];
        tacticsDirty = true;
      }
      tacticsFormat = chip.dataset.format;
      formatRow.querySelectorAll('.tactics-chip[data-format]').forEach(c=>c.classList.toggle('active', c===chip));
      tacticsPendingRosterName = null;
      renderTacticsFormationChips(); // 형식이 바뀌면 포메이션 이름 목록 자체가 달라지므로 다시 그립니다.
      renderTacticsRoster();
      renderTacticsCourt();
      updateTacticsStatus();
    });
  });

  if(saveBtn) saveBtn.addEventListener('click', async ()=>{
    if(!requireAdmin()) return;
    if(!tacticsSelectedDate){ toast('먼저 경기 날짜를 선택해 주시기 바랍니다.'); return; }
    saveBtn.disabled = true;
    const result = await saveTacticsBoard(tacticsSelectedDate, tacticsPositions);
    saveBtn.disabled = false;
    if(result.ok){
      tacticsDirty = false;
      updateTacticsStatus();
      toast('전술 배치를 저장했습니다.');
    } else {
      toast(`전술 저장에 실패했습니다: ${result.reason}`);
    }
  });

  if(resetBtn) resetBtn.addEventListener('click', ()=>{
    if(!requireAdmin()) return;
    if(!tacticsPositions.length){ return; }
    if(!confirm('코트에 배치한 선수를 모두 초기화하시겠습니까? (저장 전까지는 취소할 수 있습니다)')) return;
    tacticsPositions = [];
    tacticsDirty = true;
    renderTacticsRoster();
    renderTacticsCourt();
    updateTacticsStatus();
  });
}

/* 기록 탭에서 지난 경기를 눌렀을 때, 그 날짜에 저장된 전술 배치가 있으면 작은 읽기 전용 코트로 보여줍니다. */
async function renderTacticsMiniForDate(dateStr, containerEl){
  if(!containerEl) return;
  const saved = await loadTacticsBoard(dateStr);
  if(!saved.length){ containerEl.innerHTML = ''; return; }
  const placedHtml = saved.map(p=>`
    <g transform="translate(${p.x},${p.y})">
      <circle r="${TACTICS_PLAYER_R}" fill="var(--pitch)" stroke="#0b1410" stroke-width="2"></circle>
      <text y="4" font-size="9" font-weight="700" fill="#0b1410" text-anchor="middle">${escapeHtml(tacticsGivenName(p.name))}</text>
    </g>
  `).join('');
  containerEl.innerHTML = `
    <div class="tactics-mini-court-wrap">
      <svg class="tactics-mini-court" viewBox="0 0 ${TACTICS_COURT_W} ${TACTICS_COURT_H}" preserveAspectRatio="xMidYMid meet">
        ${drawTacticsCourtLines()}
        ${placedHtml}
      </svg>
    </div>
  `;
}


