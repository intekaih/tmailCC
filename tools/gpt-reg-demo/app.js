/**
 * tmailCC GPT Demo - Main Application Logic
 * Handles API calls, UI state, and OTP polling.
 */

// ============================================================
// STATE
// ============================================================
const state = {
  apiUrl: '',
  apiKey: '',
  selectedDomain: '',
  account: null,         // { address, localPart, domain, createdAt }
  pollTimer: null,
  otpTimer: null,
  otpStartTime: null,
  otpStartTimeSec: null,
  isPolling: false,
  isOtpPolling: false,
  otpTimeout: null,
};

// ============================================================
// DOM REFS
// ============================================================
const $ = id => document.getElementById(id);

// Sections
const sections = {
  config:  $('section-config'),
  account: $('section-account'),
  inbox:   $('section-inbox'),
  otp:     $('section-otp'),
  result:  $('section-result'),
};

// Flow steps
const flowSteps = [1, 2, 3, 4].map(n => ({
  el: document.getElementById(`flow-${n}`),
  num: n,
}));

// ============================================================
// API CLIENT
// ============================================================
async function apiGet(path) {
  const res = await fetch(`${state.apiUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.apiKey}`,
    },
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

async function apiPost(path, body) {
  const res = await fetch(`${state.apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

// ============================================================
// LOGGING
// ============================================================
function log(method, path, status, body) {
  const container = $('logContainer');
  const empty = container.querySelector('.log-empty');
  if (empty) empty.remove();

  const entry = document.createElement('div');
  entry.className = 'log-entry';

  const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isOk = status >= 200 && status < 300;
  const methodClass = isOk ? method : 'error';

  entry.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;">
      <span class="log-method ${methodClass}">${method}</span>
      <span class="log-path">${path}</span>
    </div>
    <div>
      <span class="log-status ${isOk ? 'ok' : 'err'}">${status}</span>
      <span class="log-time">${time}</span>
      ${body ? `<div class="log-body">${truncate(JSON.stringify(body), 100)}</div>` : ''}
    </div>
  `;

  container.insertBefore(entry, container.firstChild);

  // Keep max 50 entries
  while (container.children.length > 50) {
    container.removeChild(container.lastChild);
  }
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function clearLog() {
  const container = $('logContainer');
  container.innerHTML = '<div class="log-empty">Chua co request nao</div>';
  $('clearLog').addEventListener('click', clearLog);
}

// ============================================================
// FLOW DIAGRAM
// ============================================================
function setFlowStep(stepNum, status) {
  // status: 'pending' | 'active' | 'done' | 'error'
  flowSteps.forEach(s => {
    s.el.className = 'flow-step';
    const check = s.el.querySelector('.flow-check');
    if (check) check.innerHTML = '';
  });

  for (let i = 0; i < flowSteps.length; i++) {
    const s = flowSteps[i];
    if (i < stepNum - 1) {
      s.el.className = 'flow-step done';
      s.el.querySelector('.flow-check').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a6e3a1" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (i === stepNum - 1) {
      s.el.className = `flow-step ${status}`;
    }
  }
}

// ============================================================
// API STATUS
// ============================================================
function setApiStatus(status, text) {
  const dot = $('statusDot');
  const txt = $('statusText');
  dot.className = 'status-dot ' + status;
  txt.textContent = text;
}

// ============================================================
// TOAST
// ============================================================
let toastTimer = null;
function showToast(message, type = 'info') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// ============================================================
// NAVIGATION
// ============================================================
function showSection(name) {
  Object.values(sections).forEach(s => s.classList.add('hidden'));
  sections[name].classList.remove('hidden');
}

// ============================================================
// SECTION 1: CONFIG
// ============================================================
async function testConnection() {
  const apiUrl = $('apiUrl').value.trim();
  const apiKey = $('apiKey').value.trim();

  if (!apiUrl) { showToast('Vui long nhap API URL', 'error'); return; }
  if (!apiKey) { showToast('Vui long nhap API Key', 'error'); return; }

  state.apiUrl = apiUrl;
  state.apiKey = apiKey;
  setApiStatus('loading', 'Dang kiem tra...');
  setFlowStep(1, 'active');

  const res = await apiGet('/api/v1/domains');
  log('GET', '/api/v1/domains', res.status, res.json);

  if (res.ok && res.json?.success) {
    setApiStatus('connected', 'Da ket noi');
    setFlowStep(1, 'done');

    // Populate domains
    const select = $('domainSelect');
    select.innerHTML = '<option value="">-- Chon domain --</option>';
    res.json.data.domains.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.domain;
      opt.textContent = `${d.domain}${d.isDefault ? ' (mac dinh)' : ''}${d.label ? ' - ' + d.label : ''}`;
      if (d.isDefault) opt.selected = true;
      select.appendChild(opt);
    });

    if (res.json.data.domains.length > 0) {
      state.selectedDomain = res.json.data.domains.find(d => d.isDefault)?.domain || res.json.data.domains[0].domain;
      select.value = state.selectedDomain;
    }

    $('btnNextStep2').disabled = !state.selectedDomain;
    showToast('Ket noi thanh cong!', 'success');
  } else {
    setApiStatus('error', 'Loi ket noi');
    setFlowStep(1, 'error');
    const msg = res.json?.error?.message || `Loi ${res.status}`;
    showToast(msg, 'error');
  }
}

$('btnTestConnection').addEventListener('click', testConnection);

$('domainSelect').addEventListener('change', e => {
  state.selectedDomain = e.target.value;
  $('btnNextStep2').disabled = !state.selectedDomain;
  $('domainDisplay').textContent = state.selectedDomain || '---';
});

$('refreshDomains').addEventListener('click', async () => {
  if (!state.apiKey) { showToast('Chua co API key', 'error'); return; }
  const select = $('domainSelect');
  select.innerHTML = '<option value="">Dang tai...</option>';
  const res = await apiGet('/api/v1/domains');
  if (res.ok && res.json?.success) {
    select.innerHTML = '<option value="">-- Chon domain --</option>';
    res.json.data.domains.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.domain;
      opt.textContent = `${d.domain}${d.isDefault ? ' (mac dinh)' : ''}`;
      select.appendChild(opt);
    });
    showToast('Domains da cap nhat', 'success');
  }
});

$('btnNextStep2').addEventListener('click', () => {
  if (!state.selectedDomain) { showToast('Chon domain truoc', 'error'); return; }
  showSection('account');
  setFlowStep(2, 'active');
  $('domainDisplay').textContent = state.selectedDomain;
  $('emailAddress').textContent = 'Nhap dia chi ben duoi roi nhan Tao email moi';
});

$('btnBack2')?.addEventListener('click', () => {
  showSection('config');
  setFlowStep(2, 'pending');
});

// ============================================================
// SECTION 2: CREATE ACCOUNT
// ============================================================
function randomLocalPart() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let r = '';
  for (let i = 0; i < 12; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

async function createAccount() {
  const localPart = $('localPart').value.trim() || randomLocalPart();
  $('btnCreateAccount').disabled = true;
  $('btnCreateAccount').textContent = 'Dang tao...';

  const res = await apiPost('/api/v1/accounts', {
    localPart,
    domain: state.selectedDomain,
  });

  const path = `/api/v1/accounts (localPart=${localPart}, domain=${state.selectedDomain})`;
  log('POST', '/api/v1/accounts', res.status, res.json);

  if (res.ok && res.json?.success) {
    state.account = res.json.data;
    setFlowStep(2, 'done');

    // Update email preview
    $('emailAddress').textContent = state.account.address;
    $('emailAddress').style.fontSize = '1.1rem';
    $('localPart').value = state.account.localPart;

    showToast('Tai khoan da tao!', 'success');
    $('btnNextStep3').disabled = false;
  } else {
    const msg = res.json?.error?.message || `Loi ${res.status}`;
    showToast(msg, 'error');
    setFlowStep(2, 'error');
  }

  $('btnCreateAccount').disabled = false;
  $('btnCreateAccount').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Tao email moi`;
}

$('btnCreateAccount').addEventListener('click', createAccount);

$('copyEmail').addEventListener('click', () => {
  const addr = state.account?.address || $('emailAddress').textContent;
  navigator.clipboard.writeText(addr).then(() => showToast('Da copy dia chi email!', 'success'));
});

$('copyInboxEmail')?.addEventListener('click', () => {
  const addr = state.account?.address || '';
  navigator.clipboard.writeText(addr).then(() => showToast('Da copy!', 'success'));
});

$('btnNextStep3').addEventListener('click', () => {
  showSection('inbox');
  setFlowStep(3, 'active');
  $('inboxEmailAddress').textContent = state.account.address;
  refreshInbox();
  startAutoPoll();
});

$('btnBack3')?.addEventListener('click', () => {
  stopAutoPoll();
  showSection('account');
  setFlowStep(3, 'pending');
});

// ============================================================
// SECTION 3: EMAIL INBOX
// ============================================================
async function fetchEmails() {
  if (!state.account) return [];
  const encoded = encodeURIComponent(state.account.address.toLowerCase());
  const res = await apiGet(`/api/v1/accounts/${encoded}/emails?limit=20`);
  log('GET', `/api/v1/accounts/:addr/emails`, res.status, res.json);
  if (res.ok && res.json?.success) {
    return res.json.data.emails || [];
  }
  return [];
}

function detectService(from) {
  const addr = (from.address || '').toLowerCase();
  if (addr.includes('openai') || addr.includes('chatgpt') || addr.includes('ai')) return 'gpt';
  if (addr.includes('google') || addr.includes('gmail')) return 'google';
  return 'other';
}

function getAvatarColor(service) {
  return service;
}

function getAvatarLetter(from) {
  const name = from.name || from.address || '?';
  return name.charAt(0).toUpperCase();
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Vua xong';
  if (diff < 3600000) return `${Math.floor(diff/60000)} phut truoc`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)} gio truoc`;
  return d.toLocaleDateString('vi-VN');
}

function hasOtpKeyword(subject) {
  const s = (subject || '').toLowerCase();
  return s.includes('verify') || s.includes('confirm') || s.includes('code') ||
         s.includes('otp') || s.includes('ma') || s.includes('xac minh') ||
         s.includes('security') || s.includes('password') || s.includes('auth');
}

function renderEmails(emails) {
  const container = $('emailList');

  if (!emails || emails.length === 0) {
    container.innerHTML = `
      <div class="email-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <p>Chua co email nao</p>
        <span>Email den se hien thi o day</span>
      </div>`;
    $('btnNextStep4').disabled = true;
    return;
  }

  $('btnNextStep4').disabled = false;

  container.innerHTML = emails.map(email => {
    const service = detectService(email.from);
    const hasOtp = hasOtpKeyword(email.subject);
    return `
      <div class="email-item${email.isRead ? '' : ' unread'}" data-id="${email.id}" data-from='${JSON.stringify(email.from)}' data-subject="${email.subject}" data-time="${email.receivedAt}">
        <div class="email-avatar ${getAvatarColor(service)}">${getAvatarLetter(email.from)}</div>
        <div class="email-info">
          <div class="email-from">${email.from.name || email.from.address}</div>
          <div class="email-subject">${email.subject}</div>
        </div>
        ${hasOtp ? '<span class="email-otp-tag">Co the co OTP</span>' : ''}
        <span class="email-time">${formatTime(email.receivedAt)}</span>
      </div>`;
  }).join('');

  // Click to open detail
  container.querySelectorAll('.email-item').forEach(item => {
    item.addEventListener('click', () => openEmailModal(item.dataset));
  });
}

async function refreshInbox() {
  const emails = await fetchEmails();
  renderEmails(emails);
}

function startAutoPoll() {
  stopAutoPoll();
  state.isPolling = true;
  const interval = parseInt($('pollInterval').value) * 1000;
  state.pollTimer = setInterval(refreshInbox, interval);
}

function stopAutoPoll() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
  state.isPolling = false;
}

$('btnRefreshInbox')?.addEventListener('click', refreshInbox);

$('autoPoll')?.addEventListener('change', e => {
  if (e.target.checked) startAutoPoll();
  else stopAutoPoll();
});

$('pollInterval')?.addEventListener('change', () => {
  if ($('autoPoll')?.checked) startAutoPoll();
});

// ============================================================
// EMAIL MODAL
// ============================================================
async function openEmailModal(data) {
  if (!state.account) return;
  const encoded = encodeURIComponent(state.account.address.toLowerCase());
  const res = await apiGet(`/api/v1/emails/${data.id}`);
  log('GET', `/api/v1/emails/:id`, res.status, res.json);

  const modal = $('emailModal');
  if (res.ok && res.json?.success) {
    const email = res.json.data;
    $('modalSubject').textContent = email.subject;
    $('modalFrom').textContent = `${email.from.name || ''} <${email.from.address}>`.trim();
    $('modalTime').textContent = new Date(email.receivedAt).toLocaleString('vi-VN');
    $('modalContent').textContent = email.text || email.html?.replace(/<[^>]+>/g, '') || '(Khong co noi dung)';
  } else {
    $('modalContent').textContent = '(Khong the tai noi dung email)';
  }

  modal.classList.remove('hidden');
}

$('closeModal').addEventListener('click', () => $('emailModal').classList.add('hidden'));
$('emailModal').addEventListener('click', e => {
  if (e.target === $('emailModal')) $('emailModal').classList.add('hidden');
});

// ============================================================
// SECTION 4: OTP WAITING
// ============================================================
function updateOtpTimer() {
  if (!state.otpStartTimeSec) return;
  const elapsed = Math.floor((Date.now() - state.otpStartTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  $('otpWaitTime').textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

async function pollForOtp() {
  if (!state.account) return;

  const encoded = encodeURIComponent(state.account.address.toLowerCase());
  const res = await apiGet(`/api/v1/accounts/${encoded}/wait-otp?timeout=5&interval=2`);
  log('GET', `/api/v1/accounts/:addr/wait-otp`, res.status, res.json);

  if (res.ok && res.json?.success && res.json.data?.otpCodes?.length > 0) {
    stopOtpPolling();
    const { otpCodes } = res.json.data;
    const code = otpCodes[0];
    const email = res.json.data.email;

    // Update OTP display
    $('otpCodes').innerHTML = `
      <div class="otp-code-list">
        ${otpCodes.map(c => `<span class="otp-code-item">${c}</span>`).join('')}
      </div>`;

    $('otpStatus').innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span style="color:#22c55e">Da tim thay ma OTP!</span>`;

    // Show result section
    setTimeout(() => {
      showSection('result');
      setFlowStep(4, 'done');
      $('resultEmail').textContent = state.account.address;
      $('resultCode').textContent = code;
      $('resultMeta').innerHTML = `
        <span>Tu: ${email?.from?.address || '---'}</span>
        <span>Chu de: ${email?.subject || '---'}</span>
        <span>Thoi gian: ${$('otpWaitTime').textContent}</span>`;
      showToast('Tim thay ma OTP!', 'success');
    }, 800);

    return;
  }

  // Update count
  const currentCount = parseInt($('otpEmailCount').textContent.replace(/[^0-9]/g, '')) || 0;
  $('otpEmailCount').textContent = `${currentCount + 1} email da kiem tra`;
}

function startOtpPolling() {
  if (!state.account) return;
  stopOtpPolling();

  state.isOtpPolling = true;
  state.otpStartTime = Date.now();
  $('otpStartOtp').classList.add('hidden');
  $('btnStopOtp').classList.remove('hidden');
  $('otpStatus').innerHTML = '<div class="otp-pulse"></div><span>Dang cho ma OTP...</span>';
  $('otpCodes').innerHTML = '<div class="otp-empty">Ma OTP se hien thi o day khi co email xac minh</div>';
  $('otpEmailCount').textContent = '0 email da kiem tra';

  // Poll immediately then every 3s
  pollForOtp();
  state.otpTimer = setInterval(pollForOtp, 3000);
  state.otpTimeout = setInterval(updateOtpTimer, 1000);
}

function stopOtpPolling() {
  state.isOtpPolling = false;
  if (state.otpTimer) { clearInterval(state.otpTimer); state.otpTimer = null; }
  if (state.otpTimeout) { clearInterval(state.otpTimeout); state.otpTimeout = null; }
  $('btnStopOtp')?.classList.add('hidden');
  $('btnStartOtp')?.classList.remove('hidden');
}

$('btnStartOtp').addEventListener('click', startOtpPolling);
$('btnStopOtp').addEventListener('click', stopOtpPolling);

$('btnNextStep4').addEventListener('click', () => {
  stopAutoPoll();
  showSection('otp');
  setFlowStep(4, 'active');
});

$('btnBack4')?.addEventListener('click', () => {
  showSection('inbox');
  setFlowStep(4, 'pending');
});

// ============================================================
// RESULT & RESET
// ============================================================
$('copyOtpCode').addEventListener('click', () => {
  const code = $('resultCode').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('Da copy ma OTP!', 'success'));
});

$('btnResetDemo')?.addEventListener('click', resetDemo);
$('btnNewDemo')?.addEventListener('click', resetDemo);

function resetDemo() {
  stopOtpPolling();
  stopAutoPoll();
  state.account = null;

  // Reset OTP section
  $('btnResetDemo')?.classList.add('hidden');
  $('btnStopOtp')?.classList.add('hidden');
  $('btnStartOtp')?.classList.remove('hidden');
  $('otpCodes').innerHTML = '<div class="otp-empty">Ma OTP se hien thi o day khi co email xac minh</div>';
  $('otpEmailCount').textContent = '0 email da kiem tra';
  $('otpWaitTime').textContent = '0s';

  // Reset flow
  setFlowStep(1, 'pending');
  $('emailAddress').textContent = '---';
  $('domainDisplay').textContent = '---';
  $('localPart').value = '';
  $('emailList').innerHTML = `
    <div class="email-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
      <p>Chua co email nao</p>
      <span>Email den se hien thi o day</span>
    </div>`;
  $('btnNextStep2').disabled = true;
  $('btnNextStep3').disabled = true;
  $('btnNextStep4').disabled = true;
  $('inboxEmailAddress').textContent = '---';

  showSection('config');
}

// ============================================================
// CLEAR LOG
// ============================================================
$('clearLog').addEventListener('click', clearLog);

// ============================================================
// INIT
// ============================================================
// Load saved config from localStorage
const savedUrl = localStorage.getItem('tmail_demo_api_url');
const savedKey = localStorage.getItem('tmail_demo_api_key');
if (savedUrl) $('apiUrl').value = savedUrl;
if (savedKey) $('apiKey').value = savedKey;

// Save config on change
$('apiUrl').addEventListener('change', e => localStorage.setItem('tmail_demo_api_url', e.target.value));
$('apiKey').addEventListener('change', e => localStorage.setItem('tmail_demo_api_key', e.target.value));

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $('emailModal').classList.add('hidden');
  }
});

// ============================================================
// COPY HELPERS
// ============================================================
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-copy]');
  if (btn) {
    navigator.clipboard.writeText(btn.dataset.copy).then(() => showToast('Da copy!', 'success'));
  }
});
