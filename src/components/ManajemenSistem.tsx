/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NexaDB } from '../lib/db';
import { AdminUser } from '../types';
import { 
  UserPlus, UploadCloud, Download, ShieldCheck, 
  Users, Layers, FileSpreadsheet, Server, FileText, CheckCircle
} from 'lucide-react';

export default function ManajemenSistem() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  
  // Registration Form States
  const [nameInput, setNameInput] = useState('');
  const [agencyInput, setAgencyInput] = useState<AdminUser['agency']>('OJK');
  const [authorityInput, setAuthorityInput] = useState<AdminUser['authority_level']>('Operator');
  const [pinInput, setPinInput] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Bulk File Ingestion States
  const [fileDragOver, setFileDragOver] = useState(false);
  const [ingestLog, setIngestLog] = useState<string[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadTextPaste, setUploadTextPaste] = useState('');

  // Dataset Generator States
  const [dsLimit, setDsLimit] = useState(100);
  const [dsMinAmount, setDsMinAmount] = useState(10000000);
  const [dsMaxAmount, setDsMaxAmount] = useState(500000000);
  const [dsBankFilter, setDsBankFilter] = useState('ALL');

  useEffect(() => {
    setAdmins([...NexaDB.getAdmins()]);
    
    // Subscribe to admin additions
    const unsubscribe = NexaDB.subscribeState(() => {
      setAdmins([...NexaDB.getAdmins()]);
    });
    return unsubscribe;
  }, []);

  // Registry form registration
  const handleRegisterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    if (pinInput.length !== 6 || /\D/.test(pinInput)) {
      alert('PIN harus berupa 6 digit angka.');
      return;
    }

    const newAdmin = NexaDB.registerAdmin(nameInput, agencyInput, authorityInput, pinInput);
    setAdmins([...NexaDB.getAdmins()]);
    setRegSuccess(`Sukses Mendaftarkan ${newAdmin.name}! ID Operator: ${newAdmin.operator_id}`);
    
    // Reset Form fields
    setNameInput('');
    setPinInput('');
    
    setTimeout(() => setRegSuccess(''), 5000);
  };

  // CSV column splitter preserving quoted values (e.g. "Rp 150.000.000")
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let currentPart = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        result.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    result.push(currentPart.trim());
    return result;
  };

  // Ingest mass uploaded dataset
  const processDatasetText = (content: string) => {
    if (!content.trim()) return;
    setIsProcessingFile(true);
    setIngestLog(['Menganalisis format baris dataset...']);
    
    setTimeout(() => {
      const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        setIngestLog(prev => [...prev, '⚠ Format Gagal: Dataset kosong atau tidak memiliki baris header.']);
        setIsProcessingFile(false);
        return;
      }

      const header = lines[0];
      let classification: 'Account' | 'Transaction' | 'Pattern' = 'Account';
      
      if (header.toLowerCase().includes('source_account') || header.toLowerCase().includes('destination_account')) {
        classification = 'Transaction';
      } else if (header.startsWith('[PATTERN]') || header.includes('Pola_') || lines.some(l => l.startsWith('[PATTERN]'))) {
        classification = 'Pattern';
      }

      setIngestLog(prev => [
        ...prev, 
        `Pola Terdeteksi: ${classification.toUpperCase()} Dataset.`,
        `Jumlah total: ${lines.length - 1} baris records ditemukan.`,
        `Mengunggah records ke skema database PostgreSQL sandboxed...`
      ]);

      // Process rows recursively
      let countSuccess = 0;
      let totalAmountSecured = 0;

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const cols = parseCSVLine(row);

        if (classification === 'Account' && cols.length >= 4) {
          // Account format: Account_Number, Bank_Name, Holder_Name, Risk_Score, Total_Flow_IDR, Reported_By
          const accNumber = cols[0];
          const bankName = cols[1];
          const holderName = cols[2];
          const riskScore = parseFloat(cols[3]) || 0.85;
          const totalFlow = parseInt(cols[4]?.replace(/\D/g, '')) || 250000000;
          const reporter = cols[5] || 'Bulk CSV Upload';

          NexaDB.insertDetectedAccount({
            account_number: accNumber,
            bank_code: '001',
            bank_name: bankName,
            holder_name: holderName,
            status: 'suspected',
            risk_score: riskScore,
            total_flow_idr: totalFlow,
            reported_by: reporter
          });

          countSuccess++;

        } else if (classification === 'Transaction' && cols.length >= 4) {
          // Transaction format: Source_Account, Destination_Account, Amount_IDR, Transfer_Type
          const sAcc = cols[0];
          const dAcc = cols[1];
          const amount = parseInt(cols[2]?.replace(/\D/g, '')) || 120000000;
          const type = cols[3] as any || 'BI_FAST';

          NexaDB.insertFlow({
            source_account: sAcc,
            dest_account: dAcc,
            amount_idr: amount,
            transfer_type: type,
            flagged: true,
            pattern_match: ['Bulk Upload Anomaly Wire']
          });

          countSuccess++;
          totalAmountSecured += amount;
        } else if (classification === 'Pattern') {
          // Pattern text stream
          NexaDB.emitLog('ai', `[GNN Dataset Parser] Loaded Pattern node entry: "${row}"`);
          countSuccess++;
        }
      }

      NexaDB.emitLog('success', `[PostgreSQL CLI] Bulk parsed ingestion successfully committed. Loaded ${countSuccess} entries.`);
      setIngestLog(prev => [
        ...prev,
        `✓ Sinkronisasi Selesai!`,
        `Berhasil memproses ${countSuccess} baris records.`,
        classification === 'Transaction' ? `Total aliran dana terdaftar: ${totalAmountSecured.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })}` : 'Semua simpanan accounts dimasukkan ke antrean suspected.'
      ]);
      setIsProcessingFile(false);
      setUploadTextPaste('');
    }, 2000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragOver(true);
  };

  const handleDragLeave = () => {
    setFileDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processDatasetText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processDatasetText(text);
      };
      reader.readAsText(files[0]);
    }
  };

  // Preset quick sandbox pastes
  const triggerDemoAccountPaste = () => {
    const csvPattern = `Account_Number, Bank_Name, Holder_Name, Risk_Score, Total_Flow_IDR, Reported_By
4420011984, BCA (Bank Central Asia), Suhendar Pratama, 0.92, "Rp 450.000.000", CekRekening Ingest API
9920119833, Bank Mandiri, Devi Amalia, 0.85, "Rp 320.000.000", OJK Flagged Wire`;
    setUploadTextPaste(csvPattern);
  };

  const triggerDemoTransactionPaste = () => {
    const csvPattern = `Source_Account, Destination_Account, Amount_IDR, Transfer_Type
8830112244, 4420011984, "Rp 120.000.000", BI_FAST
1120098443, 9920119833, "Rp 210.000.000", Virtual_Account`;
    setUploadTextPaste(csvPattern);
  };

  // Programmatic custom downloader matrices
  const triggerGenerateAndDownloadBlob = (category: 'Akun' | 'Transaksi' | 'Pola', size: number) => {
    NexaDB.emitLog('info', `Permintaan dataset: Menyusun berkas ${category} ukuran ${size} baris...`);
    
    let content = '';
    let filename = '';

    const firstNames = ['Rudi', 'Budi', 'Anisa', 'Siti', 'Agus', 'Hendra', 'Kiki', 'Dewi', 'Mulyadi', 'Iwan'];
    const lastNames = ['Pratama', 'Santoso', 'Wijaya', 'Lestari', 'Kusuma', 'Siregar', 'Wicaksono', 'Purnama', 'Hayati'];
    
    const banks = [
      { name: 'BCA (Bank Central Asia)', code: '014' },
      { name: 'BNI (Bank Negara Indonesia)', code: '009' },
      { name: 'Bank Mandiri', code: '008' },
      { name: 'BRI (Bank Rakyat Indonesia)', code: '002' }
    ];

    if (category === 'Akun') {
      content = 'Account_Number,Bank_Name,Holder_Name,Risk_Score,Total_Flow_IDR,Reported_By\n';
      for (let i = 0; i < size; i++) {
        const accNum = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const randBank = banks[Math.floor(Math.random() * banks.length)];
        const randName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const score = (0.75 + Math.random() * 0.23).toFixed(2);
        const flowIdr = Math.floor(50_000_000 + Math.random() * 950_000_000);
        content += `${accNum},"${randBank.name}","${randName}",${score},"${flowIdr}","OJK Simulator Ingress"\n`;
      }
      filename = `Akun_Intensitas-Tinggi_${size}-Baris.csv`;
    } else if (category === 'Transaksi') {
      content = 'Source_Account,Destination_Account,Amount_IDR,Transfer_Type\n';
      for (let i = 0; i < size; i++) {
        const sourceAcc = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const destAcc = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const amount = Math.floor(10_000_000 + Math.random() * 450_000_000);
        const types = ['BI_FAST', 'SKN', 'RTGS', 'Virtual_Account'];
        const type = types[Math.floor(Math.random() * types.length)];
        content += `${sourceAcc},${destAcc},"${amount}",${type}\n`;
      }
      filename = `Transaksi_Intensitas-Tinggi_${size}-Baris.csv`;
    } else {
      for (let i = 0; i < size; i++) {
        const id = Math.floor(1000 + Math.random() * 9000);
        const acc = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        const score = (0.8 + Math.random() * 0.18).toFixed(3);
        content += `[PATTERN] NODE_ID: ${id} | ACC: ${acc} | FRAUD_INDEX_WEIGHT: ${score} | GNN Matching layering patterns successfully compiled to postgres journal.\n`;
      }
      filename = `Pola_LOG_Intensitas-Tinggi_${size}-Baris.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    NexaDB.emitLog('success', `Berhasil mengunduh berkas simulasi: "${filename}"`);
  };

  return (
    <div className="space-y-6" id="admin-tab">
      
      {/* 2 Grid split layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Enrolment Operator Form Card (Left, Span 1) */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <form onSubmit={handleRegisterAdmin} className="space-y-4">
            <div className="flex items-center gap-2 text-blue-700 font-bold outfit-font select-none">
              <UserPlus className="h-5 w-5" />
              <h4 className="text-md uppercase tracking-wider">Daftar Admin Baru</h4>
            </div>

            <p className="text-gray-500 text-xs leading-relaxed">
              Daftarkan operator, auditor atau pihak kepolisian baru secara mandiri. PIN 6-digit harus dicatat karena ini satu-satunya akses mTLS.
            </p>

            <div className="space-y-3 text-xs">
              
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Nama Lengkap Operator</label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. AKP Hermawan Prasetyo"
                  className="w-full bg-[#f8fafc] hover:bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-sans outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Instansi / Lembaga</label>
                  <select
                    value={agencyInput}
                    onChange={(e) => setAgencyInput(e.target.value as any)}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-2.5 font-sans outline-none focus:border-blue-500"
                    disabled
                  >
                    <option value="OJK">OJK</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Tingkat Kewenangan</label>
                  <select
                    value={authorityInput}
                    onChange={(e) => setAuthorityInput(e.target.value as any)}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-2.5 font-sans outline-none focus:border-blue-500"
                  >
                    <option value="Operator">Operator</option>
                    <option value="Auditor">Auditor</option>
                    <option value="Superintendent">Superintendent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">6-Digit Security PIN</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="******"
                  className="w-full bg-[#f8fafc] hover:bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-mono text-center tracking-widest outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

            </div>

            {regSuccess && (
              <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> {regSuccess}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-blue-100 cursor-pointer text-center"
            >
              DAFTARKAN ADMIN & SIGN VALID
            </button>
          </form>
        </div>

        {/* Database Admins Active registry table (Center/Right, Span 2) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between select-none">
            <h5 className="text-base font-extrabold outfit-font text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span>Daftar Operator mTLS Terdaftar (Vault Registry)</span>
            </h5>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> SECURE ROOT
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-150 text-gray-400 text-[9px] font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Nama Lengkap</th>
                  <th className="py-2.5 px-3">Lembaga</th>
                  <th className="py-2.5 px-3">Operator ID</th>
                  <th className="py-2.5 px-3">Tingkat Hak</th>
                  <th className="py-2.5 px-3">Keamanan mTLS</th>
                  <th className="py-2.5 px-3">Waktu Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans text-gray-700">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-semibold text-gray-900">{admin.name}</td>
                    <td className="py-3 px-3 font-mono">
                      <span className="bg-blue-50 hover:bg-blue-100 text-blue-750 font-semibold px-2 py-0.5 rounded text-[10px]">
                        {admin.agency}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">{admin.operator_id}</td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold text-[10.5px] ${
                        admin.authority_level === 'Superintendent' ? 'text-red-650' :
                        admin.authority_level === 'Auditor' ? 'text-purple-650' : 'text-blue-650'
                      }`}>
                        {admin.authority_level}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle className="h-3 w-3" /> Secured
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[10px] text-gray-400">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CSV Block drag uploader & presets templates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Drag-drop file panel */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-md font-bold text-gray-900 outfit-font flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-gray-500" />
              <span>Bulk Ingestion Sandbox (Unggah Massal)</span>
            </h4>
            <p className="text-gray-500 text-xs leading-relaxed">
              OJK memproses ratusan ribu transaksi per detik. Anda dapat melakukan simulasi pengunggahan massal berkas CSV atau TXT anomali secara lokal. Seret berkas atau tempel di teks area di bawah.
            </p>

            {/* Drag drop area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                fileDragOver ? 'border-blue-500 bg-blue-50/50 scale-[0.99]' : 'border-slate-200 bg-slate-50/20'
              }`}
            >
              <input
                type="file"
                id="bulk-file-loader"
                accept=".csv,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="bulk-file-loader" className="cursor-pointer space-y-1">
                <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">Seret File CSV / TXT Kemari</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Atau klik untuk memilih secara manual</div>
              </label>
            </div>

            {/* Paste trigger examples option */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase select-none">
                <span>Tempel Isi Dokumen Simulasi Mandiri</span>
                <div className="flex gap-2">
                  <button onClick={triggerDemoAccountPaste} className="text-blue-500 hover:underline cursor-pointer">Simulasi Akun</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={triggerDemoTransactionPaste} className="text-blue-500 hover:underline cursor-pointer">Simulasi Transfer</button>
                </div>
              </div>
              <textarea
                value={uploadTextPaste}
                onChange={(e) => setUploadTextPaste(e.target.value)}
                rows={4}
                className="w-full bg-[#f8fafc] text-gray-800 font-mono text-xs p-3 rounded-xl border border-gray-200 outline-none focus:border-blue-510 leading-relaxed max-h-[120px]"
                placeholder="Account_Number, Bank_Name, Holder_Name, Risk_Score, Total_Flow_IDR..."
              />
            </div>
          </div>

          <button
            onClick={() => processDatasetText(uploadTextPaste)}
            disabled={isProcessingFile || !uploadTextPaste}
            className={`w-full flex items-center justify-center gap-1 ${
              isProcessingFile || !uploadTextPaste ? 'bg-slate-350 cursor-not-allowed' : 'bg-[#0f172a] hover:bg-black'
            } text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-sm mt-4`}
          >
            {isProcessingFile ? 'SEDANG MEMPROSES LAPORAN...' : 'PROSES DATASET MASSAL (POSTGRES COMMIT)'}
          </button>
        </div>

        {/* Processing Logs Card (Right Panel, Span 1) */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <h5 className="text-md font-bold text-gray-900 outfit-font flex items-center gap-2">
              <Server className="h-5 w-5 text-slate-500" />
              <span>Status Parsing & SQL Ingestion</span>
            </h5>
            
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-h-[295px] overflow-y-auto p-4 flex flex-col gap-2 font-mono text-[10.5px] leading-relaxed shadow-inner">
              {ingestLog.length === 0 ? (
                <div className="text-slate-400 italic text-center py-12">
                  Menunggu file diletakkan di panel sebelah kiri untuk memulai pencatatan log.
                </div>
              ) : (
                ingestLog.map((log, i) => (
                  <div key={i} className={log.startsWith('✓') || log.startsWith('Account') ? 'text-emerald-400' : 'text-slate-300'}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-[10px] leading-relaxed text-slate-500 font-mono border-t border-slate-100 pt-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            File parsing menggunakan model recursive asynchronous split. Output DML SQL diumpankan ke WAL console.
          </div>
        </div>

      </div>

      {/* Preset Downloads Matrix & Custom Build options */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3 select-none">
          <FileSpreadsheet className="h-5.5 w-5.5 text-blue-700" />
          <h4 className="text-md font-bold text-gray-900 outfit-font uppercase">
            PRE-GENERATED HIGH-INTENSITY FILES MATRIX
          </h4>
        </div>

        <p className="text-gray-500 text-xs leading-relaxed max-w-4xl font-sans">
          Arsitektur NEXA AI OJK dilengkapi dengan tumpukan CSV dan TXT yang pre-generated dengan tingkat intensitas transaksi tinggi demi simulasi berkecepatan tinggi dalam sandbox compliance. Unduh berkas langsung ke hardisk lokal Anda:
        </p>

        {/* Matrix Downloads grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 select-none">
          
          {/* Akun Dataset preset panel */}
          <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 space-y-3.5">
            <h5 className="text-xs font-extrabold outfit-font text-blue-800 flex items-center gap-1.5 uppercase">
              <FileSpreadsheet className="h-4.5 w-4.5" /> Berkas Akun (CSV)
            </h5>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Akun', 100)}
                className="w-full flex items-center justify-between bg-white hover:bg-blue-50 hover:text-blue-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Akun_Ukuran-Kecil (100 Baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Akun', 500)}
                className="w-full flex items-center justify-between bg-white hover:bg-blue-50 hover:text-blue-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Akun_Ukuran-Sedang (500 Baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Akun', 1000)}
                className="w-full flex items-center justify-between bg-white hover:bg-blue-50 hover:text-blue-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Akun_Ukuran-Besar (1000 Baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Transaksi Dataset preset panel */}
          <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 space-y-3.5">
            <h5 className="text-xs font-extrabold outfit-font text-emerald-800 flex items-center gap-1.5 uppercase">
              <FileSpreadsheet className="h-4.5 w-4.5" /> Berkas Transaksi (CSV)
            </h5>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Transaksi', 100)}
                className="w-full flex items-center justify-between bg-white hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Transaksi_Ukuran-Kecil (100 Baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Transaksi', 500)}
                className="w-full flex items-center justify-between bg-white hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Transaksi_Ukuran-Sedang (500 Baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Transaksi', 1000)}
                className="w-full flex items-center justify-between bg-white hover:bg-emerald-50 hover:text-emerald-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Transaksi_Ukuran-Besar (1000 Baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Pola logs TXT preset panel */}
          <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 space-y-3.5">
            <h5 className="text-xs font-extrabold outfit-font text-purple-800 flex items-center gap-1.5 uppercase">
              <FileText className="h-4.5 w-4.5" /> Berkas Pola GNN (TXT)
            </h5>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Pola', 100)}
                className="w-full flex items-center justify-between bg-white hover:bg-purple-50 hover:text-purple-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Pola_Ukuran-Kecil (100 baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Pola', 500)}
                className="w-full flex items-center justify-between bg-white hover:bg-purple-50 hover:text-purple-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Pola_Ukuran-Sedang (500 baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => triggerGenerateAndDownloadBlob('Pola', 1000)}
                className="w-full flex items-center justify-between bg-white hover:bg-purple-50 hover:text-purple-700 text-xs font-semibold p-2.5 rounded-lg border border-slate-250 cursor-pointer transition-all"
              >
                <span>Pola_Ukuran-Besar (1000 baris)</span>
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
