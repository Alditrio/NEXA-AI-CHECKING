/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DetectedAccount, EnforcementLog, TransactionFlow, AIAnalysis, AdminUser, SystemLog } from '../types';

// Seed Initial Admin Users
const SEED_ADMINS: AdminUser[] = [
  {
    id: 'admin-1',
    name: 'OJK Superintendent',
    agency: 'OJK',
    operator_id: 'OJK-10029',
    authority_level: 'Superintendent',
    pin: '060507',
    created_at: new Date('2026-01-15T08:30:00Z').toISOString(),
  },
  {
    id: 'admin-2',
    name: 'OJK Auditor',
    agency: 'OJK',
    operator_id: 'OJK-9904',
    authority_level: 'Auditor',
    pin: '060507',
    created_at: new Date('2026-02-10T10:15:00Z').toISOString(),
  },
  {
    id: 'admin-3',
    name: 'OJK Technical Agent',
    agency: 'OJK',
    operator_id: 'OJK-4421',
    authority_level: 'Operator',
    pin: '060507',
    created_at: new Date('2026-03-05T14:45:00Z').toISOString(),
  }
];

// Seed Initial Detected Accounts
const SEED_ACCOUNTS: DetectedAccount[] = [
  {
    id: 'acc-1',
    account_number: '8830112244',
    bank_code: '014',
    bank_name: 'BCA (Bank Central Asia)',
    holder_name: 'PT Digital Indonesia Sejahtera',
    status: 'suspected',
    risk_score: 0.94,
    total_flow_idr: 1240000000,
    detected_at: new Date('2026-05-28T02:30:00Z').toISOString(),
    reported_by: 'CekRekening.id API'
  },
  {
    id: 'acc-2',
    account_number: '1120098443',
    bank_code: '009',
    bank_name: 'BNI (Bank Negara Indonesia)',
    holder_name: 'CV Sentra Solusi Virtual',
    status: 'suspected',
    risk_score: 0.88,
    total_flow_idr: 870000000,
    detected_at: new Date('2026-05-28T04:15:00Z').toISOString(),
    reported_by: 'OJK Flagged Stream'
  },
  {
    id: 'acc-3',
    account_number: '7741003312',
    bank_code: '008',
    bank_name: 'Bank Mandiri',
    holder_name: 'Ahmad Faisal',
    status: 'suspected',
    risk_score: 0.82,
    total_flow_idr: 560000000,
    detected_at: new Date('2026-05-28T05:40:00Z').toISOString(),
    reported_by: 'GNN Graph Isomorphism'
  },
  {
    id: 'acc-4',
    account_number: '5561002299',
    bank_code: '002',
    bank_name: 'BRI (Bank Rakyat Indonesia)',
    holder_name: 'Siti Rahmawati',
    status: 'cleared',
    risk_score: 0.18,
    total_flow_idr: 15400000,
    detected_at: new Date('2026-05-27T11:20:00Z').toISOString(),
    reported_by: 'False Positive Escalation'
  }
];

// Seed GNN Analysis Patterns
const SEED_ANALYSIS: AIAnalysis[] = [
  {
    id: 'ai-1',
    target_account: '8830112244',
    model_version: 'NEXA-GNN-v3.1',
    gambling_prob: 0.947,
    layering_prob: 0.912,
    structuring_prob: 0.845,
    smurfing_prob: 0.731,
    patterns: ['High transaction frequency on nighttime', 'Rapid in-and-out funding matching smurfing splits', 'Multi-recipient layering structure'],
    analyzed_at: new Date('2026-05-28T02:35:00Z').toISOString()
  },
  {
    id: 'ai-2',
    target_account: '1120098443',
    model_version: 'NEXA-GNN-v3.1',
    gambling_prob: 0.881,
    layering_prob: 0.824,
    structuring_prob: 0.795,
    smurfing_prob: 0.862,
    patterns: ['Excessive smurfing via micro-transactions', 'Sub-limit dynamic routing and bridging'],
    analyzed_at: new Date('2026-05-28T04:20:00Z').toISOString()
  },
  {
    id: 'ai-3',
    target_account: '7741003312',
    model_version: 'NEXA-GNN-v3.1',
    gambling_prob: 0.824,
    layering_prob: 0.718,
    structuring_prob: 0.892,
    smurfing_prob: 0.450,
    patterns: ['Structuring transfer series under cash reporting limits (Rp 100M threshold)'],
    analyzed_at: new Date('2026-05-28T05:45:00Z').toISOString()
  }
];

// Seed Transaction Flows
const SEED_FLOWS: TransactionFlow[] = [
  {
    id: 'flow-1',
    source_account: '8830112244',
    dest_account: '1120098443',
    amount_idr: 450000000,
    transfer_type: 'BI_FAST',
    flagged: true,
    pattern_match: ['Level 1 Layering Transfer'],
    occurred_at: new Date('2026-05-28T03:02:00Z').toISOString()
  },
  {
    id: 'flow-2',
    source_account: '1120098443',
    dest_account: '7741003312',
    amount_idr: 280000000,
    transfer_type: 'Virtual_Account',
    flagged: true,
    pattern_match: ['Level 2 Smurfing Dispersal'],
    occurred_at: new Date('2026-05-28T04:30:00Z').toISOString()
  }
];

// Initial Enforcement Logs
const SEED_ENFORCEMENT: EnforcementLog[] = [
  {
    id: 'enf-1',
    report_id: 'OJK-ENF-88402921',
    target_account: '8830112244',
    operator: 'OJK Superintendent (Direct)',
    nodes_blocked: 4,
    total_flow_idr: 1240000000,
    ai_confidence: 0.947,
    action_type: 'auto_block',
    status: 'complete',
    created_at: new Date('2026-05-28T03:15:00Z').toISOString()
  }
];

type LogSubscriber = (log: SystemLog) => void;
type StateSubscriber = () => void;

class NexaDatabase {
  private admins: AdminUser[] = [];
  private accounts: DetectedAccount[] = [];
  private analysis: AIAnalysis[] = [];
  private flows: TransactionFlow[] = [];
  private enforcement: EnforcementLog[] = [];
  private logs: SystemLog[] = [];

  private logSubscribers: Set<LogSubscriber> = new Set();
  private stateSubscribers: Set<StateSubscriber> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const adminsStr = localStorage.getItem('nexa_admins');
    const accountsStr = localStorage.getItem('nexa_accounts');
    const analysisStr = localStorage.getItem('nexa_analysis');
    const flowsStr = localStorage.getItem('nexa_flows');
    const enforcementStr = localStorage.getItem('nexa_enforcement');
    const logsStr = localStorage.getItem('nexa_logs');

    let parsedAdmins = adminsStr ? JSON.parse(adminsStr) : null;
    if (parsedAdmins && (!parsedAdmins.some((adm: any) => adm.pin === '060507') || parsedAdmins.some((adm: any) => adm.agency !== 'OJK'))) {
      parsedAdmins = [...SEED_ADMINS];
      localStorage.setItem('nexa_admins', JSON.stringify(parsedAdmins));
    }

    this.admins = parsedAdmins || [...SEED_ADMINS];
    this.accounts = accountsStr ? JSON.parse(accountsStr) : [...SEED_ACCOUNTS];
    this.analysis = analysisStr ? JSON.parse(analysisStr) : [...SEED_ANALYSIS];
    this.flows = flowsStr ? JSON.parse(flowsStr) : [...SEED_FLOWS];
    this.enforcement = enforcementStr ? JSON.parse(enforcementStr) : [...SEED_ENFORCEMENT];
    this.logs = logsStr ? JSON.parse(logsStr) : [
      {
        id: 'init-log',
        timestamp: new Date().toISOString(),
        type: 'info',
        message: 'NEXA DB initialized. PostgreSQL mTLS secure server heartbeat: ACTIVE.'
      }
    ];

    if (!adminsStr) this.saveToStorage();
  }

  private saveToStorage() {
    localStorage.setItem('nexa_admins', JSON.stringify(this.admins));
    localStorage.setItem('nexa_accounts', JSON.stringify(this.accounts));
    localStorage.setItem('nexa_analysis', JSON.stringify(this.analysis));
    localStorage.setItem('nexa_flows', JSON.stringify(this.flows));
    localStorage.setItem('nexa_enforcement', JSON.stringify(this.enforcement));
    localStorage.setItem('nexa_logs', JSON.stringify(this.logs));
  }

  // Subscribe to changes
  subscribeLogs(cb: LogSubscriber) {
    this.logSubscribers.add(cb);
    return () => this.logSubscribers.delete(cb);
  }

  subscribeState(cb: StateSubscriber) {
    this.stateSubscribers.add(cb);
    return () => this.stateSubscribers.delete(cb);
  }

  private notifyState() {
    this.saveToStorage();
    this.stateSubscribers.forEach(cb => cb());
  }

  public emitLog(type: SystemLog['type'], message: string) {
    const newLog: SystemLog = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      message
    };
    this.logs.unshift(newLog);
    // Keep internal log array to max 150 items
    if (this.logs.length > 150) {
      this.logs.pop();
    }
    this.logSubscribers.forEach(cb => cb(newLog));
    this.notifyState();
  }

  // Generate SQL statement logging
  private emitSQLLog(query: string, params?: any[]) {
    const formattedParams = params ? ` | PARAMS: [${params.map(p => typeof p === 'string' ? `'${p}'` : p).join(', ')}]` : '';
    this.emitLog('db', `[PostgreSQL WAL Sync] SQL EXEC: "${query}"${formattedParams}`);
  }

  // ADMIN OPERATIONS
  getAdmins(): AdminUser[] {
    return this.admins;
  }

  verifyPin(enteredPin: string): AdminUser | null {
    this.emitSQLLog('SELECT * FROM public.admin_users WHERE pin = $1 LIMIT 1', [enteredPin]);
    const found = this.admins.find(adm => adm.pin === enteredPin) || null;
    if (found) {
      this.emitLog('success', `SECURE PIN VERIFIED: Authority granted to ${found.name} (${found.operator_id} / ${found.agency})`);
    } else {
      this.emitLog('error', `PIN VERIFICATION FAILS: Unauthorized access attempt blocked with authentication code: "${enteredPin}"`);
    }
    return found;
  }

  registerAdmin(name: string, agency: AdminUser['agency'], authority: AdminUser['authority_level'], pin: string): AdminUser {
    const newAdmin: AdminUser = {
      id: `admin-${Math.random().toString(36).substr(2, 9)}`,
      name,
      agency,
      operator_id: `${agency.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      authority_level: authority,
      pin,
      created_at: new Date().toISOString()
    };
    
    this.emitSQLLog(
      'INSERT INTO public.admin_users (id, name, agency, operator_id, authority_level, pin) VALUES ($1, $2, $3, $4, $5, $6)',
      [newAdmin.id, newAdmin.name, newAdmin.agency, newAdmin.operator_id, newAdmin.authority_level, '***']
    );

    this.admins.push(newAdmin);
    this.emitLog('success', `NEW OPERATOR ENROLLED: registered ${newAdmin.name} [ID: ${newAdmin.operator_id}] securely under mTLS vault`);
    this.notifyState();
    return newAdmin;
  }

  // ACCOUNTS OPERATIONS
  getAccounts(): DetectedAccount[] {
    return this.accounts;
  }

  insertDetectedAccount(acc: Omit<DetectedAccount, 'id' | 'detected_at'>): DetectedAccount {
    const newAcc: DetectedAccount = {
      ...acc,
      id: `acc-${Math.random().toString(36).substr(2, 9)}`,
      detected_at: new Date().toISOString()
    };

    this.emitSQLLog(
      'INSERT INTO public.detected_accounts (account_number, bank_code, bank_name, holder_name, status, risk_score, total_flow_idr, reported_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [newAcc.account_number, newAcc.bank_code, newAcc.bank_name, newAcc.holder_name, newAcc.status, newAcc.risk_score, newAcc.total_flow_idr, newAcc.reported_by]
    );

    this.accounts.unshift(newAcc);
    this.notifyState();
    return newAcc;
  }

  freezeAccount(accountNumber: string): boolean {
    this.emitSQLLog(
      'UPDATE public.detected_accounts SET status = $1 WHERE account_number = $2',
      ['frozen', accountNumber]
    );

    const idx = this.accounts.findIndex(acc => acc.account_number === accountNumber);
    if (idx !== -1) {
      this.accounts[idx] = { ...this.accounts[idx], status: 'frozen' };
      this.emitLog('success', `mTLS BROADCAST ORDER: Frozen instruction completed for Account ${accountNumber} (${this.accounts[idx].bank_name})`);
      this.notifyState();
      return true;
    }
    return false;
  }

  clearAccount(accountNumber: string): boolean {
    this.emitSQLLog(
      'UPDATE public.detected_accounts SET status = $1, risk_score = 0.0 WHERE account_number = $2',
      ['cleared', accountNumber]
    );

    const idx = this.accounts.findIndex(acc => acc.account_number === accountNumber);
    if (idx !== -1) {
      this.accounts[idx] = { ...this.accounts[idx], status: 'cleared', risk_score: 0.0 };
      this.emitLog('info', `CLEARED STATUS: RegTech classification revoked for account ${accountNumber}`);
      this.notifyState();
      return true;
    }
    return false;
  }

  // AI/GNN INTERFACES
  getAnalysis(): AIAnalysis[] {
    return this.analysis;
  }

  insertAiAnalysis(ai: Omit<AIAnalysis, 'id' | 'analyzed_at'>): AIAnalysis {
    const newAi: AIAnalysis = {
      ...ai,
      id: `ai-${Math.random().toString(36).substr(2, 9)}`,
      analyzed_at: new Date().toISOString()
    };

    this.emitSQLLog(
      'INSERT INTO public.ai_analysis (target_account, model_version, gambling_prob, layering_prob, structuring_prob, smurfing_prob, patterns) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newAi.target_account, newAi.model_version, newAi.gambling_prob, newAi.layering_prob, newAi.structuring_prob, newAi.smurfing_prob, JSON.stringify(newAi.patterns)]
    );

    this.analysis.unshift(newAi);
    this.notifyState();
    return newAi;
  }

  // TRANSACTION FLOWS
  getFlows(): TransactionFlow[] {
    return this.flows;
  }

  insertFlow(flow: Omit<TransactionFlow, 'id' | 'occurred_at'>): TransactionFlow {
    const newFlow: TransactionFlow = {
      ...flow,
      id: `flow-${Math.random().toString(36).substr(2, 9)}`,
      occurred_at: new Date().toISOString()
    };

    this.emitSQLLog(
      'INSERT INTO public.transaction_flows (source_account, dest_account, amount_idr, transfer_type, flagged, pattern_match) VALUES ($1, $2, $3, $4, $5, $6)',
      [newFlow.source_account, newFlow.dest_account, newFlow.amount_idr, newFlow.transfer_type, newFlow.flagged, JSON.stringify(newFlow.pattern_match)]
    );

    this.flows.unshift(newFlow);
    this.notifyState();
    return newFlow;
  }

  // ENFORCEMENT LOGS
  getEnforcementLogs(): EnforcementLog[] {
    return this.enforcement;
  }

  insertEnforcementLog(log: Omit<EnforcementLog, 'id' | 'created_at'>): EnforcementLog {
    const newLog: EnforcementLog = {
      ...log,
      id: `enf-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString()
    };

    this.emitSQLLog(
      'INSERT INTO public.enforcement_logs (report_id, target_account, operator, nodes_blocked, total_flow_idr, ai_confidence, action_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING report_id',
      [newLog.report_id, newLog.target_account, newLog.operator, newLog.nodes_blocked, newLog.total_flow_idr, newLog.ai_confidence, newLog.action_type, newLog.status]
    );

    this.enforcement.unshift(newLog);
    this.notifyState();
    return newLog;
  }

  // SYSTEM LOGS
  getLogs(): SystemLog[] {
    return this.logs;
  }

  clearLogs() {
    this.logs = [
      {
        id: 'init-recon',
        timestamp: new Date().toISOString(),
        type: 'info',
        message: 'System audit log console cleared by Superintendent command.'
      }
    ];
    this.notifyState();
  }
}

export const NexaDB = new NexaDatabase();
