/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { NexaDB } from '../lib/db';
import { DetectedAccount, ExecutionStep } from '../types';
import { 
  ShieldAlert, ShieldCheck, KeyRound, Play, CheckCircle2, 
  HelpCircle, Server, FileText, Cpu, Shield, RefreshCw, 
  AlertOctagon, Download, Loader2, Network, UserCheck
} from 'lucide-react';

interface RuangEksekusiProps {
  initialTargetAccount: string | null;
  onExecutionCompleted: () => void;
}

export default function RuangEksekusi({ initialTargetAccount, onExecutionCompleted }: RuangEksekusiProps) {
  const [selectedAccNum, setSelectedAccNum] = useState<string>('');
  const [suspectedAccounts, setSuspectedAccounts] = useState<DetectedAccount[]>([]);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Sequencer States
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [steps, setSteps] = useState<ExecutionStep[]>([
    { id: 1, title: 'mTLS Handshake & Ingest Check', description: 'Verifying public endpoint keys with OJK Secure Central Node', status: 'idle' },
    { id: 2, title: 'Identity Resolution (Dukcapil)', description: 'Querying NIK mapping database via IPSec VPN tunnel', status: 'idle' },
    { id: 3, title: 'NEXA-GNN Tensor Inference', description: 'Allocating GPU memory arrays for clustering classification', status: 'idle' },
    { id: 4, title: 'Primary Account Hold Order', description: 'Broadcasting temporary suspension commands across OJK federation services', status: 'idle' },
    { id: 5, title: 'Parallel Enforcement (BCA Node)', description: 'Neutralizing BCA sub-nodes & holding related transfer paths', status: 'idle' },
    { id: 6, title: 'Parallel Enforcement (BNI Node)', description: 'Suspending BNI electronic cash interfaces & logging trace edges', status: 'idle' },
    { id: 7, title: 'Parallel Enforcement (Mandiri Node)', description: 'Placing temporary holds on Mandiri destination transfers', status: 'idle' },
    { id: 8, title: 'Compliance Sync & PostgreSQL WAL Write', description: 'Compiling cryptographic hash checksum ledger reports', status: 'idle' }
  ]);

  // Canvas visual states
  const [activeCanvasLinks, setActiveCanvasLinks] = useState({
    kemenkomdigi: false,
    dukcapil: false,
    target: false,
    bca: false,
    bni: false,
    mandiri: false
  });

  const [activeCanvasNodes, setActiveCanvasNodes] = useState({
    ojk: true,
    kemenkomdigi: false,
    dukcapil: false,
    target: false,
    bca: false,
    bni: false,
    mandiri: false
  });

  // Final Judicial report state
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportDetails, setReportDetails] = useState<any>(null);

  // References for timeouts to clear safely on unmount
  const executionTimerRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Load suspected accounts
    const accs = NexaDB.getAccounts().filter(a => a.status === 'suspected');
    setSuspectedAccounts(accs);

    if (initialTargetAccount) {
      setSelectedAccNum(initialTargetAccount);
    } else if (accs.length > 0) {
      setSelectedAccNum(accs[0].account_number);
    }

    return () => {
      // Clean up async intervals
      executionTimerRefs.current.forEach(clearTimeout);
    };
  }, [initialTargetAccount]);

  const targetAccountInfo = NexaDB.getAccounts().find(a => a.account_number === selectedAccNum);

  // Pin authentication action
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length !== 6) {
      setPinError('PIN Keypad harus berupa 6-digit numerik.');
      return;
    }

    const verifiedAdmin = NexaDB.verifyPin(pinInput);
    if (verifiedAdmin) {
      setCurrentUser(verifiedAdmin);
      setPinError('');
      setPinInput('');
      setPinModalOpen(false);
      startEmergencyPipeline(verifiedAdmin);
    } else {
      setPinError('PIN Otoritas tidak cocok. Akses mTLS ditolak.');
    }
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setPinInput('');
    } else if (val === '⌫') {
      setPinInput(p => p.slice(0, -1));
    } else if (pinInput.length < 6) {
      setPinInput(p => p + val);
    }
  };

  // Run the 8-Stage Secure Automated Sequencer
  const startEmergencyPipeline = (operator: any) => {
    setIsExecuting(true);
    setShowReportCard(false);
    
    // Reset steps to idle status
    const resetSteps = steps.map(s => ({ ...s, status: 'idle' as const, details: undefined }));
    setSteps(resetSteps);
    
    // Reset canvas states
    setActiveCanvasLinks({
      kemenkomdigi: false, dukcapil: false, target: false, bca: false, bni: false, mandiri: false
    });
    setActiveCanvasNodes({
      ojk: true, kemenkomdigi: false, dukcapil: false, target: false, bca: false, bni: false, mandiri: false
    });

    NexaDB.emitLog('mtls', `[mTLS Operations Tunnel] Launching secure state session. Operator: ${operator.name}`);

    // Sequential steps delays (milliseconds)
    const stepDelays = [1200, 1500, 1800, 1500, 1400, 1300, 1300, 1600];
    let totalDelay = 0;

    stepDelays.forEach((delay, index) => {
      const timer = setTimeout(() => {
        executeStep(index, operator);
      }, totalDelay);
      executionTimerRefs.current.push(timer);
      totalDelay += delay;
    });
  };

  const executeStep = (index: number, operator: any) => {
    setCurrentStepIndex(index);
    setSteps(current => current.map((st, i) => {
      if (i === index) return { ...st, status: 'processing' as const };
      if (i < index) return { ...st, status: 'success' as const };
      return st;
    }));

    const accountNumString = selectedAccNum;

    switch (index) {
      case 0: // Step 1: OJK mTLS Handshake
        setActiveCanvasNodes(n => ({ ...n, kemenkomdigi: true }));
        setActiveCanvasLinks(l => ({ ...l, kemenkomdigi: true }));
        NexaDB.emitLog('info', `[Step 1/8] Verifying identity certificates with OJK secure Ingest Hub at endpoint: "/api/v1/ingest-fraud"`);
        setSteps(current => current.map((st, i) => i === 0 ? { ...st, details: 'OJK Secure Hub verified. mTLS certificates validated.' } : st));
        break;

      case 1: // Step 2: Identity Resolution
        setActiveCanvasNodes(n => ({ ...n, dukcapil: true }));
        setActiveCanvasLinks(l => ({ ...l, dukcapil: true }));
        NexaDB.emitLog('info', `[Step 2/8] Fetching NIK payload over secure VPN tunneling. Querying NIK mapping for target account holder.`);
        setSteps(current => current.map((st, i) => i === 1 ? { ...st, details: `Resolved Entity: "${targetAccountInfo?.holder_name || 'PT Digital Indonesia Sejahtera'}" as verified NIK master registry.` } : st));
        break;

      case 2: // Step 3: GNN Inference
        NexaDB.emitLog('ai', `[Step 3/8] Simulating 4GB GPU Tensor allocation. Clustering adjacent transaction graphs for ${accountNumString}...`);
        setSteps(current => current.map((st, i) => i === 2 ? { ...st, details: 'Clustering index resolved. Primary anomaly probability matches NEXA-GNN indices at 94.7% accuracy.' } : st));
        break;

      case 3: // Step 4: Primary Hold Order
        setActiveCanvasNodes(n => ({ ...n, target: true }));
        setActiveCanvasLinks(l => ({ ...l, target: true }));
        NexaDB.emitLog('mtls', `[Step 4/8] Issuing emergency temporary suspension request for Primary Suspect core ledger account: ${accountNumString}...`);
        NexaDB.freezeAccount(accountNumString);
        setSteps(current => current.map((st, i) => i === 3 ? { ...st, details: `Primary wallet status updated to TEMPORARY_HOLD in database. Core-Banking balance suspended.` } : st));
        break;

      case 4: // Step 5: BCA Node Hold
        setActiveCanvasNodes(n => ({ ...n, bca: true }));
        setActiveCanvasLinks(l => ({ ...l, bca: true }));
        NexaDB.emitLog('info', `[Step 5/8] Contacts BCA core-gateway api. Traced wire transfer edge value of IDR 1.24B into auxiliary account 8830112244.`);
        NexaDB.insertFlow({
          source_account: accountNumString,
          dest_account: '8830112244',
          amount_idr: 1240000000,
          transfer_type: 'BI_FAST',
          flagged: true,
          pattern_match: ['Level 1 Auxiliary Layering Account']
        });
        setSteps(current => current.map((st, i) => i === 4 ? { ...st, details: 'Linked BCA secondary wallet quarantined. Cash dispersal path put on temporary hold.' } : st));
        break;

      case 5: // Step 6: BNI Node Hold
        setActiveCanvasNodes(n => ({ ...n, bni: true }));
        setActiveCanvasLinks(l => ({ ...l, bni: true }));
        NexaDB.emitLog('info', `[Step 6/8] Contacts BNI core-gateway api. Suspended transaction channels on account 1120098443.`);
        NexaDB.insertFlow({
          source_account: accountNumString,
          dest_account: '1120098443',
          amount_idr: 870000000,
          transfer_type: 'Virtual_Account',
          flagged: true,
          pattern_match: ['Level 2 Smurfing Dispersal Account']
        });
        setSteps(current => current.map((st, i) => i === 5 ? { ...st, details: 'Linked BNI active nodes isolated. Electronic settlement channels suspended temporarily.' } : st));
        break;

      case 6: // Step 7: Mandiri Node Hold
        setActiveCanvasNodes(n => ({ ...n, mandiri: true }));
        setActiveCanvasLinks(l => ({ ...l, mandiri: true }));
        NexaDB.emitLog('info', `[Step 7/8] Contacts Mandiri Gateway. Placed hold on destination node 7741003312 tracking cash outlays.`);
        NexaDB.insertFlow({
          source_account: accountNumString,
          dest_account: '7741003312',
          amount_idr: 560000000,
          transfer_type: 'RTGS',
          flagged: true,
          pattern_match: ['Level 3 Structuring Withdrawal Node']
        });
        setSteps(current => current.map((st, i) => i === 6 ? { ...st, details: 'Linked Mandiri endpoint disabled. Outgoing RTGS routes suspended.' } : st));
        break;

      case 7: // Step 8: postgres Compliance Sync
        NexaDB.emitLog('db', `[Step 8/8] Syncing transaction blocks into official enforcement journal.`);
        const reportId = `OJK-ENF-${Math.floor(10000000 + Math.random() * 90000000)}`;
        
        const finalLog = NexaDB.insertEnforcementLog({
          report_id: reportId,
          target_account: accountNumString,
          operator: `${operator.name} (${operator.operator_id})`,
          nodes_blocked: 4,
          total_flow_idr: (targetAccountInfo?.total_flow_idr || 1240000000) + 1240000000 + 870000000 + 560000000,
          ai_confidence: 0.947,
          action_type: 'auto_block',
          status: 'complete'
        });

        setSteps(current => current.map((st, i) => i === 7 ? { ...st, status: 'success' as const, details: `Ledger written: ${reportId}. Cryptographic signatures compiled.` } : st));
        
        // Complete state sequence
        setReportDetails(finalLog);
        setShowReportCard(true);
        setIsExecuting(false);
        onExecutionCompleted();
        break;
    }
  };

  // TXT judicial report file builder using Blob
  const handleDownloadReportText = () => {
    if (!reportDetails || !targetAccountInfo) return;

    const reportContent = `========================================================================
                      SURAT AMAR KEPUTUSAN PENINDAKAN
                   UPT PEMBERANTASAN JUDI ONLINE NASIONAL
                OTORITAS JASA KEUANGAN (OJK) REPUBLIK INDONESIA
========================================================================

ID LAPORAN RESMI      : ${reportDetails.report_id}
TANGGAL PENINDAKAN    : ${new Date(reportDetails.created_at).toLocaleString('id-ID')}
OTORITAS EKSEKUTIF    : ${reportDetails.operator}
TIER KEWENANGAN       : PENANGGUHAN SEMENTARA REKENING (OJK COMPLIANT)
PROTOKOL JARINGAN     : SECURE mTLS (RSA-4096 VALIDATED)

------------------------------------------------------------------------
DETAIL REKENING UTAMA (TERKAIT SINDIKASI/PRIMARY TARGET):
------------------------------------------------------------------------
No. Rekening Utama    : ${targetAccountInfo.account_number}
Nama Pemilik KYC      : ${targetAccountInfo.holder_name}
Instansi Perbankan    : ${targetAccountInfo.bank_name}
Klasifikasi Risiko    : GNN PROBABILITY ${ (targetAccountInfo.risk_score * 100).toFixed(1) }%
Indikasi Kejahatan    : Fasilitator Aliran Transaksi Deposit Judi Online
Status Akhir Ledg     : REKENING DITANGGUHKAN SEMENTARA (mTLS HOLD COMMAND ACTIVE)

------------------------------------------------------------------------
NODE JARINGAN YANG DITANGGUHKAN SEMENTARA (PARALLEL HOLDS):
------------------------------------------------------------------------
1. BCA Secondary Hold Node [8830112244]  - Rp 1.240.000.000 (SUSPENDED)
2. BNI Smurfing Portal Node [1120098443]  - Rp 870.000.000 (SUSPENDED)
3. Mandiri Flow-Route Node [7741003312]  - Rp 560.000.000 (SUSPENDED)

Total Dana yang Disamarkan: Rp ${reportDetails.total_flow_idr.toLocaleString('id-ID')}
Jumlah Node yang Ditangguhkan: ${reportDetails.nodes_blocked} Node Jaringan

------------------------------------------------------------------------
DEKLARASI INTEGRITAS DAN KEBIJAKAN REGULATOR OJK:
------------------------------------------------------------------------
Kunci Verifikasi SHA-256 : ${Math.random().toString(16).substr(2, 64).toUpperCase()}
Sistem Operasi GNN       : NEXA-GNN-v3.1 ENGINE

Berdasarkan kebijakan OJK Republik Indonesia mengenai anti-pencucian uang 
dan pemberantasan aktivitas perjudian online ilegal nasional, tindakan 
yang dieksekusi adalah PENANGGUHAN REKENING SEMENTARA demi keselamatan 
aset keuangan negara, bukan pemblokiran rekening sepihak permanen.

Dokumen ini sah dikeluarkan melalui sistem NEXA AI mTLS Otoritas Jasa Keuangan,
tidak memerlukan tanda tangan basah demi kecepatan penanganan darurat.

========================================================================
           Otoritas Jasa Keuangan (OJK) RI, Gedung Soemitro Djojohadikusumo
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LAPORAN_PENINDAKAN_${reportDetails.report_id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    NexaDB.emitLog('info', `Surat keputusan hukum TXT Berhasil diunduh untuk Arsip Kepatuhan OJK: "${reportDetails.report_id}"`);
  };

  return (
    <div className="space-y-6" id="tracer-tab">

      {/* Target selector and operator confirmation cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* left Card: Operations Control */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-extrabold outfit-font">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
              <h4 className="text-md uppercase tracking-wider">Pusat Eksekusi Operasi</h4>
            </div>
            
            <p className="text-gray-500 text-xs leading-relaxed">
              Pilih rekening sasaran utama dari antrean GNN. Sistem akan mengoordinasikan interkoneksi NIK, pemetaan kluster transaksi, dan penangguhan sementara paralel di jaringan perbankan tujuan sesuai kebijakan resmi OJK.
            </p>

            {/* Selector list dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400">Pilih Rekening Tersangka</label>
              {suspectedAccounts.length === 0 ? (
                <div className="text-xs text-amber-600 font-semibold bg-amber-50 p-3 rounded-xl border border-amber-100">
                  Tidak ada rekening mencurigai yang aktif di antrean saat ini. Buat simulasi baru di dashboard!
                </div>
              ) : (
                <select
                  value={selectedAccNum}
                  onChange={(e) => setSelectedAccNum(e.target.value)}
                  disabled={isExecuting}
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3 font-mono text-xs font-bold text-gray-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                >
                  {suspectedAccounts.map(acc => (
                    <option key={acc.id} value={acc.account_number}>
                      {acc.account_number} - {acc.holder_name.substring(0, 15)}... ({acc.bank_name})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Active Targets Stats Info inside Control card */}
            {targetAccountInfo && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                <h5 className="text-[10px] uppercase font-bold text-gray-400">Profil Rekening Sasaran</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 text-[9px] block">Holder KYC:</span>
                    <strong className="text-gray-800">{targetAccountInfo.holder_name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[9px] block">Risiko Kejahatan:</span>
                    <strong className="text-red-600 font-mono">{(targetAccountInfo.risk_score * 100).toFixed(0)}% Confidence</strong>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200">
                    <span className="text-gray-400 text-[9px] block">Volume Dana Tersangka Utama:</span>
                    <strong className="text-gray-900 font-mono text-sm">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(targetAccountInfo.total_flow_idr)}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setPinModalOpen(true)}
            disabled={isExecuting || !selectedAccNum}
            className={`w-full flex items-center justify-center gap-2 ${isExecuting ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'} text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-red-200 uppercase tracking-widest transition-all cursor-pointer mt-4`}
            id="btn-trigger-freeze"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Eksekusi Sedang Berjalan...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" /> TRIGGER TEMPORARY ACCOUNTS SUSPENSION
              </>
            )}
          </button>
        </div>

        {/* right Card: visual network node canvas */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden relative">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0.5">
              <h4 className="text-lg font-bold text-gray-900 outfit-font">Tracer & Enforcement Interactive Canvas</h4>
              <p className="text-gray-400 text-xs">Simulasi visual pergerakan mTLS inter-bank di OJK secure sandbox</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] tracking-wide uppercase font-extrabold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <Network className="h-3.5 w-3.5" /> SECURE MTLS CANVAS
            </div>
          </div>

          {/* Interactive Responsive SVG Node Canvas Grid */}
          <div className="relative w-full aspect-[16/10] bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-inner flex items-center justify-center select-none" id="viz-area">
            
            {/* SVG Link lines between nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" id="viz-svg">
              <defs>
                {/* Flow lines color states */}
                <linearGradient id="trace-flow-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <linearGradient id="trace-flow-red" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
              </defs>

              {/* Connections (Coordinates set as proportional percentage lines) */}
              {/* OJK <-> OJK Ingress Feed */}
              <line 
                x1="50%" y1="50%" x2="15%" y2="20%" 
                stroke={activeCanvasLinks.kemenkomdigi ? '#06b6d4' : '#1e293b'} 
                strokeWidth={activeCanvasLinks.kemenkomdigi ? '2.5' : '1.5'} 
                strokeDasharray={activeCanvasLinks.kemenkomdigi ? '5,5' : 'none'}
                className={activeCanvasLinks.kemenkomdigi ? 'animate-dash-offset' : ''}
              />
              
              {/* OJK <-> Dukcapil */}
              <line 
                x1="50%" y1="50%" x2="85%" y2="20%" 
                stroke={activeCanvasLinks.dukcapil ? '#06b6d4' : '#1e293b'} 
                strokeWidth={activeCanvasLinks.dukcapil ? '2.5' : '1.5'} 
                strokeDasharray={activeCanvasLinks.dukcapil ? '5,5' : 'none'}
                className={activeCanvasLinks.dukcapil ? 'animate-dash-offset' : ''}
              />

              {/* OJK <-> Target account Suspect node */}
              <line 
                x1="50%" y1="50%" x2="50%" y2="15%" 
                stroke={activeCanvasLinks.target ? '#ef4444' : '#1e293b'} 
                strokeWidth={activeCanvasLinks.target ? '3' : '1.5'} 
                strokeDasharray={activeCanvasLinks.target ? '5,5' : 'none'}
                className={activeCanvasLinks.target ? 'animate-dash-offset' : ''}
              />

              {/* OJK <-> BCA Parallel Node */}
              <line 
                x1="50%" y1="50%" x2="15%" y2="80%" 
                stroke={activeCanvasLinks.bca ? '#10b981' : '#1e293b'} 
                strokeWidth={activeCanvasLinks.bca ? '2.5' : '1.5'} 
                strokeDasharray={activeCanvasLinks.bca ? '5,5' : 'none'}
                className={activeCanvasLinks.bca ? 'animate-dash-offset' : ''}
              />

              {/* OJK <-> BNI Parallel Node */}
              <line 
                x1="50%" y1="50%" x2="85%" y2="80%" 
                stroke={activeCanvasLinks.bni ? '#10b981' : '#1e293b'} 
                strokeWidth={activeCanvasLinks.bni ? '2.5' : '1.5'} 
                strokeDasharray={activeCanvasLinks.bni ? '5,5' : 'none'}
                className={activeCanvasLinks.bni ? 'animate-dash-offset' : ''}
              />

              {/* OJK <-> Mandiri Parallel Node */}
              <line 
                x1="50%" y1="50%" x2="50%" y2="85%" 
                stroke={activeCanvasLinks.mandiri ? '#10b981' : '#1e293b'} 
                strokeWidth={activeCanvasLinks.mandiri ? '2.5' : '1.5'} 
                strokeDasharray={activeCanvasLinks.mandiri ? '5,5' : 'none'}
                className={activeCanvasLinks.mandiri ? 'animate-dash-offset' : ''}
              />
            </svg>

            {/* CANVAS LABELS & PHYSICAL NODES */}
            
            {/* National Central OJK Super-Hub (Located precisely in middle) */}
            <div className="absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center z-10">
              <div className="h-14 w-14 rounded-full bg-slate-900 border-2 border-blue-500 shadow-lg shadow-blue-500/20 flex items-center justify-center relative">
                <span className="absolute -inset-1.5 rounded-full border border-blue-500/30 animate-pulse"></span>
                <Shield className="h-7 w-7 text-blue-400" />
              </div>
              <span className="text-[10px] font-bold text-blue-400 mt-2 outfit-font px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
                OJK SUPER-HUB
              </span>
            </div>

            {/* Node 1: OJK secure Ingress Handshake Node (Top-Left 15%, 20%) */}
            <div className="absolute left-[15%] top-[20%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center z-10 transition-all">
              <div className={`h-11 w-11 rounded-full ${activeCanvasNodes.kemenkomdigi ? 'bg-cyan-950 border-cyan-400 shadow-md shadow-cyan-400/40 scale-105' : 'bg-slate-900 border-slate-800'} border-2 flex items-center justify-center transition-all`}>
                <Server className={`h-5 w-5 ${activeCanvasNodes.kemenkomdigi ? 'text-cyan-400' : 'text-slate-600'}`} />
              </div>
              <span className={`text-[9px] font-bold ${activeCanvasNodes.kemenkomdigi ? 'text-cyan-400' : 'text-slate-500'} mt-1.5 mono-font`}>
                OJK_SECURE_FEED
              </span>
            </div>

            {/* Node 2: Dukcapil Identity Router (Top-Right 85%, 20%) */}
            <div className="absolute left-[85%] top-[20%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center z-10 transition-all">
              <div className={`h-11 w-11 rounded-full ${activeCanvasNodes.dukcapil ? 'bg-cyan-950 border-cyan-400 shadow-md shadow-cyan-400/40 scale-105' : 'bg-slate-900 border-slate-800'} border-2 flex items-center justify-center transition-all`}>
                <UserCheck className={`h-5 w-5 ${activeCanvasNodes.dukcapil ? 'text-cyan-400' : 'text-slate-600'}`} />
              </div>
              <span className={`text-[9px] font-bold ${activeCanvasNodes.dukcapil ? 'text-cyan-400' : 'text-slate-500'} mt-1.5 mono-font`}>
                DUKCAPIL_NIK_GW
              </span>
            </div>

            {/* Node 3: Primary Suspected Wallet (Top Center 50%, 15%) */}
            <div className="absolute left-[50%] top-[15%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center z-10 transition-all">
              {targetAccountInfo && activeCanvasNodes.target && (
                <div className="absolute -top-7 px-2 py-0.5 rounded-md bg-amber-600 border border-amber-500 text-[8px] font-bold text-white uppercase animate-bounce">
                  SUSPENDED
                </div>
              )}
              <div className={`h-12 w-12 rounded-full ${activeCanvasNodes.target ? 'bg-amber-950 border-amber-500 shadow-md shadow-amber-500/50 scale-110' : 'bg-slate-900 border-slate-800'} border-2 flex items-center justify-center transition-all`}>
                <AlertOctagon className={`h-5.5 w-5.5 ${activeCanvasNodes.target ? 'text-amber-505 animate-pulse' : 'text-slate-600'}`} />
              </div>
              <span className={`text-[10px] font-extrabold ${activeCanvasNodes.target ? 'text-amber-400' : 'text-slate-500'} mt-1.5 mono-font`}>
                {selectedAccNum || 'SUSPECT_WALLET'}
              </span>
            </div>

            {/* Node 4: Parallel Block BCA Gateway (Bottom-Left 15%, 80%) */}
            <div className="absolute left-[15%] top-[80%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center z-10 transition-all">
              <div className={`h-11 w-11 rounded-full ${activeCanvasNodes.bca ? 'bg-emerald-950 border-emerald-400 shadow-md shadow-emerald-400/40 scale-105' : 'bg-slate-900 border-slate-800'} border-2 flex items-center justify-center transition-all`}>
                <Cpu className={`h-5 w-5 ${activeCanvasNodes.bca ? 'text-emerald-400' : 'text-slate-600'}`} />
              </div>
              <span className={`text-[9px] font-bold ${activeCanvasNodes.bca ? 'text-emerald-400' : 'text-slate-500'} mt-1.5 mono-font`}>
                BCA_HOLD_GATEWAY
              </span>
            </div>

            {/* Node 5: Parallel Block BNI Gateway (Bottom-Right 85%, 80%) */}
            <div className="absolute left-[85%] top-[80%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center z-10 transition-all">
              <div className={`h-11 w-11 rounded-full ${activeCanvasNodes.bni ? 'bg-emerald-950 border-emerald-400 shadow-md shadow-emerald-400/40 scale-105' : 'bg-slate-900 border-slate-800'} border-2 flex items-center justify-center transition-all`}>
                <Cpu className={`h-5 w-5 ${activeCanvasNodes.bni ? 'text-emerald-400' : 'text-slate-600'}`} />
              </div>
              <span className={`text-[9px] font-bold ${activeCanvasNodes.bni ? 'text-emerald-400' : 'text-slate-500'} mt-1.5 mono-font`}>
                BNI_HOLD_GATEWAY
              </span>
            </div>

            {/* Node 6: Parallel Block Mandiri Gateway (Bottom Center 50%, 85%) */}
            <div className="absolute left-[50%] top-[85%] -translate-x-[50%] -translate-y-[50%] flex flex-col items-center z-10 transition-all">
              <div className={`h-11 w-11 rounded-full ${activeCanvasNodes.mandiri ? 'bg-emerald-950 border-emerald-400 shadow-md shadow-emerald-400/40 scale-105' : 'bg-slate-900 border-slate-800'} border-2 flex items-center justify-center transition-all`}>
                <Cpu className={`h-5 w-5 ${activeCanvasNodes.mandiri ? 'text-emerald-400' : 'text-slate-600'}`} />
              </div>
              <span className={`text-[9px] font-bold ${activeCanvasNodes.mandiri ? 'text-emerald-400' : 'text-slate-500'} mt-1.5 mono-font`}>
                MANDIRI_HOLD_GATEWAY
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* Sequencer step timeline logs progress & judicial PDF-style print results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step Sequencer Timeline Log (Left, Span 2) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-sm">
          <h4 className="text-md font-bold text-gray-900 outfit-font mb-4">Urutan Penangguhan Rekening Jaringan (OJK Core-Banking Pipeline Progress)</h4>
          
          <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-4">
            {steps.map((st, i) => (
              <div key={st.id} className="relative select-none">
                {/* Node Status Markers */}
                <span className={`absolute -left-[33px] top-0.5 rounded-full h-[14px] w-[14px] border-2 bg-white flex items-center justify-center transition-all ${
                  st.status === 'success' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 h-5 w-5 -left-[36px]' :
                  st.status === 'processing' ? 'border-blue-500 bg-white animate-pulse h-5 w-5 -left-[36px] text-blue-600' :
                  'border-gray-200'
                }`}>
                  {st.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                  {st.status === 'processing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </span>

                <div className="space-y-0.5">
                  <h5 className={`text-xs font-bold ${st.status === 'processing' ? 'text-blue-600' : st.status === 'success' ? 'text-emerald-600' : 'text-gray-750'}`}>
                    {st.title}
                  </h5>
                  <p className="text-[11px] text-gray-450">{st.description}</p>
                  
                  {st.details && (
                    <div className="text-[10px] font-mono bg-slate-50 border border-slate-100 p-2 rounded-md text-slate-600 mt-1 max-w-xl">
                      {st.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Completed Audit Judicial Report (Right, Span 1) */}
        <div className="lg:col-span-1 flex flex-col justify-start">
          {showReportCard && reportDetails && targetAccountInfo ? (
            <div className="border border-blue-200 shadow-md shadow-blue-50/50 bg-gradient-to-br from-white to-blue-50/20 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full min-h-[380px]" id="audit-report">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-600 font-bold outfit-font text-sm select-none border-b border-blue-100 pb-3">
                  <ShieldCheck className="h-6 w-6" />
                  <span>DEKRIT SUSPENSI REKENING SEMENTARA OJK DIRESMIKAN</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-gray-405 text-[9px] uppercase font-bold block">Enforcement ID:</span>
                    <strong className="mono-font text-blue-600 text-sm tracking-tight">{reportDetails.report_id}</strong>
                  </div>

                  <div>
                    <span className="text-gray-405 text-[9px] uppercase font-bold block">Target Ledger Verified NIK:</span>
                    <strong className="text-gray-800">{targetAccountInfo.holder_name} ({targetAccountInfo.account_number})</strong>
                  </div>

                  <div>
                    <span className="text-gray-405 text-[9px] uppercase font-bold block">Volume Aliran Dana Diamankan:</span>
                    <strong className="text-gray-900 text-sm font-mono font-extrabold block">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(reportDetails.total_flow_idr)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-405 text-[9px] uppercase font-bold block">Mitra OJK Perbankan Dilumpuhkan:</span>
                    <span className="inline-flex flex-wrap gap-1 mt-1">
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">BCA</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">BNI</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">MANDIRI</span>
                    </span>
                  </div>

                  <div className="pt-2 border-t border-blue-105 space-y-1">
                    <span className="text-[10px] text-gray-400 block font-semibold leading-relaxed">Cryptographic Proof SHA-256 Verified. Audit compliance logging complete to master db schema. Ready for OJK Registry Archiving.</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={handleDownloadReportText}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer mt-5"
                >
                  <Download className="h-4 w-4" /> AMBIL KEPUTUSAN LEGALISASI (TXT)
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 h-full select-none min-h-[380px]">
              <FileText className="h-10 w-10 text-slate-300" />
              <p className="text-slate-500 font-bold text-xs outfit-font">Surat Keputusan Belum Diterbitkan</p>
              <p className="text-slate-400 text-[10px] max-w-[200px] leading-relaxed">
                Tekan tombol penangguhan massal dan masukkan PIN superintendent OJK untuk memproses dokumen judisial sesuai hukum perbankan.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* SECURITY ACCESS PIN MODAL OVERLAY */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-filter backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2 select-none">
              <div className="h-11 w-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <KeyRound className="h-5.5 w-5.5" />
              </div>
              <h4 className="text-lg font-bold outfit-font text-gray-900">Otorisasi Supervisor mTLS</h4>
              <p className="text-gray-400 text-[11px] leading-relaxed max-w-[280px] mx-auto">
                Tindakan penangguhan berantai memerlukan verifikasi PIN 6-digit. Pemangku kebijakan berwenang:
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div className="flex flex-col items-center gap-1">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="******"
                  maxLength={6}
                  autoFocus
                  className="w-full text-center tracking-[1em] text-xl font-bold font-mono bg-[#f8fafc] border border-gray-200 rounded-xl py-2 px-3 outline-none focus:border-red-500 focus:bg-white"
                />
                {pinError && (
                  <span className="text-[10px] font-bold text-red-500 mt-1 block">
                    ⚠ {pinError}
                  </span>
                )}
              </div>

              {/* Secure visual Numeric Keypad panel */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKeypadPress(key)}
                    className="h-10 w-10 text-xs font-extrabold font-mono rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center transition-colors shadow-sm focus:outline-none cursor-pointer select-none mx-auto"
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPinModalOpen(false);
                    setPinInput('');
                    setPinError('');
                  }}
                  className="w-1/2 text-center bg-gray-150 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2.5 rounded-xl border border-gray-200 transition-colors cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  className="w-1/2 text-center bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  VERIFIKASI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
