"use client";
/* eslint-disable */
import { useState, useEffect } from "react";
import { ChefHat, LayoutGrid, Utensils, LogOut, Download, TrendingUp, DollarSign, Receipt, Filter, QrCode, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { collection, query, onSnapshot, where, Timestamp, getDocs, writeBatch, doc } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { AnimatePresence, motion } from "framer-motion";

interface Order {
  id: string;
  table_number: number;
  items: { name: string; quantity: number; price: number; special_instructions?: string }[];
  total_amount: number;
  status: string;
  created_at: Date;
  payment_method?: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const COLORS = ['#1B3022', '#C5A059', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Theme colors

export default function SalesReportPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [devMode, setDevMode] = useState(false);

  const handleSecretClick = () => {
    setClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setDevMode(prevDev => !prevDev);
        toast.success(devMode ? "Developer Mode Disabled" : "Developer Mode Enabled: Database tools unlocked!", {
          icon: devMode ? "🔒" : "🔓",
          style: { background: '#1B3022', color: '#FFF', border: '1px solid #C5A059' }
        });
        return 0;
      }
      return newCount;
    });
  };

  const handleDeleteAllData = async () => {
    setIsDeletingAll(true);
    try {
      const q = query(collection(db, "orders"));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((docSnap) => {
        batch.delete(doc(db, "orders", docSnap.id));
      });
      
      await batch.commit();
      
      toast.success("All dummy data has been deleted!", {
        style: { background: '#1B3022', color: '#FFF', border: '1px solid #C5A059' }
      });
      setShowDeleteAllModal(false);
    } catch (err) {
      console.error("Error deleting all data:", err);
      toast.error("Failed to delete data.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Time filters
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      where("status", "in", ["Completed", "Delivered"])
    );
    
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
          payment_method: data.payment_method || "Unknown",
          created_at: data.created_at ? (data.created_at as Timestamp).toDate() : new Date(),
        });
      });
      // Sort descending by date
      fetchedOrders.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
      setOrders(fetchedOrders);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching sales data: ", error);
      toast.error("Failed to load sales data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter orders by selected month/year
  const filteredOrders = orders.filter(order => {
    return order.created_at.getMonth() === selectedMonth && order.created_at.getFullYear() === selectedYear;
  });

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const totalOrders = filteredOrders.length;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // --- Chart Data Calculations ---

  // Daily Revenue (Bar Chart)
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dailyRevenueData = Array.from({ length: daysInMonth }, (_, i) => ({
    day: `${i + 1}`,
    revenue: 0,
  }));

  filteredOrders.forEach(order => {
    const day = order.created_at.getDate();
    dailyRevenueData[day - 1].revenue += order.total_amount;
  });

  // Top Selling Items (Pie Chart)
  const itemSales: Record<string, number> = {};
  filteredOrders.forEach(order => {
    order.items.forEach(item => {
      if (!itemSales[item.name]) itemSales[item.name] = 0;
      itemSales[item.name] += item.quantity;
    });
  });

  const topItemsData = Object.entries(itemSales)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5); // top 5 items

  // --- Excel Export ---
  const exportToExcel = () => {
    if (filteredOrders.length === 0) {
      toast.error("No data to export for this month.");
      return;
    }

    const data = filteredOrders.map(order => ({
      "Order ID": order.id,
      "Date & Time": order.created_at.toLocaleString("id-ID"),
      "Table Number": order.table_number,
      "Items Ordered": order.items.map(i => `${i.quantity}x ${i.name}`).join(", "),
      "Payment Method": order.payment_method,
      "Status": order.status,
      "Total Amount": order.total_amount
    }));

    // Add Total Row
    data.push({
      "Order ID": "TOTAL",
      "Date & Time": "",
      "Table Number": "" as any,
      "Items Ordered": "",
      "Payment Method": "",
      "Status": "",
      "Total Amount": totalRevenue
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    const wscols = [
      { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 50 }, 
      { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];
    worksheet["!cols"] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Report");
    
    const monthName = MONTHS[selectedMonth];
    const fileName = `Jaha_Sales_Report_${monthName}_${selectedYear}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
    toast.success(`Excel file for ${monthName} generated!`);
  };

  // Generate Year Options
  const yearOptions = [];
  const startYear = 2024;
  for (let i = currentDate.getFullYear(); i >= startYear; i--) {
    yearOptions.push(i);
  }

  // Format currency for chart Y-axis
  const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return "0";
    if (tickItem >= 1000000) return `Rp ${tickItem / 1000000}M`;
    if (tickItem >= 1000) return `Rp ${tickItem / 1000}K`;
    return `Rp ${tickItem}`;
  };

  return (
    <div className="min-h-screen bg-[#FDFCF7] flex flex-col font-sans">
      {/* Premium Header */}
      <header className="bg-[#1B3022] text-white px-4 md:px-8 py-4 md:py-5 shadow-[0_10px_30px_rgba(0,0,0,0.05)] flex justify-between items-center z-10 border-b border-[#C5A059]/20 overflow-hidden min-w-0">
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
            <Link href="/sales" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#F5F2E8]/10 text-white border border-white/5 transition-all">
              <TrendingUp size={16} /> Sales Report
            </Link>
            <Link href="/qr-codes" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
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
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h2 
              onClick={handleSecretClick}
              className="text-3xl font-serif font-black text-[#1B3022] mb-2 cursor-default select-none"
            >
              Sales Overview
            </h2>
            <p className="text-gray-500 font-medium text-sm">Review revenue and top items by month.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Filter:</span>
            </div>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 text-[#1B3022] font-bold rounded-xl px-4 py-2 outline-none focus:border-[#C5A059] transition-all"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-gray-50 border border-gray-200 text-[#1B3022] font-bold rounded-xl px-4 py-2 outline-none focus:border-[#C5A059] transition-all"
            >
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-[#C5A059] hover:bg-[#b59048] text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-[#C5A059]/20 transition-all active:scale-95 ml-2"
            >
              <Download size={16} strokeWidth={2.5} /> Export
            </button>
            
            {/* HIDDEN DEV MODE BUTTON */}
            {devMode && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold px-5 py-2.5 rounded-xl border border-red-200 transition-all active:scale-95 ml-2"
              >
                <Trash2 size={16} strokeWidth={2.5} /> Clear All Data
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
              <DollarSign size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Revenue</p>
              <h3 className="text-2xl font-black text-[#1B3022]">Rp {totalRevenue.toLocaleString("id-ID")}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
              <Receipt size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Orders</p>
              <h3 className="text-2xl font-black text-[#1B3022]">{totalOrders}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
              <TrendingUp size={28} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Avg. Order Value</p>
              <h3 className="text-2xl font-black text-[#1B3022]">Rp {Math.round(aov).toLocaleString("id-ID")}</h3>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Bar Chart (Daily Revenue) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 flex flex-col h-[400px]">
            <h3 className="text-lg font-bold text-[#1B3022] mb-6 font-serif">Daily Revenue ({MONTHS[selectedMonth]})</h3>
            <div className="flex-1 min-h-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    tickFormatter={formatYAxis}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: any) => [`Rp ${value.toLocaleString('id-ID')}`, 'Revenue']}
                    labelFormatter={(label) => `${MONTHS[selectedMonth]} ${label}, ${selectedYear}`}
                  />
                  <Bar dataKey="revenue" fill="#1B3022" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart (Top Items) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
            <h3 className="text-lg font-bold text-[#1B3022] mb-2 font-serif">Top 5 Items</h3>
            <div className="flex-1 min-h-0 w-full">
              {topItemsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topItemsData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="quantity"
                    >
                      {topItemsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [`${value} sold`, 'Quantity']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-xs text-gray-600 font-medium">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                  No sales data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-10">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#1B3022] font-serif">Order History ({MONTHS[selectedMonth]})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Table</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">Loading data...</td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">No completed orders found for this month.</td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {order.created_at.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-6 text-sm font-mono text-gray-500">
                        {order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-[#1B3022]">
                        {order.table_number}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 max-w-xs truncate">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-[#1B3022] text-right">
                        Rp {order.total_amount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Toaster position="top-right" />

      {/* ── Delete All Data Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteAllModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowDeleteAllModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm pointer-events-auto p-6 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Clear All Data?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete <strong>ALL</strong> orders from the database? This is usually done before deploying to production. This action <strong>cannot be undone</strong>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteAllModal(false)}
                    disabled={isDeletingAll}
                    className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-colors border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAllData}
                    disabled={isDeletingAll}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeletingAll ? "Clearing..." : "Yes, Clear All"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
