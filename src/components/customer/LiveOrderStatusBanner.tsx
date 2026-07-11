"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Bell, CheckCircle2, X, ChevronDown, ChevronUp } from "lucide-react";

type OrderStatus = "Pending" | "Preparing" | "Ready" | "Delivered" | "Completed";

interface LiveOrderStatusBannerProps {
  orderId: string;
  tableNumber: string;
  onDismiss: () => void;
}

const STATUS_CONFIG = {
  Pending: {
    label: "Order Received. Waiting for kitchen...",
    sublabel: "Your order is in the queue",
    icon: Bell,
    bg: "bg-[#1B2A1E]",
    border: "border-amber-500/30",
    accent: "bg-amber-500",
    text: "text-amber-400",
    dot: "bg-amber-400",
    pulse: true,
  },
  Preparing: {
    label: "Sedang Disiapkan 🍳",
    sublabel: "Our chefs are crafting your order",
    icon: ChefHat,
    bg: "bg-[#111D2E]",
    border: "border-blue-500/30",
    accent: "bg-blue-500",
    text: "text-blue-400",
    dot: "bg-blue-400",
    pulse: true,
  },
  Ready: {
    label: "Makanan Siap Diantar! 🛎️",
    sublabel: "Your order is on its way to your table",
    icon: CheckCircle2,
    bg: "bg-[#0D2018]",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    pulse: false,
  },
  Delivered: {
    label: "Makanan Sudah Diantar! 🍽️",
    sublabel: "Enjoy your meal!",
    icon: CheckCircle2,
    bg: "bg-[#0D2018]",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    pulse: false,
  },
  Completed: {
    label: "Pesanan Selesai! 🎉",
    sublabel: "Thank you for dining with us!",
    icon: CheckCircle2,
    bg: "bg-[#0D2018]",
    border: "border-emerald-500/30",
    accent: "bg-emerald-500",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    pulse: false,
  },
};

export default function LiveOrderStatusBanner({ orderId, tableNumber, onDismiss }: LiveOrderStatusBannerProps) {
  const [status, setStatus] = useState<OrderStatus>("Pending");
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "orders", orderId), (snap) => {
      if (snap.exists()) {
        const newStatus = snap.data().status as OrderStatus;
        setStatus(newStatus);
      } else {
        // Order doc was deleted — clean up and dismiss
        localStorage.removeItem("historica_active_order");
        onDismiss();
      }
    });
    return () => unsub();
  }, [orderId, onDismiss]);

  // Auto-dismiss banner 15 seconds after reaching terminal states
  useEffect(() => {
    if (status === "Ready" || status === "Delivered" || status === "Completed") {
      const timer = setTimeout(() => {
        localStorage.removeItem("historica_active_order");
        onDismiss();
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss]);

  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -100, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50"
        style={{ pointerEvents: "auto" }}
      >
        <div className={`${cfg.bg} ${cfg.border} border rounded-[1.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden`}>
          
          {/* Top accent stripe */}
          <div className={`h-0.5 w-full ${cfg.accent} opacity-60`} />

          <div className="p-4">
            <div className="flex items-center gap-3">
              
              {/* Animated status icon */}
              <div className={`relative w-10 h-10 ${cfg.accent} bg-opacity-20 rounded-full flex items-center justify-center shrink-0`}>
                <Icon size={20} className={cfg.text} strokeWidth={2.5} />
                {cfg.pulse && (
                  <span className={`absolute inset-0 rounded-full ${cfg.accent} opacity-30 animate-ping`} />
                )}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className={`font-bold text-[13px] leading-tight ${cfg.text}`}>{cfg.label}</p>
                    {!minimized && (
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">{cfg.sublabel}</p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setMinimized(v => !v)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-white/5 transition-colors"
                >
                  {minimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                </button>
                {(status === "Ready" || status === "Completed" || status === "Delivered") && (
                  <button
                    onClick={() => {
                      localStorage.removeItem("historica_active_order");
                      onDismiss();
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:bg-white/5 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded: Table + Progress steps */}
            <AnimatePresence>
              {!minimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-3 border-t border-white/5">
                    {/* Step progress bar */}
                    <div className="flex items-center justify-between mb-2">
                      {(["Pending", "Preparing", "Ready"] as OrderStatus[]).map((step, i) => {
                        const stepCfg = STATUS_CONFIG[step];
                        const stepIndex = ["Pending","Preparing","Ready"].indexOf(step);
                        const currentIndex = ["Pending","Preparing","Ready"].indexOf(status);
                        const isActive = step === status;
                        const isDone = stepIndex < currentIndex;
                        return (
                          <div key={step} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                isActive ? `${stepCfg.accent} shadow-lg` : 
                                isDone ? "bg-white/20" : "bg-white/5"
                              }`}>
                                {isDone 
                                  ? <CheckCircle2 size={12} className="text-white/60" strokeWidth={3} />
                                  : <span className={`w-2 h-2 rounded-full ${isActive ? "bg-white" : "bg-white/20"}`} />
                                }
                              </div>
                              <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                isActive ? stepCfg.text : "text-gray-600"
                              }`}>
                                {step === "Pending" ? "Ordered" : step === "Preparing" ? "Cooking" : "Ready"}
                              </span>
                            </div>
                            {i < 2 && (
                              <div className={`flex-1 h-px mx-1 mb-4 transition-all ${isDone || isActive && i === 0 ? "bg-white/20" : "bg-white/5"}`} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Table number pill */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-gray-600 font-medium">Order ID: {orderId.slice(0, 8)}...</span>
                      <span className="text-[10px] font-black text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                        Table {tableNumber}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
