/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NexaDB } from '../lib/db';
import { DetectedAccount } from '../types';
import { ShieldAlert, ShieldCheck, TrendingUp, AlertTriangle, Activity, Database, Sparkles, Plus, Clock, Globe, Download } from 'lucide-react';

interface MacroMonitoringProps {
  onNavigateToTracer: (accountNumber: string) => void;
  triggerRedraw: number;
}

export default function MacroMonitoring({ onNavigateToTracer, triggerRedraw }: MacroMonitoringProps) {
  const [accounts, setAccounts] = useState<DetectedAccount[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  const handleDownloadSuspectReport = (acc: DetectedAccount) => {
    // Retrieve GNN Analysis pattern for this account if exists, or generate a high-fidelity one based on its score
    const matchingAnalysis = NexaDB.getAnalysis().find(an => an.target_account === acc.account_number);
    const gamblingProb = matchingAnalysis ? matchingAnalysis.gambling_prob : acc.risk_score;
    const layeringProb = matchingAnalysis ? matchingAnalysis.layering_prob : (acc.risk_score * 0.9);
    const structuringProb = matchingAnalysis ? matchingAnalysis.structuring_prob : (acc.risk_score * 0.85);
    const smurfingProb = matchingAnalysis ? matchingAnalysis.smurfing_prob : (acc.risk_score * 0.88);
    const patterns = matchingAnalysis ? matchingAnalysis.patterns : [
      'Aktivitas transfer berfrekuensi tinggi di malam hari (pukul 22:00 - 04:00)',
      'Konsistensi penataan dana di bawah batas pelaporan tunai Rp 100 Juta',
      'Masuk dan keluarnya dana mikro dalam hitungan detik (GND/Smurfing Network)'
    ];

    const reportContent = `========================================================================
             LAPORAN ANALISIS ANOMALI & RISIKO PERJUDIAN ONLINE
                OTORITAS JASA KEUANGAN (OJK) REPUBLIK INDONESIA
========================================================================

DETAIL IDENTITAS REKENING MASUK DAFTAR WASPADA:
------------------------------------------------------------------------
Nomor Rekening     : ${acc.account_number}
Nama Pemilik (KYC) : ${acc.holder_name}
Nama Bank          : ${acc.bank_name}
Asal Laporan       : ${acc.reported_by}
Waktu Deteksi      : ${new Date(acc.detected_at).toLocaleString('id-ID')} WIB

FAKTOR ANALISIS ANOMALI SIFAT DAN AKUN (NEXA-GNN PROBABILITY):
------------------------------------------------------------------------
1. Indeks Tingkat Risiko     : ${(acc.risk_score * 100).toFixed(1)}% CONFIDENCE
2. Faktor Perjudian Online   : ${(gamblingProb * 100).toFixed(1)}% MATCHING RATE
3. Pola Layering Transaksi   : ${(layeringProb * 100).toFixed(1)}% DETECTED
4. Penataan Sub-Batas (GND)  : ${(structuringProb * 100).toFixed(1)}% DETECTED
5. Smurfing Aliran Dana      : ${(smurfingProb * 100).toFixed(1)}% DETECTED

DETAIL INDIKATOR SIKLUS & POLA ANOMALI JARINGAN:
------------------------------------------------------------------------
${patterns.map((p, idx) => `[${idx + 1}] ${p}`).join('\n')}

ESTIMASI ALIRAN DANA (PERPUTARAN):
------------------------------------------------------------------------
Total Aliran Dana Terkait   : ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(acc.total_flow_idr)}

KEBIJAKAN REGULASI & SANKSI OJK (RULE OF LAW):
------------------------------------------------------------------------
Berdasarkan Instruksi Khusus OJK RI perihal Penindakan Judol Nasional,
rekening ini terdeteksi memfasilitasi penampungan deposit Judi Online.
Sesuai regulasi dan kebijakan OJK, tindakan penertiban yang ditempuh
adalah PENANGGUHAN SEMENTARA REKENING (ACCOUNT TEMPORARY SUSPENSION)
untuk pembekuan dana transaksional mTLS demi mitigasi pencucian uang bursa,
bukan pemblokiran sepihak tanpa pemecahan, hingga proses verifikasi KYC
ulang dan audit internal OJK selesai dideklarasikan bersih.

Kunci Otentikasi Digital : SHA-256 MATCH (${Math.random().toString(16).substr(2, 32).toUpperCase()})
Log Postgres SQL WAL ID  : WAL-${Math.floor(100000 + Math.random() * 900000)}
========================================================================
Dokumen dikeluarkan secara otomatis oleh Platform OJK SUPTECH - NEXA AI.
`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LAPORAN_FAKTOR_JUDOL_${acc.account_number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    NexaDB.emitLog('success', `Berhasil mengunduh Laporan Faktor Judi Online untuk pemilik ${acc.holder_name} (${acc.account_number})`);
  };

  // Load account data on mount & subscribe to DB changes
  useEffect(() => {
    setAccounts([...NexaDB.getAccounts()]);
    
    const unsubscribe = NexaDB.subscribeState(() => {
      setAccounts([...NexaDB.getAccounts()]);
    });
    return unsubscribe;
  }, [triggerRedraw]);

  // Derived stats
  const suspectedCount = accounts.filter(a => a.status === 'suspected').length;
  const frozenCount = accounts.filter(a => a.status === 'frozen').length;
  const totalFlowIdr = accounts
    .filter(a => a.status === 'frozen')
    .reduce((sum, a) => sum + a.total_flow_idr, 0);

  // Format IDR nicely in Miliar / Juta
  const formatIDRScaled = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `Rp ${(amount / 1_000_000_000).toFixed(2)} Miliar`;
    }
    return `Rp ${(amount / 1_000_000).toFixed(0)} Juta`;
  };

  const formatRawIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // SVG Line Chart Suspected Accounts Spikes (Hourly Data representation)
  // X-axis: Hour 00:00 to 23:00. Y-axis: Suspected rate indicator (arbitrary realistic points representing nighttime gamble-ring surges)
  const chartData = [
    { label: '00.00', value: 45, transactions: 1540 },
    { label: '02.00', value: 78, transactions: 2432 },
    { label: '04.00', value: 92, transactions: 3120 },
    { label: '06.00', value: 38, transactions: 980 },
    { label: '08.00', value: 24, transactions: 512 },
    { label: '10.00', value: 18, transactions: 403 },
    { label: '12.00', value: 30, transactions: 780 },
    { label: '14.00', value: 42, transactions: 1109 },
    { label: '16.00', value: 35, transactions: 890 },
    { label: '18.00', value: 64, transactions: 1872 },
    { label: '20.00', value: 85, transactions: 2901 },
    { label: '22.00', value: 96, transactions: 3540 },
  ];

  const svgWidth = 720;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const { points, pathString, areaString } = (() => {
    const values = chartData.map(d => d.value);
    const maxVal = 100;
    const minVal = 0;
    const scaledPoints = chartData.map((d, index) => {
      const x = paddingX + (index * (svgWidth - paddingX * 2) / (chartData.length - 1));
      const y = svgHeight - paddingY - ((d.value - minVal) * (svgHeight - paddingY * 2) / (maxVal - minVal));
      return { x, y, value: d.value, label: d.label, transactions: d.transactions };
    });
    const path = scaledPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${scaledPoints[scaledPoints.length - 1].x} ${svgHeight - paddingY} L ${scaledPoints[0].x} ${svgHeight - paddingY} Z`;
    return { points: scaledPoints, pathString: path, areaString: area };
  })();

  // Handle active ingest simulation
  const handleSimulateIngest = () => {
    const names = [
      'Bambang Pamungkas', 'Devi Lestari', 'PT Global Sinergi Kartika', 
      'Rian Hermawan', 'Mulyadi Pratama', 'Hendra Kusuma', 'CV Karya Mandala Nusa',
      'Yuni Tri Astuti', 'PT Berjaya Sukses Sejahtera', 'Arif Wicaksono'
    ];
    
    const banks = [
      { name: 'BCA (Bank Central Asia)', code: '014' },
      { name: 'BNI (Bank Negara Indonesia)', code: '009' },
      { name: 'Bank Mandiri', code: '008' },
      { name: 'BRI (Bank Rakyat Indonesia)', code: '002' },
      { name: 'CIMB Niaga', code: '022' },
      { name: 'Bank Syariah Indonesia (BSI)', code: '451' },
      { name: 'Bank Jago', code: '542' }
    ];

    const sources = [
      'CekRekening.id Ingestion Interface', 
      'OJK Automated Bot Tracker', 
      'OJK Anomalous Wire Flag', 
      'Dukcapil KYC Cross-Check Pipeline'
    ];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomBank = banks[Math.floor(Math.random() * banks.length)];
    const randomSource = sources[Math.floor(Math.random() * sources.length)];
    
    // Generate simulated 10-digit account
    const randomAccount = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const riskScore = parseFloat((0.75 + Math.random() * 0.23).toFixed(2));
    const randomFlow = Math.floor(150_000_000 + Math.random() * 850_000_000);

    // Database Actions
    NexaDB.emitLog('info', `[Ingest Ingress Trigger] Initializing API ingestion handshake with OJK secure node...`);
    NexaDB.emitLog('mtls', `[mTLS Client Auth] TLS 1.3 handshake verified using RSA-4096 signature certificates.`);
    
    const newAccount = NexaDB.insertDetectedAccount({
      account_number: randomAccount,
      bank_code: randomBank.code,
      bank_name: randomBank.name,
      holder_name: randomName,
      status: 'suspected',
      risk_score: riskScore,
      total_flow_idr: randomFlow,
      reported_by: randomSource
    });

    const patterns = [
      'Unusual midnight transfer spikes matching layering networks',
      'Structuring activities with multiple split BI-FAST deposits',
      'Smurfing velocity pattern exceeding Rp 200M/day standard frequency'
    ];

    NexaDB.insertAiAnalysis({
      target_account: randomAccount,
      model_version: 'NEXA-GNN-v3.1',
      gambling_prob: riskScore,
      layering_prob: parseFloat((riskScore - 0.05).toFixed(3)),
      structuring_prob: parseFloat((riskScore - 0.12).toFixed(3)),
      smurfing_prob: parseFloat((riskScore - 0.08).toFixed(3)),
      patterns: [patterns[Math.floor(Math.random() * patterns.length)]]
    });

    NexaDB.emitLog('ai', `[Graph Neural Network] Evaluation completed for node ${randomAccount}. Risk score set to ${(riskScore * 100).toFixed(1)}%. Anomaly indicators stored in public.ai_analysis.`);
    NexaDB.emitLog('success', `[Ingest Ingress Status] Ingress sync complete. Suspected account ${randomAccount} added to active queue successfully.`);
  };

  const handleClearFake = (accNumber: string) => {
    NexaDB.emitLog('info', `Operator command: Revoking risk label on account ${accNumber}`);
    NexaDB.clearAccount(accNumber);
  };

  return (
    <div className="space-y-6" id="dashboard-tab">
      
      {/* Dynamic Status Statistics Banners */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Banner 1: Suspected Rate */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden" id="card-suspected">
          <div className="space-y-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Jumlah Akun Dicurigai</p>
            <h3 className="text-4xl font-extrabold outfit-font text-gray-900 tracking-tight">{suspectedCount}</h3>
            <p className="text-gray-400 text-[10px] uppercase font-semibold">Memerlukan Penindakan Segera</p>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl">
            <AlertTriangle className="h-7 w-7 text-amber-500 animate-pulse" />
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
        </div>

        {/* Banner 2: Active Frozen Status */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden" id="card-frozen">
          <div className="space-y-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Rekening Ditangguhkan</p>
            <h3 className="text-4xl font-extrabold outfit-font text-emerald-600 tracking-tight">{frozenCount}</h3>
            <p className="text-emerald-600 text-[10px] uppercase font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> mTLS Hold Active
            </p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl">
            <ShieldAlert className="h-7 w-7 text-emerald-500" />
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
        </div>

        {/* Banner 3: Money Flow Secured */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden flex-col md:flex-row" id="card-capital">
          <div className="space-y-1 w-full">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Dana Diamankan</p>
            <h3 className="text-2xl xl:text-3xl font-extrabold outfit-font text-gray-900 tracking-tight">
              {formatIDRScaled(totalFlowIdr)}
            </h3>
            <p className="text-gray-400 text-[10px] uppercase font-semibold">Tindakan Preventif Pencucian Uang</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-2xl absolute md:relative top-5 right-5 md:top-auto md:right-auto">
            <TrendingUp className="h-7 w-7 text-blue-500" />
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
        </div>

        {/* Banner 4: GNN Accuracy indicator */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden" id="card-gnn-acc">
          <div className="space-y-1">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">GNN Clustering Engine</p>
            <h3 className="text-4xl font-extrabold outfit-font text-cyan-600 tracking-tight">94.7%</h3>
            <p className="text-cyan-600 text-[10px] uppercase font-bold flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Model NEXA-GNN-v3.1
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            {/* Custom Circular Progress */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center conic-dial shadow-inner">
              <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                <span className="text-[10px] text-gray-800 font-extrabold font-mono">94.7%</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
        </div>

      </div>

      {/* Hourly Suspected Account Spike Visualization & Ingest Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* custom SVG Line chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between" id="hourly-trends">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-0.5">
              <h4 className="text-lg font-bold text-gray-900 outfit-font">Pemantauan Tren Transaksi Tidak Wajar</h4>
              <p className="text-gray-400 text-xs">Frekuensi akun baru dicurigai dalam selang 24 Jam terakhir (OJK Core-Banking Database)</p>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-semibold">
              <Activity className="h-3.5 w-3.5 animate-pulse" /> Real-time Feed
            </div>
          </div>

          <div className="relative overflow-x-auto">
            {/* SVG graph container */}
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none min-w-[640px]">
              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
              <line x1={paddingX} y1={(svgHeight) / 2} x2={svgWidth - paddingX} y2={(svgHeight) / 2} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" />
              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Y Axis Indicators */}
              <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" className="text-[9px] fill-gray-400 font-bold font-mono">HIGH</text>
              <text x={paddingX - 10} y={(svgHeight) / 2 + 4} textAnchor="end" className="text-[9px] fill-gray-400 font-bold font-mono">MID</text>
              <text x={paddingX - 10} y={svgHeight - paddingY + 4} textAnchor="end" className="text-[9px] fill-gray-400 font-bold font-mono">LOW</text>

              {/* Gradient beneath the line */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={areaString} fill="url(#chartGradient)" />

              {/* Graphical Line */}
              <path d={pathString} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Node Points & Tooltip Event Handlers */}
              {points.map((point, i) => (
                <g key={i}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={hoverIndex === i ? '6' : '4'}
                    fill={hoverIndex === i ? '#ffffff' : '#2563eb'}
                    stroke="#2563eb"
                    strokeWidth={hoverIndex === i ? '3.5' : '1.5'}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                  {/* Interactive Tooltip Overlay inside SVG */}
                  {hoverIndex === i && (
                    <g transform={`translate(${point.x + 5}, ${point.y - 45})`}>
                      <rect x="-60" y="-5" width="120" height="42" rx="6" fill="#1e293b" className="shadow-lg" />
                      <text x="0" y="12" textAnchor="middle" fill="#ffffff" className="text-[10px] font-bold font-sans">
                        Pola Anomali: {point.value}%
                      </text>
                      <text x="0" y="27" textAnchor="middle" fill="#93c5fd" className="text-[9px] font-semibold font-mono">
                        Vol: {point.transactions} txn/jam
                      </text>
                    </g>
                  )}
                </g>
              ))}

              {/* X Axis labels */}
              {points.map((point, i) => (
                <text
                  key={`label-${i}`}
                  x={point.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-400 font-semibold font-mono"
                >
                  {point.label}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Ingest Simulation Dashboard Segment */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between" id="ingest-simulator-card">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-700">
              <Globe className="h-5 w-5" />
              <h4 className="text-md font-bold outfit-font text-gray-900">Komunikasi Ingress OJK Hub</h4>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed">
              Kanal federasi mTLS CekRekening.id mengirimkan aliran laporan rekening bandar & deposit judi online secara konstan. Tekan tombol simulasi untuk memicu panggilan webhook yang menyinkronkan data tersangka baru secara real-time.
            </p>
            <div className="border border-slate-100 bg-slate-50 p-3 rounded-lg text-slate-600 text-[11px] font-mono leading-relaxed space-y-1">
              <div><strong className="text-blue-600">POST</strong> /api/v1/ingest-fraud</div>
              <div className="text-gray-450 text-[10px]">Header: X-mTLS-CertId: OJK-SIGN-4096-SEC</div>
            </div>
          </div>

          <button
            onClick={handleSimulateIngest}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-md shadow-blue-200 transition-all cursor-pointer mt-4"
            id="btn-simulate-ingest"
          >
            <Plus className="h-4 w-4" /> SIMULASI INGEST FRAUD (mTLS Webhook)
          </button>
        </div>

      </div>

      {/* Active Queue Feed & Suspected Accounts Audit list */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm" id="active-queue">
        <div className="flex items-center justify-between mb-5 select-none">
          <div className="space-y-0.5">
            <h4 className="text-lg font-bold text-gray-900 outfit-font">Antrean Tersangka Anomali Transaksi (GNN Queued Feed)</h4>
            <p className="text-gray-500 text-xs">Daftar rekening bank nasional yang terdeteksi melakukan smurfing, layering, atau penataan berantai oleh AI.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
            <Clock className="h-3.5 w-3.5 animate-spin" /> Menunggu Keputusan Operator
          </div>
        </div>

        {accounts.filter(a => a.status === 'suspected').length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
            <ShieldCheck className="h-10 w-10 text-emerald-500" />
            <p className="text-gray-500 font-semibold text-xs outfit-font">Tidak Ada Antrean Rekening Dicurigai</p>
            <span className="text-gray-400 text-[10px]">Tekan "SIMULASI INGEST FRAUD" untuk memicu aliran data tersangka baru.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Rekening / Bank</th>
                  <th className="py-3 px-4">Holder NIK / KYC Name</th>
                  <th className="py-3 px-4">Metode Deteksi</th>
                  <th className="py-3 px-4 text-center">GNN Risk Score</th>
                  <th className="py-3 px-4 text-right">Volume Aliran Dana</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {accounts
                  .filter(a => a.status === 'suspected')
                  .map((acc) => {
                    const isExpanded = expandedAccountId === acc.account_number;
                    const matchingAnalysis = NexaDB.getAnalysis().find(an => an.target_account === acc.account_number);
                    const gamblingProb = matchingAnalysis ? matchingAnalysis.gambling_prob : acc.risk_score;
                    const layeringProb = matchingAnalysis ? matchingAnalysis.layering_prob : (acc.risk_score * 0.9);
                    const structuringProb = matchingAnalysis ? matchingAnalysis.structuring_prob : (acc.risk_score * 0.85);
                    const smurfingProb = matchingAnalysis ? matchingAnalysis.smurfing_prob : (acc.risk_score * 0.88);
                    const patterns = matchingAnalysis ? matchingAnalysis.patterns : [
                      'Aktivitas transfer berfrekuensi tinggi di malam hari (pukul 22:00 - 04:00)',
                      'Konsistensi penataan dana di bawah batas pelaporan tunai Rp 100 Juta',
                      'Masuk dan keluarnya dana mikro dalam hitungan detik (GND/Smurfing Network)'
                    ];

                    return (
                      <React.Fragment key={acc.id}>
                        <tr className={`hover:bg-slate-50/70 transition-colors text-xs text-gray-700 ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                          
                          {/* Bank Number & Bank name info */}
                          <td className="py-4 px-4 font-mono">
                            <div className="font-bold text-gray-800 text-sm tracking-tight">{acc.account_number}</div>
                            <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                              <Database className="h-3 w-3" /> {acc.bank_name}
                            </div>
                          </td>

                          {/* Resolved entity KYC info */}
                          <td className="py-4 px-4 font-sans font-medium text-gray-800">
                            <div>{acc.holder_name}</div>
                            <div className="text-[10px] font-mono text-gray-400">NIK: Verified (mTLS Dukcapil Sync)</div>
                          </td>

                          {/* API Source */}
                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-0.5 rounded-full select-none">
                              {acc.reported_by}
                            </span>
                          </td>

                          {/* GNN Score slider mapping */}
                          <td className="py-4 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`${acc.risk_score >= 0.9 ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'} text-xs font-bold font-mono py-0.5 px-2 rounded-md`}>
                                {(acc.risk_score * 100).toFixed(0)}%
                              </span>
                              <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${acc.risk_score >= 0.9 ? 'bg-red-500' : 'bg-amber-500'}`} 
                                  style={{ width: `${acc.risk_score * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          {/* Cumulative funds scale */}
                          <td className="py-4 px-4 text-right font-bold font-mono text-gray-900 pr-6">
                            {formatRawIDR(acc.total_flow_idr)}
                          </td>

                          {/* Inline emergency triggers */}
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onNavigateToTracer(acc.account_number)}
                                className="bg-red-650 hover:bg-red-755 active:scale-[0.98] text-white font-bold text-[10px] py-1.5 px-2 rounded-lg shadow-sm cursor-pointer select-none"
                                title="Penangguhan Sementara mTLS"
                              >
                                TANGGUHKAN
                              </button>
                              
                              {/* LIHAT FAKTOR Interactive Button */}
                              <button
                                onClick={() => setExpandedAccountId(isExpanded ? null : acc.account_number)}
                                className={`font-bold text-[10px] py-1.5 px-2 rounded-lg border cursor-pointer select-none transition-all ${
                                  isExpanded 
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                                }`}
                                title="Tampilkan Analisis Faktor Judol On-screen"
                              >
                                {isExpanded ? 'TUTUP' : 'FAKTOR'}
                              </button>

                              <button
                                onClick={() => handleDownloadSuspectReport(acc)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] py-1.5 px-3 rounded-lg border border-blue-200 cursor-pointer select-none flex items-center gap-1"
                                title="Unduh Laporan Faktor Tersangka"
                              >
                                <Download className="h-3 w-3" /> UNDUH
                              </button>
                              
                              <button
                                onClick={() => handleClearFake(acc.account_number)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-500 font-semibold text-[10px] py-1.5 px-2 rounded-lg border border-gray-200 cursor-pointer select-none"
                                title="Tandai False Alarm"
                              >
                                BATAL
                              </button>
                            </div>
                          </td>

                        </tr>

                        {/* Interactive On-screen Risk Factors Details Section */}
                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={6} className="p-4 md:p-5 border-l-4 border-l-amber-500">
                              <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-inner space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-150 pb-3 gap-2">
                                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-800 flex items-center gap-1.5">
                                    <AlertTriangle className="h-4 w-4 animate-pulse text-amber-500" /> INDIKATOR & FAKTOR RISIKO PERJUDIAN ONLINE (NEXA AI ANALYSIS)
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-2.5 py-1 rounded border border-gray-100 self-start">
                                    Status Akun: <span className="text-red-650 font-bold">MENCURIGAKAN (SUSPECTED)</span>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                  {/* Faktor Perjudian Online */}
                                  <div className="bg-red-50/40 p-3.5 rounded-xl border border-red-100/60 shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-red-800 tracking-wider">Pola Judi Online</div>
                                    <div className="text-2xl font-black font-mono text-red-600 mt-1">{(gamblingProb * 100).toFixed(1)}%</div>
                                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                                      <div className="bg-red-500 h-full transition-all" style={{ width: `${gamblingProb * 100}%` }}></div>
                                    </div>
                                    <span className="text-[9px] text-red-505 font-semibold mt-1.5 block">Kecocokan Karakteristik Deposit</span>
                                  </div>

                                  {/* Faktor Layering */}
                                  <div className="bg-amber-50/30 p-3.5 rounded-xl border border-amber-100/50 shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Layering Transaksi</div>
                                    <div className="text-2xl font-black font-mono text-amber-600 mt-1">{(layeringProb * 100).toFixed(1)}%</div>
                                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                                      <div className="bg-amber-500 h-full transition-all" style={{ width: `${layeringProb * 100}%` }}></div>
                                    </div>
                                    <span className="text-[9px] text-amber-605 font-semibold mt-1.5 block">Koneksi Pemecahan Aliran</span>
                                  </div>

                                  {/* Faktor Structuring */}
                                  <div className="bg-cyan-50/20 p-3.5 rounded-xl border border-cyan-100/45 shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-cyan-800 tracking-wider">Structuring Dana</div>
                                    <div className="text-2xl font-black font-mono text-cyan-600 mt-1">{(structuringProb * 100).toFixed(1)}%</div>
                                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                                      <div className="bg-cyan-500 h-full transition-all" style={{ width: `${structuringProb * 100}%` }}></div>
                                    </div>
                                    <span className="text-[9px] text-cyan-550 font-semibold mt-1.5 block">Di Bawah Batas Rp100 Juta</span>
                                  </div>

                                  {/* Faktor Smurfing */}
                                  <div className="bg-indigo-50/20 p-3.5 rounded-xl border border-indigo-100/45 shadow-sm">
                                    <div className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">Smurfing Network</div>
                                    <div className="text-2xl font-black font-mono text-indigo-600 mt-1">{(smurfingProb * 100).toFixed(1)}%</div>
                                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                                      <div className="bg-indigo-500 h-full transition-all" style={{ width: `${smurfingProb * 100}%` }}></div>
                                    </div>
                                    <span className="text-[9px] text-indigo-550 font-semibold mt-1.5 block">Frekuensi Mikro Berulang</span>
                                  </div>
                                </div>

                                <div className="space-y-2 border-t border-gray-100 pt-3">
                                  <p className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">Faktor & Pola Anomali yang Terdeteksi Keras:</p>
                                  <div className="space-y-1.5">
                                    {patterns.map((p, idx) => (
                                      <div key={idx} className="flex gap-2.5 items-start text-[11px] text-gray-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                                        <span className="bg-amber-100 text-amber-800 font-black font-mono px-2 py-0.5 rounded text-[9px] shrink-0 mt-0.5">
                                          FAKTOR {idx + 1}
                                        </span>
                                        <span>{p === 'High transaction frequency on nighttime' || p === 'High transaction frequency on nighttime' ? 'Aktivitas transfer berfrekuensi tinggi di malam hari luar jam kerja reguler (pukul 22:00 - 04:00)' : p === 'Rapid in-and-out funding matching smurfing splits' ? 'Konsistensi penataan pecahan dana tepat di bawah batas wajib lapor Rp 100 Juta' : p === 'Multi-recipient layering structure' ? 'Penerimaan dana mikro instan dan pendispersian dana dalam hitungan detik (GND/Smurfing)' : p}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100/50 text-[11.5px] text-slate-700 leading-relaxed flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
                                  <div className="space-y-1">
                                    <strong className="text-amber-900 border-b border-amber-200 pb-0.5 block md:inline md:border-b-0">Penegakan Kebijakan Suptech OJK:</strong>
                                    <p className="text-slate-600 text-xs mt-1">
                                      Rekening terdeteksi kuat memfasilitasi bursa judi online ilegal. Tindakan penegakan hukum yang diaktifkan adalah <span className="font-bold text-amber-800 bg-amber-100/70 px-1 rounded">PENANGGUHAN SEMENTARA REKENING</span> (Account Hold) untuk verifikasi mTLS, bukan pemblokiran permanen sepihak tanpa mediasi banding nasabah sesuai regulasi perlindungan konsumen OJK.
                                    </p>
                                  </div>
                                  <div className="flex gap-2 self-end shrink-0 select-none">
                                    <button
                                      onClick={() => handleDownloadSuspectReport(acc)}
                                      className="bg-blue-600 hover:bg-blue-700 font-bold text-white text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1 shadow hover:shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
                                      title="Ekspor Laporan Faktor Risiko dalam format .txt"
                                    >
                                      <Download className="h-3.5 w-3.5" /> UNDUH LAPORAN
                                    </button>
                                    <button
                                      onClick={() => onNavigateToTracer(acc.account_number)}
                                      className="bg-red-650 hover:bg-red-755 font-bold text-white text-[11px] py-1.5 px-3 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                                      title="Inisiasi Prosedur Penangguhan mTLS"
                                    >
                                      PROSES PENANGGUHAN
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
