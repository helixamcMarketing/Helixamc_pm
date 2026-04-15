/* ══════════════════════════════════════════════
   ⚙️  설정
══════════════════════════════════════════════ */
const EDIT_PASSWORD = '9119';
const MIN_YEAR  = 2026;
const MIN_MONTH = 3;

/* ══════════════════════════════════════════════
   메뉴 구조 — 메뉴 추가 시 여기만 수정
══════════════════════════════════════════════ */
const MENU = [
  {
    id: 'adlog',
    label: '광고비 정산',
    icon: '📊',
    items: [
      { id: 'adlog_dashboard', label: '대시보드', dot: null },
      { id: 'adlog_meta',     label: '메타',     dot: '#1877F2' },
      { id: 'adlog_google',   label: '구글',     dot: '#EA4335' },
      { id: 'adlog_daangn',   label: '당근',     dot: '#FF6F0F' },
      { id: 'adlog_naver',    label: '네이버',   dot: '#03C75A' },
      { id: 'adlog_kakao',    label: '카카오',   dot: '#FAE100' },
    ]
  },
  {
    id: 'leads',
    label: '상담 DB',
    icon: '📋',
    items: [
      { id: 'leads_list', label: '신청 목록', dot: null },
    ]
  },
  {
    id: 'sales',
    label: '매출 정산',
    icon: '💰',
    items: [
      { id: 'sales_dashboard', label: '대시보드', dot: null },
      { id: 'sales_monthly',   label: '월별 상세', dot: null },
    ]
  },
];

const MEDIA = [
  { id:'meta',   name:'메타',   color:'#1877F2' },
  { id:'google', name:'구글',   color:'#EA4335' },
  { id:'daangn', name:'당근',   color:'#FF6F0F' },
  { id:'naver',  name:'네이버', color:'#03C75A' },
  { id:'kakao',  name:'카카오', color:'#FAE100' },
];
const DAYS_KO = ['일','월','화','수','목','금','토'];

/* ══════════════════════════════════════════════
   STATE
══════════════════════════════════════════════ */
const now = new Date();
let curYear    = now.getFullYear();
let curMonth   = now.getMonth() + 1;
let curPageId  = 'adlog_dashboard';
let isUnlocked = false;
let sidebarCollapsed = false;
let openSections = { adlog: true, leads: true, sales: true };
let dashView = 'monthly'; // 'monthly' | 'annual'

/* ══════════════════════════════════════════════
   FIREBASE
══════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyCmJpvfoMvquoBdDJAK4ZJ657C2UOTZ5eU",
  authDomain: "helixamc-pm.firebaseapp.com",
  databaseURL: "https://helixamc-pm-default-rtdb.firebaseio.com",
  projectId: "helixamc-pm",
  storageBucket: "helixamc-pm.firebasestorage.app",
  messagingSenderId: "382526528183",
  appId: "1:382526528183:web:c487b9de1471829afe0b32",
  measurementId: "G-0F55R2PE1Q"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const dataCache = {};
function cacheKey(year, month, mediaId) { return `${year}_${String(month).padStart(2,'0')}_${mediaId}`; }
function loadData(year, month, mediaId) { return dataCache[cacheKey(year, month, mediaId)] || {}; }
function saveData(year, month, mediaId, data) {
  dataCache[cacheKey(year, month, mediaId)] = data;
  db.ref(`adlog/${year}/${String(month).padStart(2,'00')}/${mediaId}`).set(data).catch(e => console.error(e));
}
async function fetchMonthData(year, month) {
  const snap = await db.ref(`adlog/${year}/${String(month).padStart(2,'0')}`).once('value');
  const val  = snap.val() || {};
  MEDIA.forEach(m => { dataCache[cacheKey(year, month, m.id)] = val[m.id] || {}; });
}
async function fetchAllData() {
  const snap = await db.ref('adlog').once('value');
  const val  = snap.val() || {};
  Object.entries(val).forEach(([year, months]) => {
    Object.entries(months).forEach(([month, medias]) => {
      Object.entries(medias).forEach(([mediaId, data]) => {
        dataCache[cacheKey(Number(year), Number(month), mediaId)] = data || {};
      });
    });
  });
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
function getDayOfWeek(y, m, d) { return new Date(y, m - 1, d).getDay(); }
function fmtMoney(n) { if (!n && n !== 0) return '-'; return Number(n).toLocaleString('ko-KR'); }
function calcCPA(spend, db) { if (!spend || !db || db === 0) return null; return Math.round(spend / db); }
function calcROAS(revenue, spend) { if (!revenue || !spend || spend === 0) return null; return Math.round((revenue / spend) * 100); }

/* ══════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════ */
function buildSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = MENU.map(section => `
    <div class="nav-section ${openSections[section.id] ? 'open' : ''}" id="section_${section.id}">
      <div class="nav-section-header" onclick="toggleSection('${section.id}')">
        <div class="nav-section-icon">${section.icon}</div>
        <span class="nav-section-label">${section.label}</span>
        <span class="nav-section-arrow">›</span>
      </div>
      <div class="nav-items">
        ${section.items.map(item => `
          <div class="nav-item ${curPageId === item.id ? 'active' : ''}" id="navitem_${item.id}" onclick="navigateTo('${item.id}')">
            ${item.dot
              ? `<span class="nav-item-dot" style="background:${item.dot}"></span>`
              : `<span style="width:6px"></span>`}
            ${item.label}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function toggleSection(sectionId) {
  openSections[sectionId] = !openSections[sectionId];
  const el = document.getElementById(`section_${sectionId}`);
  el.classList.toggle('open', openSections[sectionId]);
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.getElementById('main').classList.toggle('collapsed', sidebarCollapsed);
}

function navigateTo(pageId) {
  curPageId = pageId;
  // update active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.id === `navitem_${pageId}`);
  });
  updateBreadcrumb();
  render();
}

function updateBreadcrumb() {
  let sectionLabel = '', itemLabel = '';
  for (const section of MENU) {
    const item = section.items.find(i => i.id === curPageId);
    if (item) { sectionLabel = section.label; itemLabel = item.label; break; }
  }
  document.getElementById('breadcrumb').innerHTML = `
    <span>${sectionLabel}</span>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-cur">${itemLabel}</span>
  `;
}

/* ══════════════════════════════════════════════
   MONTH NAV
══════════════════════════════════════════════ */
function updateMonthLabel() {
  const label = document.getElementById('monthLabel');
  if (dashView === 'annual') {
    label.textContent = `${curYear}년`;
  } else {
    label.textContent = `${curYear}.${String(curMonth).padStart(2,'0')}`;
  }
  const isCur = curYear === now.getFullYear() && curMonth === now.getMonth() + 1;
  const isMin = curYear === MIN_YEAR && curMonth === MIN_MONTH;
  document.getElementById('nextBtn').style.opacity = isCur ? '0.3' : '1';
  document.getElementById('nextBtn').style.pointerEvents = isCur ? 'none' : 'auto';
  document.getElementById('prevBtn').style.opacity = isMin ? '0.3' : '1';
  document.getElementById('prevBtn').style.pointerEvents = isMin ? 'none' : 'auto';
}
function changeMonth(delta) {
  if (dashView === 'annual') {
    curYear += delta;
    updateMonthLabel();
    renderDashboard();
    return;
  }
  curMonth += delta;
  if (curMonth > 12) { curMonth = 1; curYear++; }
  if (curMonth < 1)  { curMonth = 12; curYear--; }
  updateMonthLabel();
  render();
}

/* ══════════════════════════════════════════════
   MONTH PICKER
══════════════════════════════════════════════ */
let pickerYear = null;
function openPicker() {
  pickerYear = curYear;
  renderPickerMonths();
  const rect = document.getElementById('monthLabel').getBoundingClientRect();
  const p = document.getElementById('picker');
  p.style.display = 'block';
  p.style.top  = (rect.bottom + 8) + 'px';
  p.style.left = (rect.left + rect.width/2 - 130) + 'px';
  document.getElementById('pickerOverlay').classList.add('open');
}
function closePicker() {
  document.getElementById('picker').style.display = 'none';
  document.getElementById('pickerOverlay').classList.remove('open');
}
function changePickerYear(delta) {
  pickerYear += delta;
  if (pickerYear > now.getFullYear()) { pickerYear = now.getFullYear(); return; }
  if (pickerYear < MIN_YEAR) { pickerYear = MIN_YEAR; return; }
  renderPickerMonths();
}
function renderPickerMonths() {
  document.getElementById('pickerYear').textContent = pickerYear + '년';
  const months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('pickerMonths').innerHTML = months.map((m, i) => {
    const mo = i + 1;
    const isActive = pickerYear === curYear && mo === curMonth;
    const isFuture = pickerYear === now.getFullYear() && mo > now.getMonth() + 1;
    const isPast   = pickerYear === MIN_YEAR && mo < MIN_MONTH;
    return `<button class="picker-month-btn ${isActive?'active':''} ${isFuture||isPast?'future':''}" onclick="selectMonth(${mo})">${m}</button>`;
  }).join('');
}
function selectMonth(month) {
  closePicker();
  curYear = pickerYear; curMonth = month;
  updateMonthLabel();
  render();
}

/* ══════════════════════════════════════════════
   RENDER ROUTER
══════════════════════════════════════════════ */
function render() {
  if (curPageId === 'adlog_dashboard') renderDashboard();
  else if (curPageId.startsWith('adlog_')) renderMediaTable(curPageId.replace('adlog_', ''));
  else if (curPageId === 'leads_list') renderLeads();
  else if (curPageId === 'sales_dashboard') renderSalesDashboard();
  else if (curPageId === 'sales_monthly') renderSalesMonthly();
  else renderComingSoon();
}

/* ══════════════════════════════════════════════
   LEADS DB
══════════════════════════════════════════════ */
async function renderLeads() {
  // 잠금 상태면 비밀번호 요구
  if (!isUnlocked) {
    document.getElementById('content').innerHTML = `
      <div class="coming-soon">
        <div class="coming-soon-icon">🔒</div>
        <div class="coming-soon-title">열람 잠금</div>
        <div style="margin-bottom:20px;color:var(--text-sub);font-size:13px;">상담 DB를 열람하려면 잠금을 해제해 주세요.</div>
        <button onclick="openModal()" style="padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">잠금 해제</button>
      </div>`;
    return;
  }

  const mm = String(curMonth).padStart(2, '0');
  const defaultStart = `${curYear}-${mm}-01`;
  const lastDay = new Date(curYear, curMonth, 0).getDate();
  const defaultEnd = `${curYear}-${mm}-${String(lastDay).padStart(2, '0')}`;

  document.getElementById('content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div class="section-title">신청 목록 <span class="section-badge" id="leadsBadge">불러오는 중…</span></div>
    </div>
    <div id="leadsSearchBar" style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:16px;padding:14px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;">
      <input type="date" id="leadsDateFrom" value="${defaultStart}" style="padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:var(--font-mono);" />
      <span style="color:var(--text-mute);font-size:12px;">~</span>
      <input type="date" id="leadsDateTo" value="${defaultEnd}" style="padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;font-family:var(--font-mono);" />
      <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-left:4px;">
        <button id="searchTypeName" onclick="setLeadsSearchType('name')" style="padding:6px 14px;font-size:12px;border:none;cursor:pointer;background:var(--accent);color:#fff;font-weight:600;">이름</button>
        <button id="searchTypePhone" onclick="setLeadsSearchType('phone')" style="padding:6px 14px;font-size:12px;border:none;cursor:pointer;background:var(--surface);color:var(--text-sub);">연락처</button>
      </div>
      <input type="text" id="leadsSearchInput" placeholder="검색어 입력" style="padding:6px 12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;width:140px;" />
      <button onclick="applyLeadsSearch()" style="padding:6px 16px;background:var(--accent);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">검색</button>
      <button onclick="resetLeadsSearch()" style="padding:6px 16px;background:transparent;color:var(--text-sub);border:1px solid var(--border);border-radius:6px;font-size:12px;cursor:pointer;">초기화</button>
      <button onclick="downloadLeadsCsv()" style="margin-left:auto;padding:6px 16px;background:var(--green,#34C759);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">엑셀 다운로드</button>
    </div>
    <div class="table-wrap" id="leadsTableWrap">
      <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-mute);font-size:13px;">데이터 불러오는 중…</div>
    </div>`;

  window._leadsSearchType = 'name';
  window._leadsAllEntries = [];

  db.ref('leads').off();
  db.ref('leads').on('value', (snap) => {
    const val = snap.val();

    if (!val) {
      window._leadsAllEntries = [];
      document.getElementById('leadsTableWrap').innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-mute);font-size:13px;">신청 데이터가 없습니다.</div>`;
      document.getElementById('leadsBadge').textContent = '0건';
      return;
    }

    // 해당 월 필터링 + 오름차순 정렬
    window._leadsAllEntries = Object.entries(val)
      .filter(([, v]) => {
        if (!v.submittedAt) return false;
        const d = new Date(v.submittedAt);
        return d.getFullYear() === curYear && d.getMonth() + 1 === curMonth;
      })
      .sort((a, b) => a[0].localeCompare(b[0]));

    renderLeadsTable(window._leadsAllEntries);

  }, (e) => {
    console.error(e);
    document.getElementById('leadsTableWrap').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--red);font-size:13px;">데이터를 불러오지 못했습니다. Firebase 읽기 규칙을 확인해 주세요.</div>`;
  });
}

function renderLeadsTable(entries) {
  window._leadsDisplayedEntries = entries;
  if (entries.length === 0) {
    document.getElementById('leadsTableWrap').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:200px;color:var(--text-mute);font-size:13px;">이 달의 신청 데이터가 없습니다.</div>`;
    document.getElementById('leadsBadge').textContent = '0건';
    return;
  }

  const countMap = {};
  entries.forEach(([, v]) => {
    const gKey = `${v.name}__${v.phone}`;
    countMap[gKey] = (countMap[gKey] || 0) + 1;
  });

  const duplicateCount = Object.values(countMap).filter(c => c > 1).length;
  document.getElementById('leadsBadge').textContent =
    duplicateCount > 0
      ? `${entries.length}건 · 중복 ${duplicateCount}명`
      : `${entries.length}건`;

  const petTypeLabel = { dog: '강아지', cat: '고양이', other: '기타', '': '미선택' };

  const rows = entries.map(([key, v]) => {
    const date = v.submittedAt
      ? new Date(v.submittedAt).toLocaleString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
      : '-';
    const total = countMap[`${v.name}__${v.phone}`];
    const badge = total > 1
      ? `<span style="display:inline-block;margin-left:6px;padding:1px 6px;background:var(--red);color:#fff;border-radius:4px;font-size:10px;font-weight:700;vertical-align:middle;">${total}회</span>`
      : '';
    const reserved = !!v.reserved;
    const rowStyle = reserved ? 'border-left:3px solid var(--accent);background:rgba(0,122,255,0.04);' : '';
    const btnStyle = reserved
      ? 'padding:5px 12px;background:var(--accent);color:#fff;border:1px solid var(--accent);border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;'
      : 'padding:5px 12px;background:transparent;border:1px solid var(--accent);color:var(--accent);border-radius:6px;font-size:12px;cursor:pointer;';
    return `
      <tr style="${rowStyle}">
        <td style="width:160px;text-align:left;font-size:12px;color:var(--text-sub);">${date}</td>
        <td style="width:100px;text-align:left;font-weight:600;">${v.name || '-'}${badge}</td>
        <td style="width:140px;text-align:left;font-family:var(--font-mono);">${v.phone || '-'}</td>
        <td style="width:100px;text-align:left;">${petTypeLabel[v.petType] || v.petType || '-'}</td>
        <td onclick="showInquiry('${(v.inquiry || '-').replace(/'/g, "\\'")}')" style="text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-sub);font-size:12px;cursor:pointer;" title="클릭하여 전체 내용 보기">${v.inquiry || '-'}</td>
        <td style="width:90px;text-align:left;">
          <button onclick="toggleReserved('${key}',${!reserved})" style="${btnStyle}">${reserved ? '예약완료' : '미예약'}</button>
        </td>
        <td style="width:80px;text-align:left;">
          <button onclick="deleteLead('${key}')"
            style="padding:5px 12px;background:transparent;border:1px solid var(--red);color:var(--red);border-radius:6px;font-size:12px;cursor:pointer;">
            삭제
          </button>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('leadsTableWrap').innerHTML = `
<table style="table-layout:fixed;width:100%;">
      <thead><tr>
        <th style="text-align:left;width:160px;">신청 일시</th>
        <th style="text-align:left;width:100px;">이름</th>
        <th style="text-align:left;width:140px;">연락처</th>
        <th style="text-align:left;width:100px;">반려동물</th>
        <th style="text-align:left;">문의 내용</th>
        <th style="text-align:left;width:90px;">예약</th>
        <th style="text-align:left;width:80px;">삭제</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function setLeadsSearchType(type) {
  window._leadsSearchType = type;
  const nameBtn = document.getElementById('searchTypeName');
  const phoneBtn = document.getElementById('searchTypePhone');
  if (type === 'name') {
    nameBtn.style.background = 'var(--accent)'; nameBtn.style.color = '#fff'; nameBtn.style.fontWeight = '600';
    phoneBtn.style.background = 'var(--surface)'; phoneBtn.style.color = 'var(--text-sub)'; phoneBtn.style.fontWeight = 'normal';
  } else {
    phoneBtn.style.background = 'var(--accent)'; phoneBtn.style.color = '#fff'; phoneBtn.style.fontWeight = '600';
    nameBtn.style.background = 'var(--surface)'; nameBtn.style.color = 'var(--text-sub)'; nameBtn.style.fontWeight = 'normal';
  }
}

function applyLeadsSearch() {
  const fromVal = document.getElementById('leadsDateFrom').value;
  const toVal = document.getElementById('leadsDateTo').value;
  const keyword = document.getElementById('leadsSearchInput').value.trim();
  const type = window._leadsSearchType;

  let filtered = window._leadsAllEntries;

  if (fromVal) {
    const from = new Date(fromVal + 'T00:00:00');
    filtered = filtered.filter(([, v]) => v.submittedAt && new Date(v.submittedAt) >= from);
  }
  if (toVal) {
    const to = new Date(toVal + 'T23:59:59');
    filtered = filtered.filter(([, v]) => v.submittedAt && new Date(v.submittedAt) <= to);
  }
  if (keyword) {
    filtered = filtered.filter(([, v]) => {
      const field = type === 'name' ? (v.name || '') : (v.phone || '');
      return field.includes(keyword);
    });
  }

  renderLeadsTable(filtered);
}

function resetLeadsSearch() {
  const mm = String(curMonth).padStart(2, '0');
  const lastDay = new Date(curYear, curMonth, 0).getDate();
  document.getElementById('leadsDateFrom').value = `${curYear}-${mm}-01`;
  document.getElementById('leadsDateTo').value = `${curYear}-${mm}-${String(lastDay).padStart(2, '0')}`;
  document.getElementById('leadsSearchInput').value = '';
  setLeadsSearchType('name');
  renderLeadsTable(window._leadsAllEntries);
}

function downloadLeadsCsv() {
  const entries = window._leadsDisplayedEntries || [];
  if (entries.length === 0) { alert('다운로드할 데이터가 없습니다.'); return; }
  const petTypeLabel = { dog: '강아지', cat: '고양이', other: '기타', '': '미선택' };
  const header = '신청일시,이름,연락처,반려동물,문의내용,예약상태';
  const rows = entries.map(([, v]) => {
    const date = v.submittedAt
      ? new Date(v.submittedAt).toLocaleString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' })
      : '';
    const esc = (s) => '"' + String(s || '').replace(/"/g, '""') + '"';
    return [
      esc(date),
      esc(v.name),
      esc(v.phone),
      esc(petTypeLabel[v.petType] || v.petType || ''),
      esc(v.inquiry),
      esc(v.reserved ? '예약완료' : '미예약')
    ].join(',');
  });
  const csv = '\uFEFF' + header + '\n' + rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `상담DB_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function toggleReserved(key, value) {
  db.ref(`leads/${key}/reserved`).set(value);
}

async function deleteLead(key) {
  if (!confirm('이 신청 데이터를 삭제하시겠습니까?')) return;
  await db.ref(`leads/${key}`).remove();
  renderLeads();
}

function showInquiry(text) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:1000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:32px;max-width:480px;width:90%;position:relative;">
      <div style="font-size:13px;font-weight:600;color:var(--text-sub);margin-bottom:16px;">문의 내용</div>
      <div style="font-size:14px;line-height:1.8;color:var(--text);white-space:pre-wrap;word-break:break-all;">${text}</div>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="margin-top:24px;width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">닫기</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

/* ══════════════════════════════════════════════
   SALES — 매출 정산
══════════════════════════════════════════════ */

// 엑셀 파일 파싱 및 Firebase 저장
async function handleSalesUpload(file) {
  if (!isUnlocked) { openModal(); return; }
  const btn = document.getElementById('salesUploadBtn');
  if (btn) { btn.disabled = true; btn.textContent = '업로드 중...'; }

  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    let uploadedMonths = [];

    for (const sheetName of wb.SheetNames) {
      if (sheetName === 'DASHBOARD') continue;
      const match = sheetName.match(/^(\d{2})\.(\d{2})$/);
      if (!match) continue;

      const year = '20' + match[1];
      const month = match[2];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // row[0]: 헤더, row[1]: 요약행, row[2]: 일별 헤더, row[3]+: 일별 데이터
      const summary = {
        dailyAvg:    rows[1][0] || 0,
        totalCount:  rows[1][1] || 0,
        totalAmount: rows[1][2] || 0,
        avgAmount:   rows[1][3] || 0,
      };

      const daily = {};
      for (let i = 3; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0] || typeof r[0] !== 'string') continue;
        daily[r[0].replace(/\./g, '-')] = {
          count:       r[1]  || 0,
          amount:      r[2]  || 0,
          avg:         r[3]  || 0,
          cashCount:   r[4]  || 0,
          cashAmount:  r[5]  || 0,
          cardCount:   r[7]  || 0,
          cardAmount:  r[8]  || 0,
          transferCount:  r[11] || 0,
          transferAmount: r[12] || 0,
          taxAmount:   r[18] || 0,
          taxFreeAmount: r[19] || 0,
        };
      }

      await db.ref(`sales/${year}/${month}`).set({ summary, daily });
      uploadedMonths.push(`${year}.${month}`);
    }

    alert(`업로드 완료: ${uploadedMonths.join(', ')}`);
    if (curPageId === 'sales_dashboard') renderSalesDashboard();
    if (curPageId === 'sales_monthly') renderSalesMonthly();
  } catch(e) {
    console.error(e);
    alert('파일 파싱 오류: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '엑셀 업로드'; }
  }
}

// 매출 대시보드
async function renderSalesDashboard() {
  if (!isUnlocked) {
    document.getElementById('content').innerHTML = `
      <div class="coming-soon">
        <div class="coming-soon-icon">🔒</div>
        <div class="coming-soon-title">열람 잠금</div>
        <div style="margin-bottom:20px;color:var(--text-sub);font-size:13px;">매출 정산을 열람하려면 잠금을 해제해 주세요.</div>
        <button onclick="openModal()" style="padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">잠금 해제</button>
      </div>`;
    return;
  }

  document.getElementById('content').innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:300px;color:var(--text-mute);font-size:13px;">데이터 불러오는 중...</div>`;

  const snap = await db.ref('sales').once('value');
  const salesData = snap.val() || {};

  // 월별 요약 집계
  const monthly = [];
  for (const year of Object.keys(salesData).sort()) {
    for (const month of Object.keys(salesData[year]).sort()) {
      const s = salesData[year][month].summary || {};
      monthly.push({
        label: `${year}.${month}`,
        year, month,
        totalAmount: s.totalAmount || 0,
        totalCount:  s.totalCount  || 0,
        avgAmount:   s.avgAmount   || 0,
        dailyAvg:    s.dailyAvg    || 0,
      });
    }
  }

  const latest = monthly[monthly.length - 1];

  const kpiHtml = latest ? `
    <div class="dash-grid">
      <div class="kpi-card"><div class="kpi-label">최근월 수납 총액</div><div class="kpi-value">${fmtMoney(latest.totalAmount)}</div><div class="kpi-sub">₩ · ${latest.label}</div></div>
      <div class="kpi-card"><div class="kpi-label">최근월 수납 건수</div><div class="kpi-value">${fmtMoney(latest.totalCount)}</div><div class="kpi-sub">건 · ${latest.label}</div></div>
      <div class="kpi-card"><div class="kpi-label">최근월 수납 평균</div><div class="kpi-value" style="color:var(--accent)">${fmtMoney(Math.round(latest.avgAmount))}</div><div class="kpi-sub">₩ / 건</div></div>
      <div class="kpi-card"><div class="kpi-label">최근월 일평균 수납</div><div class="kpi-value">${fmtMoney(Math.round(latest.dailyAvg))}</div><div class="kpi-sub">₩ / 일</div></div>
    </div>` : '';

  const tableRows = monthly.map(m => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:13px;font-weight:600;text-align:left;padding:12px 20px;">${m.label}</td>
      <td>${fmtMoney(m.totalAmount)}</td>
      <td>${fmtMoney(m.totalCount)}</td>
      <td>${fmtMoney(Math.round(m.avgAmount))}</td>
      <td>${fmtMoney(Math.round(m.dailyAvg))}</td>
    </tr>`).join('');

  document.getElementById('content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div class="section-title">매출 대시보드</div>
      <div>
        <input type="file" id="salesFileInput" accept=".xlsx,.xls" style="display:none" onchange="handleSalesUpload(this.files[0])">
        <button id="salesUploadBtn" onclick="document.getElementById('salesFileInput').click()"
          style="padding:10px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">
          엑셀 업로드
        </button>
      </div>
    </div>
    ${kpiHtml}
    <div class="chart-wrap" style="margin-top:20px;">
      <div class="chart-title"><div class="chart-title-left">월별 수납 총액 추이</div></div>
      <div class="chart-canvas-wrap"><canvas id="salesChart"></canvas></div>
    </div>
    <div class="section-header" style="margin-top:20px;">
      <div class="section-title" style="font-size:14px;color:var(--text-sub);">월별 요약</div>
    </div>
    <div class="dash-table-wrap">
      <table class="dash-table">
        <thead><tr>
          <th style="text-align:left;">월</th>
          <th>수납 총액 (₩)</th>
          <th>수납 건수 (건)</th>
          <th>수납 평균 (₩)</th>
          <th>일평균 수납 (₩)</th>
        </tr></thead>
        <tbody>${tableRows || '<tr><td colspan="5" style="text-align:center;color:var(--text-mute);padding:40px;">데이터가 없습니다. 엑셀 파일을 업로드해 주세요.</td></tr>'}</tbody>
      </table>
    </div>`;

  // 차트
  setTimeout(() => {
    const ctx = document.getElementById('salesChart')?.getContext('2d');
    if (!ctx || !monthly.length) return;
    if (window._salesChart) { window._salesChart.destroy(); }
    window._salesChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthly.map(m => m.label),
        datasets: [{
          label: '수납 총액',
          data: monthly.map(m => m.totalAmount),
          backgroundColor: 'rgba(79,142,247,0.4)',
          borderColor: '#4F8EF7',
          borderWidth: 1.5,
          borderRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E2230', borderColor: '#2A2E3E', borderWidth: 1,
            titleColor: '#7A8099', bodyColor: '#E8EAF0', padding: 12,
            callbacks: { label: ctx => ` 수납 총액  ₩${Number(ctx.parsed.y).toLocaleString('ko-KR')}` }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#464D66', font: { size: 10 } }, border: { color: '#2A2E3E' } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#464D66', font: { size: 10 }, callback: v => v >= 1000000000 ? (v/1000000000).toFixed(1)+'B' : v >= 1000000 ? (v/1000000).toFixed(0)+'M' : v }, border: { color: '#2A2E3E' } }
        }
      }
    });
  }, 50);
}

// 월별 상세
async function renderSalesMonthly() {
  if (!isUnlocked) {
    document.getElementById('content').innerHTML = `
      <div class="coming-soon">
        <div class="coming-soon-icon">🔒</div>
        <div class="coming-soon-title">열람 잠금</div>
        <div style="margin-bottom:20px;color:var(--text-sub);font-size:13px;">매출 정산을 열람하려면 잠금을 해제해 주세요.</div>
        <button onclick="openModal()" style="padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">잠금 해제</button>
      </div>`;
    return;
  }

  const month = String(curMonth).padStart(2, '0');
  const snap = await db.ref(`sales/${curYear}/${month}`).once('value');
  const data = snap.val();

  if (!data) {
    document.getElementById('content').innerHTML = `
      <div class="coming-soon">
        <div class="coming-soon-icon">📂</div>
        <div class="coming-soon-title">${curYear}.${month}</div>
        <div style="color:var(--text-sub);font-size:13px;">해당 월의 데이터가 없습니다. 엑셀 파일을 업로드해 주세요.</div>
      </div>`;
    return;
  }

  const s = data.summary || {};
  const daily = data.daily || {};
  const sortedDays = Object.keys(daily).sort();

  const rows = sortedDays.map(day => {
    const d = daily[day];
    return `
      <tr>
        <td style="font-family:var(--font-mono);font-size:12px;text-align:left;padding:10px 20px;">${day.replace(/-/g,'.')}</td>
        <td>${fmtMoney(d.count)}</td>
        <td>${fmtMoney(d.amount)}</td>
        <td>${fmtMoney(Math.round(d.avg))}</td>
        <td>${fmtMoney(d.cashAmount)}</td>
        <td>${fmtMoney(d.cardAmount)}</td>
        <td>${fmtMoney(d.transferAmount)}</td>
      </tr>`;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div class="section-header">
      <div class="section-title">월별 상세 <span class="section-badge">${curYear}.${month}</span></div>
    </div>
    <div class="dash-grid" style="margin-bottom:20px;">
      <div class="kpi-card"><div class="kpi-label">수납 총액</div><div class="kpi-value">${fmtMoney(s.totalAmount)}</div><div class="kpi-sub">₩</div></div>
      <div class="kpi-card"><div class="kpi-label">수납 건수</div><div class="kpi-value">${fmtMoney(s.totalCount)}</div><div class="kpi-sub">건</div></div>
      <div class="kpi-card"><div class="kpi-label">수납 평균</div><div class="kpi-value" style="color:var(--accent)">${fmtMoney(Math.round(s.avgAmount))}</div><div class="kpi-sub">₩ / 건</div></div>
      <div class="kpi-card"><div class="kpi-label">일평균 수납</div><div class="kpi-value">${fmtMoney(Math.round(s.dailyAvg))}</div><div class="kpi-sub">₩ / 일</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="col-date">날짜</th>
          <th>수납 건수</th>
          <th>수납 총액 (₩)</th>
          <th>수납 평균 (₩)</th>
          <th>현금 (₩)</th>
          <th>카드 (₩)</th>
          <th>계좌이체 (₩)</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td>합계</td>
          <td>${fmtMoney(s.totalCount)}</td>
          <td>${fmtMoney(s.totalAmount)}</td>
          <td>${fmtMoney(Math.round(s.avgAmount))}</td>
          <td>-</td><td>-</td><td>-</td>
        </tr></tfoot>
      </table>
    </div>`;
}

function renderComingSoon() {
  const section = MENU.find(s => s.items.some(i => i.id === curPageId));
  const item    = section?.items.find(i => i.id === curPageId);
  document.getElementById('content').innerHTML = `
    <div class="coming-soon">
      <div class="coming-soon-icon">🚧</div>
      <div class="coming-soon-title">${item?.label || ''}</div>
      <div>준비 중인 페이지입니다</div>
    </div>`;
}

/* ══════════════════════════════════════════════
   MEDIA TABLE
══════════════════════════════════════════════ */
function renderMediaTable(mediaId) {
  const media = MEDIA.find(m => m.id === mediaId);
  const days  = daysInMonth(curYear, curMonth);
  const data  = loadData(curYear, curMonth, mediaId);
  let totalSpend = 0, totalDB = 0, totalRevenue = 0;
  let rows = '';

  for (let d = 1; d <= days; d++) {
    const row  = data[String(d)] || { spend:'', db:'', revenue:'' };
    const dow  = getDayOfWeek(curYear, curMonth, d);
    const isWE = dow === 0 || dow === 6;
    const spendV   = row.spend   !== '' ? Number(row.spend)   : null;
    const dbV      = row.db      !== '' ? Number(row.db)      : null;
    const revenueV = row.revenue !== '' ? Number(row.revenue) : null;
    const cpa  = calcCPA(spendV, dbV);
    const roas = calcROAS(revenueV, spendV);
    if (spendV)   totalSpend   += spendV;
    if (dbV)      totalDB      += dbV;
    if (revenueV) totalRevenue += revenueV;
    const dateStyle = isWE ? `color:${dow===0?'#FF453A':'#4F8EF7'};` : '';
    rows += `
      <tr>
        <td class="td-date">
          <span style="${dateStyle}">${curYear}.${String(curMonth).padStart(2,'0')}.${String(d).padStart(2,'0')}</span>
          <span class="day" style="${dateStyle}">${DAYS_KO[dow]}</span>
        </td>
        <td><input class="cell-input" type="text" inputmode="numeric" placeholder="0" value="${row.spend}" data-day="${d}" data-field="spend" data-media="${mediaId}" onchange="onCellChange(this)" onfocus="this.select()" ${isUnlocked?'':'disabled'}></td>
        <td><input class="cell-input" type="text" inputmode="numeric" placeholder="0" value="${row.db}" data-day="${d}" data-field="db" data-media="${mediaId}" onchange="onCellChange(this)" onfocus="this.select()" ${isUnlocked?'':'disabled'}></td>
        <td class="td-cpa ${cpa?'filled':''}" id="cpa_${mediaId}_${d}">${cpa ? fmtMoney(cpa)+' ₩' : '-'}</td>
        <td><input class="cell-input" type="text" inputmode="numeric" placeholder="0" value="${row.revenue}" data-day="${d}" data-field="revenue" data-media="${mediaId}" onchange="onCellChange(this)" onfocus="this.select()" ${isUnlocked?'':'disabled'}></td>
        <td class="td-roas ${roas?(Number(roas)>=100?'good':'bad'):''}" id="roas_${mediaId}_${d}">${roas ? fmtMoney(roas)+'%' : '-'}</td>
      </tr>`;
  }

  const totalCPA  = calcCPA(totalSpend, totalDB);
  const totalROAS = calcROAS(totalRevenue, totalSpend);
  document.getElementById('content').innerHTML = `
    <div class="section-header">
      <div class="section-title">
        <span style="color:${media.color};font-size:18px;">●</span>${media.name}
        <span class="section-badge">${curYear}.${String(curMonth).padStart(2,'0')}</span>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="col-date">날짜</th>
          <th class="col-spend">소진 광고비 (₩)</th>
          <th class="col-db">유입 DB (건)</th>
          <th class="col-cpa">DB 단가 (₩)</th>
          <th class="col-revenue">매출 (₩)</th>
          <th class="col-roas">ROAS</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td>합계</td>
          <td id="foot_spend_${mediaId}">${totalSpend ? fmtMoney(totalSpend) : '-'}</td>
          <td id="foot_db_${mediaId}">${totalDB ? fmtMoney(totalDB) : '-'}</td>
          <td class="total-cpa" id="foot_cpa_${mediaId}">${totalCPA ? fmtMoney(totalCPA)+' ₩' : '-'}</td>
          <td id="foot_revenue_${mediaId}">${totalRevenue ? fmtMoney(totalRevenue) : '-'}</td>
          <td class="total-cpa" id="foot_roas_${mediaId}">${totalROAS ? fmtMoney(totalROAS)+'%' : '-'}</td>
        </tr></tfoot>
      </table>
    </div>`;
}

/* ══════════════════════════════════════════════
   CELL CHANGE
══════════════════════════════════════════════ */
function onCellChange(input) {
  const mediaId = input.dataset.media;
  const day     = String(input.dataset.day);
  const field   = input.dataset.field;
  const raw     = input.value.replace(/,/g, '').trim();
  const num     = raw === '' ? '' : parseInt(raw, 10);
  if (raw !== '' && isNaN(num)) { input.value = ''; return; }
  const data = loadData(curYear, curMonth, mediaId);
  if (!data[day]) data[day] = { spend:'', db:'', revenue:'' };
  data[day][field] = num === '' ? '' : num;
  saveData(curYear, curMonth, mediaId, data);
  if (num !== '') input.value = num;
  const r = data[day];
  const cpa  = calcCPA(r.spend!==''?Number(r.spend):null, r.db!==''?Number(r.db):null);
  const roas = calcROAS(r.revenue!==''?Number(r.revenue):null, r.spend!==''?Number(r.spend):null);
  const cpaEl  = document.getElementById(`cpa_${mediaId}_${day}`);
  const roasEl = document.getElementById(`roas_${mediaId}_${day}`);
  if (cpaEl)  { cpaEl.textContent  = cpa  ? fmtMoney(cpa)+'  ₩' : '-'; cpaEl.className  = `td-cpa ${cpa?'filled':''}`; }
  if (roasEl) { roasEl.textContent = roas ? fmtMoney(roas)+'%' : '-'; roasEl.className = `td-roas ${roas?(Number(roas)>=100?'good':'bad'):''}`; }
  recalcFooter(mediaId);
}

function recalcFooter(mediaId) {
  const data = loadData(curYear, curMonth, mediaId);
  const days = daysInMonth(curYear, curMonth);
  let s=0, d=0, r=0;
  for (let i=1; i<=days; i++) {
    const row = data[String(i)] || {};
    if (row.spend   !== '' && row.spend   != null) s += Number(row.spend);
    if (row.db      !== '' && row.db      != null) d += Number(row.db);
    if (row.revenue !== '' && row.revenue != null) r += Number(row.revenue);
  }
  const cpa = calcCPA(s,d), roas = calcROAS(r,s);
  const get = id => document.getElementById(id);
  if (get(`foot_spend_${mediaId}`))   get(`foot_spend_${mediaId}`).textContent   = s    ? fmtMoney(s)    : '-';
  if (get(`foot_db_${mediaId}`))      get(`foot_db_${mediaId}`).textContent      = d    ? fmtMoney(d)    : '-';
  if (get(`foot_cpa_${mediaId}`))     get(`foot_cpa_${mediaId}`).textContent     = cpa  ? fmtMoney(cpa)+' ₩' : '-';
  if (get(`foot_roas_${mediaId}`))    get(`foot_roas_${mediaId}`).textContent    = roas ? fmtMoney(roas)+'%' : '-';
}

/* ══════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════ */
function renderDashboard() {
  const badge = dashView === 'monthly'
    ? `${curYear}.${String(curMonth).padStart(2,'0')}`
    : `${curYear}년`;

  const toggleHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div class="section-title">대시보드 <span class="section-badge">${badge}</span></div>
      <div style="display:flex;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:3px;">
        <button class="chart-toggle-btn ${dashView==='monthly'?'active':''}" onclick="setDashView('monthly')">월간</button>
        <button class="chart-toggle-btn ${dashView==='annual'?'active':''}" onclick="setDashView('annual')">연간</button>
      </div>
    </div>`;

  if (dashView === 'annual') {
    document.getElementById('content').innerHTML = toggleHtml + '<div id="annualContent"></div>';
    renderAnnualDashboard();
    return;
  }

  const days = daysInMonth(curYear, curMonth);
  let grandSpend=0, grandDB=0, grandRevenue=0;
  const summaries = MEDIA.map(m => {
    const data = loadData(curYear, curMonth, m.id);
    let spend=0, db=0, revenue=0;
    for (let d=1; d<=days; d++) {
      const r = data[String(d)] || {};
      if (r.spend   !== '' && r.spend   != null) spend   += Number(r.spend);
      if (r.db      !== '' && r.db      != null) db      += Number(r.db);
      if (r.revenue !== '' && r.revenue != null) revenue += Number(r.revenue);
    }
    grandSpend += spend; grandDB += db; grandRevenue += revenue;
    return { ...m, spend, db, revenue, cpa: calcCPA(spend,db), roas: calcROAS(revenue,spend) };
  });
  const grandCPA  = calcCPA(grandSpend, grandDB);
  const grandROAS = calcROAS(grandRevenue, grandSpend);

  const kpiHtml = `<div class="dash-grid">
    <div class="kpi-card"><div class="kpi-label">총 소진 광고비</div><div class="kpi-value">${grandSpend ? fmtMoney(grandSpend) : '0'}</div><div class="kpi-sub">₩ · ${curYear}.${String(curMonth).padStart(2,'0')}</div></div>
    <div class="kpi-card"><div class="kpi-label">총 유입 DB</div><div class="kpi-value">${grandDB ? fmtMoney(grandDB) : '0'}</div><div class="kpi-sub">건 · ${curYear}.${String(curMonth).padStart(2,'0')}</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 DB 단가</div><div class="kpi-value" style="color:var(--accent)">${grandCPA ? fmtMoney(grandCPA) : '-'}</div><div class="kpi-sub">₩ / 건</div></div>
    <div class="kpi-card"><div class="kpi-label">총 매출</div><div class="kpi-value">${grandRevenue ? fmtMoney(grandRevenue) : '0'}</div><div class="kpi-sub">₩ · ${curYear}.${String(curMonth).padStart(2,'0')}</div></div>
    <div class="kpi-card"><div class="kpi-label">전체 ROAS</div><div class="kpi-value" style="color:${grandROAS&&Number(grandROAS)>=100?'var(--accent)':'var(--red)'}">${grandROAS ? fmtMoney(grandROAS)+'%' : '-'}</div><div class="kpi-sub">매출 ÷ 광고비</div></div>
    <div class="kpi-card"><div class="kpi-label">집행 매체 수</div><div class="kpi-value">${summaries.filter(s=>s.spend>0).length}</div><div class="kpi-sub">/ 5개 매체</div></div>
  </div>`;

  const mediaRows = summaries.map(s => `
    <tr>
      <td><span class="media-badge" style="background:${s.color}22;color:${s.color}"><span style="width:7px;height:7px;border-radius:50%;background:${s.color};display:inline-block;"></span>${s.name}</span></td>
      <td>${s.spend   ? fmtMoney(s.spend)   : '-'}</td>
      <td>${s.db      ? fmtMoney(s.db)      : '-'}</td>
      <td style="color:${s.cpa?'var(--green)':'var(--text-mute)'}">${s.cpa ? fmtMoney(s.cpa)+' ₩' : '-'}</td>
      <td>${s.revenue ? fmtMoney(s.revenue) : '-'}</td>
      <td style="color:${s.roas?(Number(s.roas)>=100?'var(--accent)':'var(--red)'):'var(--text-mute)'}">${s.roas ? fmtMoney(s.roas)+'%' : '-'}</td>
    </tr>`).join('');

  document.getElementById('content').innerHTML = toggleHtml + `
    ${kpiHtml}
    <div class="chart-wrap">
      <div class="chart-title">
        <div class="chart-title-left">
          전체 매체 합산 추이
          <div class="chart-legend">
            <div class="legend-item"><div class="legend-bar" style="background:#4F8EF7"></div>광고비</div>
            <div class="legend-item"><div class="legend-bar" style="background:#34C759"></div>매출</div>
            <div class="legend-item"><div class="legend-line" style="background:#F4A030"></div>ROAS</div>
          </div>
        </div>
        <div class="chart-toggle">
          <button class="chart-toggle-btn dash-toggle-btn ${dashChartMode==='daily'?'active':''}" data-mode="daily" onclick="setDashChartMode('daily')">일별</button>
          <button class="chart-toggle-btn dash-toggle-btn ${dashChartMode==='monthly'?'active':''}" data-mode="monthly" onclick="setDashChartMode('monthly')">월별</button>
        </div>
      </div>
      <div class="chart-canvas-wrap"><canvas id="dashChart"></canvas></div>
    </div>
    <div class="section-header" style="margin-top:8px;">
      <div class="section-title" style="font-size:14px;color:var(--text-sub);">매체별 월 합계</div>
    </div>
    <div class="dash-table-wrap">
      <table class="dash-table">
        <thead><tr><th>매체</th><th>소진 광고비 (₩)</th><th>유입 DB (건)</th><th>DB 단가 (₩)</th><th>매출 (₩)</th><th>ROAS</th></tr></thead>
        <tbody>${mediaRows}</tbody>
        <tfoot><tr>
          <td>전체 합계</td>
          <td>${grandSpend   ? fmtMoney(grandSpend)   : '-'}</td>
          <td>${grandDB      ? fmtMoney(grandDB)      : '-'}</td>
          <td>${grandCPA     ? fmtMoney(grandCPA)+' ₩' : '-'}</td>
          <td>${grandRevenue ? fmtMoney(grandRevenue) : '-'}</td>
          <td>${grandROAS    ? fmtMoney(grandROAS)+'%' : '-'}</td>
        </tr></tfoot>
      </table>
    </div>`;

  setTimeout(() => renderDashboardChart(days), 50);
}

function setDashView(view) {
  dashView = view;
  updateMonthLabel();
  renderDashboard();
}

function renderAnnualDashboard() {
  let totalSpend = 0, totalDB = 0, totalRevenue = 0;
  const monthlyStats = [];

  for (let mo = 1; mo <= 12; mo++) {
    let spend = 0, db = 0, revenue = 0;
    MEDIA.forEach(m => {
      const data = loadData(curYear, mo, m.id);
      const days = daysInMonth(curYear, mo);
      for (let d = 1; d <= days; d++) {
        const r = data[String(d)] || {};
        if (r.spend   !== '' && r.spend   != null) spend   += Number(r.spend);
        if (r.db      !== '' && r.db      != null) db      += Number(r.db);
        if (r.revenue !== '' && r.revenue != null) revenue += Number(r.revenue);
      }
    });
    totalSpend   += spend;
    totalDB      += db;
    totalRevenue += revenue;
    monthlyStats.push({ mo, spend, db, revenue, roas: calcROAS(revenue, spend) });
  }

  const totalCPA  = calcCPA(totalSpend, totalDB);
  const totalROAS = calcROAS(totalRevenue, totalSpend);

  const kpiHtml = `<div class="dash-grid">
    <div class="kpi-card"><div class="kpi-label">연간 소진 광고비</div><div class="kpi-value">${totalSpend ? fmtMoney(totalSpend) : '0'}</div><div class="kpi-sub">₩ · ${curYear}년</div></div>
    <div class="kpi-card"><div class="kpi-label">연간 유입 DB</div><div class="kpi-value">${totalDB ? fmtMoney(totalDB) : '0'}</div><div class="kpi-sub">건 · ${curYear}년</div></div>
    <div class="kpi-card"><div class="kpi-label">평균 DB 단가</div><div class="kpi-value" style="color:var(--accent)">${totalCPA ? fmtMoney(totalCPA) : '-'}</div><div class="kpi-sub">₩ / 건</div></div>
    <div class="kpi-card"><div class="kpi-label">연간 매출</div><div class="kpi-value">${totalRevenue ? fmtMoney(totalRevenue) : '0'}</div><div class="kpi-sub">₩ · ${curYear}년</div></div>
    <div class="kpi-card"><div class="kpi-label">연간 ROAS</div><div class="kpi-value" style="color:${totalROAS&&Number(totalROAS)>=100?'var(--accent)':'var(--red)'}">${totalROAS ? fmtMoney(totalROAS)+'%' : '-'}</div><div class="kpi-sub">매출 ÷ 광고비</div></div>
    <div class="kpi-card"><div class="kpi-label">집행 월 수</div><div class="kpi-value">${monthlyStats.filter(m=>m.spend>0).length}</div><div class="kpi-sub">/ 12개월</div></div>
  </div>`;

  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const monthlyRows = monthlyStats.map(m => `
    <tr style="${m.mo === curMonth ? 'background:var(--accent-dim);' : ''}">
      <td style="text-align:left;padding:12px 20px;font-family:var(--font-mono);font-size:13px;font-weight:600;">${monthNames[m.mo-1]}</td>
      <td>${m.spend   ? fmtMoney(m.spend)   : '-'}</td>
      <td>${m.db      ? fmtMoney(m.db)      : '-'}</td>
      <td style="color:${m.roas?(Number(m.roas)>=100?'var(--accent)':'var(--red)'):'var(--text-mute)'}">${m.roas ? fmtMoney(m.roas)+'%' : '-'}</td>
      <td>${m.revenue ? fmtMoney(m.revenue) : '-'}</td>
    </tr>`).join('');

  const content = document.getElementById('content');
  const labels    = monthNames;
  const spends    = monthlyStats.map(m => m.spend);
  const revenues  = monthlyStats.map(m => m.revenue);
  const roasArr   = monthlyStats.map(m => m.roas);

  content.querySelector('#annualKpi')          && (content.querySelector('#annualKpi').outerHTML = kpiHtml);
  content.querySelector('#annualMonthlyRows')  && (content.querySelector('#annualMonthlyRows').innerHTML = monthlyRows);

  document.getElementById('annualContent').innerHTML = `
    ${kpiHtml}
    <div class="chart-wrap" style="margin-bottom:20px;">
      <div class="chart-title">
        <div class="chart-title-left">${curYear}년 월별 추이
          <div class="chart-legend">
            <div class="legend-item"><div class="legend-bar" style="background:#4F8EF7"></div>광고비</div>
            <div class="legend-item"><div class="legend-bar" style="background:#34C759"></div>매출</div>
            <div class="legend-item"><div class="legend-line" style="background:#F4A030"></div>ROAS</div>
          </div>
        </div>
      </div>
      <div class="chart-canvas-wrap"><canvas id="annualChart"></canvas></div>
    </div>
    <div class="section-header" style="margin-top:8px;">
      <div class="section-title" style="font-size:14px;color:var(--text-sub);">월별 합계</div>
    </div>
    <div class="dash-table-wrap">
      <table class="dash-table">
        <thead><tr><th style="text-align:left;">월</th><th>소진 광고비 (₩)</th><th>유입 DB (건)</th><th>ROAS</th><th>매출 (₩)</th></tr></thead>
        <tbody>${monthlyRows}</tbody>
        <tfoot><tr>
          <td style="text-align:left;padding:13px 20px;font-size:11px;color:var(--text-sub);">연간 합계</td>
          <td>${totalSpend   ? fmtMoney(totalSpend)   : '-'}</td>
          <td>${totalDB      ? fmtMoney(totalDB)      : '-'}</td>
          <td>${totalROAS    ? fmtMoney(totalROAS)+'%' : '-'}</td>
          <td>${totalRevenue ? fmtMoney(totalRevenue) : '-'}</td>
        </tr></tfoot>
      </table>
    </div>`;

  setTimeout(() => {
    if (dashChartInstance) { dashChartInstance.destroy(); dashChartInstance = null; }
    const ctx = document.getElementById('annualChart')?.getContext('2d');
    if (!ctx) return;
    dashChartInstance = new Chart(ctx, {
      data: { labels, datasets: [
        { type:'bar', label:'광고비', data:spends, backgroundColor:'rgba(79,142,247,0.4)', borderColor:'#4F8EF7', borderWidth:1.5, borderRadius:4, yAxisID:'yMoney', order:2 },
        { type:'bar', label:'매출', data:revenues, backgroundColor:'rgba(52,199,89,0.35)', borderColor:'#34C759', borderWidth:1.5, borderRadius:4, yAxisID:'yMoney', order:3 },
        { type:'line', label:'ROAS', data:roasArr, borderColor:'#F4A030', backgroundColor:'rgba(244,160,48,0.12)', borderWidth:2.5, pointRadius:3.5, pointBackgroundColor:'#F4A030', tension:0.35, yAxisID:'yROAS', spanGaps:true, order:1 },
      ]},
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        plugins: {
          legend:{ display:false },
          tooltip:{ backgroundColor:'#1E2230', borderColor:'#2A2E3E', borderWidth:1, titleColor:'#7A8099', bodyColor:'#E8EAF0', padding:12,
            callbacks:{ label(ctx) {
              if (ctx.dataset.label==='ROAS') return ctx.parsed.y!=null ? ` ROAS  ${ctx.parsed.y.toLocaleString('ko-KR')}%` : ' ROAS  -';
              return ` ${ctx.dataset.label}  ₩${Number(ctx.parsed.y).toLocaleString('ko-KR')}`;
            }}
          }
        },
        scales: {
          x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#464D66',font:{size:10}}, border:{color:'#2A2E3E'} },
          yMoney: { type:'linear', position:'left', grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#464D66',font:{size:10}, callback:v=>v===0?'0':v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':v}, border:{color:'#2A2E3E'} },
          yROAS: { type:'linear', position:'right', grid:{drawOnChartArea:false}, ticks:{color:'#F4A030',font:{size:10},callback:v=>fmtMoney(v)+'%'}, border:{color:'#2A2E3E'} },
        }
      }
    });
  }, 50);
}

/* ══════════════════════════════════════════════
   CHART
══════════════════════════════════════════════ */
let dashChartInstance = null;
let dashChartMode = 'daily';

function getMonthlyData() {
  const months = new Set();
  Object.keys(dataCache).forEach(k => {
    const m = k.match(/^(\d{4})_(\d{2})_(.+)$/);
    if (m) months.add(`${m[1]}_${m[2]}`);
  });
  return [...months].sort().map(ym => {
    const [y, mo] = ym.split('_');
    const days = new Date(Number(y), Number(mo), 0).getDate();
    let spend=0, revenue=0, db=0;
    MEDIA.forEach(mid => {
      const data = loadData(Number(y), Number(mo), mid.id);
      for (let d=1; d<=days; d++) {
        const r = data[String(d)] || {};
        if (r.spend   !== '' && r.spend   != null) spend   += Number(r.spend);
        if (r.revenue !== '' && r.revenue != null) revenue += Number(r.revenue);
        if (r.db      !== '' && r.db      != null) db      += Number(r.db);
      }
    });
    return { label:`${y}.${mo}`, spend, revenue, db, roas: calcROAS(revenue, spend) };
  });
}

function renderDashboardChart(days) {
  if (dashChartInstance) { dashChartInstance.destroy(); dashChartInstance = null; }
  let labels, spends, revenues, roasArr;
  if (dashChartMode === 'monthly') {
    const monthly = getMonthlyData();
    labels = monthly.map(m => m.label); spends = monthly.map(m => m.spend);
    revenues = monthly.map(m => m.revenue); roasArr = monthly.map(m => m.roas);
  } else {
    labels=[]; spends=[]; revenues=[]; roasArr=[];
    for (let d=1; d<=days; d++) {
      labels.push(`${d}일`);
      let ts=0, tr=0;
      MEDIA.forEach(m => {
        const data = loadData(curYear, curMonth, m.id);
        const r = data[String(d)] || {};
        if (r.spend   !== '' && r.spend   != null) ts += Number(r.spend);
        if (r.revenue !== '' && r.revenue != null) tr += Number(r.revenue);
      });
      spends.push(ts); revenues.push(tr); roasArr.push(calcROAS(tr, ts));
    }
  }
  const ctx = document.getElementById('dashChart').getContext('2d');
  dashChartInstance = new Chart(ctx, {
    data: { labels, datasets: [
      { type:'bar', label:'광고비', data:spends, backgroundColor:'rgba(79,142,247,0.4)', borderColor:'#4F8EF7', borderWidth:1.5, borderRadius:4, yAxisID:'yMoney', order:2 },
      { type:'bar', label:'매출',   data:revenues, backgroundColor:'rgba(52,199,89,0.35)', borderColor:'#34C759', borderWidth:1.5, borderRadius:4, yAxisID:'yMoney', order:3 },
      { type:'line', label:'ROAS', data:roasArr, borderColor:'#F4A030', backgroundColor:'rgba(244,160,48,0.12)', borderWidth:2.5, pointRadius:3.5, pointBackgroundColor:'#F4A030', tension:0.35, yAxisID:'yROAS', spanGaps:true, order:1 },
    ]},
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins: {
        legend:{ display:false },
        tooltip:{ backgroundColor:'#1E2230', borderColor:'#2A2E3E', borderWidth:1, titleColor:'#7A8099', bodyColor:'#E8EAF0', padding:12,
          callbacks:{ label(ctx) {
            if (ctx.dataset.label==='ROAS') return ctx.parsed.y!=null ? ` ROAS  ${ctx.parsed.y.toLocaleString('ko-KR')}%` : ' ROAS  -';
            return ` ${ctx.dataset.label}  ₩${Number(ctx.parsed.y).toLocaleString('ko-KR')}`;
          }}
        }
      },
      scales: {
        x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#464D66',font:{size:10},maxTicksLimit:16,maxRotation:0}, border:{color:'#2A2E3E'} },
        yMoney: { type:'linear', position:'left', grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#464D66',font:{size:10}, callback:v=>v===0?'0':v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'K':v}, border:{color:'#2A2E3E'} },
        yROAS:  { type:'linear', position:'right', grid:{drawOnChartArea:false}, ticks:{color:'#F4A030',font:{size:10},callback:v=>fmtMoney(v)+'%'}, border:{color:'#2A2E3E'} },
      }
    }
  });
}

function setDashChartMode(mode) {
  dashChartMode = mode;
  document.querySelectorAll('.dash-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.mode===mode));
  renderDashboardChart(daysInMonth(curYear, curMonth));
}

function updateLockUI() {
  const btn = document.getElementById('lockBtn');
  const text = document.getElementById('lockBtnText');
  if (isUnlocked) {
    btn.classList.add('unlocked');
    btn.querySelector('.lock-icon').textContent = '🔓';
    text.textContent = '편집 중';
  } else {
    btn.classList.remove('unlocked');
    btn.querySelector('.lock-icon').textContent = '🔒';
    text.textContent = 'LOCK';
  }
  if (curPageId.startsWith('adlog_') && curPageId !== 'adlog_dashboard') render();
  if (curPageId === 'leads_list') renderLeads();
  if (curPageId.startsWith('sales_')) render();
}
function onLockBtnClick() {
  if (isUnlocked) { isUnlocked = false; updateLockUI(); }
  else openModal();
}
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  const input = document.getElementById('pwInput');
  input.value = ''; input.classList.remove('error');
  document.getElementById('pwError').textContent = '';
  setTimeout(() => input.focus(), 100);
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }
function onOverlayClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }
function clearError() { document.getElementById('pwInput').classList.remove('error'); document.getElementById('pwError').textContent = ''; }
function submitPassword() {
  const input = document.getElementById('pwInput');
  if (input.value === EDIT_PASSWORD) {
    isUnlocked = true; closeModal(); updateLockUI();
  } else {
    input.classList.add('error');
    document.getElementById('pwError').textContent = '비밀번호가 올바르지 않습니다';
    input.value = '';
    setTimeout(() => input.classList.remove('error'), 400);
  }
}

function showLoading() {
  document.getElementById('content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:300px;gap:12px;color:var(--text-mute);font-size:13px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      데이터 불러오는 중...
    </div>`;
}

buildSidebar();
updateBreadcrumb();
updateMonthLabel();
render();
(async () => {
  await fetchAllData();
  render();
})();
