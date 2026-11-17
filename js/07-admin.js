/* ---------- 관리자 도구: 경기장 선택 및 경기시간 기입 ---------- */
/* 관리자 도구 상단에 지금 실제로 확정된 경기일이 무엇인지 명확히 보여줍니다.
   (경기가 확정되기 전에 저장한 날짜와 실제 확정일이 어긋나는 것을 방지하기 위함) */
function renderMatchVenueConfirmedHint(){
  const el = $('#matchVenueConfirmedHint');
  if(!el) return;
  const nearest = findNearestUpcomingConfirmedDate();
  const hasConfirmed = Object.keys(appData.votes||{}).some(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayStr() && (appData.votes[d]||[]).length>0);
  if(hasConfirmed){
    const o = parseYMD(nearest);
    el.textContent = `현재 실제로 확정된 다음 경기일: ${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]}) — 아래 날짜가 이 날짜와 같아야 홈 화면에 반영됩니다.`;
  } else {
    el.textContent = '현재 확정된 예정 경기가 없습니다. 먼저 캘린더에서 주간 투표를 확정한 뒤 입력해 주시기 바랍니다.';
  }
}
function populateMatchVenuePresetSelect(){
  const sel = $('#matchVenuePresetSelect');
  if(!sel || sel.options.length>1) return;
  FUTSAL_VENUES.forEach(v=>{ sel.innerHTML += `<option value="${escapeHtml(v.name)}">${escapeHtml(v.name)}</option>`; });
}
function findNearestUpcomingConfirmedDate(){
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  return confirmedDates[0] || todayS;
}
let pendingMatchGuests = []; // 현재 편집 중인 날짜의 용병 명단 (저장 버튼을 눌러야 실제로 반영됨)
function renderMatchVenueGuestList(){
  const el = $('#matchVenueGuestList');
  if(!el) return;
  if(!pendingMatchGuests.length){
    el.innerHTML = '<span class="empty-hint">등록된 용병이 없습니다.</span>';
    return;
  }
  el.innerHTML = pendingMatchGuests.map((name, i)=>
    `<span class="guest-chip">${escapeHtml(name)}<button type="button" data-idx="${i}" title="삭제">✕</button></span>`
  ).join('');
  el.querySelectorAll('button[data-idx]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      pendingMatchGuests.splice(parseInt(btn.dataset.idx,10), 1);
      renderMatchVenueGuestList();
    });
  });
}
function addPendingMatchGuest(){
  const input = $('#matchVenueGuestNameInput');
  if(!input) return;
  const name = input.value.trim();
  if(!name){ toast('용병 이름을 입력해 주시기 바랍니다.'); return; }
  if(pendingMatchGuests.includes(name)){ toast('이미 추가된 이름입니다.'); return; }
  pendingMatchGuests.push(name);
  input.value = '';
  renderMatchVenueGuestList();
  input.focus();
}
$('#addMatchVenueGuestBtn').addEventListener('click', addPendingMatchGuest);
$('#matchVenueGuestNameInput').addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); addPendingMatchGuest(); }
});

/* ---------- 미투표 통계 제외 주간 (시험운영 기간 등) ---------- */
function renderExcludeWeekList(){
  const el = $('#excludeWeekList');
  if(!el) return;
  const weeks = [...(appData.excludedWeeks || [])].sort();
  if(!weeks.length){
    el.innerHTML = '<span class="empty-hint">제외된 주간이 없습니다.</span>';
    return;
  }
  el.innerHTML = weeks.map(wk=>{
    const dates = getWeekDates(wk);
    const s = parseYMD(dates[0]), e = parseYMD(dates[6]);
    const label = `${s.getMonth()+1}.${s.getDate()} ~ ${e.getMonth()+1}.${e.getDate()}`;
    return `<span class="guest-chip">${escapeHtml(label)}<button type="button" data-week="${wk}" title="제외 해제">✕</button></span>`;
  }).join('');
  el.querySelectorAll('button[data-week]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const wk = btn.dataset.week;
      await mutateAppData(data=>{
        data.excludedWeeks = (data.excludedWeeks || []).filter(w=>w!==wk);
      });
      renderExcludeWeekList();
      computeAttendanceStats();
      toast('제외 해제했습니다. 다시 팀 순위 통계에 포함됩니다.');
    });
  });
}
$('#addExcludeWeekBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const dateInput = $('#excludeWeekDateInput');
  const dateVal = dateInput.value;
  if(!dateVal){ toast('날짜를 선택해 주시기 바랍니다.'); return; }
  const weekKey = getWeekStart(dateVal);
  if((appData.excludedWeeks||[]).includes(weekKey)){ toast('이미 제외된 주간입니다.'); return; }
  await mutateAppData(data=>{
    if(!data.excludedWeeks) data.excludedWeeks = [];
    data.excludedWeeks.push(weekKey);
  });
  dateInput.value = '';
  renderExcludeWeekList();
  computeAttendanceStats();
  toast('해당 주간을 팀 순위 통계에서 제외했습니다.');
});

function loadMatchVenueTimeEditorForDate(dateStr){
  const info = getVenueInfo(dateStr);
  const sel = $('#matchVenuePresetSelect');
  if(sel) sel.value = (info && findVenuePreset(info.name)) ? info.name : '';
  const timeInput = $('#matchVenueTimeInput');
  if(timeInput) timeInput.value = info && info.time ? info.time : '';
  const linkInput = $('#matchVenueLinkInput');
  if(linkInput) linkInput.value = info && info.link ? info.link : '';
  const formatSelect = $('#matchVenueFormatSelect');
  if(formatSelect) formatSelect.value = (info && info.format) ? info.format : '';
  pendingMatchGuests = [...((appData.matchGuests && appData.matchGuests[dateStr]) || [])];
  renderMatchVenueGuestList();
}
/* 관리자가 입력한 링크를 정리합니다. http(s):// 로 시작하지 않으면 https:// 를 붙여 정상적인 링크로 저장합니다. */
function normalizeMatchLink(raw){
  const v = (raw||'').trim();
  if(!v) return '';
  if(/^https?:\/\//i.test(v)) return v;
  return 'https://' + v;
}
$('#matchVenueDateInput').addEventListener('change', (e)=>{
  if(e.target.value) loadMatchVenueTimeEditorForDate(e.target.value);
});
$('#saveMatchVenueTimeBtn').addEventListener('click', async ()=>{
  if(!requireAdmin()) return;
  const statusEl = $('#matchVenueTimeStatus');
  const dateStr = $('#matchVenueDateInput').value;
  const venueName = $('#matchVenuePresetSelect').value;
  const timeStr = $('#matchVenueTimeInput').value.trim();
  const linkRaw = $('#matchVenueLinkInput').value.trim();
  const formatVal = $('#matchVenueFormatSelect').value; // '5' | '6' | '' (미지정)
  if(!dateStr){ statusEl.textContent = '날짜를 선택해 주시기 바랍니다.'; statusEl.style.color='var(--danger)'; return; }
  if(!venueName){ statusEl.textContent = '경기장을 선택해 주시기 바랍니다.'; statusEl.style.color='var(--danger)'; return; }
  let link = '';
  if(linkRaw){
    link = normalizeMatchLink(linkRaw);
    try{ new URL(link); }catch(e){ statusEl.textContent = '경기 링크 형식이 올바르지 않습니다.'; statusEl.style.color='var(--danger)'; return; }
  }
  const guests = [...pendingMatchGuests];
  const preset = findVenuePreset(venueName);
  const isActuallyConfirmed = !!(appData.votes[dateStr] && appData.votes[dateStr].length>0);
  await mutateAppData(data=>{
    data.venues[dateStr] = { name: venueName, address: preset ? preset.address : '', time: timeStr, link, format: formatVal || null };
    if(!data.matchGuests) data.matchGuests = {};
    if(guests.length) data.matchGuests[dateStr] = guests;
    else delete data.matchGuests[dateStr];
  });
  renderCalendar();
  renderMatchStats();
  renderMatchVenueConfirmedHint();
  if(!isActuallyConfirmed){
    statusEl.style.color = 'var(--amber)';
    statusEl.textContent = '저장했지만, 이 날짜는 아직 실제로 확정된 경기일이 아닙니다. 홈 화면에는 표시되지 않을 수 있습니다.';
  } else {
    statusEl.style.color = 'var(--pitch)';
    statusEl.textContent = '저장했습니다.';
  }
  toast('경기장/시간/링크/용병 정보를 저장했습니다.');
});


function hideMap(){
  $('#mapEmpty').style.display='block'; $('#map').style.display='none'; $('#mapFullscreenBtn').style.display='none'; $('#mapCtlRight').style.display='none'; $('#venueCard').hidden=true;
  if(marker){ marker.setMap(null); marker = null; }
}

// TODO: 정식 배포 전 Supabase Auth 및 서버 측 권한 검증으로 이전 필요 (클라이언트에 API 키 노출)
const KAKAO_JS_KEY = '120b5bb6ea3f8f79aa298231e1a6c04e';
let kakaoReady = false;
let kakaoLoadFailed = false;

/* 카카오맵 SDK는 네이버와 달리 인증 실패를 콜백으로 알려주지 않고, 등록되지 않은 도메인에서는
   자체적으로 경고창을 띄우며 로드를 마치지 않습니다. 그래서 일정 시간 안에 로드가 끝나지 않으면
   실패로 간주하는 타임아웃 방식으로 감지합니다. */
function loadKakaoScript(){
  return new Promise((resolve, reject)=>{
    if(window.kakao && window.kakao.maps && window.kakao.maps.Map){ resolve(); return; }
    if(window.kakao && window.kakao.maps && window.kakao.maps.load){ kakao.maps.load(resolve); return; }
    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_JS_KEY)}&autoload=false&libraries=services`;
    s.onload = ()=>{
      try{ kakao.maps.load(resolve); }catch(e){ reject(e); }
    };
    s.onerror = ()=>reject(new Error('스크립트 로드 실패'));
    document.head.appendChild(s);
  });
}
/* 지도 탭을 누르기 전에 카카오 지도 스크립트를 미리 받아 두어, 처음 열 때의 대기를 없앱니다. */
window.addEventListener('load', ()=>{
  if(location.protocol==='file:') return;
  const go = ()=>{ if(kakaoLoadFailed || kakaoReady) return; loadKakaoScript().then(()=>{ kakaoReady = true; }).catch(()=>{}); };
  if('requestIdleCallback' in window) requestIdleCallback(go, {timeout:3000}); else setTimeout(go, 2000);
});
async function ensureKakaoReady(){
  if(kakaoLoadFailed){ $('#mapConfigBox').style.display='block'; return false; }
  if(kakaoReady) return true;
  try{
    await Promise.race([
      loadKakaoScript(),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('타임아웃')), 5000))
    ]);
    kakaoReady = true;
    $('#mapConfigBox').style.display='none';
    return true;
  }catch(e){
    kakaoLoadFailed = true;
    $('#mapConfigBox').style.display='block';
    toast('카카오맵을 불러오지 못했습니다. 등록된 도메인에서 열었는지 확인해 주시기 바랍니다.');
    return false;
  }
}

/* 지도 전체화면 / 축소
   아이폰 사파리(홈 화면 추가 포함)는 임의의 요소에 대한 네이티브 전체화면 API를 지원하지 않아서,
   화면 전체를 덮는 CSS 클래스를 직접 토글하는 방식으로 구현했습니다. 모든 환경에서 동일하게 동작합니다. */
const MAP_ICON_EXPAND = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
const MAP_ICON_SHRINK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
function isMapFullscreen(){
  const el = $('#mapWrap');
  return !!(el && el.classList.contains('map-fullscreen-mode'));
}
function setMapFullscreen(on){
  const el = $('#mapWrap');
  const btn = $('#mapFullscreenBtn');
  if(!el) return;
  el.classList.toggle('map-fullscreen-mode', on);
  document.body.classList.toggle('map-fullscreen-open', on);
  if(btn){ btn.innerHTML = on ? MAP_ICON_SHRINK : MAP_ICON_EXPAND; btn.setAttribute('aria-label', on ? '전체화면 닫기' : '전체화면'); }
  setTimeout(()=>{
    try{ if(map) map.relayout(); }catch(e){}
    const focusName = currentExpandedVenue || confirmedVenueName;
    if(map && focusName && venuePinObjects[focusName]){ map.setCenter(venuePinObjects[focusName].pos); }
  }, 100);
}
$('#mapFullscreenBtn').addEventListener('click', ()=>{
  setMapFullscreen(!isMapFullscreen());
});
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && isMapFullscreen()) setMapFullscreen(false);
});


