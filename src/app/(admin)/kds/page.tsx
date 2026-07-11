"use client";
import { useState, useEffect, useRef } from "react";
import { Clock, CheckCircle2, ChefHat, Utensils, LayoutGrid, LogOut, Printer, X, TrendingUp, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { collection, query, onSnapshot, updateDoc, doc, orderBy, Timestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(0.15, start);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };
    
    const now = audioCtx.currentTime;
    playNote(587.33, now, 0.4); // D5
    playNote(880.00, now + 0.12, 0.6); // A5
  } catch (e) {
    console.warn("AudioContext failed to play sound:", e);
  }
};

type OrderStatus = "Pending" | "Preparing" | "Ready" | "Delivered" | "Completed";

interface Order {
  id: string;
  table_number: number;
  items: { name: string; quantity: number; price: number; special_instructions?: string }[];
  total_amount: number;
  status: OrderStatus;
  created_at: Date;
  payment_method?: string;
}

export default function KitchenDisplaySystem() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [error, setError] = useState("");
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const isInitialLoad = useRef(true);

  // Force re-render every minute to update elapsed times
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Firebase Real-time Listener
  useEffect(() => {
    try {
      const q = query(collection(db, "orders"), orderBy("created_at", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedOrders: Order[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedOrders.push({
            id: docSnap.id,
            table_number: data.table_number,
            items: data.items,
            total_amount: data.total_amount || 0,
            status: data.status,
            payment_method: data.payment_method,
            created_at: data.created_at ? (data.created_at as Timestamp).toDate() : new Date(),
          });
        });
        setOrders(fetchedOrders);
        
        // Trigger notification for new additions (only after the first load)
        if (!isInitialLoad.current) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (data.status === "Pending") {
                playNotificationSound();
                toast(`🛎️ New Order from Table ${data.table_number}!`, {
                  icon: "🛎️",
                  duration: 5000,
                  style: {
                    background: '#0D1A10',
                    color: '#FFF',
                    border: '1px solid #C5A059',
                    fontWeight: 'bold',
                  }
                });
              }
            }
          });
        }
        
        isInitialLoad.current = false;
      }, (err) => {
        console.error("Firestore Error:", err);
        setError("Failed to connect to Firebase. Check your config and Firestore rules.");
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up Firebase listener:", err);
      setError("Firebase is not configured correctly.");
    }
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    } catch (err) {
      console.error("Error updating order:", err);
      alert("Failed to update status.");
    }
  };

  const getElapsedTime = (date: Date) => {
    const diff = Math.floor((currentTime - date.getTime()) / 60000);
    if (diff < 1) return "Just now";
    return `${diff}m ago`;
  };

  const columns: { title: string; status: OrderStatus; color: string; bg: string; border: string }[] = [
    { title: "New Orders", status: "Pending", color: "text-amber-800", bg: "bg-amber-50/60", border: "border-amber-100" },
    { title: "Preparing", status: "Preparing", color: "text-blue-800", bg: "bg-blue-50/60", border: "border-blue-100" },
    { title: "Ready to Serve", status: "Ready", color: "text-[#1B3022]", bg: "bg-[#1B3022]/5", border: "border-[#1B3022]/10" }
  ];

  // Auto-remove completed orders: only display active ones
  const activeOrders = orders.filter(o => o.status === "Pending" || o.status === "Preparing" || o.status === "Ready");

  return (
    <div className="kds-no-print min-h-screen w-full max-w-full overflow-x-hidden bg-[#FDFCF7] flex flex-col font-sans">
      {/* Premium Header */}
      <header className="kds-no-print bg-[#1B3022] text-white px-4 md:px-8 py-4 md:py-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-10 border-b border-[#C5A059]/20 overflow-hidden min-w-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <ChefHat size={28} className="text-[#C5A059]" />
            <h1 className="text-2xl font-serif font-black tracking-wide text-[#F5F2E8]">Historica KDS</h1>
          </div>
          <nav className="flex items-center gap-1.5 overflow-x-auto">
            <Link href="/kds" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#F5F2E8]/10 text-white border border-white/5 transition-all">
              <LayoutGrid size={16} /> Kitchen Display
            </Link>
            <Link href="/menu" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <Utensils size={16} /> Menu Items
            </Link>
            <Link href="/sales" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <TrendingUp size={16} /> Sales Report
            </Link>
            <Link href="/qr-codes" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
              <QrCode size={16} /> Table QR
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {error ? (
            <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-200 text-xs font-black uppercase tracking-wider">
              {error}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Live Sync Active</span>
            </div>
          )}
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

      {/* Kanban Board Container — overflow-x-auto lets columns scroll internally on small screens */}
      <main className="kds-no-print flex-1 p-4 md:p-8 overflow-x-auto flex gap-4 md:gap-8">
        {columns.map(col => {
          const colOrders = activeOrders.filter(o => o.status === col.status);
          return (
            <div key={col.status} className="flex-1 min-w-[300px] md:min-w-0 flex flex-col bg-[#F5F2E8]/40 rounded-3xl border border-gray-200/50 shadow-sm overflow-hidden">
              {/* Column Header */}
              <div className={`p-5 border-b flex justify-between items-center ${col.bg} ${col.border} ${col.color}`}>
                <h2 className="text-base font-extrabold uppercase tracking-wider flex items-center gap-2">
                  {col.title}
                </h2>
                <span className="bg-white/80 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black shadow-sm border border-gray-100">
                  {colOrders.length}
                </span>
              </div>
              
              {/* Column Body / Cards List */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4">
                {colOrders.map(order => {
                  const elapsedMins = Math.floor((currentTime - order.created_at.getTime()) / 60000);
                  const isLate = elapsedMins > 15;
                  return (
                    <div key={order.id} className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_12px_40px_rgb(0,0,0,0.05)] transition-all duration-300">
                      
                      {/* Card Top section */}
                      <div className="flex justify-between items-start mb-4 pb-4 border-b border-gray-50">
                        <div>
                          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest">{order.id.slice(0, 8)}</span>
                          <h3 className="text-3xl font-serif font-black text-[#1B3022] mt-0.5">Table {order.table_number}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                            isLate 
                              ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' 
                              : 'bg-gray-50 text-gray-500 border-gray-100'
                          }`}>
                            <Clock size={14} />
                            {getElapsedTime(order.created_at)}
                          </div>
                          <button
                            onClick={() => setReceiptOrder(order)}
                            title="View Receipt"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-amber-50 hover:text-amber-600 text-gray-400 border border-gray-100 transition-all hover:border-amber-100"
                          >
                            <Printer size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Card Items List */}
                      <ul className="space-y-2.5 mb-6">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="bg-[#1B3022]/5 text-[#1B3022] font-black px-2 py-1 rounded-lg text-xs min-w-[32px] text-center border border-[#1B3022]/10">
                              {item.quantity}x
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 text-[14px] leading-tight pt-0.5">{item.name}</p>
                              {item.special_instructions && (
                                <p className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 inline-block px-2 py-0.5 rounded border border-red-100">⚠️ {item.special_instructions}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Card Actions */}
                      <div className="flex gap-2">
                        {col.status === "Pending" && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, "Preparing")}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-blue-600/10 flex justify-center items-center gap-2"
                          >
                            Start Preparing
                          </button>
                        )}
                        {col.status === "Preparing" && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, "Ready")}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-emerald-600/10 flex justify-center items-center gap-2"
                          >
                            <CheckCircle2 size={14} strokeWidth={3} /> Ready to Serve
                          </button>
                        )}
                        {col.status === "Ready" && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, "Delivered")}
                            className="flex-1 bg-[#1B3022] hover:bg-[#0D1A10] text-[#C5A059] border border-[#C5A059]/20 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 shadow-md flex justify-center items-center gap-2"
                          >
                            <CheckCircle2 size={14} strokeWidth={3} /> Mark as Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {colOrders.length === 0 && (
                  <div className="h-full py-16 flex flex-col items-center justify-center text-gray-400 opacity-40">
                    <ChefHat size={40} className="mb-3 text-gray-300" />
                    <p className="font-extrabold text-sm uppercase tracking-wider">No active orders</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
      <Toaster position="top-right" />

      {/* ── Receipt Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {receiptOrder && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="receipt-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setReceiptOrder(null)}
            />

            {/* Modal container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              className="receipt-modal-chrome fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm pointer-events-auto flex flex-col overflow-hidden">
                {/* Modal header — hidden at print time */}
                <div className="receipt-modal-chrome flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="font-serif text-lg font-bold text-[#1B3022]">Order Receipt</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 bg-[#1B3022] hover:bg-[#0D1A10] text-[#C5A059] font-bold text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95 border border-[#C5A059]/20"
                    >
                      <Printer size={13} /> Print
                    </button>
                    <button
                      onClick={() => setReceiptOrder(null)}
                      className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Printable receipt content */}
                <div id="receipt-printable" className="historica-receipt-modal overflow-y-auto max-h-[75vh]">
                  <div className="p-6 font-mono" style={{ fontFamily: '"Courier New", Courier, monospace' }}>

                    {/* Receipt Header */}
                    <div className="text-center mb-5 pb-4" style={{ borderBottom: '2px dashed #d1d5db' }}>
                      <div className="text-2xl font-bold text-[#1B3022] mb-0.5">Historica</div>
                      <div className="text-xs text-gray-500">Coffee & Kitchen · Surabaya</div>
                      <div className="text-xs text-gray-400 mt-1">Tel: (031) 000-0000</div>
                    </div>

                    {/* Order Meta */}
                    <div className="text-xs space-y-1 mb-4 text-gray-600">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order ID</span>
                        <span className="font-bold">{receiptOrder.id.slice(0, 12).toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Table</span>
                        <span className="font-bold">{receiptOrder.table_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Date</span>
                        <span className="font-bold">
                          {receiptOrder.created_at.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Time</span>
                        <span className="font-bold">
                          {receiptOrder.created_at.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {receiptOrder.payment_method && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payment</span>
                          <span className="font-bold">{receiptOrder.payment_method}</span>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '2px dashed #d1d5db', marginBottom: '16px' }} />

                    {/* Line Items */}
                    <div className="space-y-2 mb-4">
                      {/* Column header */}
                      <div className="flex text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <span className="w-8 shrink-0">Qty</span>
                        <span className="flex-1">Item</span>
                        <span className="w-24 text-right">Price</span>
                      </div>

                      {receiptOrder.items.map((item, idx) => {
                        const lineTotal = (item.price || 0) * item.quantity;
                        return (
                          <div key={idx} className="flex text-xs items-start gap-1">
                            <span className="w-8 shrink-0 font-bold text-[#1B3022]">{item.quantity}x</span>
                            <span className="flex-1 text-gray-700 leading-tight">{item.name}</span>
                            <span className="w-24 text-right font-semibold text-gray-800">
                              {item.price
                                ? `Rp ${lineTotal.toLocaleString('id-ID')}`
                                : '—'
                              }
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '2px dashed #d1d5db', marginBottom: '12px' }} />

                    {/* Totals */}
                    <div className="space-y-1.5 text-xs">
                      {(() => {
                        const subtotal = receiptOrder.items.reduce(
                          (s, i) => s + (i.price || 0) * i.quantity, 0
                        );
                        const grandTotal = receiptOrder.total_amount || subtotal;
                        return (
                          <>
                            <div className="flex justify-between text-gray-500">
                              <span>Subtotal</span>
                              <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between font-black text-base text-[#1B3022] pt-1" style={{ borderTop: '1px solid #e5e7eb', marginTop: '6px', paddingTop: '8px' }}>
                              <span>TOTAL</span>
                              <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 pt-4 text-[10px] text-gray-400 space-y-1" style={{ borderTop: '2px dashed #d1d5db' }}>
                      <p className="font-bold text-gray-500">Thank you for dining with us!</p>
                      <p>historicacoffee.id</p>
                      <p className="mt-2">* * *</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
