/**
 * NEXA AI — Online Gambling Detection & Enforcement Engine
 * db.js  — Supabase Database Layer (Simulation)
 *
 * Simulasi penuh Supabase database queries termasuk:
 *   - Table: detected_accounts, enforcement_logs, transaction_flows, ai_analysis, admin_users
 *   - Real-time INSERT, SELECT, UPDATE dengan response time realistis
 *   - Row-level data yang dihasilkan secara dinamis
 */

'use strict';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUPABASE CONFIG (Simulasi — tidak terhubung real)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const SUPABASE_CONFIG = {
  url: 'https://xyzcompany.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.simulated',
  schema: 'public',
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DATABASE SCHEMA (definisi tabel)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const DB_SCHEMA = {
  detected_accounts: [
    { col: 'id',               type: 'uuid',        note: 'PRIMARY KEY, DEFAULT gen_random_uuid()' },
    { col: 'account_number',   type: 'text',        note: 'NOT NULL' },
    { col: 'bank_code',        type: 'text',        note: 'NOT NULL' },
    { col: 'bank_name',        type: 'text',        note: '' },
    { col: 'holder_name',      type: 'text',        note: '' },
    { col: 'status',           type: 'text',        note: "CHECK (status IN ('suspected','frozen','cleared'))" },
    { col: 'risk_score',       type: 'numeric',     note: 'RANGE 0.0 – 1.0' },
    { col: 'total_flow_idr',   type: 'bigint',      note: '' },
    { col: 'detected_at',      type: 'timestamptz', note: 'DEFAULT now()' },
    { col: 'reported_by',      type: 'text',        note: '' },
  ],
  enforcement_logs: [
    { col: 'id',               type: 'uuid',        note: 'PRIMARY KEY' },
    { col: 'report_id',        type: 'text',        note: 'NOT NULL, UNIQUE' },
    { col: 'target_account',   type: 'text',        note: 'FK → detected_accounts.account_number' },
    { col: 'operator',         type: 'text',        note: '' },
    { col: 'nodes_blocked',    type: 'int4',        note: '' },
    { col: 'total_flow_idr',   type: 'bigint',      note: '' },
    { col: 'ai_confidence',    type: 'numeric',     note: '' },
    { col: 'action_type',      type: 'text',        note: "CHECK (action_type IN ('auto_block','manual','monitor'))" },
    { col: 'status',           type: 'text',        note: "CHECK (status IN ('pending','complete','failed'))" },
    { col: 'created_at',       type: 'timestamptz', note: 'DEFAULT now()' },
  ],
  transaction_flows: [
    { col: 'id',               type: 'uuid',        note: 'PRIMARY KEY' },
    { col: 'source_account',   type: 'text',        note: '' },
    { col: 'dest_account',     type: 'text',        note: '' },
    { col: 'amount_idr',       type: 'bigint',      note: '' },
    { col: 'transfer_type',    type: 'text',        note: "('BI_FAST','SKN','RTGS','Virtual_Account')" },
    { col: 'flagged',          type: 'boolean',     note: 'DEFAULT false' },
    { col: 'pattern_match',    type: 'text[]',      note: 'ARRAY of detected patterns' },
    { col: 'occurred_at',      type: 'timestamptz', note: '' },
  ],
  ai_analysis: [
    { col: 'id',               type: 'uuid',        note: 'PRIMARY KEY' },
    { col: 'target_account',   type: 'text',        note: '' },
    { col: 'model_version',    type: 'text',        note: '' },
    { col: 'gambling_prob',    type: 'numeric',     note: 'Confidence 0.0–1.0' },
    { col: 'layering_prob',    type: 'numeric',     note: '' },
    { col: 'structuring_prob', type: 'numeric',     note: '' },
    { col: 'smurfing_prob',    type: 'numeric',     note: '' },
    { col: 'patterns',         type: 'jsonb',       note: 'Detected behavior patterns' },
    { col: 'analyzed_at',      type: 'timestamptz', note: 'DEFAULT now()' },
  ],
  admin_users: [
    { col: 'id',               type: 'uuid',        note: 'PRIMARY KEY' },
    { col: 'name',             type: 'text',        note: 'NOT NULL' },
    { col: 'agency',           type: 'text',        note: "('OJK', 'Kemenkomdigi', 'PPATK')" },
    { col: 'operator_id',      type: 'text',        note: 'UNIQUE' },
    { col: 'authority_level',  type: 'text',        note: "('Superintendent', 'Operator', 'Auditor')" },
    { col: 'pin',              type: 'text',        note: '6 Digit Security Code' },
    { col: 'created_at',       type: 'timestamptz', note: 'DEFAULT now()' },
  ],
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   IN-MEMORY STORE (simulasi state database)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const Store = {
  detected_accounts: [],
  enforcement_logs:  [],
  transaction_flows: [],
  ai_analysis:       [],
  admin_users:       [], // will seed below
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HELPERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function now() { return new Date().toISOString(); }

function dbLatency() { return Math.floor(Math.random() * 60 + 20); } // 20–80ms

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DB LOG EMITTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const dbLogListeners = [];
function onDbLog(fn) { dbLogListeners.push(fn); }
function emitDbLog(op, query, result) {
  dbLogListeners.forEach(fn => fn({ op, query, result, ts: new Date().toLocaleTimeString('id-ID', { hour12: false }) }));
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUPABASE CLIENT API (simulasi)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const supabase = {

  /** INSERT rekening terdeteksi */
  async insertDetectedAccount({ account_number, bank_code, bank_name, holder_name, risk_score, total_flow_idr, reported_by }) {
    await sleep(dbLatency());
    const row = {
      id: uuid(), account_number, bank_code, bank_name, holder_name,
      status: 'suspected', risk_score, total_flow_idr,
      detected_at: now(), reported_by,
    };
    Store.detected_accounts.push(row);
    emitDbLog('INSERT',
      `INSERT INTO detected_accounts\n  (account_number, bank_code, bank_name, status, risk_score, total_flow_idr, reported_by)\n  VALUES ('${account_number}', '${bank_code}', '${bank_name}', 'suspected', ${risk_score}, ${total_flow_idr}, '${reported_by}')\n  RETURNING id, detected_at;`,
      `1 row affected | id: ${row.id.slice(0,8)}... | latency: ${dbLatency()}ms`
    );
    return { data: row, error: null };
  },

  /** UPDATE status rekening menjadi frozen */
  async freezeAccount(account_number) {
    await sleep(dbLatency());
    const row = Store.detected_accounts.find(r => r.account_number === account_number);
    if (row) row.status = 'frozen';
    emitDbLog('UPDATE',
      `UPDATE detected_accounts\n  SET status = 'frozen', updated_at = now()\n  WHERE account_number = '${account_number}'\n  RETURNING status, updated_at;`,
      `1 row updated | status: frozen`
    );
    return { data: row || null, error: null };
  },

  /** INSERT aliran transaksi */
  async insertTransactionFlow({ source, dest, amount, type, patterns }) {
    await sleep(dbLatency());
    const row = {
      id: uuid(), source_account: source, dest_account: dest,
      amount_idr: amount, transfer_type: type,
      flagged: true, pattern_match: patterns, occurred_at: now(),
    };
    Store.transaction_flows.push(row);
    emitDbLog('INSERT',
      `INSERT INTO transaction_flows\n  (source_account, dest_account, amount_idr, transfer_type, flagged, pattern_match)\n  VALUES ('${source}', '${dest}', ${amount}, '${type}', true, ARRAY[${patterns.map(p=>`'${p}'`).join(',')}])\n  RETURNING id;`,
      `1 row affected | flow: Rp ${(amount/1e6).toFixed(1)}Jt | flagged: true`
    );
    return { data: row, error: null };
  },

  /** INSERT hasil analisis AI */
  async insertAiAnalysis({ target, gambling, layering, structuring, smurfing, patterns, model }) {
    await sleep(dbLatency());
    const row = {
      id: uuid(), target_account: target, model_version: model,
      gambling_prob: gambling, layering_prob: layering,
      structuring_prob: structuring, smurfing_prob: smurfing,
      patterns, analyzed_at: now(),
    };
    Store.ai_analysis.push(row);
    emitDbLog('INSERT',
      `INSERT INTO ai_analysis\n  (target_account, model_version, gambling_prob, layering_prob, structuring_prob, smurfing_prob, patterns)\n  VALUES ('${target}', '${model}', ${gambling}, ${layering}, ${structuring}, ${smurfing},\n    '${JSON.stringify(patterns)}'::jsonb)\n  RETURNING id, analyzed_at;`,
      `1 row affected | GNN confidence: ${(gambling*100).toFixed(1)}%`
    );
    return { data: row, error: null };
  },

  /** INSERT enforcement log */
  async insertEnforcementLog({ report_id, target, nodes_blocked, total_flow, ai_confidence }) {
    await sleep(dbLatency());
    const row = {
      id: uuid(), report_id, target_account: target,
      operator: 'OJK Central Authority', nodes_blocked, total_flow_idr: total_flow,
      ai_confidence, action_type: 'auto_block', status: 'complete', created_at: now(),
    };
    Store.enforcement_logs.push(row);
    emitDbLog('INSERT',
      `INSERT INTO enforcement_logs\n  (report_id, target_account, operator, nodes_blocked, total_flow_idr, ai_confidence, action_type, status)\n  VALUES ('${report_id}', '${target}', 'OJK Central Authority', ${nodes_blocked}, ${total_flow}, ${ai_confidence}, 'auto_block', 'complete')\n  RETURNING id, created_at;`,
      `1 row affected | report: ${report_id}`
    );
    return { data: row, error: null };
  },

  /** SELECT semua enforcement logs */
  async getEnforcementLogs() {
    await sleep(dbLatency());
    emitDbLog('SELECT',
      `SELECT el.* FROM enforcement_logs el ORDER BY created_at DESC LIMIT 50;`,
      `${Store.enforcement_logs.length} rows returned`
    );
    return { data: [...Store.enforcement_logs].reverse(), error: null };
  },

  /** SELECT rekening suspect */
  async getSuspectedAccounts() {
    await sleep(dbLatency());
    emitDbLog('SELECT',
      `SELECT da.* FROM detected_accounts da ORDER BY da.detected_at DESC LIMIT 100;`,
      `${Store.detected_accounts.length} rows returned`
    );
    return { data: [...Store.detected_accounts], error: null };
  },

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ADMIN USER METHODS
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  async insertAdmin({ name, agency, operator_id, authority_level, pin }) {
    await sleep(dbLatency());
    const row = {
      id: uuid(), name, agency, operator_id, authority_level, pin, created_at: now()
    };
    Store.admin_users.push(row);
    emitDbLog('INSERT',
      `INSERT INTO admin_users\n  (name, agency, operator_id, authority_level, pin)\n  VALUES ('${name}', '${agency}', '${operator_id}', '${authority_level}', '******')\n  RETURNING id, created_at;`,
      `1 row affected | admin: ${name} (${agency})`
    );
    return { data: row, error: null };
  },

  async getAdmins() {
    await sleep(dbLatency());
    emitDbLog('SELECT',
      `SELECT au.id, au.name, au.agency, au.operator_id, au.authority_level, au.created_at\n  FROM admin_users au\n  ORDER BY created_at ASC;`,
      `${Store.admin_users.length} rows returned`
    );
    return { data: [...Store.admin_users], error: null };
  },

  async verifyPin(enteredPin) {
    await sleep(dbLatency());
    const found = Store.admin_users.find(au => au.pin === enteredPin);
    emitDbLog('SELECT',
      `SELECT name, agency, authority_level\n  FROM admin_users\n  WHERE pin = '******'\n  LIMIT 1;`,
      found ? `1 row found | Authorized: ${found.name}` : `0 rows found | Unauthorized PIN`
    );
    return { data: found || null, error: null };
  }
};

/* Seed Admin Users */
Store.admin_users = [
  { id: uuid(), name: 'OJK Authority', agency: 'OJK', operator_id: 'OJK-10029', authority_level: 'Superintendent', pin: '123456', created_at: now() },
  { id: uuid(), name: 'PPATK Auditor', agency: 'PPATK', operator_id: 'PPATK-9904', authority_level: 'Auditor', pin: '777777', created_at: now() },
  { id: uuid(), name: 'Komdigi Agent', agency: 'Kemenkomdigi', operator_id: 'KOMDIGI-4421', authority_level: 'Operator', pin: '999999', created_at: now() },
];

/* Export to window */
window.supabase = supabase;
window.DB_SCHEMA = DB_SCHEMA;
window.Store = Store;
window.onDbLog = onDbLog;
window.emitDbLog = emitDbLog;
