"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MenuItem } from "@/components/customer/MenuItemCard";
import MenuItemCard from "@/components/customer/MenuItemCard";
import LiveOrderStatusBanner from "@/components/customer/LiveOrderStatusBanner";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs } from "firebase/firestore";
import {
  ShoppingBag, Search, ChevronRight, QrCode,
  Coffee, UtensilsCrossed, Pizza, CakeSlice,
  GlassWater, ChevronLeft, CreditCard, Wallet, Clock, Filter, Info
} from "lucide-react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import OrderHistoryDrawer from "@/components/customer/OrderHistoryDrawer";

const cuteIcons: Record<string, string> = {
  "Favorites": "❤️",
  "All": "✨",
  "Signature Coffee": "☕",
  "Main Course": "🥘",
  "Pasta & Pizza": "🍕",
  "Light Bites": "🥐",
  "Desserts": "🍰"
};



function MenuContent() {
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");
  const displayTable = tableParam || "Unknown";

  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<(MenuItem & { quantity: number })[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMenu = async () => {
      const cached = localStorage.getItem("jaha_menu_cache");
      if (cached && isMounted) {
        setMenuItems(JSON.parse(cached));
        setLoadingMenu(false);
      }
      
      try {
        const q = query(collection(db, "menu_items"), orderBy("name", "asc"));
        const snap = await getDocs(q);
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
        
        if (isMounted) {
          setMenuItems(fetched);
          localStorage.setItem("jaha_menu_cache", JSON.stringify(fetched));
          setLoadingMenu(false);
        }
      } catch (err) {
        console.error("Failed to fetch menu:", err);
        if (isMounted) setLoadingMenu(false);
      }
    };
    
    fetchMenu();
    return () => { isMounted = false; };
  }, []);

  // Checkout & Payment
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"QRIS" | "VA" | "CASHIER" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Hydration safeguard: start with null so server & client render identical HTML.
  // localStorage is only read after mount on the client side.
  const [isMounted, setIsMounted] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [favoriteItemIds, setFavoriteItemIds] = useState<string[]>([]);

  useEffect(() => {
    setIsMounted(true);
    const savedOrderId = localStorage.getItem("jaha_active_order");
    if (savedOrderId) setActiveOrderId(savedOrderId);

    const savedFavs = localStorage.getItem("jaha_favorite_items");
    if (savedFavs) {
      try { setFavoriteItemIds(JSON.parse(savedFavs)); } catch (e) {}
    }
  }, []);

  // Helper: sync state and localStorage together
  const persistActiveOrder = (id: string | null) => {
    setActiveOrderId(id);
    if (id) localStorage.setItem("jaha_active_order", id);
    else localStorage.removeItem("jaha_active_order");
  };

  const baseCategories = ["All", "Signature Coffee", "Main Course", "Pasta & Pizza", "Light Bites", "Desserts"];
  const categories = favoriteItemIds.length > 0 ? ["Favorites", ...baseCategories] : baseCategories;

  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesCategory = false;
      if (searchQuery || activeCategory === "All") {
        matchesCategory = true;
      } else if (activeCategory === "Favorites") {
        matchesCategory = favoriteItemIds.includes(String(item.id));
      } else {
        matchesCategory = item.category === activeCategory;
      }

      return matchesSearch && matchesCategory;
    });
  }, [menuItems, activeCategory, searchQuery, favoriteItemIds]);

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
        table_number: tableParam ? parseInt(tableParam) : 0,
        items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total_amount: totalAmount,
        status: "Pending",
        payment_method: paymentMethod,
        created_at: serverTimestamp(),
      });

      // ✅ Stay on menu: persist the order ID so it survives refreshes
      persistActiveOrder(docRef.id);

      // Save order to history in localStorage
      const savedHistoryStr = localStorage.getItem("jaha_order_history");
      const history = savedHistoryStr ? JSON.parse(savedHistoryStr) : [];
      history.push(docRef.id);
      localStorage.setItem("jaha_order_history", JSON.stringify(history));

      // Save favorite items
      const orderedItemIds = cart.map(i => String(i.id));
      const newFavs = Array.from(new Set([...favoriteItemIds, ...orderedItemIds]));
      setFavoriteItemIds(newFavs);
      localStorage.setItem("jaha_favorite_items", JSON.stringify(newFavs));

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

  // BLOCK DIRECT ACCESS WITHOUT TABLE
  if (!tableParam) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 border border-gray-100 relative overflow-hidden">
          <QrCode size={40} className="text-[#C5A059]" />
          <div className="absolute inset-0 bg-[#C5A059]/5 animate-pulse"></div>
        </div>
        <h1 className="font-serif text-3xl font-bold text-primary-dark mb-3">Scan to Order</h1>
        <p className="text-gray-500 text-[15px] font-medium max-w-[260px] leading-relaxed mb-8">
          Please scan the QR code located on your table to access the menu and place your order.
        </p>
      </div>
    );
  }

  // PAYMENT CHECKOUT FLOW
  if (isCheckoutMode) {
    if (cart.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-screen bg-secondary flex flex-col font-sans"
        >
          <header className="bg-white border-b border-gray-100 p-6 flex items-center gap-4 z-20 shadow-sm sticky top-0">
            <button
              onClick={() => setIsCheckoutMode(false)}
              className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200 text-gray-600"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="font-serif text-2xl font-bold text-primary-dark">Cart</h1>
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
        <header className="bg-white border-b border-gray-100 p-6 flex items-center gap-4 z-20 shadow-sm sticky top-0">
          <button
            onClick={() => { if (paymentMethod) setPaymentMethod(null); else setIsCheckoutMode(false); }}
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border border-gray-200 text-gray-600"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="font-serif text-2xl font-bold text-primary-dark">
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
                    <QRCodeSVG value="https://jahacafe.com/pay/demo" size={180} fgColor="#3B2F2F" />
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
                    Please proceed to the cashier and mention your <strong className="text-primary-dark">{tableParam ? `Table ${tableParam}` : "Order"}</strong>.
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
    <div className="min-h-screen w-full mx-auto bg-[#FDFBF7] pb-[calc(9rem+env(safe-area-inset-bottom))] font-sans relative md:max-w-7xl md:shadow-2xl md:border-x md:border-gray-100">

      {/* Floating Live Order Status Banner — only render after mount to avoid hydration mismatch */}
      {isMounted && activeOrderId && (
        <LiveOrderStatusBanner
          orderId={activeOrderId}
          tableNumber={tableParam || "0"}
          onDismiss={() => persistActiveOrder(null)}
        />
      )}

      {/* Fresh, Airy Header */}
      <header className={`pt-8 pb-6 px-5 sm:px-8 lg:px-10 max-w-7xl mx-auto w-full z-20 relative transition-all ${activeOrderId ? "pt-32" : "pt-14"}`}>
        <div className="flex justify-between items-start w-full">
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[32px] sm:text-[40px] text-primary-dark font-extrabold tracking-tight leading-none mb-1.5">
              Welcome to <span className="text-accent italic font-medium">Jaha</span>
            </h1>
            <p className="text-gray-500 font-medium text-sm flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              {new Date().getHours() < 12 ? "Good morning!" : new Date().getHours() < 18 ? "Good afternoon!" : "Good evening!"}
            </p>
          </div>
          <div className="bg-white border border-gray-100 px-4 py-2.5 rounded-[1.25rem] flex flex-col items-center shadow-sm shrink-0 ml-4 ring-1 ring-gray-900/5">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Table</span>
            <span className={`font-black text-primary-dark leading-none mt-0.5 ${!tableParam ? "text-sm" : "text-xl"}`}>{displayTable}</span>
          </div>
        </div>

        <div className="mt-8 relative z-10 max-w-lg">
          <input
            type="text"
            placeholder="Search for coffee, pasta, desserts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-full py-4 pl-12 pr-4 text-[15px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all shadow-sm"
          />
          <Search size={20} className="absolute left-4 top-4 text-gray-400" />
        </div>
      </header>

      {/* Categories - Horizontal Scroll */}
      {!searchQuery && (
        <div className="flex overflow-x-auto scrollbar-hide gap-5 sm:gap-8 mb-6 pb-4 px-4 sm:px-6 lg:px-8 mt-6 max-w-7xl mx-auto w-full items-start">
          {categories.map((category) => {
            const isActive = activeCategory === category;
            const emoji = cuteIcons[category] || "🍽️";
            return (
              <motion.button
                key={category}
                onClick={() => setActiveCategory(category)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9, rotate: -5 }}
                animate={isActive ? { y: [0, -5, 0] } : {}}
                transition={{ duration: 0.3 }}
                className={`flex flex-col items-center gap-2.5 shrink-0 group ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
              >
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-[1.5rem] flex items-center justify-center text-3xl sm:text-4xl shadow-sm transition-all duration-300 ${
                  isActive 
                    ? "bg-primary shadow-lg shadow-primary/30 scale-110 ring-4 ring-primary/10" 
                    : "bg-white border-2 border-gray-100 group-hover:border-primary/20 group-hover:shadow-md"
                }`}>
                  <motion.span 
                    animate={isActive ? { rotate: [0, 15, -15, 0] } : {}} 
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    {emoji}
                  </motion.span>
                </div>
                <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider text-center transition-colors max-w-[80px] leading-tight ${isActive ? 'text-primary' : 'text-gray-500'}`}>
                  {category}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Menu Items */}
      <main className="px-4 pt-2">
        {activeOrderId && (
          <div className="bg-orange-50/70 border border-orange-100/50 rounded-[1.25rem] p-3 mb-5 mt-2 flex items-center gap-3 shadow-sm mx-1">
            <div className="bg-white rounded-full p-1.5 shadow-sm border border-orange-50 shrink-0">
              <Info size={16} className="text-[#B25A38]" />
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
          {loadingMenu ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col p-3 sm:p-4 rounded-[2rem] border border-gray-100 bg-white h-[280px] shadow-sm">
                <div className="w-full aspect-square bg-gray-100 rounded-2xl mb-3"></div>
                <div className="w-3/4 h-5 bg-gray-100 rounded-md mb-2"></div>
                <div className="w-1/2 h-4 bg-gray-100 rounded-md"></div>
                <div className="w-full h-10 bg-gray-100 rounded-xl mt-auto"></div>
              </div>
            ))
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <MenuItemCard item={item} onAdd={addToCart} />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 mt-16 flex flex-col items-center">
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
        <span className="font-serif font-bold text-gray-900 tracking-wide">Jaha Cafe</span>
      </div>
    }>
      <MenuContent />
    </Suspense>
  );
}
