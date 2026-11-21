/* ---------- Map (venue input moved here) ---------- */
const FUTSAL_VENUES = [
  {name:'서울 강남 도곡에프씨(중대부고 운동장)', address:'서울특별시 강남구 선릉로 207'},
  {name:'서울 강동 송파 풋살장', address:'서울특별시 송파구 풍납동 403-2'},
  {name:'서울 강북 아크 풋살 스타디움', address:'서울특별시 도봉구 도봉로110라길 69-6, 4층'},
  {name:'서울 강서 KBS 스포츠월드', address:'서울특별시 강서구 공항대로 376'},
  {name:'서울 광진 리더짐 풋살장', address:'서울특별시 광진구 구의로 28, 6층'},
  {name:'서울 노원 염광 운동장', address:'서울특별시 노원구 월계로45가길 9'},
  {name:'서울 노원 하라 풋살장', address:'서울특별시 노원구 동일로 1323'},
  {name:'서울 논현 누리풋볼클럽', address:'서울특별시 강남구 논현로 748, 지하 1층'},
  {name:'서울 도봉 라온 풋살장', address:'서울특별시 도봉구 방학동 553-2'},
  {name:'서울 도봉 루다 풋살장', address:'서울특별시 도봉구 방학로 223'},
  {name:'서울 서대문 HIP 풋살그라운드 충정로점', address:'서울특별시 서대문구 경기대로9길 24'},
  {name:'서울 서대문 돌산구장', address:'서울특별시 서대문구 홍은동 10-305'},
  {name:'서울 서초 서동원 축구아카데미', address:'서울특별시 서초구 청계산로 41'},
  {name:'서울 성북 서경대 풋살파크', address:'서울특별시 성북구 서경로 118, 수인관'},
  {name:'서울 송파 천마 풋살파크', address:'서울특별시 송파구 성내천로29길 31'},
  {name:'서울 수유 마이그라운드 풋살장', address:'서울특별시 강북구 도봉로 342, 옥상층'},
  {name:'서울 어반풋볼파크 강서점', address:'서울특별시 강서구 내발산동 755-1'},
  {name:'서울 영등포 SKY 풋살파크', address:'서울특별시 영등포구 선유로43길 19'},
  {name:'서울 영등포 남서울상가 SKY 풋살파크', address:'서울특별시 영등포구 영중로14길 11, 3층 옥상'},
  {name:'서울 영등포 더에프필드', address:'서울특별시 영등포구 선유로 138'},
  {name:'서울 용산 아디다스 더베이스', address:'서울특별시 용산구 한강대로23길 55'},
  {name:'서울 은평 롯데몰 풋살장', address:'서울특별시 은평구 통일로 1050'},
  {name:'서울 잠실 랩스풋볼', address:'서울특별시 송파구 올림픽로8길 21'},
  {name:'서울 지니 풋살파크 용두동점', address:'서울특별시 동대문구 왕산로 68'},
  {name:'서울 지니 풋살파크 중화점', address:'서울특별시 중랑구 봉화산로 56'},
  {name:'서울 짐앤조이 2호점 풋살파크', address:'서울특별시 성동구 자동차시장1길 96, 11층 옥상'},
  {name:'서울 화곡 스트리트 풋살파크', address:'서울특별시 강서구 화곡로 142'},
  {name:'플랩 스타디움 가산 디지털엠파이어', address:'서울특별시 금천구 범안로 1130, 디지털엠파이어 옥상'},
  {name:'플랩 스타디움 가산 마리오', address:'서울특별시 금천구 벚꽃로 266, 마리오아울렛 3관 4층'},
  {name:'플랩 스타디움 가산 벽산디지털밸리 6차', address:'서울특별시 금천구 가산디지털1로 219'},
  {name:'플랩 스타디움 가산 코오롱테크노밸리', address:'서울특별시 금천구 디지털로9길 56, 코오롱테크노밸리 옥상'}
];
/* 플랩풋볼 실제 stadium_name과 프리셋 이름의 표기가 완전히 같지 않을 수 있어(공백 차이 등),
   비교 전에 공백을 모두 제거해서 맞춰봅니다. */
/* ---------- 신규 구장 자동 등록 ----------
   플랩 경기 데이터(plab_matches)에 새 구장 이름이 나타나면 FUTSAL_VENUES에 자동으로 추가합니다.
   (서울 지역만. 주소는 지도에서 이름으로 검색해 채웁니다.) 직접 적어 둔 구장 목록이 항상 우선합니다. */
const AUTO_VENUE_KEY = 'gsg-auto-venues-v1';
function baseVenueName(n){
  let s = String(n||'').replace(/<[^>]*>/g,'').trim();
  s = s.replace(/\s+(실내\s*단일구장|단일구장|실내구장[A-Z]?|야외구장[A-Z]?|[A-Z0-9]+구장(\([^)]*\))?|\d+구장(\([^)]*\))?|(레드|블루|블랙|화이트)구장|8vs8\s*축구장)$/,'').trim();
  return s;
}
function mergeAutoVenues(rawNames){
  const added = [];
  (rawNames||[]).forEach(raw=>{
    const base = baseVenueName(raw);
    if(!base || base.length < 4) return;
    if(findVenuePreset(base) || findVenuePreset(raw)) return;
    FUTSAL_VENUES.push({ name: base, address: '', auto: true });
    added.push(base);
  });
  return added;
}

/* 신규 구장 알림: 자동 등록된 구장 중 관리자가 아직 못 본 것을 한 번만 알려줍니다.
   본 구장 목록은 팀 데이터(appData.knownAutoVenues)에 저장되어 기기가 달라도 한 번만 안내됩니다. */
let newVenueNoticeTries = 0;
function scheduleNewVenueNotice(){
  clearTimeout(scheduleNewVenueNotice._t);
  scheduleNewVenueNotice._t = setTimeout(checkNewVenueNotice, 1500);
}
async function checkNewVenueNotice(){
  try{
    if(!appData || !myName || !isAdminUser()){
      if(++newVenueNoticeTries < 12) scheduleNewVenueNotice();   // 로그인·데이터 로딩을 최대 18초 기다림
      return;
    }
    const cur = FUTSAL_VENUES.filter(v=>v.auto).map(v=>v.name);
    if(!cur.length) return;
    const known = new Set(Array.isArray(appData.knownAutoVenues) ? appData.knownAutoVenues : []);
    const fresh = cur.filter(n=>!known.has(n));
    if(!fresh.length) return;
    const short = fresh.map(n=>n.replace(/^플랩\s*스타디움\s+/,''));
    toast(`🆕 신규 구장 ${fresh.length}곳이 자동 등록됐어요: ${short.slice(0,3).join(', ')}${fresh.length>3?' 외 '+(fresh.length-3)+'곳':''}`, 6000);
    await mutateAppData(data=>{ data.knownAutoVenues = [...new Set([...(Array.isArray(data.knownAutoVenues)?data.knownAutoVenues:[]), ...cur])]; });
  }catch(e){ console.warn('[신규 구장 알림] 실패(무시)', e); }
}
async function loadAutoVenues(){
  try{ await loadAutoVenuesCore(); }finally{ scheduleNewVenueNotice(); }
}
async function loadAutoVenuesCore(){
  let names = [];
  try{
    const c = JSON.parse(localStorage.getItem(AUTO_VENUE_KEY) || 'null');
    if(c && Array.isArray(c.names)) names = c.names;
    if(names.length) mergeAutoVenues(names);
    if(c && Date.now() - c.t < 6*3600*1000) return;   // 6시간 이내면 다시 조회하지 않음
  }catch(_){}
  if(!supabaseClient) return;
  try{
    const { data, error } = await supabaseClient.from('plab_matches').select('stadium_name').eq('area_group','서울').limit(5000);
    if(error) throw error;
    const fresh = [...new Set((data||[]).map(r=>r.stadium_name).filter(Boolean))];
    const added = mergeAutoVenues(fresh);
    try{ localStorage.setItem(AUTO_VENUE_KEY, JSON.stringify({ t: Date.now(), names: fresh })); }catch(_){}
    if(added.length){
      try{ const sel = $('#venuePresetSelect'); if(sel){ sel.innerHTML = ''; populateVenuePresetSelect(); } }catch(_){}
      try{ const ms = $('#matchVenuePresetSelect'); if(ms){ while(ms.options.length>1) ms.remove(1); populateMatchVenuePresetSelect(); } }catch(_){}
      if(typeof venuePinsStarted !== 'undefined' && venuePinsStarted && map){
        for(const v of FUTSAL_VENUES.filter(x=>x.auto && added.includes(x.name))){
          venuePinReady[v.name] = Promise.resolve();
          try{ await placeVenuePin(v); }catch(e){ console.error(e); }
        }
      }
    }
  }catch(e){ console.warn('[구장 자동등록] 조회 실패(무시)', e); }
}
function normalizeVenueName(s){ return String(s||'').replace(/\s+/g, ''); }
function findVenuePreset(name){
  const exact = FUTSAL_VENUES.find(v=>v.name===name);
  if(exact) return exact;
  // 완전 일치가 없으면 공백 무시 + 부분 포함으로 한 번 더 시도합니다.
  const target = normalizeVenueName(name);
  if(!target) return null;
  return FUTSAL_VENUES.find(v=>{
    const preset = normalizeVenueName(v.name);
    return preset && (preset===target || preset.includes(target) || target.includes(preset));
  }) || null;
}
/* appData.venues[date]는 과거엔 문자열이었고 지금은 {name, address} 객체입니다. 둘 다 지원합니다. */
function getVenueInfo(dateStr){
  const raw = appData.venues[dateStr];
  if(!raw) return null;
  if(typeof raw === 'string'){ const preset = findVenuePreset(raw); return { name: raw, address: preset ? preset.address : '' }; }
  return raw;
}
function populateVenuePresetSelect(){
  const sel = $('#venuePresetSelect');
  if(!sel) return;
  const prevValue = sel.value;
  const favSet = favoriteVenueSet;
  const favVenues = FUTSAL_VENUES.filter(v=>favSet.has(v.name));
  const restVenues = FUTSAL_VENUES.filter(v=>!favSet.has(v.name));
  let html = '<option value="">목록에서 선택</option>';
  if(favVenues.length){
    html += `<optgroup label="⭐ 자주 쓰는 경기장">${favVenues.map(v=>`<option value="${escapeHtml(v.name)}">⭐ ${escapeHtml(v.name)}</option>`).join('')}</optgroup>`;
  }
  html += `<optgroup label="전체 경기장">${restVenues.map(v=>`<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`).join('')}</optgroup>`;
  sel.innerHTML = html;
  if(prevValue) sel.value = prevValue;
}
$('#venuePresetSelect').addEventListener('change', ()=>{
  const name = $('#venuePresetSelect').value;
  if(!name) return;
  $('#venueInput').value = name;
  lookupVenueOnMap();
});

/* 즐겨찾기(자주 쓰는 경기장) 토글 버튼. 관리자만 사용할 수 있고, 프리셋 목록에 있는 경기장이든
   플랩풋볼에서 넘어온 경기장이든(프리셋과 이름이 정확히 일치하지 않아도) 지도에 지금 표시 중인
   이름 그대로를 즐겨찾기 키로 저장합니다. 즐겨찾기 등록/해제는 지도 탭에서만 할 수 있습니다. */
function updateFavVenueBtn(){
  const btn = $('#favVenueBtn');
  if(!btn) return;
  if(!isAdminUser()){ btn.style.display='none'; syncVenueCardStar(); return; }
  if(!currentVenueName){ btn.style.display='none'; syncVenueCardStar(); return; }
  btn.style.display = 'inline-block';
  const isFav = favoriteVenueSet.has(currentVenueName);
  btn.textContent = isFav ? '★' : '☆';
  btn.classList.toggle('on', isFav);
  syncVenueCardStar();
}
/* ⚠️ 즐겨찾기는 이제 app_state의 공유 블롭이 아니라 독립된 favorite_venues 테이블에 저장합니다.
   추가/삭제가 그 자체로 원자적인 DB 작업이라, 투표·부상설정 등 다른 저장 작업과 절대 겹쳐서
   유실될 일이 없습니다. */
let favoriteVenueSet = new Set();
async function loadFavoriteVenues(){
  if(!supabaseClient) return;
  try{
    const { data, error } = await supabaseClient.from('favorite_venues').select('venue_name');
    if(error) throw error;
    favoriteVenueSet = new Set((data||[]).map(r=>r.venue_name));
  }catch(e){
    console.error('[즐겨찾기] 목록을 불러오지 못했습니다:', e);
  }
}
async function setFavoriteVenueRobust(name, shouldBeFavorite){
  try{
    if(shouldBeFavorite){
      const { error } = await supabaseClient.from('favorite_venues').insert({ venue_name: name });
      // 이미 즐겨찾기되어 있어서 primary key 충돌이 나는 경우는 실패로 취급하지 않습니다.
      if(error && error.code !== '23505') throw error;
      favoriteVenueSet.add(name);
    } else {
      const { error } = await supabaseClient.from('favorite_venues').delete().eq('venue_name', name);
      if(error) throw error;
      favoriteVenueSet.delete(name);
    }
    return { ok:true };
  }catch(e){
    console.error('[즐겨찾기] 저장/삭제 실패:', e);
    // 테이블이 아직 없거나(42P01) RLS 정책이 없어서 막힌 경우(42501)를 구분해서 안내합니다.
    let reason = e && e.message ? e.message : '알 수 없는 오류';
    if(e && e.code === '42P01') reason = 'favorite_venues 테이블이 아직 없습니다. favorite-venues-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    else if(e && e.code === '42501') reason = '저장 권한이 없습니다(RLS 정책 확인 필요). favorite-venues-table.sql을 Supabase에서 실행해 주시기 바랍니다.';
    return { ok:false, reason };
  }
}
async function toggleFavoriteVenue(name){
  if(!requireAdmin()) return;
  if(!name) return;
  const willBeFavorite = !favoriteVenueSet.has(name);
  const result = await setFavoriteVenueRobust(name, willBeFavorite);
  populateVenuePresetSelect();
  updateFavVenueBtn();
  if(venuePinObjects[name]){
    if(venuePinObjects[name].type !== 'confirmed') venuePinObjects[name].type = favoriteVenueSet.has(name) ? 'favorite' : 'regular';
    try{ venuePinObjects[name].overlay.setZIndex(venuePinObjects[name].type==='favorite'?3:2); }catch(e){}
    renderVenuePinContent(name);
  }
  try{ renderVenueList(); }catch(e){}
  if(!result.ok){
    toast(`즐겨찾기 저장에 실패했습니다: ${result.reason}`);
  } else {
    toast(willBeFavorite ? '즐겨찾기에 추가했습니다.' : '즐겨찾기에서 제거했습니다.');
  }
}
$('#favVenueBtn').addEventListener('click', ()=>toggleFavoriteVenue(currentVenueName));
$('#copyVenueAddressBtn').addEventListener('click', ()=>{
  const text = $('#venueAddressText').textContent;
  if(!text) return;
  navigator.clipboard.writeText(text).then(()=>toast('주소를 복사했습니다.')).catch(()=>toast('복사에 실패했어요. 직접 선택해서 복사해 주시기 바랍니다.'));
});
window.copyVenueAddress = function(addr){
  if(!addr) return;
  navigator.clipboard.writeText(addr).then(()=>toast('주소를 복사했습니다.')).catch(()=>toast('복사에 실패했어요.'));
};

/* 지도 탭은 조회 전용입니다. 확정 경기의 공식 경기장은 관리자 도구에서만 저장할 수 있습니다. */
$('#lookupVenueBtn').addEventListener('click', ()=>lookupVenueOnMap());
$('#venueInput').addEventListener('keydown', (e)=>{ if(e.key==='Enter') lookupVenueOnMap(); });
async function lookupVenueOnMap(){
  const name = $('#venueInput').value.trim();
  if(!name){ toast('경기장 이름을 입력하거나 목록에서 선택해 주시기 바랍니다.'); return; }
  const preset = findVenuePreset(name);
  const info = preset ? { name: preset.name, address: preset.address } : { name, address: '' };
  await showVenueOnMap(info);
}

/* 지도 렌더링의 핵심 로직 (직접 검색과 "기본 경기장 자동 표시"가 공통으로 사용합니다) */
let currentVenueName = null; // 지도에 지금 표시 중인 경기장의 확정된 이름 (즐겨찾기 버튼이 기준으로 삼는 이름)
let showVenueChain = Promise.resolve();
function showVenueOnMap(info){
  const run = ()=>showVenueOnMapImpl(info);
  showVenueChain = showVenueChain.then(run, run);
  return showVenueChain;
}
let currentVenuePos = null;
let mapUserMoved = false; // 사용자가 지도를 직접 움직이거나 확대/축소했으면, 탭을 다시 열 때 위치를 되돌리지 않습니다.
/* 지도는 로그인 직후 숨겨진 상태에서 미리 만들어지므로(크기 0), 지도 탭을 실제로 열 때마다
   크기를 다시 계산(relayout)하고 확정 경기장을 가운데로 맞춰야 합니다. */
function onMapTabShown(){
  const go = ()=>{
    try{
      if(!map) return;
      const sm = document.getElementById('sectionMap');
      if(!sm || !sm.classList.contains('mobile-active')) return;
      map.relayout();
      if(!mapUserMoved){ if(currentVenueName) recenterOnCurrentVenue(); else if(mapOverviewShown) fitSeoul(); }
    }catch(e){}
  };
  requestAnimationFrame(go);
  [80, 250, 600, 1300].forEach(ms=>setTimeout(go, ms));
}
function recenterOnCurrentVenue(){
  try{
    if(!map) return;
    map.relayout();
    const o = currentVenueName && venuePinObjects[currentVenueName];
    const pos = (o && o.pos) || currentVenuePos;
    if(pos) map.setCenter(pos);
  }catch(e){}
}
/* 확정 경기의 경기장 이름은 "…1구장(블랙)"처럼 세부 구장까지 붙어 있어, 지도 핀 목록(기본 구장명)과 이름이 달라
   핀을 못 찾고 임시 검색으로 빠지던 문제가 있었습니다. 목록에 있는 구장이면 그 이름으로 맞춰서 기존 핀을 그대로 씁니다. */
function canonicalVenueInfo(info){
  const preset = findVenuePreset(info.name) || findVenuePreset(baseVenueName(info.name));
  if(preset) return { name: preset.name, address: info.address || preset.address || '', display: info.name };
  return info;
}
async function showVenueOnMapImpl(info){
  info = canonicalVenueInfo(info);
  mapUserMoved = false;
  if(location.protocol === 'file:'){
    toast('파일을 직접 열어서는(file://) 경기장 검색이 동작하지 않습니다. 로컬 서버나 실제 배포 주소에서 열어주시기 바랍니다.');
    return;
  }
  const ok = await ensureKakaoReady();
  if(!ok) return;

  $('#mapEmpty').style.display='none';
  $('#map').style.display='block';
  $('#mapFullscreenBtn').style.display='grid';
  $('#mapCtlRight').style.display='flex';
  if(!map){
    map = new kakao.maps.Map($('#map'), { center: new kakao.maps.LatLng(37.5665,126.9780), level: 8 });
    try{ kakao.maps.event.addListener(map, 'dragstart', ()=>{ mapUserMoved = true; }); }catch(e){}
  }
  await renderAllVenuePins(info.name); // 요청한 경기장 핀을 먼저 올리고, 나머지는 뒤에서 채웁니다.
  await placeVenueMarker(info);
  currentVenueName = info.name;
  // 탭이 막 열려 지도 크기가 늦게 확정되는 경우를 대비해, 크기 확정 후 핀을 화면 가운데로 다시 맞춥니다.
  requestAnimationFrame(recenterOnCurrentVenue);
  [150, 450, 1100, 2500].forEach(ms=>setTimeout(recenterOnCurrentVenue, ms));

  const addrRow = $('#venueAddressRow');
  if(info.address){
    addrRow.style.display = 'flex';
    $('#venueAddressText').textContent = info.address;
  } else {
    addrRow.style.display = 'none';
  }
  updateFavVenueBtn();
  updateVenueCard(info.display || info.name, info.address || (findVenuePreset(info.name)||{}).address || '');
}

/* 목록에 있는 모든 경기장을 이름표와 함께 지도에 항상 표시합니다.
   한 번 좌표를 찾은 경기장은 세션 동안 캐시해서, 지도를 다시 열 때마다 다시 검색하지 않습니다.
   각 경기장의 마커/이름표 객체를 보관해뒀다가, 선택된 경기장만 강조 스타일로 바꿔 재사용합니다
   (같은 위치에 마커가 두 개 겹치는 것을 방지). */
let allVenuePinsPlaced = false;
const venueGeocodeCache = {};
const venuePinObjects = {}; // { 이름: { overlay, el, pos, address, type, expanded } }
let currentExpandedVenue = null;
let confirmedVenueName = null; // 실제 확정 경기의 경기장 이름 (일치하는 핀을 축구공으로 표시)

/* 경기장 마다: 평소엔 아이콘+이름만 작게 보이고, 터치하면 주소와 복사 버튼이 펼쳐집니다.
   다른 경기장을 터치하거나 지도 빈 곳을 터치하면 자동으로 닫힙니다.
   아이콘으로 종류를 구분합니다: 📍 일반 경기장 / ⭐ 즐겨찾기 / ⚽ 확정 경기 경기장(가장 눈에 띄게)
   주의: 카카오맵 CustomOverlay는 content의 크기가 나중에 바뀌어도 자동으로 다시 계산해주지 않아서,
   내용을 바꿀 때마다 setContent()를 다시 호출해 강제로 재계산시킵니다 (안 하면 좁은 폭에 텍스트가
   세로로 끼거나, 아예 안 보이는 문제가 생깁니다). */
function venueIconFor(type){
  if(type==='confirmed') return '⚽';
  if(type==='favorite') return '⭐';
  return '📍';
}
/* "플랩 스타디움 가산 삼성리더스타워" → ["플랩 스타디움 가산", "삼성리더스타워"] (회사/지점 줄 + 구장명 줄) */
function splitVenueName(name){
  const m = String(name||'').match(/^(플랩\s*스타디움\s*\S+)\s+(.+)$/);
  return m ? [m[1], m[2]] : ['', String(name||'')];
}
const VPIN_BALL = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0b1218" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.2l4.3 3.1-1.6 5h-5.4l-1.6-5z" fill="#0b1218"/><path d="M12 7.2V3.2M16.3 10.3l3.9-1.2M14.7 15.3l2.4 3.3M9.3 15.3l-2.4 3.3M7.7 10.3L3.8 9.1"/></svg>';
function ddayText(dstr){
  if(!dstr) return '';
  const n = Math.round((new Date(dstr+'T00:00:00') - new Date(todayStr()+'T00:00:00')) / 86400000);
  return n<=0 ? '오늘' : 'D-'+n;
}
function renderVenuePinContent(name){
  const obj = venuePinObjects[name];
  if(!obj) return;
  const icon = venueIconFor(obj.type);
  if(obj.expanded){
    obj.el.className = `venue-pin ${obj.type} expanded`;
    obj.el.innerHTML = `
      <div class="vp-head">${icon} <b>${escapeHtml(name)}</b></div>
      ${obj.address ? `<div class="vp-addr">${escapeHtml(obj.address)}</div><button type="button" class="vp-copy">주소 복사</button>` : '<div class="vp-addr">등록된 주소가 없습니다</div>'}
    `;
    const copyBtn = obj.el.querySelector('.vp-copy');
    if(copyBtn) copyBtn.addEventListener('click', (e)=>{ e.stopPropagation(); window.copyVenueAddress(obj.address); });
  } else {
    obj.el.className = `vpin vpin-${obj.type}${(name===currentVenueName && obj.type!=='confirmed')?' vpin-sel':''}`;
    const [co, nm] = splitVenueName(obj.type==='confirmed' ? (obj.label || name) : name);
    if(obj.type==='confirmed'){
      const dd = ddayText(obj.dday);
      obj.el.innerHTML = `<div class="vpn-bubble"><div class="vpn-badges"><span class="vpn-t">다음 경기</span>${dd?`<span class="vpn-d">${dd}</span>`:''}</div>${co?`<div class="vpn-co">${escapeHtml(co)}</div>`:''}<div class="vpn-nm">${escapeHtml(nm)}</div></div><i class="vpn-tail"></i><div class="vpn-ball">${VPIN_BALL}</div>`;
    } else if(obj.type==='favorite'){
      obj.el.innerHTML = `<div class="vpn-fav"><span>★</span> ${escapeHtml(nm)}</div><i class="vpn-ftail"></i><div class="vpn-star">★</div>`;
    } else {
      obj.el.innerHTML = `<div class="vpn-reg">${escapeHtml(nm)}</div><i class="vpn-rtail"></i><div class="vpn-dot"></div>`;
    }
  }
  // 카카오맵이 새 크기를 다시 계산하도록 강제합니다.
  if(obj.overlay) obj.overlay.setContent(obj.el);
}
function collapseAllVenuePins(){
  if(currentExpandedVenue){
    const prev = currentExpandedVenue;
    currentExpandedVenue = null;
    const obj = venuePinObjects[prev];
    if(obj){ obj.expanded = false; renderVenuePinContent(prev); }
  }
}
function expandVenuePin(name){
  /* 예전처럼 핀 위에 주소 카드를 펼치지 않습니다. 경기장 정보는 하단 카드에 표시하고, 선택한 핀만 테두리로 강조합니다. */
  if(!venuePinObjects[name]) return;
  const prev = currentVenueName;
  currentVenueName = name;
  if(prev && prev !== name && venuePinObjects[prev]) renderVenuePinContent(prev);
  renderVenuePinContent(name);
  map.setCenter(venuePinObjects[name].pos);
  updateVenueCard(name, venuePinObjects[name].address || '');
  updateFavVenueBtn();
}

/* 경기장 좌표는 바뀌지 않으므로 기기에 저장해 두고 다음부터는 카카오 검색 없이 즉시 사용합니다. */
const GEO_LS_KEY = 'gsg-venue-geo-v1';
let venueGeoStore = null;
function geoStoreGet(addr){
  if(!venueGeoStore){ try{ venueGeoStore = JSON.parse(localStorage.getItem(GEO_LS_KEY)||'{}') || {}; }catch(e){ venueGeoStore = {}; } }
  return venueGeoStore[addr];
}
function geoStoreSet(addr, c){
  geoStoreGet(addr); venueGeoStore[addr] = c;
  try{ localStorage.setItem(GEO_LS_KEY, JSON.stringify(venueGeoStore)); }catch(e){}
}
let venuePinsStarted = false;
const venuePinReady = {};   // { 이름: Promise } 해당 경기장 핀이 지도에 올라간 뒤 완료
const venuePinResolve = {};
async function placeVenuePin(v){
  const gkey = v.address || ('name:' + v.name);
  let coords = venueGeocodeCache[v.name] || geoStoreGet(gkey);
  if(!coords){
    if(v.address){ coords = await kakaoGeocode(v.address, true); }
    else { coords = await kakaoGeocode(v.name.replace(/^플랩\s*스타디움\s*/,'플랩스타디움 '), false) || await kakaoGeocode(v.name, false); }   // 주소 없는 자동 등록 구장: 이름으로 검색
    if(coords){ geoStoreSet(gkey, coords); }
  }
  if(coords && !v.address && coords.addr) v.address = coords.addr;
  if(coords) venueGeocodeCache[v.name] = coords;
  if(!coords || venuePinObjects[v.name]) return;
  const pos = new kakao.maps.LatLng(coords.lat, coords.lng);
  const isFav = favoriteVenueSet.has(v.name);
  const el = document.createElement('div');
  el.addEventListener('click', (e)=>{
    e.stopPropagation();
    const obj = venuePinObjects[v.name];
    expandVenuePin(v.name);
  });
  const overlay = new kakao.maps.CustomOverlay({ position: pos, content: el, yAnchor: 1, xAnchor: 0.5, zIndex: isFav ? 3 : 2 });
  overlay.setMap(map);
  venuePinObjects[v.name] = { overlay, el, pos, address: v.address, type: isFav?'favorite':'regular', expanded:false };
  renderVenuePinContent(v.name);
}
/* 요청한 경기장의 핀을 가장 먼저 올려 곧바로 보여주고, 나머지 경기장은 뒤에서 여러 개씩 동시에 올립니다. */
function renderAllVenuePins(priorityName){
  if(!map) return Promise.resolve();
  if(!venuePinsStarted){
    venuePinsStarted = true;
    allVenuePinsPlaced = true;
    FUTSAL_VENUES.forEach(v=>{ venuePinReady[v.name] = new Promise(r=>{ venuePinResolve[v.name] = r; }); });
    kakao.maps.event.addListener(map, 'click', ()=>{ collapseAllVenuePins(); });
    const list = FUTSAL_VENUES.slice();
    const pi = list.findIndex(v=>v.name===priorityName);
    if(pi > 0) list.unshift(list.splice(pi,1)[0]);
    (async ()=>{
      const run = async (v)=>{ try{ await placeVenuePin(v); }catch(e){ console.error(e); } venuePinResolve[v.name](); };
      if(list.length){ await run(list.shift()); try{ applyConfirmedVenueMarker(); }catch(e){} }
      const CONC = 6;
      for(let i=0;i<list.length;i+=CONC){
        await Promise.all(list.slice(i,i+CONC).map(run));
        await new Promise(r=>setTimeout(r,0));
      }
      try{ applyConfirmedVenueMarker(); }catch(e){}
    })();
  }
  return venuePinReady[priorityName] || Promise.resolve();
}

/* 홈 화면과 동일한 "가장 가까운 확정 경기"의 경기장을 ⚽ 아이콘으로 확실하게 구분해서 표시합니다. */
function applyConfirmedVenueMarker(){
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  const nearest = confirmedDates[0];
  const venue = nearest ? getVenueInfo(nearest) : null;
  const pinName = venue ? canonicalVenueInfo({ name: venue.name, address: venue.address||'' }).name : null;   // "…1구장(블랙)" 같은 이름도 기본 구장 핀과 맞춰줍니다.
  const newConfirmedName = (pinName && venuePinObjects[pinName]) ? pinName : null;
  if(confirmedVenueName && confirmedVenueName !== newConfirmedName && venuePinObjects[confirmedVenueName]){
    const prevObj = venuePinObjects[confirmedVenueName];
    prevObj.type = favoriteVenueSet.has(confirmedVenueName) ? 'favorite' : 'regular';
    try{ prevObj.overlay.setZIndex(prevObj.type==='favorite'?3:2); }catch(e){}
    renderVenuePinContent(confirmedVenueName);
  }
  confirmedVenueName = newConfirmedName;
  if(confirmedVenueName){
    const obj = venuePinObjects[confirmedVenueName];
    obj.type = 'confirmed';
    obj.dday = nearest; obj.label = venue ? venue.name : confirmedVenueName;
    try{ obj.overlay.setZIndex(6); }catch(e){}
    renderVenuePinContent(confirmedVenueName);
  }
}
/* 즐겨찾기 토글 시, 지도를 다시 그리지 않고 해당 핀의 아이콘만 바로 바꿉니다. */
function setVenueStarBadge(name, on){
  const obj = venuePinObjects[name];
  if(!obj) return;
  if(obj.type !== 'confirmed'){ obj.type = on ? 'favorite' : 'regular'; }
  renderVenuePinContent(name);
}
function refreshVenuePinStyle(){ /* 강조 스타일은 이제 아이콘 종류(type)로만 구분하므로 별도 처리가 필요 없습니다. */ }

/* 지도 탭을 처음 열었을 때: 홈 화면과 동일하게 "가장 가까운 확정 경기"의 경기장을 기본으로 보여줍니다.
   경기장 선택 UI는 그대로 남아있어서, 다른 경기장을 직접 검색해서 볼 수도 있습니다. */
let mapDefaultLoaded = false;
let mapOverviewShown = false;
const SEOUL_SW = [37.43, 126.76], SEOUL_NE = [37.70, 127.19];
function fitSeoul(){
  try{
    if(!map) return;
    map.relayout();
    map.setBounds(new kakao.maps.LatLngBounds(new kakao.maps.LatLng(SEOUL_SW[0],SEOUL_SW[1]), new kakao.maps.LatLng(SEOUL_NE[0],SEOUL_NE[1])));
  }catch(e){}
}
async function showSeoulOverview(){
  if(mapOverviewShown || currentVenueName) return;
  if(location.protocol === 'file:') return;
  const ok = await ensureKakaoReady();
  if(!ok || currentVenueName) return;
  mapOverviewShown = true;
  $('#mapEmpty').style.display='none';
  $('#map').style.display='block';
  $('#mapFullscreenBtn').style.display='grid';
  $('#mapCtlRight').style.display='flex';
  try{ $('#venueCard').hidden = true; }catch(e){}
  if(!map){
    map = new kakao.maps.Map($('#map'), { center: new kakao.maps.LatLng(37.5665,126.9780), level: 9 });
    try{ kakao.maps.event.addListener(map, 'dragstart', ()=>{ mapUserMoved = true; }); }catch(e){}
  }
  await renderAllVenuePins(null);
  requestAnimationFrame(()=>{ if(!currentVenueName && !mapUserMoved) fitSeoul(); });
  [150, 450, 1100, 2500].forEach(ms=>setTimeout(()=>{ if(!currentVenueName && !mapUserMoved) fitSeoul(); }, ms));
}
async function loadDefaultMapVenue(force){
  if(mapDefaultLoaded && !force) return;
  if(typeof appData==='undefined' || !appData) return;
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  const nearest = confirmedDates[0];
  /* 확정된 예정 경기가 없으면 빈 화면 대신 서울 전역 지도를 구장 핀과 함께 보여줍니다. */
  if(!nearest){ await showSeoulOverview(); return; }
  const venue = getVenueInfo(nearest);
  if(!venue || !venue.name){ await showSeoulOverview(); return; }
  mapDefaultLoaded = true;
  // 처음 한 번은 신규 구장 자동 등록이 끝나기 전일 수 있어, 목록에 없는 구장이면 잠깐(최대 2.5초) 기다립니다.
  if(!findVenuePreset(venue.name) && !findVenuePreset(baseVenueName(venue.name)) && window.__autoVenuesP){
    await Promise.race([window.__autoVenuesP.catch(()=>{}), new Promise(r=>setTimeout(r,2500))]);
  }
  const sel = $('#venuePresetSelect');
  const input = $('#venueInput');
  if(sel) sel.value = findVenuePreset(venue.name) ? venue.name : '';
  if(input) input.value = venue.name;
  await showVenueOnMap({ name: venue.name, address: venue.address || '' });
}

