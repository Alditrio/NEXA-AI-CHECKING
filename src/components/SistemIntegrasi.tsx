/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { NexaDB } from '../lib/db';
import { SystemLog, DetectedAccount, EnforcementLog, TransactionFlow, AIAnalysis, AdminUser } from '../types';
import { Database, Terminal, Shield, RefreshCw, Layers, GitMerge, FileCode, Play, Trash2 } from 'lucide-react';

export default function SistemIntegrasi() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>('detected_accounts');
  
  // SQL playground states
  const [sqlInput, setSqlInput] = useState<string>('SELECT * FROM public.detected_accounts;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [queryError, setQueryError] = useState<string>('');

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch
    setLogs([...NexaDB.getLogs()]);

    // Subscribe to database streams
    const unsubscribe = NexaDB.subscribeLogs((newLog) => {
      setLogs((current) => [newLog, ...current]);
    });

    // Auto run default query on load
    handleRunQuery('SELECT * FROM public.detected_accounts;');

    return unsubscribe;
  }, []);

  // Run simulated queries on our memory datasets
  const handleRunQuery = (customSql?: string) => {
    const query = customSql || sqlInput;
    setQueryError('');
    setQueryResult(null);

    // Dynamic state logger
    NexaDB.emitLog('db', `[SQL Terminal Input] Executing: "${query}"`);

    // Basic SQL parser simulating response based on table names
    const cleaned = query.trim().toLowerCase();

    try {
      if (cleaned.includes('detected_accounts')) {
        const data = NexaDB.getAccounts();
        let filtered = [...data];
        
        if (cleaned.includes('status = \'suspected\'')) {
          filtered = filtered.filter(a => a.status === 'suspected');
        } else if (cleaned.includes('status = \'frozen\'')) {
          filtered = filtered.filter(a => a.status === 'frozen');
        }

        if (filtered.length === 0) {
          setQueryResult({ columns: ['status'], rows: [{ status: 'No rows matching criteria' }] });
          return;
        }

        const cols = ['id', 'account_number', 'bank_name', 'holder_name', 'status', 'risk_score', 'total_flow_idr'];
        setQueryResult({
          columns: cols,
          rows: filtered.map(item => ({
            id: item.id.substring(0, 8) + '...',
            account_number: item.account_number,
            bank_name: item.bank_name.substring(0, 15),
            holder_name: item.holder_name,
            status: item.status.toUpperCase(),
            risk_score: `${(item.risk_score * 100).toFixed(0)}%`,
            total_flow_idr: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.total_flow_idr)
          }))
        });

      } else if (cleaned.includes('enforcement_logs')) {
        const data = NexaDB.getEnforcementLogs();
        if (data.length === 0) {
          setQueryError('Empty set. (0.00 sec)');
          return;
        }
        setQueryResult({
          columns: ['id', 'report_id', 'target_account', 'operator', 'nodes_blocked', 'total_flow_idr', 'status'],
          rows: data.map(item => ({
            id: item.id.substring(0, 8) + '...',
            report_id: item.report_id,
            target_account: item.target_account,
            operator: item.operator.substring(0, 18),
            nodes_blocked: item.nodes_blocked,
            total_flow_idr: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.total_flow_idr),
            status: item.status.toUpperCase()
          }))
        });

      } else if (cleaned.includes('transaction_flows')) {
        const data = NexaDB.getFlows();
        if (data.length === 0) {
          setQueryResult({ columns: ['notice'], rows: [{ notice: 'No transaction links analyzed recently.' }] });
          return;
        }
        setQueryResult({
          columns: ['id', 'source_account', 'dest_account', 'amount_idr', 'transfer_type', 'flagged'],
          rows: data.map(item => ({
            id: item.id.substring(0, 8) + '...',
            source_account: item.source_account,
            dest_account: item.dest_account,
            amount_idr: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.amount_idr),
            transfer_type: item.transfer_type,
            flagged: item.flagged ? 'TRUE' : 'FALSE'
          }))
        });

      } else if (cleaned.includes('ai_analysis')) {
        const data = NexaDB.getAnalysis();
        setQueryResult({
          columns: ['id', 'target_account', 'model_version', 'gambling_prob', 'layering_prob', 'structuring_prob', 'smurfing_prob'],
          rows: data.map(item => ({
            id: item.id.substring(0, 8) + '...',
            target_account: item.target_account,
            model_version: item.model_version,
            gambling_prob: `${(item.gambling_prob * 100).toFixed(1)}%`,
            layering_prob: `${(item.layering_prob * 100).toFixed(1)}%`,
            structuring_prob: `${(item.structuring_prob * 100).toFixed(1)}%`,
            smurfing_prob: `${(item.smurfing_prob * 100).toFixed(1)}%`
          }))
        });

      } else if (cleaned.includes('admin_users')) {
        const data = NexaDB.getAdmins();
        setQueryResult({
          columns: ['id', 'name', 'agency', 'operator_id', 'authority_level', 'pin_hash'],
          rows: data.map(item => ({
            id: item.id.substring(0, 8) + '...',
            name: item.name,
            agency: item.agency,
            operator_id: item.operator_id,
            authority_level: item.authority_level,
            pin_hash: 'SHA256(MASKED)'
          }))
        });
      } else {
        setQueryError(`Query execution error: Table not recognized in public schema bounds. Syntactic parser expects keywords matching relations: [detected_accounts, enforcement_logs, transaction_flows, ai_analysis, admin_users].`);
      }
    } catch (err: any) {
      setQueryError(`PostgreSQL engine error: ${err.message || 'Malformed syntax error'}`);
    }
  };

  const handleClearLogs = () => {
    NexaDB.clearLogs();
    setLogs([...NexaDB.getLogs()]);
  };

  const sqlPresets = [
    { label: 'Semua Tersangka', q: 'SELECT * FROM public.detected_accounts;' },
    { label: 'Anomali Masih Aktif', q: 'SELECT * FROM public.detected_accounts WHERE status = \'suspected\';' },
    { label: 'Ketetapan Penangguhan', q: 'SELECT * FROM public.enforcement_logs;' },
    { label: 'Aliran Dana GNN Traces', q: 'SELECT * FROM public.transaction_flows;' },
    { label: 'Hak Akses Administrator', q: 'SELECT * FROM public.admin_users;' },
  ];

  // Schema specifications mapping
  const schemaSpecs: Record<string, { col: string; type: string; key: string; notes: string }[]> = {
    detected_accounts: [
      { col: 'id', type: 'uuid', key: 'PRIMARY KEY', notes: 'DEFAULT gen_random_uuid()' },
      { col: 'account_number', type: 'text', key: 'NOT NULL', notes: 'Electronic bank target identifier' },
      { col: 'bank_code', type: 'text', key: 'NOT NULL', notes: 'Swift local perbankan ID' },
      { col: 'bank_name', type: 'text', key: '—', notes: 'Resolved KYC central name' },
      { col: 'holder_name', type: 'text', key: '—', notes: 'Resolved KYC identity owner NIK' },
      { col: 'status', type: 'text', key: 'CHECK', notes: 'IN (\'suspected\', \'frozen\', \'cleared\')' },
      { col: 'risk_score', type: 'numeric', key: 'CHECK', notes: 'GNN Risk weight calculation boundary (0.00 to 1.00)' },
      { col: 'total_flow_idr', type: 'bigint', key: '—', notes: 'Secured currency asset totals in IDR Rupiah' },
      { col: 'detected_at', type: 'timestamptz', key: '—', notes: 'DEFAULT now()' },
      { col: 'reported_by', type: 'text', key: '—', notes: 'Ingestion node identifier source' },
    ],
    enforcement_logs: [
      { col: 'id', type: 'uuid', key: 'PRIMARY KEY', notes: 'DEFAULT gen_random_uuid()' },
      { col: 'report_id', type: 'text', key: 'UNIQUE', notes: 'Official OJK Judicial ledger ID (formatted OJK-ENF-XXXXXXXX)' },
      { col: 'target_account', type: 'text', key: 'FOREIGN KEY', notes: 'References detected_accounts.account_number' },
      { col: 'operator', type: 'text', key: '—', notes: 'Supervisor name authorizing pin lock' },
      { col: 'nodes_blocked', type: 'int4', key: '—', notes: 'Number of inter-banking nodes isolated parallel' },
      { col: 'total_flow_idr', type: 'bigint', key: '—', notes: 'Secured financial volume save' },
      { col: 'ai_confidence', type: 'numeric', key: '—', notes: 'Model probability index metrics weight' },
      { col: 'action_type', type: 'text', key: 'CHECK', notes: 'IN (\'auto_block\', \'manual\', \'monitor\')' },
      { col: 'status', type: 'text', key: 'CHECK', notes: 'IN (\'pending\', \'complete\', \'failed\')' },
      { col: 'created_at', type: 'timestamptz', key: '—', notes: 'DEFAULT now()' },
    ],
    transaction_flows: [
      { col: 'id', type: 'uuid', key: 'PRIMARY KEY', notes: 'DEFAULT gen_random_uuid()' },
      { col: 'source_account', type: 'text', key: '—', notes: 'Origin wire transfer card node' },
      { col: 'dest_account', type: 'text', key: '—', notes: 'Target arrival node' },
      { col: 'amount_idr', type: 'bigint', key: '—', notes: 'Wire transfer value unit' },
      { col: 'transfer_type', type: 'text', key: '—', notes: 'IN (\'BI_FAST\', \'SKN\', \'RTGS\', \'Virtual_Account\')' },
      { col: 'flagged', type: 'boolean', key: '—', notes: 'DEFAULT false' },
      { col: 'pattern_match', type: 'text[]', key: '—', notes: 'Structuring or layering tag strings' },
      { col: 'occurred_at', type: 'timestamptz', key: '—', notes: 'Timestamp record' },
    ],
    ai_analysis: [
      { col: 'id', type: 'uuid', key: 'PRIMARY KEY', notes: 'DEFAULT gen_random_uuid()' },
      { col: 'target_account', type: 'text', key: '—', notes: 'Evaluation subject key' },
      { col: 'model_version', type: 'text', key: '—', notes: 'Standard string (e.g. NEXA-GNN-v3.1)' },
      { col: 'gambling_prob', type: 'numeric', key: '—', notes: 'Major primary online-gambling probability weight' },
      { col: 'layering_prob', type: 'numeric', key: '—', notes: 'Layering behavior probability' },
      { col: 'structuring_prob', type: 'numeric', key: '—', notes: 'Structuring behavior probability' },
      { col: 'smurfing_prob', type: 'numeric', key: '—', notes: 'Smurfing behavior probability' },
      { col: 'patterns', type: 'jsonb', key: '—', notes: 'Array list detailing exact indicators' },
      { col: 'analyzed_at', type: 'timestamptz', key: '—', notes: 'DEFAULT now()' },
    ],
    admin_users: [
      { col: 'id', type: 'uuid', key: 'PRIMARY KEY', notes: 'DEFAULT gen_random_uuid()' },
      { col: 'name', type: 'text', key: 'NOT NULL', notes: 'Operator identity username details' },
      { col: 'agency', type: 'text', key: 'CHECK', notes: 'IN (\'OJK\')' },
      { col: 'operator_id', type: 'text', key: 'UNIQUE', notes: 'Unique agency serial ID' },
      { col: 'authority_level', type: 'text', key: 'CHECK', notes: 'IN (\'Superintendent\', \'Operator\', \'Auditor\')' },
      { col: 'pin', type: 'text', key: 'NOT NULL', notes: 'Secured 6-digit cryptographic PIN verification key' },
      { col: 'created_at', type: 'timestamptz', key: '—', notes: 'DEFAULT now()' },
    ]
  };

  return (
    <div className="space-y-6" id="database-tab">
      
      {/* Relational schema blueprints & Database model explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Schema Navigator columns detail List (Left side, Span 1) */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-bold outfit-font select-none">
              <Database className="h-5 w-5" />
              <h4 className="text-md uppercase tracking-wider">OJK Model Relasional</h4>
            </div>
            
            <p className="text-gray-500 text-xs leading-relaxed">
              Katalog skema tabel SQL PostgreSQL yang disinkronisasi berkala di seluruh server mTLS. Klik nama tabel untuk memeriksa konfigurasi struktur field dan foreign key.
            </p>

            <div className="flex flex-col gap-2 mt-4 select-none">
              {Object.keys(schemaSpecs).map((tbl) => (
                <button
                  key={tbl}
                  onClick={() => setSelectedSchema(tbl)}
                  className={`w-full text-left font-mono font-bold text-xs p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedSchema === tbl 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>public.{tbl}</span>
                  <Layers className={`h-3.5 w-3.5 ${selectedSchema === tbl ? 'text-blue-500 animate-bounce' : 'text-slate-400'}`} />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[10px] leading-relaxed text-slate-500 font-mono mt-4">
            <Shield className="h-3.5 w-3.5 text-blue-500 mb-1" />
            Keamanan Data: mTLS 1.3, SSL Pinning, enkripsi baris pgCrypto diaktifkan otomatis.
          </div>
        </div>

        {/* Selected Schema table grid (Center/Right, Span 2) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 select-none">
              <h5 className="text-base font-extrabold outfit-font text-gray-900 flex items-center gap-2">
                <FileCode className="h-5 w-5 text-gray-500" />
                <span>Field Kamus untuk "public.{selectedSchema}"</span>
              </h5>
              <span className="mono-font bg-slate-900 border border-slate-800 text-white font-semibold text-[9px] py-1 px-2.5 rounded-full uppercase">
                PostgreSQL v16.3
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-[9px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Nama Kolom</th>
                    <th className="py-2.5 px-3">Tipe Data</th>
                    <th className="py-2.5 px-3">Atribut Key / Constraint</th>
                    <th className="py-2.5 px-3">Deskripsi / Defaults</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-mono text-gray-700">
                  {schemaSpecs[selectedSchema].map((field, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-bold text-slate-900">{field.col}</td>
                      <td className="py-3 px-3 text-blue-600 font-medium">{field.type}</td>
                      <td className="py-3 px-3">
                        {field.key !== "—" ? (
                          <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1.5 py-0.5 rounded select-none">
                            {field.key}
                          </span>
                        ) : (
                          <span className="text-gray-300">none</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[10px] leading-relaxed">{field.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* SQL Execution Playground & Formatted Table Result */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2 select-none">
          <div className="space-y-0.5">
            <h4 className="text-md font-bold text-gray-900 outfit-font flex items-center gap-2">
              <Terminal className="h-5 w-5 text-gray-600" /> PostgreSQL Command Engine & Live Audit WAL Stream
            </h4>
            <p className="text-gray-400 text-xs">Uji kueri database pada tumpukan database sandboxed OJK secara langsung.</p>
          </div>
          
          <div className="flex items-center gap-2 select-none">
            {sqlPresets.map((ps, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSqlInput(ps.q);
                  handleRunQuery(ps.q);
                }}
                className="bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none"
              >
                {ps.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          
          {/* SQL Input Area */}
          <div className="w-full lg:w-1/3 flex flex-col justify-between gap-3">
            <textarea
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
              className="w-full h-32 md:h-full bg-[#0f172a] hover:bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed shadow-inner"
              placeholder="SELECT * FROM public.detected_accounts;"
            />
            <button
              onClick={() => handleRunQuery()}
              className="w-full flex items-center justify-center gap-1 bg-slate-900 hover:bg-black text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" /> JALANKAN SQL QUERY
            </button>
          </div>

          {/* Table Result Presentation */}
          <div className="w-full lg:w-2/3 max-h-[295px] overflow-auto border border-gray-200 bg-[#f8fafc] rounded-xl p-4 shadow-inner">
            {queryError ? (
              <div className="h-full flex items-center justify-center text-xs font-mono font-bold text-red-600 bg-red-50 p-4 border border-red-100 rounded-xl leading-relaxed whitespace-pre-wrap">
                ⚠ {queryError}
              </div>
            ) : queryResult ? (
              <div className="overflow-x-auto h-full">
                <table className="w-full text-left border-collapse text-[11px] font-mono select-none">
                  <thead>
                    <tr className="border-b border-gray-200 bg-white shadow-sm text-slate-450 font-bold uppercase tracking-wider sticky top-0">
                      {queryResult.columns.map((c, i) => (
                        <th key={i} className="py-2 px-3">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 bg-white">
                    {queryResult.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-55/40 text-slate-800">
                        {queryResult.columns.map((c, cIdx) => (
                          <td key={cIdx} className="py-2.5 px-3 font-semibold truncate max-w-[150px]">
                            {typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 font-mono italic">
                Simulasi Kueri Postgres Kosong. Ketik kueri atau pilih preset di atas.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Raw terminal sync system stream logs */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
        
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 select-none">
          <div className="flex items-center gap-2">
            <Terminal className="h-5.5 w-5.5 text-slate-700" />
            <h5 className="text-base font-extrabold outfit-font text-gray-900">
              PostgreSQL WAL Sync & mTLS Server Broadcast Console
            </h5>
          </div>
          <button
            onClick={handleClearLogs}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 hover:text-red-600 text-slate-500 font-bold text-[10px] py-1.5 px-3 rounded-lg transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" /> BERSIHKAN LOG AUDIT
          </button>
        </div>

        {/* Console Panel Terminal */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-h-[300px] overflow-y-auto p-4 flex flex-col-reverse shadow-inner">
          <div ref={terminalEndRef} />
          {logs.map((log) => (
            <div key={log.id} className={`terminal-line ${
              log.type === 'success' ? 't-success' :
              log.type === 'error' ? 't-error' :
              log.type === 'warning' ? 't-warning' :
              log.type === 'db' ? 't-db' :
              log.type === 'ai' ? 't-ai' :
              log.type === 'mtls' ? 't-mtls' : 't-info'
            }`}>
              <span className="opacity-40 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
            </div>
          ))}
        </div>
        
      </div>

    </div>
  );
}
