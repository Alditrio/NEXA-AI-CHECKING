/**
 * NEXA AI — Online Gambling Detection & Enforcement Engine
 * app.js  — Core Application Controller
 *
 * Modul Terintegrasi:
 *   1. SPA Navigation & Page Router (dashboard, enforcement, pipeline)
 *   2. Real-time SVG Trend Line Graph (hourly detection spikes)
 *   3. Ingest Fraud Simulator (POST /api/v1/ingest-fraud by Kemenkomdigi)
 *   4. PIN Otoritas Modal controller & multi-input focus stepping
 *   5. API Pipeline Matrix pings (latency testing & online badge checking)
 *   6. Core 8-step Enforcement Engine (Dukcapil NIK match, GNN model trace & mTLS parallel freeze)
 *   7. Centralized logs rendering (colored terminal & SQL transaction logging)
 */

'use strict';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GLOBAL STATE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const AppState = {
  currentPage: 'dashboard',
  enforcement: {
    running: false,
    reportId: null,
    startTime: null,
    aiResult: null,
    targetAccount: '',
    targetBank: '',
  },
  stats: {
    fundSaved: 14.7, // Rp Miliar
    blockedAccounts: 71,
    responseTime: 42, // Milliseconds
  },
  activeNodes: [],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONSTANTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const AI_MODEL_VERSION = 'NEXA-GNN-v3.1';

const GAMBLING_PATTERNS = [
  'Mutasi malam hari ganjil berulang (22:00–04:00)',
  'Smurfing: Rangkaian setoran kecil < Rp 2 juta beruntun',
  'Structuring: Pemecahan dana untuk menghindari threshold OJK',
  'Layering: Aliran transfer cepat antar bank digital < 3 menit',
  'Interaksi IP dengan server perjudian yurisdiksi lepas pantai',
  'Rekening terafiliasi dengan jaringan bandar siber terdata',
];

const BANK_LIST = {
  jago:    { name: 'Bank Jago',    code: '542', swift: 'ARTTIDJA' },
  bca:     { name: 'BCA',          code: '014', swift: 'CENAIDJA' },
  mandiri: { name: 'Bank Mandiri', code: '008', swift: 'BMRIIDJA' },
  bni:     { name: 'BNI',          code: '009', swift: 'BNINIDJA' },
  bri:     { name: 'BRI',          code: '002', swift: 'BRINIDJA' },
  cimb:    { name: 'CIMB Niaga',   code: '022', swift: 'BNIAIDJA' },
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DOM HELPER UTILITIES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const el  = id => document.getElementById(id);
const qs  = s  => document.querySelector(s);
const qsa = s  => document.querySelectorAll(s);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function now() {
  const d = new Date();
  return d.toLocaleTimeString('id-ID', { hour12: false }) + '.' + d.getMilliseconds().toString().padStart(3, '0');
}

function fmtIDR(n) {
  if (n >= 1e12) return `Rp ${(n/1e12).toFixed(2)} T`;
  if (n >= 1e9)  return `Rp ${(n/1e9).toFixed(2)} Miliar`;
  if (n >= 1e6)  return `Rp ${(n/1e6).toFixed(1)} Juta`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

/** Professional Notification Toasts */
function showToast(title, desc, type = 'blue') {
  const container = document.body;
  
  // Clean old toasts
  const activeToasts = qsa('.ojk-toast');
  activeToasts.forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'ojk-toast';
  
  // Custom borders mapping
  let borderLeftColor = 'var(--blue)';
  if (type === 'red') borderLeftColor = 'var(--red)';
  if (type === 'green') borderLeftColor = 'var(--green)';
  if (type === 'amber') borderLeftColor = 'var(--amber)';

  toast.style.cssText = `
    position: fixed; top: 70px; right: 20px; z-index: 300;
    background: #ffffff; border: 1px solid var(--border); border-left: 4px solid ${borderLeftColor};
    border-radius: var(--r1); padding: 10px 14px; box-shadow: var(--s2);
    display: flex; align-items: flex-start; gap: 10px; width: 320px;
    animation: slideUp 0.3s ease;
  `;
  
  toast.innerHTML = `
    <div style="flex:1;">
      <div style="font-size:11px;font-weight:700;color:var(--t1);">${title}</div>
      <div style="font-size:10px;color:var(--t2);margin-top:2px;line-height:1.4;">${desc}</div>
    </div>
    <button style="color:var(--t4);font-size:10px;font-weight:bold;cursor:pointer;background:transparent;border:none;" onclick="this.parentElement.remove()">X</button>
  `;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
}

/** Smooth Counters */
function animCount(elem, target, duration = 1000) {
  if (!elem) return;
  const start = parseFloat(elem.textContent.replace(/[^0-9.]/g, '')) || 0;
  const t0 = performance.now();
  const tick = t => {
    const p = Math.min((t - t0) / duration, 1);
    const ease = 1 - (1 - p) ** 3;
    const val = start + (target - start) * ease;
    
    if (elem.id === 'stat-flow') {
      elem.textContent = val.toFixed(2);
    } else {
      elem.textContent = Math.round(val).toLocaleString('id-ID');
    }
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SPA ROUTER & MENU NAVIGATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function navigate(pageId) {
  AppState.currentPage = pageId;

  // Swap page displays
  qsa('.page').forEach(p => p.classList.remove('active'));
  const page = el('page-' + pageId);
  if (page) page.classList.add('active');

  // Toggle sidebar list active flags
  qsa('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  // Init triggers
  if (pageId === 'dashboard') {
    refreshDashboard();
    setTimeout(() => renderTrendChart(), 100);
  }
  if (pageId === 'pipeline') renderSchemaPage();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CENTRAL LOG RENDERING
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function log(msg, type = 'info') {
  const terminal = el('terminal');
  if (!terminal) return;

  const row = document.createElement('div');
  row.className = 't-row';
  row.innerHTML = `
    <span class="t-ts">[${now()}]</span>
    <span class="t-msg t-${type}">${msg}</span>
  `;
  terminal.appendChild(row);
  
  // Cap at 100 logs to prevent lag, but keep it long enough for scrolling
  while (terminal.children.length > 100) {
    terminal.removeChild(terminal.firstChild);
  }
  
  terminal.scrollTop = terminal.scrollHeight;
}

function appendDbLog({ op, query, result, ts }) {
  const container = el('db-query-log');
  if (!container) return;

  const entry = document.createElement('div');
  entry.className = 'db-log-entry';

  const opClass = op === 'INSERT' ? 'op-insert' : op === 'SELECT' ? 'op-select' : 'op-update';
  entry.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <span class="db-op-tag ${opClass}">${op}</span>
      <span style="font-size:9px;color:var(--t4);">${ts}</span>
    </div>
    <div class="db-query-text">${escHtml(query)}</div>
    <div class="db-result-text">&rarr; ${escHtml(result)}</div>
  `;
  container.prepend(entry);
  while (container.children.length > 25) container.lastChild.remove();
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 1: DASHBOARD REAL-TIME SVG LINE CHART
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderTrendChart() {
  const svg = el('trend-chart');
  if (!svg) return;

  svg.innerHTML = '';
  const data = [12, 28, 18, 45, 62, 38, 72, 54, 88, 92]; // Hourly suspected GNN Mule account count spikes
  const labels = ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', 'Lokal'];
  
  const width = svg.clientWidth || 500;
  const height = 280; // Taller for vertical layout
  
  const padding = { left: 40, right: 20, top: 20, bottom: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Grid dashed lines
  const ticks = 5;
  for (let i = 0; i <= ticks; i++) {
    const y = padding.top + (chartH * i) / ticks;
    const gridY = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    gridY.setAttribute('x1', padding.left);
    gridY.setAttribute('y1', y);
    gridY.setAttribute('x2', width - padding.right);
    gridY.setAttribute('y2', y);
    gridY.setAttribute('stroke', '#f1f5f9');
    gridY.setAttribute('stroke-width', '1');
    gridY.setAttribute('stroke-dasharray', '4, 4');
    svg.appendChild(gridY);
  }

  // Draw plot points
  const points = data.map((val, idx) => {
    const x = padding.left + (chartW * idx) / (data.length - 1);
    const y = padding.top + chartH - (chartH * val) / 100;
    return { x, y, val };
  });

  // Area under the line (polygon)
  const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  const dArea = points.map(p => `${p.x},${p.y}`).join(' ') + ` ${points[points.length-1].x},${padding.top + chartH} ${points[0].x},${padding.top + chartH}`;
  areaPath.setAttribute('points', dArea);
  areaPath.setAttribute('fill', 'rgba(37, 99, 235, 0.05)');
  svg.appendChild(areaPath);

  // Line path
  const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const dLine = 'M ' + points.map(p => `${p.x} ${p.y}`).join(' L ');
  linePath.setAttribute('d', dLine);
  linePath.setAttribute('fill', 'none');
  linePath.setAttribute('stroke', 'var(--blue)');
  linePath.setAttribute('stroke-width', '2');
  svg.appendChild(linePath);

  // Nodes & labels
  points.forEach((p, i) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', p.x);
    circle.setAttribute('cy', p.y);
    circle.setAttribute('r', '3.5');
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', 'var(--blue)');
    circle.setAttribute('stroke-width', '2');
    
    // Simple SVG tooltip indicator
    circle.addEventListener('mouseenter', () => {
      circle.setAttribute('r', '5.5');
      circle.setAttribute('fill', 'var(--blue)');
    });
    circle.addEventListener('mouseleave', () => {
      circle.setAttribute('r', '3.5');
      circle.setAttribute('fill', '#ffffff');
    });

    svg.appendChild(circle);

    // X-Axis labels
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', p.x);
    text.setAttribute('y', height - 8);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'var(--t3)');
    text.setAttribute('font-size', '10px');
    text.setAttribute('font-family', 'Inter');
    text.textContent = labels[i];
    svg.appendChild(text);
  });
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 1: SIMULASI INGEST FRAUD (POST /api/v1/ingest-fraud)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function triggerIngestFraudSimulation() {
  // Generate random suspected mule accounts
  const accs = ['9921008432', '3104998421', '5540023412', '7730991823', '1102984124'];
  const banks = ['BCA (014)', 'Bank Jago (542)', 'Mandiri (008)', 'BNI (009)', 'BRI (002)', 'CIMB Niaga (022)'];
  const flowVal = Math.floor(Math.random() * 850e6 + 150e6); // Rp 150M - Rp 1M

  const pickedAcc = accs[Math.floor(Math.random() * accs.length)] + Math.floor(Math.random()*10);
  const pickedBank = banks[Math.floor(Math.random() * banks.length)];

  // Inject into dashboard feed
  const newRow = {
    account: pickedAcc,
    bank: pickedBank,
    amount: flowVal,
    ai: Math.floor(Math.random() * 15 + 80), // 80%-95%
    status: 'suspected',
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };

  // Log in Postgres Live log
  supabase.insertDetectedAccount({
    account_number: pickedAcc,
    bank_code: 'FRAUD_API',
    bank_name: pickedBank,
    holder_name: 'Mule Account Suspect (Ingest)',
    risk_score: +(newRow.ai / 100).toFixed(2),
    total_flow_idr: flowVal,
    reported_by: 'Kemenkomdigi API Portal',
  });

  // Display Notification Toast
  showToast(
    'POST /api/v1/ingest-fraud',
    `Ingest sukses: Rekening ${pickedAcc} @ ${pickedBank} terindikasi mule. Ditambahkan ke antrean.`,
    'blue'
  );

  refreshDashboard();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 2: SECURITY PIN VERIFICATION MODAL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function openAuthenticationModal() {
  const account = el('input-account')?.value?.trim();
  if (!account || account.length < 6) {
    showToast('Validasi Gagal', 'Harap masukkan nomor rekening target minimal 6 digit.', 'red');
    return;
  }

  // Clear previous PIN values
  const inputs = qsa('#pin-container input');
  inputs.forEach(i => i.value = '');
  el('pin-error').style.display = 'none';

  // Toggle modal display
  const m = el('pin-modal');
  if (m) {
    m.style.display = 'flex';
    inputs[0].focus();
  }
}

function closePinModal() {
  const m = el('pin-modal');
  if (m) m.style.display = 'none';
}

function stepPinInput(input, index) {
  if (input.value.length === 1 && index < 5) {
    qsa('#pin-container input')[index + 1].focus();
  }
}

function confirmPin() {
  const inputs = qsa('#pin-container input');
  let pin = '';
  inputs.forEach(i => pin += i.value);

  // Simulated authorized pin: 123456 or 000000 or anything bypasses
  if (pin.length === 6) {
    closePinModal();
    // Pemicu core enforcement penindakan
    startEnforcementSequence();
  } else {
    el('pin-error').style.display = 'block';
  }
}

// Bypasses fingerprint click
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && el('pin-modal').style.display === 'flex') {
    confirmPin();
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   GRAPH & UI CONTROL HELPERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function setProgress(pct) {
  const pfill = el('progress-bar-fill');
  const ppct = el('progress-pct');
  if (pfill) pfill.style.width = pct + '%';
  if (ppct) ppct.textContent = pct + '%';
  
  if (pct > 0 && pct < 100) {
    el('progress-wrap').style.display = 'block';
  } else {
    setTimeout(() => {
      if (el('progress-wrap')) el('progress-wrap').style.display = 'none';
    }, 500);
  }
}

function showNode(id) {
  const n = el(id);
  if (n) {
    n.classList.remove('hidden');
    AppState.activeNodes.push(id);
    drawEdges();
  }
}

function resetNodes() {
  AppState.activeNodes.forEach(id => {
    const n = el(id);
    if (n) n.classList.add('hidden');
  });
  AppState.activeNodes = [];
  const svg = el('viz-svg');
  if (svg) svg.innerHTML = '';
}

function drawEdges() {
  const svg = el('viz-svg');
  if (!svg) return;
  svg.innerHTML = '';
  
  const main = el('node-main');
  const mainRect = main.getBoundingClientRect();
  const vizRect = el('viz-area').getBoundingClientRect();
  
  const x1 = mainRect.left - vizRect.left + mainRect.width/2;
  const y1 = mainRect.top - vizRect.top + mainRect.height/2;

  AppState.activeNodes.forEach(id => {
    const node = el(id);
    const nRect = node.getBoundingClientRect();
    const x2 = nRect.left - vizRect.left + nRect.width/2;
    const y2 = nRect.top - vizRect.top + nRect.height/2;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', id === 'node-3' ? 'var(--green)' : 'var(--blue)');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '4, 4');
    
    const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    anim.setAttribute('attributeName', 'stroke-dashoffset');
    anim.setAttribute('values', '20;0');
    anim.setAttribute('dur', '1s');
    anim.setAttribute('repeatCount', 'indefinite');
    line.appendChild(anim);

    svg.appendChild(line);
  });
}

function genReportId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let str = 'OJK-ENF-';
  for(let i=0; i<8; i++) str += chars.charAt(Math.floor(Math.random() * chars.length));
  return str;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 2: CORE 8-STAGE ENFORCEMENT & API HANDSHAKES
   (MAXIMUM REAL-TIME ANALOGY)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function startEnforcementSequence() {
  if (AppState.enforcement.running) return;

  const accountInput = el('input-account');
  const bankInput    = el('input-bank');
  const account = accountInput?.value?.trim();
  const bankName = bankInput?.value?.trim() || 'Bank Tidak Diketahui';

  // ── Init state variables ──
  AppState.enforcement.running = true;
  AppState.enforcement.reportId = genReportId();
  AppState.enforcement.startTime = Date.now();
  AppState.enforcement.targetAccount = account;
  AppState.enforcement.targetBank = bankName;
  AppState.activeNodes = [];

  const btn = el('btn-execute');
  btn.classList.add('running');
  btn.disabled = true;
  btn.querySelector('span span').textContent = 'EXECUTING PARALLEL THREADS...';
  btn.querySelector('.execute-btn-sub').textContent = 'mTLS HANDSHAKE IN PROGRESS';

  el('terminal').innerHTML = '';
  resetNodes();
  el('success-overlay').style.display = 'none';
  setProgress(0);
  
  el('pattern-list').innerHTML = '<div style="font-size:11px;color:var(--t3);text-align:center;padding:12px 0;">Menghitung vektor pola...</div>';

  const totalFlow = Math.floor(Math.random() * 2.5e9 + 1.2e9); // Rp 1.2M - Rp 3.7M
  const flowValEl = el('viz-flow-val');
  if (flowValEl) flowValEl.textContent = fmtIDR(totalFlow);

  log('══════════ OJK CORE CYBER-GATEWAY v3.1.9-rc2 ══════════', 'info');
  log(`Operator         : SYSTEM/SUPERINTENDENT`, 'info');
  log(`Report Hash ID   : ${AppState.enforcement.reportId}`, 'info');
  log(`Target Node      : ${account} @ ${bankName}`, 'info');
  log(`Crypto Handshake : TLS 1.3 / ECDHE-RSA-AES256-GCM-SHA384`, 'info');
  log('────────────────────────────────────────────────────────────', 'info');

  // ── Step 1: Handshake and ingest check (Very Fast) ──
  await sleep(100);
  log('[mTLS] Exchange public key with Kemenkomdigi Fraud Registry API...', 'info');
  await sleep(50);
  log('[mTLS] Certificate chain verified. Payload signature: OK', 'success');
  log('[INGEST] POST /api/v1/ingest-fraud parsing JSON byte-stream...', 'info');
  setProgress(10);
  await sleep(150);
  log('[INGEST] Deserialization complete. Risk coefficient exceeds threshold.', 'error');

  // ── Step 2: GET Dukcapil NIK (Identity Resolution) ──
  log(`[HTTP GET] Resolving identity via VPN-tunnel: /api/v1/identity-resolution?acc=${account}`, 'info');
  await sleep(200);
  log(`[BGP ROUTE] Tracing ASN path to Core Dukcapil 203.119.xxx.xx...`, 'info');
  setProgress(24);
  await sleep(300);
  
  const simulatedNik = '317409240889' + Math.floor(1000 + Math.random()*9000);
  log(`[Dukcapil ASN-291] NIK Resolved: ${simulatedNik}`, 'success');
  log(`[KYC Match] Owner: PT Digital Indonesia Sejahtera (Score: 0.992)`, 'success');
  
  el('viz-nik-val').textContent = `NIK: ${simulatedNik}`;

  // Insert target into public.detected_accounts
  await supabase.insertDetectedAccount({
    account_number: account, bank_code: 'EXT', bank_name: bankName,
    holder_name: 'PT Digital Indonesia Sejahtera',
    risk_score: 0.94, total_flow_idr: totalFlow,
    reported_by: 'OJK Central Authority',
  });

  // ── Step 3: POST /api/v1/graph-trace GNN Inference (Intense) ──
  setProgress(38);
  log(`[GNN Model] Invoking Neural Network: tensor allocation 4096MB...`, 'ai');
  await sleep(100);
  log(`[GNN Model] Forward propagation on 1.4 million graph edges...`, 'ai');
  await sleep(150);
  log(`[GNN Model] Computing Graph Isomorphism anomalies for NIK: ${simulatedNik}...`, 'ai');
  
  // Fake AI Analysis
  let conf = 0;
  const confEl = el('conf-val');
  const confRing = el('conf-ring');
  
  // Fast counter animation for AI score
  for(let i=0; i<=20; i++) {
    conf = Math.floor(i * 4.7);
    if(confEl) confEl.textContent = conf + '%';
    if(confRing) confRing.style.setProperty('--pct', conf);
    await sleep(20);
  }
  
  const aiResult = {
    gambling: 0.94,
    patterns: [
      'Layering lintas bank digital dalam < 3 menit',
      'Smurfing: 1,420 setoran mikro beruntun',
      'IP Relocation BGP routing ke Kamboja (ASN 45293)'
    ]
  };
  AppState.enforcement.aiResult = aiResult;
  
  log(`[GNN Model] Clustering complete. Found 3 isomorphic mule nodes. Confidence: 94%`, 'success');
  
  // Populate Patterns Matched
  const patList = el('pattern-list');
  if (patList) {
    patList.innerHTML = aiResult.patterns.map(p => `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--red);font-weight:bold;margin-top:2px;">></span>
        <span style="font-family:'JetBrains Mono', monospace; font-size:10px;">${p}</span>
      </div>
    `).join('');
  }

  // ── Step 4: POST /api/v1/broadcast-freeze (Primary account) ──
  await sleep(200);
  log(`[HTTP POST] /api/v1/broadcast-freeze (Initiating TCP handshake with ${bankName})`, 'info');
  setProgress(50);
  await sleep(250);
  log(`[mTLS] Encrypting payload with ECDHE-RSA... Sent 1420 bytes.`, 'info');
  log(`[CORE] ${bankName} executed SQL DROP access privileges for ${account}.`, 'error');
  await supabase.freezeAccount(account);

  AppState.stats.blockedAccounts += 1;
  animCount(el('stat-blocked'), AppState.stats.blockedAccounts);

  // ── Step 5: Freeze Node 1 (BCA) ──
  setProgress(64);
  log('[PARALLEL-1] Routing instruction to BCA Core Gateway...', 'info');
  await sleep(150);
  log('[PARALLEL-1] TCP Window Scaling applied. Latency: 12ms', 'info');
  const n1acct = '8830112244';
  log(`[PARALLEL-1] Node 1 (BCA ${n1acct}) Hard-Frozen via API.`, 'success');
  showNode('node-1');

  await supabase.insertTransactionFlow({
    source: account, dest: n1acct,
    amount: 1240000000, type: 'BI_FAST',
    patterns: ['Layering mendadak'],
  });
  AppState.stats.blockedAccounts += 1;

  // ── Step 6: Freeze Node 2 (BNI) ──
  setProgress(78);
  log('[PARALLEL-2] Routing instruction to BNI Core Gateway...', 'info');
  await sleep(150);
  log('[PARALLEL-2] Bypass firewall IPS signatures...', 'warning');
  const n2acct = '1120098443';
  log(`[PARALLEL-2] Node 2 (BNI ${n2acct}) Hard-Frozen via API.`, 'success');
  showNode('node-2');

  await supabase.insertTransactionFlow({
    source: n1acct, dest: n2acct,
    amount: 870000000, type: 'SKN',
    patterns: ['Pemecahan nominal'],
  });
  AppState.stats.blockedAccounts += 1;

  // ── Step 7: Suspensi Node 3 (Mandiri) ──
  setProgress(90);
  log('[PARALLEL-3] Routing instruction to Mandiri Core Gateway...', 'info');
  await sleep(150);
  const n3acct = '7741003312';
  log(`[PARALLEL-3] Node 3 (Mandiri ${n3acct}) shadow-banned (Traced).`, 'success');
  showNode('node-3');

  await supabase.insertTransactionFlow({
    source: n2acct, dest: n3acct,
    amount: 560000000, type: 'Virtual_Account',
    patterns: ['Mule account detection'],
  });
  
  animCount(el('stat-blocked'), AppState.stats.blockedAccounts);

  // ── Step 8: Finalize Compliance ──
  await sleep(200);
  setProgress(100);
  log('────────────────────────────────────────────────────────────', 'info');
  log('Generating cryptographic hash for enforcement compliance...', 'info');
  await sleep(200);

  await supabase.insertEnforcementLog({
    report_id: AppState.enforcement.reportId,
    target: account, nodes_blocked: 4,
    total_flow: totalFlow,
    ai_confidence: aiResult.gambling,
  });
  log(`[DB] Syncing transaction WAL logs to public.enforcement_logs...`, 'db');

  AppState.stats.fundSaved += (totalFlow / 1e9);
  animCount(el('stat-flow'), AppState.stats.fundSaved);

  const elapsed = ((Date.now() - AppState.enforcement.startTime) / 1000).toFixed(2);
  log(`═══ MASS FREEZE COMPILED | EXECUTED IN ${elapsed}s | 4 NODES NEUTRALIZED ═══`, 'success');

  // Trigger Success Overlay
  const overlay = el('success-overlay');
  if (overlay) {
    overlay.style.display = 'block';
    el('success-report-id').textContent = AppState.enforcement.reportId;
    el('success-nodes').textContent = '4 Node';
    el('success-flow').textContent = fmtIDR(totalFlow);
  }

  // Reset button state
  btn.classList.remove('running');
  btn.disabled = false;
  btn.querySelector('span span').textContent = 'TRIGGER MASS TEMPORARY FREEZE';
  btn.querySelector('.execute-btn-sub').textContent = 'Keamanan Ganda: PIN Otoritas';

  AppState.enforcement.running = false;
  
  refreshDashboard();
}

function resetEnforcementPanel() {
  resetNodes();
  el('success-overlay').style.display = 'none';
  el('viz-nik-val').textContent = 'NIK: Unresolved';
  el('viz-flow-val').textContent = 'Rp 0.00 Miliar';
  el('terminal').innerHTML = '<div class="t-row"><span class="t-ts">['+now()+']</span><span class="t-msg t-info">SYSTEM READY — Awaiting Operator Input...</span></div>';
  el('pattern-list').innerHTML = '<div style="font-size:11px;color:var(--t3);text-align:center;padding:12px 0;">Belum ada pola anomali terdeteksi.</div>';
  
  const confEl = el('conf-val');
  const confRing = el('conf-ring');
  if(confEl) confEl.textContent = '—';
  if(confRing) confRing.style.setProperty('--pct', 0);
  
  setProgress(0);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 2: BULK DATASET INGESTION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    el('input-bulk').value = text;
    const linesCount = text.split('\n').filter(l => l.trim().length > 0).length;
    showToast('Dataset Dimuat', `File ${file.name} (${linesCount} baris) berhasil dimuat. Siap diproses.`, 'blue');
  };
  reader.readAsText(file);
}

async function processBulkDataset() {
  const bulkText = el('input-bulk')?.value?.trim();
  if (!bulkText) {
    showToast('Validasi Gagal', 'Dataset kosong. Mohon masukkan data rekening.', 'red');
    return;
  }

  const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return;

  if (AppState.enforcement.running) return;
  AppState.enforcement.running = true;

  el('terminal').innerHTML = '';
  setProgress(0);
  
  log('══════════ BATCH PROCESSING INITIATED ══════════', 'info');
  log(`Found ${lines.length} lines in dataset. Analyzing structure...`, 'info');
  
  // Detect dataset type
  let datasetType = 'unknown';
  let hasHeader = false;
  
  const firstLine = lines[0];
  const secondLine = lines[1] || '';
  
  if (firstLine.includes('Source_Account') || firstLine.includes('Destination_Account') || firstLine.includes('Amount_IDR')) {
    datasetType = 'transaction';
    hasHeader = true;
  } else if (firstLine.includes('Account_Number') || firstLine.includes('Bank_Name')) {
    datasetType = 'account';
    hasHeader = true;
  } else if (firstLine.includes('[PATTERN]') || firstLine.includes('activity between') || secondLine.includes('[PATTERN]')) {
    datasetType = 'pattern';
  } else {
    // If no explicit header, check content structure of first non-empty line
    const parts = firstLine.split(',');
    if (parts.length >= 4) {
      datasetType = 'transaction';
    } else if (parts.length === 2) {
      datasetType = 'account';
    } else {
      datasetType = 'pattern';
    }
  }
  
  log(`Structure detected: ${datasetType.toUpperCase()} dataset.`, 'info');
  
  const startIndex = hasHeader ? 1 : 0;
  const dataLines = lines.slice(startIndex);
  let successCount = 0;
  
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    setProgress(Math.round(((i + 1) / dataLines.length) * 100));
    
    // Parse CSV line with quotes support (e.g. for amounts like "Rp 150.000.000")
    let parts = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());
    
    if (datasetType === 'account') {
      const acc = parts[0];
      const bank = parts[1] || 'Bank Tidak Diketahui';
      if (!acc) continue;
      
      log(`[BATCH ${i+1}/${dataLines.length}] Ingesting Account: ${acc} @ ${bank}`, 'info');
      await sleep(25);
      
      const risk = 0.85 + (Math.random() * 0.14);
      const flow = Math.floor(Math.random() * 1.5e9 + 5e8);
      
      await supabase.insertDetectedAccount({
        account_number: acc, bank_code: 'EXT', bank_name: bank,
        holder_name: 'Identitas Tersamarkan (Batch)',
        risk_score: risk, total_flow_idr: flow,
        reported_by: 'Mass Upload API (Akun)',
      });
      await supabase.freezeAccount(acc);
      
      log(`[BATCH ${i+1}/${dataLines.length}] > Account ${acc} registered as suspected. Status updated to FROZEN.`, 'error');
      AppState.stats.blockedAccounts += 1;
      AppState.stats.fundSaved += (flow / 1e9);
      successCount++;
      
    } else if (datasetType === 'transaction') {
      const src = parts[0];
      const dest = parts[1];
      const amountStr = parts[2];
      const time = parts[3] || new Date().toISOString();
      
      if (!src || !dest) continue;
      
      // Parse currency amount
      let amount = 100000000;
      if (amountStr) {
        const cleanStr = amountStr.replace(/Rp/gi, '').replace(/\./g, '').replace(/,/g, '').trim();
        amount = parseInt(cleanStr) || 100000000;
      }
      
      log(`[BATCH ${i+1}/${dataLines.length}] Ingesting Transaction: ${src} -> ${dest} (${amountStr || fmtIDR(amount)})`, 'info');
      await sleep(25);
      
      // Insert Transaction Flow
      await supabase.insertTransactionFlow({
        source: src,
        dest: dest,
        amount: amount,
        type: 'BI_FAST',
        patterns: ['Layering Massal (Batch)'],
      });
      
      // Register & Freeze Source
      await supabase.insertDetectedAccount({
        account_number: src, bank_code: 'EXT', bank_name: 'Bank Terlapor (Source)',
        holder_name: 'Identitas Tersamarkan (Batch)',
        risk_score: 0.92, total_flow_idr: amount,
        reported_by: 'Mass Upload API (Transaksi)',
      });
      await supabase.freezeAccount(src);
      
      // Register & Freeze Destination
      await supabase.insertDetectedAccount({
        account_number: dest, bank_code: 'EXT', bank_name: 'Bank Terlapor (Dest)',
        holder_name: 'Identitas Tersamarkan (Batch)',
        risk_score: 0.88, total_flow_idr: amount,
        reported_by: 'Mass Upload API (Transaksi)',
      });
      await supabase.freezeAccount(dest);
      
      log(`[BATCH ${i+1}/${dataLines.length}] > Transaction flow logged. Accounts ${src} & ${dest} FROZEN.`, 'error');
      
      AppState.stats.blockedAccounts += 2;
      AppState.stats.fundSaved += (amount / 1e9);
      successCount++;
      
    } else if (datasetType === 'pattern') {
      // Find 10-digit account numbers in log
      const accounts = line.match(/\b\d{10}\b/g) || [];
      if (accounts.length === 0) continue;
      
      const primaryAcc = accounts[0];
      const secondaryAcc = accounts[1] || randomAccount();
      
      log(`[BATCH ${i+1}/${dataLines.length}] Parsing Anomaly Pattern: ${line.substring(0, 50)}...`, 'info');
      await sleep(25);
      
      // Insert AI analysis log
      await supabase.insertAiAnalysis({
        target: primaryAcc,
        gambling: 0.95,
        layering: 0.90,
        structuring: 0.85,
        smurfing: 0.80,
        patterns: [line],
        model: 'NEXA-GNN-v3.1',
      });
      
      // Register & Freeze account
      const flow = Math.floor(Math.random() * 800000000 + 200000000);
      await supabase.insertDetectedAccount({
        account_number: primaryAcc, bank_code: 'EXT', bank_name: 'Bank Terlapor (AI Pattern)',
        holder_name: 'Identitas Tersamarkan (Batch)',
        risk_score: 0.96, total_flow_idr: flow,
        reported_by: 'Mass Upload API (Pola)',
      });
      await supabase.freezeAccount(primaryAcc);
      
      // Insert transaction flow for relation if secondary account found
      if (accounts[1]) {
        await supabase.insertTransactionFlow({
          source: primaryAcc,
          dest: secondaryAcc,
          amount: flow,
          type: 'BI_FAST',
          patterns: [line],
        });
        
        await supabase.insertDetectedAccount({
          account_number: secondaryAcc, bank_code: 'EXT', bank_name: 'Bank Terlapor (AI Pattern)',
          holder_name: 'Identitas Tersamarkan (Batch)',
          risk_score: 0.89, total_flow_idr: flow,
          reported_by: 'Mass Upload API (Pola)',
        });
        await supabase.freezeAccount(secondaryAcc);
        AppState.stats.blockedAccounts += 1;
      }
      
      log(`[BATCH ${i+1}/${dataLines.length}] > GNN anomaly mapped to target ${primaryAcc}. Status updated to FROZEN.`, 'error');
      
      AppState.stats.blockedAccounts += 1;
      AppState.stats.fundSaved += (flow / 1e9);
      successCount++;
    }
  }
  
  animCount(el('stat-blocked'), AppState.stats.blockedAccounts);
  animCount(el('stat-flow'), AppState.stats.fundSaved);
  
  log('══════════ BATCH PROCESSING COMPLETE ══════════', 'success');
  log(`Successfully processed and synced ${successCount} entries to Supabase tables.`, 'success');
  
  showToast('Bulk Ingest Selesai', `Berhasil memproses & mencatat ${successCount} anomali ke database.`, 'green');
  
  el('input-bulk').value = '';
  AppState.enforcement.running = false;
  refreshDashboard();
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 3: INTEGRASI & API PIPELINE HEALTH CHECKS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function pingAllApiPipelines() {
  showToast('mTLS Ping Integrator', 'Melakukan pengecekan latensi endpoint API eksternal secara asinkron...', 'blue');
  
  const tbody = el('api-pipeline-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  for (let row of rows) {
    const tdLatency = row.cells[3];
    const tdStatus = row.cells[2];
    
    // Add pulsing state
    tdLatency.style.opacity = '0.5';
    tdLatency.textContent = 'pinging...';
    
    await sleep(50 + Math.random() * 50); // random response delay (very fast)
    
    const newLatency = Math.floor(Math.random() * 30 + 15); // 15ms - 45ms
    tdLatency.textContent = `${newLatency} ms`;
    tdLatency.style.opacity = '1';
    tdLatency.style.color = 'var(--green)';

    tdStatus.innerHTML = `<span class="tag tag-green">ONLINE</span>`;
  }

  showToast('mTLS Ping Sukses', 'Seluruh pipa integrasi API (Dukcapil, Komdigi, GNN, & 6 Bank) merespon 200 OK.', 'green');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DOWNLOAD TXT REPORT EXPORTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function downloadReport() {
  const account  = el('input-account')?.value || '-';
  const bankName = el('input-bank')?.value || 'Bank Tidak Diketahui';
  const ai       = AppState.enforcement.aiResult;
  const elapsed  = AppState.enforcement.startTime
    ? ((Date.now() - AppState.enforcement.startTime)/1000).toFixed(1) + 's' : '-';

  const lines = [
    '==============================================================',
    '        NEXA AI — DOKUMENcompliance PENINDAKAN MASAL OJK      ',
    '==============================================================',
    '',
    `Nomor Laporan ID : ${AppState.enforcement.reportId || '-'}`,
    `Tanggal Audit    : ${new Date().toLocaleString('id-ID')}`,
    `Operator Penguji : OJK Central Superintendent Gateway`,
    `Protokol Sandi   : TLS 1.3 mTLS Core API Gateway`,
    '',
    '── REKENING TARGET UTAMA ──────────────────────────────────────',
    `Nomor Rekening   : ${account}`,
    `Bank / Institusi : ${bankName}`,
    `Status Tindakan  : PEMBLOKIRAN MASSAL BERHASIL (FROZEN)`,
    `Estimasi Aliran  : ${fmtIDR(AppState.stats.fundSaved * 1e9)}`,
    '',
    '── GRAPH NEURAL NETWORK INFERENCE (NIK MATCH) ─────────────────',
    `Versi Model AI   : ${AI_MODEL_VERSION} (GNN Heuristic Cluster)`,
    `Probabilitas GNN : ${ai ? (ai.gambling*100).toFixed(1)+'%' : '-'}`,
    `Pola Terdeteksi  :`,
    ...(ai?.patterns || ['(tidak ditemukan data pola)']).map(p => `  [x] ${p}`),
    '',
    '── PENYITAAN NODE KLASTER (MULE ACCOUNTS) ─────────────────────',
    `Node 1: BCA 8830112244     — BLOKIR PIPELINE 200 OK`,
    `Node 2: BNI 1120098443     — BLOKIR PIPELINE 200 OK`,
    `Node 3: Mandiri 7741003312 — SUSPENSI PIPELINE 200 OK`,
    '',
    '── INTEGRASI API TERKAIT ──────────────────────────────────────',
    '  - API Ditjen Dukcapil (Resolusi Identitas NIK)',
    '  - API CekRekening.id (Kemenkomdigi Fraud Ingest)',
    '  - API Core-banking BCA, BNI, Mandiri (mTLS Broadcast)',
    '',
    'Laporan compliance ini bersifat RAHASIA NEGARA (CONFIDENTIAL) dan',
    'diarsipkan otomatis di database public.enforcement_logs.',
    '',
    '==============================================================',
    '      NEXA AI | OJK INDONESIA | PENINDAKAN JUDI ONLINE        ',
    '==============================================================',
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${AppState.enforcement.reportId || 'NEXA-COMPLIANCE-REPORT'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function dismissBanner() {
  const o = el('success-overlay');
  if (o) o.style.display = 'none';
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DASHBOARD REFRESH
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const DUMMY_DETECTIONS = [
  { account: '9981002341', bank: 'BCA (014)',     amount: 2400000000, ai: 94, status: 'frozen',    time: '21:42' },
  { account: '3310094812', bank: 'Mandiri (008)', amount: 870000000,  ai: 88, status: 'suspected', time: '19:07' },
  { account: '5540023198', bank: 'BNI (009)',     amount: 1100000000, ai: 91, status: 'frozen',    time: '17:33' },
  { account: '7723001192', bank: 'BRI (002)',     amount: 540000000,  ai: 76, status: 'suspected', time: '14:11' },
  { account: '1102003456', bank: 'CIMB (022)',    amount: 320000000,  ai: 82, status: 'frozen',    time: '10:55' },
];

function refreshDashboard() {
  // Sync counter cards
  animCount(el('stat-flow'), AppState.stats.fundSaved);
  animCount(el('stat-blocked'), AppState.stats.blockedAccounts);
  animCount(el('stat-suspected'), AppState.stats.responseTime);

  const feed = el('detection-feed');
  if (!feed) return;

  const allDetections = [
    ...Store.detected_accounts.map(d => ({
      account: d.account_number,
      bank: `${d.bank_name} (${d.bank_code})`,
      amount: d.total_flow_idr,
      ai: Math.round((d.risk_score || 0.9) * 100),
      status: d.status,
      time: new Date(d.detected_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    })),
    ...DUMMY_DETECTIONS,
  ].slice(0, 5);

  feed.innerHTML = allDetections.map(d => `
    <div class="feed-item">
      <div class="feed-ico" style="background:${d.status==='frozen' ? 'var(--red-bg)' : 'var(--amber-bg)'};">
        <span style="font-size:14px;color:${d.status==='frozen' ? 'var(--red)' : 'var(--amber)'}; font-weight:bold;">
          ${d.status === 'frozen' ? 'X' : '!'}
        </span>
      </div>
      <div class="feed-info">
        <div class="feed-acct">${d.account}</div>
        <div class="feed-bank">${d.bank}</div>
      </div>
      <div class="feed-right">
        <div class="feed-amount">${fmtIDR(d.amount)}</div>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:2px;">
          <span class="tag ${d.status === 'frozen' ? 'tag-red' : 'tag-amber'}" style="font-size:8px;padding:1px 4px;">
            ${d.status === 'frozen' ? 'DIBEKUKAN' : 'DICURIGAI'}
          </span>
          <span class="feed-time">${d.time}</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 3: RENDER POSTGRES DB SCHEMA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function renderSchemaPage() {
  const container = el('schema-tables');
  if (!container || container.dataset.rendered) return;
  container.dataset.rendered = '1';

  container.innerHTML = Object.entries(DB_SCHEMA).map(([tbl, cols]) => `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-head">
        <div class="card-title">
          public.${tbl}
        </div>
        <span class="tag tag-blue">${cols.length} kolom</span>
      </div>
      <div class="card-body" style="padding:0;">
        <table class="schema-tbl">
          <thead>
            <tr>
              <th>Kolom</th>
              <th>Tipe Data</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${cols.map(c => `
              <tr>
                <td>${c.col}</td>
                <td>${c.type}</td>
                <td>${c.note || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `).join('');
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SYSTEM CLOCK & INIT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function startClock() {
  const clk = el('live-clock');
  if (!clk) return;
  const tick = () => {
    clk.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) + ' WIB';
  };
  tick();
  setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', () => {

  // Bind nav click listeners
  qsa('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.page) navigate(item.dataset.page);
    });
  });

  // DB Logs listener
  onDbLog(entry => appendDbLog(entry));

  // Sync inputs dynamically
  el('input-account')?.addEventListener('input', e => {
    const a = el('viz-main-acct');
    if (a) a.textContent = e.target.value || '—';
  });
  el('input-bank')?.addEventListener('input', e => {
    const b = el('viz-main-bank');
    if (b) b.textContent = e.target.value || '';
  });

  // Start clock
  startClock();

  // Load default stats
  AppState.stats = { fundSaved: 14.72, blockedAccounts: 71, responseTime: 18 };

  // Go to default dashboard screen
  navigate('dashboard');

  // Trigger counters slides
  setTimeout(() => {
    animCount(el('stat-flow'), 14.72);
    animCount(el('stat-blocked'), 71);
    animCount(el('stat-suspected'), 18);
  }, 200);

  // Setup initial terminal logs
  resetEnforcementPanel();

  // Setup dataset size select listener
  const dsSizeEl = el('ds-size');
  const dsRowsEl = el('ds-rows');
  if (dsSizeEl && dsRowsEl) {
    dsSizeEl.addEventListener('change', () => {
      const val = dsSizeEl.value;
      if (val === 'small') {
        dsRowsEl.value = 100;
        dsRowsEl.disabled = true;
      } else if (val === 'medium') {
        dsRowsEl.value = 500;
        dsRowsEl.disabled = true;
      } else if (val === 'large') {
        dsRowsEl.value = 1000;
        dsRowsEl.disabled = true;
      } else if (val === 'custom') {
        dsRowsEl.disabled = false;
      }
    });
    // Set initial state
    dsRowsEl.disabled = (dsSizeEl.value !== 'custom');
  }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 4: ADMIN MANAGEMENT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function registerNewAdmin() {
  const name = el('adm-name')?.value?.trim();
  const agency = el('adm-agency')?.value;
  const opid = el('adm-opid')?.value?.trim();
  const role = el('adm-role')?.value;
  const pin = el('adm-pin')?.value?.trim();

  if (!name || !opid || !pin) {
    showToast('Validasi Gagal', 'Mohon lengkapi seluruh form (Nama, ID, dan PIN) sebelum menyimpan.', 'red');
    return;
  }
  if (pin.length !== 6) {
    showToast('Validasi PIN', 'PIN Otorisasi harus tepat 6 digit.', 'amber');
    return;
  }

  showToast('Memproses Pendaftaran', 'Mensinkronisasi data ke Supabase API...', 'blue');
  
  await supabase.insertAdmin({
    name, agency, operator_id: opid, authority_level: role, pin
  });

  showToast('Registrasi Berhasil', 'Akun operator baru berhasil didaftarkan ke sistem.', 'green');
  
  // Clear form
  el('adm-name').value = '';
  el('adm-opid').value = '';
  el('adm-pin').value = '';

  refreshAdmins();
}

async function refreshAdmins() {
  const tbody = el('admins-tbody');
  if (!tbody) return;

  const { data } = await supabase.getAdmins();
  if (data && data.length > 0) {
    tbody.innerHTML = data.map(au => `
      <tr>
        <td style="font-weight:600;color:var(--t1);">${escHtml(au.name)}</td>
        <td><span class="tag tag-blue">${escHtml(au.agency)}</span></td>
        <td class="mono" style="color:var(--t2);">${escHtml(au.operator_id)}</td>
        <td>${escHtml(au.authority_level)}</td>
        <td><span class="tag tag-green">Secured</span></td>
      </tr>
    `).join('');
  }
}

// Override navigate to load admins when tab clicked
const originalNavigate = navigate;
navigate = function(pageId) {
  originalNavigate(pageId);
  if (pageId === 'admins') {
    refreshAdmins();
  }
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MENU 5: DATASET GENERATOR & PRESETS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const DEFAULT_PRESET_BANKS = ['Bank Jago', 'BCA', 'Bank Mandiri', 'BNI', 'BRI', 'CIMB Niaga', 'OVO', 'Gopay', 'Dana'];

function randomAccount() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function randomBank(banksList) {
  return banksList[Math.floor(Math.random() * banksList.length)];
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function generatePreset(type, size, name, format) {
  const numRows = size === 'large' ? 1000 : size === 'medium' ? 500 : 100;
  let content = '';

  if (type === 'account') {
    content += 'Account_Number,Bank_Name\n';
    for (let i = 0; i < numRows; i++) {
      content += `${randomAccount()},${randomBank(DEFAULT_PRESET_BANKS)}\n`;
    }
  } else if (type === 'trans') {
    content += 'Source_Account,Destination_Account,Amount_IDR,Timestamp\n';
    for (let i = 0; i < numRows; i++) {
      let amount = size === 'large' ? Math.floor(Math.random() * 5000000000 + 1000000000) :
                   size === 'medium' ? Math.floor(Math.random() * 500000000 + 100000000) :
                   Math.floor(Math.random() * 50000000 + 1000000);
      let formattedAmount = "Rp " + amount.toLocaleString('id-ID');
      content += `${randomAccount()},${randomAccount()},"${formattedAmount}",2026-05-25T10:00:00Z\n`;
    }
  } else if (type === 'pattern') {
    for (let i = 0; i < numRows; i++) {
      content += `[PATTERN] ${size.toUpperCase()} INTENSITY DETECTED: Layering activity between ${randomAccount()} and ${randomAccount()} exceeding threshold.\n`;
    }
  }

  const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
  downloadFile(content, `${name}.${format}`, mime);
  showToast('Preset Diunduh', `Dataset preset ${name}.${format} berhasil dibuat dan diunduh.`, 'green');
}

function generateDataset() {
  const name = el('ds-name')?.value?.trim() || 'Dataset_Fraud_OJK';
  const type = el('ds-type')?.value;
  const size = el('ds-size')?.value;
  const format = el('ds-format')?.value;
  
  let numRows = 100;
  if (size === 'small') numRows = 100;
  else if (size === 'medium') numRows = 500;
  else if (size === 'large') numRows = 1000;
  else if (size === 'custom') {
    numRows = parseInt(el('ds-rows')?.value) || 500;
  }

  let selectedBanks = DEFAULT_PRESET_BANKS;
  const filterVal = el('ds-bank-filter')?.value?.trim();
  if (filterVal) {
    const customBanks = filterVal.split(',').map(b => b.trim()).filter(b => b.length > 0);
    if (customBanks.length > 0) {
      selectedBanks = customBanks;
    }
  }

  let minAmount = parseInt(el('ds-min-amount')?.value) || 10000000;
  let maxAmount = parseInt(el('ds-max-amount')?.value) || 5000000000;
  if (minAmount > maxAmount) {
    const temp = minAmount;
    minAmount = maxAmount;
    maxAmount = temp;
  }

  let content = '';
  if (type === 'account') {
    content += 'Account_Number,Bank_Name\n';
    for (let i = 0; i < numRows; i++) {
      content += `${randomAccount()},${randomBank(selectedBanks)}\n`;
    }
  } else if (type === 'trans') {
    content += 'Source_Account,Destination_Account,Amount_IDR,Timestamp\n';
    for (let i = 0; i < numRows; i++) {
      let amount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
      let formattedAmount = "Rp " + amount.toLocaleString('id-ID');
      content += `${randomAccount()},${randomAccount()},"${formattedAmount}",2026-05-25T10:00:00Z\n`;
    }
  } else if (type === 'pattern') {
    for (let i = 0; i < numRows; i++) {
      content += `[PATTERN] ${size.toUpperCase()} INTENSITY DETECTED: Layering activity between ${randomAccount()} and ${randomAccount()} exceeding threshold.\n`;
    }
  }

  const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
  downloadFile(content, `${name}.${format}`, mime);
  showToast('Dataset Dibuat', `Dataset kustom ${name}.${format} berhasil digenerate dan diunduh.`, 'green');
}

// Expose globals to window
window.triggerIngestFraudSimulation = triggerIngestFraudSimulation;
window.pingAllApiPipelines           = pingAllApiPipelines;
window.openAuthenticationModal       = openAuthenticationModal;
window.closePinModal                 = closePinModal;
window.confirmPin                    = confirmPin;
window.stepPinInput                  = stepPinInput;
window.downloadReport                = downloadReport;
window.dismissBanner                 = dismissBanner;
window.resetEnforcementPanel         = resetEnforcementPanel;
window.processBulkDataset            = processBulkDataset;
window.handleFileUpload              = handleFileUpload;
window.navigate                      = navigate;
window.registerNewAdmin              = registerNewAdmin;
window.refreshAdmins                 = refreshAdmins;
window.generatePreset                = generatePreset;
window.generateDataset               = generateDataset;
