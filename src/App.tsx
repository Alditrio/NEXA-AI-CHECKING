/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NexaDB } from './lib/db';
import MacroMonitoring from './components/MacroMonitoring';
import RuangEksekusi from './components/RuangEksekusi';
import SistemIntegrasi from './components/SistemIntegrasi';
import ManajemenSistem from './components/ManajemenSistem';

import { 
  ShieldAlert, ShieldCheck, Activity, Clock, 
  LayoutDashboard, PlayCircle, HardDrive, Settings, 
  Fingerprint, CircleSlash2, Lock, LogOut, KeyRound
} from 'lucide-react';

type TabType = 'pemantauan' | 'ruang-eksekusi' | 'sistem-integrasi' | 'manajemen-sistem';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('pemantauan');
  const [selectedAccountNum, setSelectedAccountNum] = useState<string | null>(null);
  const [timeStr, setTimeStr] = useState('');
  const [dbStateTrigger, setDbStateTrigger] = useState(0);

  // Secure Unified Login Session State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('nexa_is_logged_in') === 'true';
  });
  const [enteredPin, setEnteredPin] = useState('');
  const [loginError, setLoginError] = useState('');

  // Synchronize dynamic WIB ticking clock on top banner
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const wibOffset = 7 * 60 * 60 * 1000; // 7 hours in ms
      const wibTime = new Date(now.getTime() + wibOffset);
      const year = wibTime.getUTCFullYear();
      const month = String(wibTime.getUTCMonth() + 1).padStart(2, '0');
      const day = String(wibTime.getUTCDate()).padStart(2, '0');
      const hours = String(wibTime.getUTCHours()).padStart(2, '0');
      const minutes = String(wibTime.getUTCMinutes()).padStart(2, '0');
      const seconds = String(wibTime.getUTCSeconds()).padStart(2, '0');
      const wibString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds} WIB`;
      setTimeStr(wibString);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to DB shifts to keep macro counters highly synchronized
  useEffect(() => {
    const unsubscribe = NexaDB.subscribeState(() => {
      setDbStateTrigger(prev => prev + 1);
    });
    return unsubscribe;
  }, []);

  // Redirect routing action from Suspected list to operations controls
  const handleNavigateToTracer = (accountNumber: string) => {
    setSelectedAccountNum(accountNumber);
    setActiveTab('ruang-eksekusi');
  };

  const handleExecutionCompleted = () => {
    // Notify lists to refresh counters
    setDbStateTrigger(prev => prev + 1);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin.trim() === '') {
      setLoginError('Sandi PIN tidak boleh kosong.');
      return;
    }
    
    // Any valid pin in database (e.g. "060507")
    const authenticated = NexaDB.getAdmins().some(adm => adm.pin === enteredPin) || enteredPin === '060507';
    if (authenticated) {
      localStorage.setItem('nexa_is_logged_in', 'true');
      setIsLoggedIn(true);
      setLoginError('');
      setEnteredPin('');
      NexaDB.emitLog('success', 'ADMINISTRATIVE ACCESS GRANTED: User logged in with full OJK system capability.');
    } else {
      setLoginError('Kode PIN Keamanan salah. Harap coba lagi.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexa_is_logged_in');
    setIsLoggedIn(false);
    NexaDB.emitLog('info', 'USER LOGOUT: Administrative session ended.');
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans p-4 relative overflow-hidden animate-fade-in" id="login-container">
        {/* Abstract futuristic background decorations */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-950/85 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6 z-10">
          <div className="text-center space-y-3 select-none">
            {/* Elegant glowing signature lock icon */}
            <div className="h-16 w-16 bg-gradient-to-tr from-blue-600 to-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/10 border border-slate-700/60">
              <Fingerprint className="h-9 w-9 text-white animate-pulse" />
            </div>
            
            <div>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-2xl font-black text-white tracking-tight outfit-font">NEXA AI</h2>
                <span className="bg-red-500/15 text-red-400 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider border border-red-500/35">
                  RegTech
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">OJK SUPTECH NATIONAL PLATFORM</p>
            </div>
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-slate-300 text-xs leading-relaxed space-y-1.5">
            <div className="font-bold text-amber-400 flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" /> AKSES ADMINISTRATOR UTAMA
            </div>
            <p className="text-[11px] text-slate-400">
              Sistem koordinasi OJK terintegrasi mTLS. Tidak ada pemilihan role — administrator masuk langsung memperoleh otoritas penuh (<span className="text-red-400 font-semibold">OJK Superintendent</span> / akses terlacak penuh).
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 block">Kode PIN Keamanan mTLS</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="h-4.5 w-4.5" />
                </div>
                <input
                  type="password"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Masukkan 6-digit PIN"
                  maxLength={6}
                  className="w-full bg-slate-900/80 hover:bg-slate-900 focus:bg-slate-900 text-white font-mono tracking-widest text-center border border-slate-800 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 transition-all text-sm"
                />
              </div>
              {loginError && (
                <p className="text-[11px] text-red-400 font-semibold text-center mt-1.5">
                  ⚠ {loginError}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] cursor-pointer text-center tracking-wider block"
            >
              MASUK KE DASHBOARD UTAMA
            </button>
          </form>

          <div className="text-center">
            <p className="text-[9px] text-slate-600 font-mono">
              NEXA Suptech System v3.1 Security Standard — OJK RI
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans" id="app-root-container">
      
      {/* Topbar Header Menu (#header) */}
      <header 
         className="h-16 border-b border-gray-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between select-none"
         id="header"
      >
        <div className="flex items-center gap-3">
          {/* Visual logo avatar branding */}
          <div className="bg-slate-900 h-9 w-9 rounded-xl flex items-center justify-center border border-slate-800 shadow-sm">
            <Fingerprint className="h-5.5 w-5.5 text-blue-400 rotate-12" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <h1 className="text-xl font-bold outfit-font text-slate-900 tracking-tight leading-none">NEXA AI</h1>
              <span className="bg-red-50 text-red-650 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider border border-red-150">
                RegTech
              </span>
            </div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">OJK SUPTECH NATIONAL PLATFORM</p>
          </div>
        </div>

        {/* Telemetry and Clock metrics */}
        <div className="flex items-center gap-5">
          
          {/* Secure mTLS Active Gateway server info */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#f8fafc] border border-gray-150 px-3.5 py-1.5 rounded-full select-none shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10.5px] font-mono font-bold text-slate-800 tracking-wider">
              mTLS_GW: SECURED
            </span>
          </div>

          {/* Network synchronized Clock */}
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="text-[11px] font-mono font-extrabold text-slate-700 select-all">
              {timeStr || '2026-05-28 11:46:30 UTC'}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-205 hidden sm:block"></div>

          {/* Superintendent profile session badge with Logout button */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col items-end leading-none">
              <span className="text-[11.5px] font-bold text-gray-800 font-sans">Superintendent OJK</span>
              <span className="text-[9.5px] text-gray-405 font-mono">ID: OJK-10029</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 border border-blue-200 text-blue-800 font-extrabold font-mono text-xs flex items-center justify-center select-none shadow-sm">
              S1
            </div>
            
            <button
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-bold text-[10px] py-1.5 px-2.5 rounded-lg border border-slate-200 cursor-pointer select-none flex items-center gap-1 transition-all"
              title="Keluar dari Sesi mTLS"
            >
              <LogOut className="h-3 w-3" /> KELUAR
            </button>
          </div>

        </div>
      </header>

      {/* Main Grid Wrapper layout and Sidebar routing menus */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Left Navigation Sidebar Drawer (#sidebar) */}
        <aside 
          className="w-full md:w-60 border-b md:border-b-0 md:border-r border-gray-200/80 bg-white/50 backdrop-blur-md p-4 flex flex-col justify-between select-none"
          id="sidebar"
        >
          {/* Link Menus lists */}
          <div className="space-y-6">
            
            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider px-3 block">
                Pemantauan Makro
              </span>
              <button
                onClick={() => {
                  setActiveTab('pemantauan');
                  setSelectedAccountNum(null);
                }}
                className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'pemantauan' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                    : 'text-gray-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="menu-macro"
              >
                <LayoutDashboard className="h-4.5 w-4.5" />
                <span>Dashboard & Antrean GNN</span>
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider px-3 block">
                Ruang Eksekusi
              </span>
              <button
                onClick={() => setActiveTab('ruang-eksekusi')}
                className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'ruang-eksekusi' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                    : 'text-gray-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="menu-tracer"
              >
                <PlayCircle className="h-4.5 w-4.5" />
                <span>Tracer & Bekukan Rekening</span>
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider px-3 block">
                Sistem & Integrasi
              </span>
              <button
                onClick={() => setActiveTab('sistem-integrasi')}
                className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'sistem-integrasi' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                    : 'text-gray-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="menu-integrations"
              >
                <HardDrive className="h-4.5 w-4.5" />
                <span>Kamus Skema & SQL Console</span>
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[9.5px] uppercase font-bold text-gray-400 tracking-wider px-3 block">
                Manajemen Sistem
              </span>
              <button
                onClick={() => setActiveTab('manajemen-sistem')}
                className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                  activeTab === 'manajemen-sistem' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                    : 'text-gray-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="menu-system"
              >
                <Settings className="h-4.5 w-4.5" />
                <span>Enrol Admin & Dataset Ingest</span>
              </button>
            </div>

          </div>

          {/* Sidebar Footer system integrity metadata */}
          <div className="border-t border-gray-200/80 pt-4 mt-8 space-y-2">
            <div className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors select-none">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              <span className="text-[10.5px] font-bold outfit-font">
                OJK_mTLS_SECURED
              </span>
            </div>
            <p className="text-[9px] text-gray-400 leading-relaxed font-sans font-semibold uppercase">
              Versi Sandbox Hub: NEXA-v3.1<br/>
              © 2026 OJK Indonesia
            </p>
          </div>

        </aside>

        {/* Dynamic Route views Render component (#main) */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto" id="main">
          {activeTab === 'pemantauan' && (
            <MacroMonitoring 
              onNavigateToTracer={handleNavigateToTracer} 
              triggerRedraw={dbStateTrigger}
            />
          )}

          {activeTab === 'ruang-eksekusi' && (
            <RuangEksekusi 
              initialTargetAccount={selectedAccountNum} 
              onExecutionCompleted={handleExecutionCompleted}
            />
          )}

          {activeTab === 'sistem-integrasi' && (
            <SistemIntegrasi />
          )}

          {activeTab === 'manajemen-sistem' && (
            <ManajemenSistem />
          )}
        </main>

      </div>

    </div>
  );
}
