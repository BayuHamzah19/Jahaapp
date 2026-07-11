"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, documentId, onSnapshot, Timestamp } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Coffee, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  table_number: number;
  items: OrderItem[];
  total_amount: number;
  status: "Pending" | "Preparing" | "Ready" | "Delivered" | "Completed";
  created_at: Timestamp | null;
  payment_method: string;
}

interface OrderHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder: (orderId: string) => void;
}

const STATUS_THEMES = {
  Pending: { bg: "bg-amber-50 text-amber-700 border-amber-100", label: "Pending" },
  Preparing: { bg: "bg-blue-50 text-blue-700 border-blue-100", label: "Cooking" },
  Ready: { bg: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Ready" },
  Delivered: { bg: "bg-gray-100 text-gray-700 border-gray-200", label: "Delivered" },
  Completed: { bg: "bg-gray-100 text-gray-700 border-gray-200", label: "Delivered" },
};

export default function OrderHistoryDrawer({ isOpen, onClose, onTrackOrder }: OrderHistoryDrawerProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let unsub: () => void;

    const setupHistoryListener = () => {
      setLoading(true);
      try {
        const savedHistoryStr = localStorage.getItem("historica_order_history");
        if (!savedHistoryStr) {
          setOrders([]);
          setLoading(false);
          return;
        }

        const orderIds = JSON.parse(savedHistoryStr) as string[];
        if (!orderIds || orderIds.length === 0) {
          setOrders([]);
          setLoading(false);
          return;
        }

        // Firestore 'in' query allows up to 30 items
        const targetIds = orderIds.slice(-30);

        const q = query(
          collection(db, "orders"),
          where(documentId(), "in", targetIds)
        );

        unsub = onSnapshot(q, (snap) => {
          const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

          // Sort by date descending
          fetched.sort((a, b) => {
            const timeA = a.created_at?.toDate().getTime() || 0;
            const timeB = b.created_at?.toDate().getTime() || 0;
            return timeB - timeA;
          });

          setOrders(fetched);
          setLoading(false);
        }, (error) => {
          console.error("Error listening to order history:", error);
          setLoading(false);
        });
      } catch (err) {
        console.error("Error setting up order history listener:", err);
        setLoading(false);
      }
    };

    setupHistoryListener();

    return () => {
      if (unsub) unsub();
    };
  }, [isOpen]);

  const formatDate = (timestamp: Timestamp | null) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate();
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-secondary rounded-t-[2.5rem] shadow-2xl z-50 flex flex-col overflow-hidden font-sans border-t border-white/20"
          >
            {/* Header drag indicator */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3 shrink-0" />

            {/* Header Content */}
            <div className="px-6 pb-4 border-b border-gray-200/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="text-[#C5A059]" size={22} />
                <h2 className="font-serif text-2xl font-bold text-primary-dark">Order History</h2>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-sm text-gray-500 font-medium">Loading your history...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 px-4 h-full">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative">
                    <Coffee size={40} className="text-gray-300" strokeWidth={1} />
                    <div className="absolute inset-0 border border-gray-200 rounded-full scale-110 opacity-50"></div>
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-primary-dark mb-3">Your history is empty</h3>
                  <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed mb-8">
                    You haven't ordered anything yet. Let's find some delicious food!
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-primary hover:bg-primary-dark text-white font-bold px-10 py-4 rounded-full shadow-lg active:scale-95 transition-all w-full max-w-[240px]"
                  >
                    Browse Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-4 pb-12">
                  {orders.map((order) => {
                    const theme = STATUS_THEMES[order.status] || STATUS_THEMES.Pending;
                    const isActive = order.status === "Pending" || order.status === "Preparing" || order.status === "Ready";
                    
                    return (
                      <div
                        key={order.id}
                        className="bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col"
                      >
                        {/* Card Top */}
                        <div className="flex justify-between items-start pb-3 border-b border-gray-50">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Order ID: {order.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">{formatDate(order.created_at)}</p>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors duration-700 ${theme.bg}`}>
                            {theme.label}
                          </span>
                        </div>

                        {/* Items summary */}
                        <div className="py-4 space-y-2 flex-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600 font-medium">
                                <strong className="text-primary-dark font-extrabold mr-1.5">{item.quantity}x</strong> 
                                {item.name}
                              </span>
                              <span className="font-bold text-primary-dark">
                                Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Card Bottom */}
                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Paid</p>
                            <p className="text-lg font-black text-accent mt-0.5">
                              Rp {order.total_amount.toLocaleString("id-ID")}
                            </p>
                          </div>

                          {isActive && (
                            <button
                              onClick={() => onTrackOrder(order.id)}
                              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-xl border border-emerald-100/50 transition-colors"
                            >
                              Track Order <ChevronRight size={14} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
