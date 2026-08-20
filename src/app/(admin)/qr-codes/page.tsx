"use client";
/* eslint-disable */
import { useState, useEffect } from "react";
import { ChefHat, LayoutGrid, Utensils, LogOut, TrendingUp, QrCode, Printer, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { QRCodeSVG } from 'qrcode.react';
import toast, { Toaster } from "react-hot-toast";

export default function QRCodesPage() {
  const router = useRouter();
  const [tableCount, setTableCount] = useState(20);
  const [tables, setTables] = useState<number[]>(Array.from({ length: 20 }, (_, i) => i + 1));
  const [singleTable, setSingleTable] = useState<string>("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const handleSequentialChange = (val: string) => {
    const count = Number(val) || 0;
    setTableCount(count);
    setTables(Array.from({ length: count }, (_, i) => i + 1));
  };

  const handleAddSingle = () => {
    const tableNo = Number(singleTable);
    if (!tableNo) return;
    if (tables.includes(tableNo)) {
      toast.error(`Table ${tableNo} already exists!`);
      return;
    }
    setTables([...tables, tableNo]);
    setSingleTable("");
  };

  return (
    <div className="min-h-screen bg-[#FDFCF7] flex flex-col font-sans">
      {/* Premium Header - Hide on print */}
      <header className="kds-no-print bg-[#1B3022] text-white px-4 md:px-8 py-4 md:py-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-10 border-b border-[#C5A059]/20 overflow-hidden min-w-0">
        <div className="flex items-center gap-8 flex-wrap">
          <div className="flex items-center gap-3">
            <ChefHat size={28} className="text-[#C5A059]" />
            <h1 className="text-2xl font-serif font-black tracking-wide text-[#F5F2E8]">Jaha Admin</h1>
          </div>
          <nav className="flex items-center gap-1.5 overflow-x-auto">
            <Link href="/kds" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <LayoutGrid size={16} /> Kitchen Display
            </Link>
            <Link href="/menu" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <Utensils size={16} /> Menu Items
            </Link>
            <Link href="/sales" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <TrendingUp size={16} /> Sales Report
            </Link>
            <Link href="/qr-codes" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#F5F2E8]/10 text-white border border-white/5 transition-all">
              <QrCode size={16} /> Table QR
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={async () => {
              await signOut(auth);
              router.push("/admin/login");
            }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all border border-red-500/20 text-xs font-bold shrink-0"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        {/* Controls - Hide on print */}
        <div className="kds-no-print flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-serif font-black text-[#1B3022] mb-2">Table QR Generator</h2>
            <p className="text-gray-500 font-medium text-sm">Generate and print QR standees for each table.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4 w-full md:w-auto">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Number of Tables</label>
              <input 
                type="number"
                min="1"
                max="200"
                value={tableCount}
                onChange={(e) => handleSequentialChange(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-[#1B3022] font-bold rounded-xl px-4 py-2 outline-none focus:border-[#C5A059] transition-all w-full md:w-32"
              />
            </div>

            <div className="flex flex-col border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4 w-full md:w-auto">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Specific Table No.</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min="1"
                  value={singleTable}
                  onChange={(e) => setSingleTable(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSingle()}
                  placeholder="e.g. 99"
                  className="bg-gray-50 border border-gray-200 text-[#1B3022] font-bold rounded-xl px-4 py-2 outline-none focus:border-[#C5A059] transition-all w-full md:w-24"
                />
                <button
                  onClick={handleAddSingle}
                  className="bg-[#1B3022] hover:bg-[#0D1A10] text-[#C5A059] p-2.5 rounded-xl transition-all active:scale-95 shrink-0"
                  title="Add Single Table"
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
            
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 bg-[#C5A059] hover:bg-[#b59048] text-white font-bold px-6 py-3.5 rounded-xl shadow-lg transition-all active:scale-95 ml-0 md:ml-2 mt-2 md:mt-0 w-full md:w-auto"
            >
              <Printer size={18} strokeWidth={2.5} /> Print QRs
            </button>
          </div>
        </div>

        {/* Printable QR Grid */}
        <div className="qr-print-container space-y-6 md:space-y-8">
          {Array.from({ length: Math.ceil(tables.length / 6) }).map((_, pageIndex) => {
            const pageTables = tables.slice(pageIndex * 6, (pageIndex + 1) * 6);
            return (
              <div key={pageIndex} className="qr-print-page grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 qr-print-grid">
                {pageTables.map(table => (
                  <div 
                    key={table}
                    className="qr-card bg-white border-2 border-dashed border-gray-300 rounded-3xl p-6 pb-8 flex flex-col items-center text-center shadow-sm relative min-h-[420px]"
                  >
                    {/* Brand Header */}
                    <div className="mb-6 pb-4 border-b border-gray-100 w-full">
                      <h3 className="font-serif text-2xl font-black text-[#1B3022] tracking-wide">Jaha</h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold mt-1">Coffee & Kitchen</p>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-inner mb-6">
                      {origin ? (
                        <QRCodeSVG 
                          value={`${origin}/?table=${table}`} 
                          size={150} 
                          fgColor="#1B3022" 
                          level="H"
                        />
                      ) : (
                        <div className="w-[150px] h-[150px] bg-gray-100 rounded animate-pulse" />
                      )}
                    </div>

                    {/* Table Info */}
                    <div className="mt-auto w-full pt-2">
                      <div className="bg-[#1B3022] text-white py-4 rounded-xl mb-3 shadow-sm">
                        <span className="text-xs uppercase tracking-widest font-bold opacity-80 block mb-1">Table</span>
                        <span className="text-4xl font-black leading-none block">{table}</span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 flex items-center justify-center gap-1.5">
                        <QrCode size={12} /> Scan to order & pay
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
