/* ================= PWA 설치 & 알림 ================= */
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('./sw.js').catch(e=>console.error('SW 등록 실패', e));
  });
}

const NOTIFY_DISMISS_KEY = 'futsal-notify-dismissed';
const NOTIFY_LAST_CONFIRMED_KEY = 'futsal-notify-last-confirmed';
const NOTIFY_LAST_VOTE_REMINDER_KEY = 'futsal-notify-last-vote-reminder-date';

function isNotificationSupported(){ return typeof Notification !== 'undefined'; }

/* ---------- 서버 푸시 (회원 전체 알림) ---------- */
const VAPID_PUBLIC_KEY = 'BNNxPH9FVDIBrLaOF4fp-EPbe3QHh-Lx4i595rz-iea-usvf2C1gH8Ty4s3x8vV66e_bH36M3UfUWzn_In7Yq6A';
function urlB64ToUint8Array(b64){
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
let pushEnsuredFor = '';
async function ensurePushSubscription(){
  try{
    if(!supabaseClient || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if(!isNotificationSupported() || Notification.permission !== 'granted' || localStorage.getItem(NOTIFY_OFF_KEY)==='1') return;
    const key = myName || '-';
    if(pushEnsuredFor === key) return;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
    const { error } = await supabaseClient.rpc('register_push', {
      p_endpoint: sub.endpoint, p_subscription: sub.toJSON(), p_member_name: myName || null
    });
    if(error) throw error;
    pushEnsuredFor = key;
  }catch(e){ console.error('push subscribe', e); }
}
async function sendMatchAlert(title, body, opts){
  opts = opts || {};
  try{
    const res = await fetch(SUPABASE_URL + '/functions/v1/send-match-alert', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ title, body, sender: myName || '', kind: opts.kind || 'match', targets: opts.targets })
    });
    const j = await res.json().catch(()=>({}));
    if(res.status === 429) return `방금 알림을 보냈습니다. ${Math.ceil((j.retryAfterSec||300)/60)}분 뒤에 다시 보낼 수 있어요.`;
    if(!res.ok) return '알림을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.';
    if(!j.total) return opts.targets ? '대상 회원 중 알림을 켠 사람이 없습니다. (더보기 > 알림 설정에서 켜야 받을 수 있어요)' : '아직 알림을 켠 회원이 없습니다. (더보기 > 알림 설정에서 켜야 받을 수 있어요)';
    return `알림을 보냈습니다. (${j.sent}/${j.total}명)`;
  }catch(e){ console.error(e); return '네트워크 오류로 알림을 보내지 못했습니다.'; }
}

async function sendLocalNotification(title, options){
  if(!notifyIsOn()) return;
  try{
    if('serviceWorker' in navigator){
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  }catch(e){ console.error(e); }
}

function updateNotifyBanner(){
  const banner = document.getElementById('notifyBanner');
  if(!banner) return;
  if(!isNotificationSupported() || Notification.permission !== 'default' || localStorage.getItem(NOTIFY_DISMISS_KEY)==='1'){
    banner.style.display = 'none';
    return;
  }
  banner.style.display = 'flex';
}

const notifyEnableBtn = document.getElementById('notifyEnableBtn');
if(notifyEnableBtn) notifyEnableBtn.addEventListener('click', async ()=>{
  if(!isNotificationSupported()){ toast('이 브라우저는 알림 기능을 지원하지 않습니다.'); return; }
  const perm = await Notification.requestPermission();
  if(perm === 'granted'){
    toast('알림이 켜졌습니다.');
    ensurePushSubscription();
    sendLocalNotification('공생관 알림이 켜졌습니다', { body:'경기 확정, 투표 마감 소식을 알려드리겠습니다.', icon:'./assets/icon-192.png' });
  } else {
    toast('알림이 차단되었습니다. 브라우저 설정에서 변경할 수 있습니다.');
  }
  updateNotifyBanner();
});
const notifyDismissBtn = document.getElementById('notifyDismissBtn');
if(notifyDismissBtn) notifyDismissBtn.addEventListener('click', ()=>{
  localStorage.setItem(NOTIFY_DISMISS_KEY, '1');
  updateNotifyBanner();
});

/* 경기 확정 알림: 마지막으로 확인했던 확정 경기일과 지금 실제 확정된 경기일이 다르면(=새로 확정됨) 알려줍니다.
   주의: 서버가 없어 실시간 푸시는 아니며, 이 브라우저에서 앱을 열거나 새로고침했을 때만 확인합니다. */
function checkMatchConfirmedNotification(){
  if(!notifyIsOn()) return;
  if(typeof appData==='undefined' || !appData) return;
  const todayS = todayStr();
  const confirmedDates = Object.keys(appData.votes||{})
    .filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d) && d>=todayS && (appData.votes[d]||[]).length>0)
    .sort();
  const nearest = confirmedDates[0];
  if(!nearest) return;
  const lastSeen = localStorage.getItem(NOTIFY_LAST_CONFIRMED_KEY);
  if(lastSeen === nearest) return;
  localStorage.setItem(NOTIFY_LAST_CONFIRMED_KEY, nearest);
  if(lastSeen === null) return; // 최초 방문에서는 알리지 않고 기준값만 저장합니다.
  const o = parseYMD(nearest);
  const venue = getVenueInfo(nearest);
  sendLocalNotification('⚽ 경기가 확정되었습니다', {
    body: `${o.getMonth()+1}.${o.getDate()}(${weekdayKR[o.getDay()]})${venue?' · '+venue.name:''}`,
    icon: './assets/icon-192.png',
    tag: 'match-confirmed'
  });
}

/* 투표 마감 리마인드: 이번 주가 아직 확정되지 않았고, 내가 가능일 선택도 불참 선언도 안 했으면
   목요일부터 하루 한 번만 알려줍니다. */
function checkVoteDeadlineReminder(){
  if(!notifyIsOn()) return;
  if(typeof myName==='undefined' || !myName) return;
  const now = kstNow();
  if(now.getDay() < 4) return; // 목(4)·금(5)·토(6)요일에만 리마인드
  const todayS = todayStr();
  if(localStorage.getItem(NOTIFY_LAST_VOTE_REMINDER_KEY) === todayS) return;

  const weekKey = getWeekStart(todayS);
  const info = getWeekInfo(weekKey);
  if(info.confirmedDates && info.confirmedDates.length) return; // 이미 확정되었으면 리마인드하지 않음
  const myAvail = (info.avail && info.avail[myName]) || [];
  const absenceMap = (appData.weekAbsence && appData.weekAbsence[weekKey]) || {};
  if(myAvail.length>0 || absenceMap[myName]) return; // 이미 응답함

  localStorage.setItem(NOTIFY_LAST_VOTE_REMINDER_KEY, todayS);
  sendLocalNotification('🗳️ 아직 이번 주 투표를 하지 않으셨습니다', {
    body: '경기 날짜 투표 마감이 다가옵니다. 앱을 열어 참석 가능한 날짜를 선택해 주세요.',
    icon: './assets/icon-192.png',
    tag: 'vote-reminder'
  });
}

