"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MenuItem } from "@/components/customer/MenuItemCard";
import MenuItemCard from "@/components/customer/MenuItemCard";
import LiveOrderStatusBanner from "@/components/customer/LiveOrderStatusBanner";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import {
  ShoppingBag, Search, ChevronRight, QrCode,
  Coffee, UtensilsCrossed, Pizza, CakeSlice,
  GlassWater, ChevronLeft, CreditCard, Wallet, Clock, Filter, Info
} from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import OrderHistoryDrawer from "@/components/customer/OrderHistoryDrawer";

const categoryIcons: Record<string, React.ReactNode> = {
  "All": <span className="text-xs font-semibold uppercase tracking-wider">All</span>,
  "Signature Coffee": <Coffee size={28} strokeWidth={2.5} />,
  "Main Course": <UtensilsCrossed size={28} strokeWidth={2.5} />,
  "Pasta & Pizza": <Pizza size={28} strokeWidth={2.5} />,
  "Light Bites": <GlassWater size={28} strokeWidth={2.5} />,
  "Desserts": <CakeSlice size={28} strokeWidth={2.5} />
};

const staticMenuItems: MenuItem[] = [
  { id: 1, name: "Historica Iced Coffee", price: 45000, category: "Signature Coffee", image: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=500" },
  { id: 2, name: "Matcha Latte", price: 48000, category: "Signature Coffee", image: "https://images.unsplash.com/photo-1515823662972-da6a2b4d3002?auto=format&fit=crop&q=80&w=500" },
  { id: 3, name: "Classic Carbonara", price: 85000, category: "Pasta & Pizza", image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&q=80&w=500" },
  { id: 4, name: "Margherita Pizza", price: 95000, category: "Pasta & Pizza", image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&q=80&w=500" },
  { id: 5, name: "Truffle Mushroom Risotto", price: 95000, category: "Main Course", image: "https://images.unsplash.com/photo-1633964913295-ceb43826e7cf?auto=format&fit=crop&q=80&w=500" },
  { id: 6, name: "Wagyu Beef Burger", price: 120000, category: "Main Course", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=500" },
  { id: 7, name: "Classic Tiramisu", price: 55000, category: "Desserts", image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=500" },
  { id: 8, name: "Almond Croissant", price: 35000, category: "Light Bites", image: "https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&q=80&w=500" }
];

function MenuContent() {
  const searchParams = useSearchParams();
  const tableNumber = searchParams.get("table");

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<(MenuItem & { quantity: number })[]>([]);

  // Checkout & Payment
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "VA" | "CASHIER" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Hydration safeguard: start with null so server & client render identical HTML.
  // localStorage is only read after mount on the client side.
  const [isMounted, setIsMounted] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const savedOrderId = localStorage.getItem("historica_active_order");
    if (savedOrderId) setActiveOrderId(savedOrderId);
  }, []);

  // Helper: sync state and localStorage together
  const persistActiveOrder = (id: string | null) => {
    setActiveOrderId(id);
    if (id) localStorage.setItem("historica_active_order", id);
    else localStorage.removeItem("historica_active_order");
  };

  const categories = ["All", "Signature Coffee", "Main Course", "Pasta & Pizza", "Light Bites", "Desserts"];

  // Use the static menu items requested
  const menuItems = staticMenuItems;

  // No table number warning
  if (!tableNumber) {
    return (
      <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
        >
          <QrCode size={40} className="text-primary-dark" />
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-3xl font-serif font-bold mb-4 text-primary-dark">Welcome to Historica</motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
          className="text-gray-500 font-medium max-w-xs leading-relaxed">
          Please scan the QR code located on your table to access the menu and place your order.
        </motion.p>
      </div>
    );
  }

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = searchQuery || activeCategory === "All" ? true : item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const finalizeOrder = async () => {
    setIsSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, "orders"), {
        table_number: parseInt(tableNumber as string),
        items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total_amount: totalAmount,
        status: "Pending",
        payment_method: paymentMethod,
        created_at: serverTimestamp(),
      });

      // ✅ Stay on menu: persist the order ID so it survives refreshes
      persistActiveOrder(docRef.id);

      // Save order to history in localStorage
      const savedHistoryStr = localStorage.getItem("historica_order_history");
      const history = savedHistoryStr ? JSON.parse(savedHistoryStr) : [];
      history.push(docRef.id);
      localStorage.setItem("historica_order_history", JSON.stringify(history));

      setCart([]);
      setIsCheckoutMode(false);
      setPaymentMethod(null);
    } catch (err) {
      console.error("Error creating order:", err);
      alert("Failed to connect to Firebase. Please check your Firestore rules.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // PAYMENT CHECKOUT FLOW
  if (isCheckoutMode) {
    if (cart.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-screen bg-secondary flex flex-col font-sans"
        >
          <header className="bg-primary text-white p-6 rounded-b-[2.5rem] shadow-xl flex items-center gap-4 z-20">
            <button
              onClick={() => setIsCheckoutMode(false)}
              className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-serif text-2xl font-bold text-secondary">Cart</h1>
          </header>
          
          <main className="flex-1 flex flex-col items-center justify-center text-center p-6 pb-20">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative">
              <ShoppingBag size={40} className="text-gray-300" strokeWidth={1} />
              <div className="absolute inset-0 border border-gray-200 rounded-full scale-110 opacity-50"></div>
            </div>
            <h3 className="font-serif text-2xl font-bold text-primary-dark mb-3">Your cart is empty</h3>
            <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed mb-8">
              You haven't ordered anything yet. Let's find some delicious food!
            </p>
            <button
              onClick={() => setIsCheckoutMode(false)}
              className="bg-primary hover:bg-primary-dark text-white font-bold px-10 py-4 rounded-full shadow-lg active:scale-95 transition-all w-full max-w-[240px]"
            >
              Browse Menu
            </button>
          </main>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-secondary flex flex-col font-sans"
      >
        <header className="bg-primary text-white p-6 rounded-b-[2.5rem] shadow-xl flex items-center gap-4 z-20">
          <button
            onClick={() => { if (paymentMethod) setPaymentMethod(null); else setIsCheckoutMode(false); }}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-serif text-2xl font-bold text-secondary">
            {paymentMethod ? "Payment" : "Checkout"}
          </h1>
        </header>

        <main className="flex-1 p-6 flex flex-col">
          {/* Order Summary */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6">
            <h2 className="text-xs font-black text-accent uppercase tracking-widest mb-4">Order Summary</h2>
            <div className="space-y-4 mb-5">
              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex justify-between items-start text-sm">
                  <div className="flex items-start gap-3">
                    <span className="font-black text-primary-dark bg-gray-50 px-2 py-0.5 rounded-md">{item.quantity}x</span>
                    <span className="text-gray-600 font-medium leading-tight pt-0.5">{item.name}</span>
                  </div>
                  <span className="font-bold text-primary-dark whitespace-nowrap ml-4">Rp {(item.price * item.quantity).toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-5 flex justify-between items-center">
              <span className="font-black text-primary-dark">Total Amount</span>
              <span className="text-2xl font-black text-accent">Rp {totalAmount.toLocaleString("id-ID")}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          {!paymentMethod ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Select Payment Method</h2>
              <div className="space-y-3">
                {[
                  { id: "QRIS", label: "QRIS", sub: "Gopay, OVO, ShopeePay, M-Banking", Icon: QrCode },
                  { id: "VA", label: "Virtual Account", sub: "BCA, Mandiri, BNI", Icon: CreditCard },
                  { id: "CASHIER", label: "Pay at Cashier", sub: "Bayar di Kasir", Icon: Wallet },
                ].map(({ id, label, sub, Icon }) => (
                  <button key={id} onClick={() => setPaymentMethod(id as "QRIS" | "VA" | "CASHIER")}
                    className="w-full bg-white p-5 rounded-[1.5rem] flex items-center justify-between border border-gray-100 shadow-sm active:scale-95 transition-transform group hover:border-accent/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Icon size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-primary-dark text-base">{label}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">{sub}</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-300 group-hover:text-accent" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center">

              {paymentMethod === "QRIS" && (
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 w-full flex flex-col items-center mb-8 relative overflow-hidden">
                  <div className="absolute top-0 w-full bg-[#E5F3EB] py-1.5 flex justify-center items-center gap-2">
                    <span className="text-[10px] font-black text-primary tracking-widest uppercase">GPN</span>
                    <span className="text-[10px] font-bold text-primary opacity-60">Verified</span>
                  </div>
                  <h3 className="font-bold text-primary-dark text-xl mt-6 mb-6">Scan to Pay</h3>
                  <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-inner">
                    <QRCodeSVG value="https://historica.com/pay/demo" size={180} fgColor="#15271A" />
                  </div>
                  <p className="font-black text-3xl text-accent mt-8 mb-2">Rp {totalAmount.toLocaleString("id-ID")}</p>
                  <p className="text-xs text-gray-400 font-medium text-center">Open your e-wallet or banking app and scan the QR code above.</p>
                </div>
              )}

              {paymentMethod === "VA" && (
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 w-full flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <CreditCard size={32} />
                  </div>
                  <h3 className="font-bold text-primary-dark text-lg mb-6 text-center">Transfer to Virtual Account</h3>
                  <div className="bg-gray-50 p-5 rounded-2xl text-center mb-6 border border-gray-200 w-full">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">BCA Virtual Account</p>
                    <p className="font-black text-[22px] tracking-widest text-primary-dark">3901 8273 1928</p>
                  </div>
                  <p className="font-black text-3xl text-accent mb-2">Rp {totalAmount.toLocaleString("id-ID")}</p>
                  <p className="text-xs text-gray-400 font-medium text-center">Please transfer the exact amount.</p>
                </div>
              )}

              {paymentMethod === "CASHIER" && (
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 w-full flex flex-col items-center mb-8 text-center">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6 ring-8 ring-primary/5">
                    <Wallet size={40} />
                  </div>
                  <h3 className="font-bold text-primary-dark text-2xl mb-3">Pay at Cashier</h3>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed px-4">
                    Please proceed to the cashier and mention your <strong className="text-primary-dark">Table {tableNumber}</strong>.
                  </p>
                  <p className="font-black text-3xl text-accent mb-2">Rp {totalAmount.toLocaleString("id-ID")}</p>
                </div>
              )}

              <button
                disabled={isSubmitting}
                onClick={finalizeOrder}
                className="w-full bg-accent hover:bg-[#b59048] text-white py-4 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_10px_25px_rgba(197,160,89,0.4)] mt-auto mb-4 disabled:opacity-70"
              >
                {isSubmitting ? "Processing..." : (paymentMethod === "CASHIER" ? "Confirm Order & Pay Later" : "Simulate Payment Success (Demo)")}
              </button>
            </motion.div>
          )}
        </main>
      </motion.div>
    );
  }

  // MAIN MENU PAGE
  return (
    <div className="min-h-screen w-full max-w-[100vw] mx-auto bg-secondary pb-[calc(9rem+env(safe-area-inset-bottom))] font-sans overflow-x-hidden relative md:max-w-7xl md:shadow-2xl md:border-x md:border-gray-100">

      {/* Floating Live Order Status Banner — only render after mount to avoid hydration mismatch */}
      {isMounted && activeOrderId && (
        <LiveOrderStatusBanner
          orderId={activeOrderId}
          tableNumber={tableNumber}
          onDismiss={() => persistActiveOrder(null)}
        />
      )}

      {/* Premium Header */}
      <header className={`pb-8 px-6 bg-primary rounded-b-[2.5rem] relative overflow-hidden w-full max-w-[100vw] shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-20 ${activeOrderId ? "pt-32" : "pt-14"}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent opacity-20 rounded-full blur-2xl translate-y-1/3"></div>

        <div className="relative z-10 flex justify-between items-start mb-8 w-full">
          <div className="min-w-0 flex-1">
            <p className="text-accent text-[10px] font-black tracking-[0.3em] uppercase mb-1.5 opacity-90 truncate">Welcome to</p>
            <h1 className="font-serif text-3xl sm:text-[38px] text-white font-bold tracking-wide leading-none truncate">Historica</h1>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-[1.25rem] flex flex-col items-center shadow-lg shrink-0 ml-4">
            <span className="text-[9px] font-black text-accent uppercase tracking-widest opacity-90">Table</span>
            <span className="text-xl font-black text-white leading-none mt-0.5">{tableNumber}</span>
          </div>
        </div>

        <div className="relative z-10">
          <input
            type="text"
            placeholder="What are you craving?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="appearance-none w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[1.25rem] py-4 pl-12 pr-4 text-base text-white placeholder-white/60 focus:outline-none focus:border-accent/50 focus:bg-white/20 transition-all shadow-inner"
          />
          <Search size={20} className="absolute left-4 top-4 text-white/60" />
        </div>
      </header>

      {/* Icon-Only Category Grid */}
      {!searchQuery && (
        <div className="mt-6 mb-2">
          <div className="flex justify-start md:justify-center overflow-x-auto gap-4 px-4 pb-2 scrollbar-hide items-center w-full">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 w-[3.25rem] h-[3.25rem] sm:w-14 sm:h-14 rounded-[1.125rem] flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgb(0,0,0,0.04)] ${
                    isActive
                      ? "bg-primary text-accent-light shadow-[0_8px_25px_rgba(27,48,34,0.3)] scale-105"
                      : "bg-white text-primary-dark border border-gray-100 hover:bg-gray-50 hover:scale-105"
                  }`}
                >
                  {categoryIcons[cat]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu Items */}
      <main className="px-4 pt-2">
        {activeOrderId && (
          <div className="bg-orange-50/70 border border-orange-100/50 rounded-[1.25rem] p-3 mb-5 mt-2 flex items-center gap-3 shadow-sm mx-1">
            <div className="bg-white rounded-full p-1.5 shadow-sm border border-orange-50 shrink-0">
              <Info size={16} className="text-[#C5A059]" />
            </div>
            <p className="text-[12px] text-primary-dark font-medium leading-snug">
              Kindly remain at your selected table until your order is served.
            </p>
          </div>
        )}

        <h2 className="font-serif text-[26px] font-bold text-primary-dark mb-6 px-1">
          {searchQuery ? "Search Results" : activeCategory}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
          {filteredItems.map((item, idx) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <MenuItemCard item={item} onAdd={addToCart} />
            </motion.div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center text-gray-500 mt-16 flex flex-col items-center">
              <Search size={48} className="text-gray-300 mb-4 opacity-50" />
              <p className="font-medium text-lg">No items found.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <nav className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-7xl z-50 pointer-events-none">
        <div className="glass-dark rounded-full p-2.5 flex items-center justify-between pointer-events-auto ring-1 ring-white/10">
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setSearchQuery(""); }}
              className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-gray-400 hover:text-accent hover:bg-white/5 transition-all"
            >
              <UtensilsCrossed size={18} className="mb-0.5" />
              <span className="text-[8px] font-black uppercase tracking-wider">Menu</span>
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-gray-400 hover:text-accent hover:bg-white/5 transition-all"
            >
              <Clock size={18} className="mb-0.5" />
              <span className="text-[8px] font-black uppercase tracking-wider">History</span>
            </button>
          </div>

          <button
            onClick={() => setIsCheckoutMode(true)}
            className={`relative flex-1 flex items-center justify-between h-12 pl-4 pr-2 rounded-full transition-all duration-300 ml-2 ${cart.length > 0
              ? "bg-accent hover:bg-[#b59048] active:scale-95 shadow-[0_10px_25px_rgba(197,160,89,0.4)]"
              : "bg-white/10 text-gray-400 hover:text-white hover:bg-white/20 active:scale-95 transition-colors"
              }`}
          >
            {cart.length > 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag size={20} className="text-white" />
                    <span className="absolute -top-1.5 -right-2 bg-primary-dark text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-accent">
                      {totalItems}
                    </span>
                  </div>
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[8px] font-black uppercase tracking-wider text-primary-dark opacity-80">Checkout</span>
                    <span className="text-[14px] font-black text-white">Rp {totalAmount.toLocaleString("id-ID")}</span>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">
                  <ChevronRight size={18} strokeWidth={3} />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center w-full gap-2 opacity-50">
                <ShoppingBag size={16} />
                <span className="text-xs font-black uppercase tracking-wider">Cart Empty</span>
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Order History Drawer */}
      <OrderHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onTrackOrder={(orderId) => {
          persistActiveOrder(orderId);
          setIsHistoryOpen(false);
        }}
      />
    </div>
  );
}

export default function CustomerMenu() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-700 rounded-full animate-spin mb-4" />
        <span className="font-serif font-bold text-gray-900 tracking-wide">Historica</span>
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}
