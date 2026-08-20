"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase/config";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy
} from "firebase/firestore";
import { 
  Plus, Pencil, Trash2, ChefHat, LayoutGrid, X, 
  Check, AlertTriangle, Utensils, LogOut, TrendingUp, QrCode, Menu as MenuIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = ["Signature Coffee", "Main Course", "Pasta & Pizza", "Light Bites", "Desserts"];

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string;
  image_url: string;
  is_available: boolean;
  is_chefs_recommendation: boolean;
}

const EMPTY_FORM: Omit<MenuItem, "id"> = {
  name: "",
  price: 0,
  category: "Signature Coffee",
  description: "",
  image_url: "",
  is_available: true,
  is_chefs_recommendation: false,
};

export default function AdminMenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Real-time listener on menu_items collection
  useEffect(() => {
    const q = query(collection(db, "menu_items"), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
      setItems(fetched);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({ 
      name: item.name, price: item.price, category: item.category,
      description: item.description, image_url: item.image_url,
      is_available: item.is_available, is_chefs_recommendation: item.is_chefs_recommendation
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return;
    setSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, "menu_items", editingItem.id), { ...form, updated_at: serverTimestamp() });
      } else {
        await addDoc(collection(db, "menu_items"), { ...form, created_at: serverTimestamp() });
      }
      setModalOpen(false);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteDoc(doc(db, "menu_items", deleteTarget.id));
    setDeleteTarget(null);
  };

  const toggleAvailability = async (item: MenuItem) => {
    await updateDoc(doc(db, "menu_items", item.id), { is_available: !item.is_available });
  };

  const displayItems = activeCategory === "All" ? items : items.filter(i => i.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#0D1A10] text-white px-4 md:px-6 py-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center gap-3">
            <Utensils size={26} className="text-[#C5A059]" />
            <h1 className="text-xl font-serif font-bold tracking-wide">Menu Management</h1>
          </div>
          <button className="lg:hidden text-white hover:text-[#C5A059] transition-colors" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            {mobileNavOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>

        {/* Navigation - Desktop & Mobile */}
        <div className={`${mobileNavOpen ? "flex" : "hidden"} lg:flex flex-col lg:flex-row items-stretch lg:items-center w-full lg:w-auto gap-2 lg:gap-1.5 order-last lg:order-none mt-2 lg:mt-0`}>
          <nav className="flex flex-col lg:flex-row items-stretch lg:items-center gap-1.5 w-full">
            <Link href="/kds" className="flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <LayoutGrid size={16} /> Kitchen Display
            </Link>
            <Link href="/menu" className="flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-bold bg-white/10 text-white border border-white/10">
              <Utensils size={16} /> Menu Items
            </Link>
            <Link href="/sales" className="flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <TrendingUp size={16} /> Sales Report
            </Link>
            <Link href="/qr-codes" className="flex items-center gap-2 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <QrCode size={16} /> Table QR
            </Link>
          </nav>
        </div>

        <div className={`${mobileNavOpen ? "flex" : "hidden"} lg:flex flex-col lg:flex-row items-stretch lg:items-center w-full lg:w-auto gap-3 mt-2 lg:mt-0`}>
          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 bg-[#C5A059] hover:bg-[#b59048] text-white font-bold px-5 py-3 lg:py-2.5 rounded-xl shadow-lg shadow-[#C5A059]/20 transition-all active:scale-95 text-sm"
          >
            <Plus size={18} strokeWidth={2.5} /> Add New Item
          </button>
          <button
            onClick={async () => {
              await signOut(auth);
              router.push("/admin/login");
            }}
            className="flex items-center justify-center gap-2 px-3.5 py-3 lg:py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all border border-red-500/20 text-xs font-bold shrink-0"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* Category Filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-2 shadow-sm">
        {["All", ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              activeCategory === cat 
                ? "bg-[#1B3022] text-white shadow-md" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >{cat}</button>
        ))}
        <span className="ml-auto text-xs text-gray-400 font-medium">{displayItems.length} items</span>
      </div>

      {/* Menu Grid */}
      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Utensils size={48} className="mb-4 opacity-30" />
            <p className="font-bold text-lg">No items found</p>
            <p className="text-sm mt-1">Click "Add New Item" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {displayItems.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
                  item.is_available ? "border-gray-100" : "border-red-100 opacity-60"
                }`}
              >
                {/* Image */}
                <div className="relative h-44 bg-gray-100">
                  <img src={item.image_url} alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=400"; }}
                  />
                  {!item.is_available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Sold Out</span>
                    </div>
                  )}
                  {item.is_chefs_recommendation && item.is_available && (
                    <span className="absolute top-2 left-2 bg-[#C5A059] text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <ChefHat size={10} /> Chef's Pick
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-900 text-[15px] leading-tight flex-1">{item.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 font-medium mb-3">{item.category}</p>
                  <p className="font-black text-[#1B3022] text-[17px] mb-4">Rp {item.price.toLocaleString("id-ID")}</p>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Availability Toggle */}
                    <button onClick={() => toggleAvailability(item)}
                      className={`flex-1 text-xs font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                        item.is_available 
                          ? "bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600 border border-emerald-100"
                          : "bg-red-50 text-red-600 hover:bg-emerald-50 hover:text-emerald-600 border border-red-100"
                      }`}
                    >
                      {item.is_available ? <><Check size={12} strokeWidth={3}/> In Stock</> : <><X size={12} strokeWidth={3}/> Sold Out</>}
                    </button>

                    <button onClick={() => openEdit(item)}
                      className="w-9 h-9 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 rounded-xl flex items-center justify-center text-gray-500 transition-colors"
                    ><Pencil size={15} /></button>

                    <button onClick={() => setDeleteTarget(item)}
                      className="w-9 h-9 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-xl flex items-center justify-center text-gray-500 transition-colors"
                    ><Trash2 size={15} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-3xl">
                <h2 className="font-serif text-xl font-bold text-gray-900">
                  {editingItem ? "Edit Menu Item" : "Add New Item"}
                </h2>
                <button onClick={() => setModalOpen(false)} className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Image Preview */}
                {form.image_url && (
                  <div className="h-40 w-full rounded-2xl overflow-hidden bg-gray-100">
                    <img src={form.image_url} alt="preview" className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Item Name *</label>
                    <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      placeholder="e.g. Jaha Iced Coffee"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Price (Rp) *</label>
                    <input type="number" value={form.price || ""} onChange={e => setForm(f => ({...f, price: parseInt(e.target.value) || 0}))}
                      placeholder="45000"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Category *</label>
                    <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all bg-white"
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                      rows={3} placeholder="Describe this item..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all resize-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Image URL</label>
                    <input value={form.image_url} onChange={e => setForm(f => ({...f, image_url: e.target.value}))}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] transition-all"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  {[
                    { key: "is_available", label: "Available / In Stock", desc: "Uncheck to mark as Sold Out" },
                    { key: "is_chefs_recommendation", label: "Chef's Recommendation", desc: "Shows a gold badge on the item" }
                  ].map(({ key, label, desc }) => (
                    <div key={key} onClick={() => setForm(f => ({...f, [key]: !f[key as keyof typeof f]}))}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-all relative ${form[key as keyof typeof form] ? "bg-[#1B3022]" : "bg-gray-300"}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form[key as keyof typeof form] ? "left-6" : "left-0.5"}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button onClick={() => setModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-colors"
                >Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.name || !form.price}
                  className="flex-1 bg-[#1B3022] hover:bg-[#0D1A10] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 shadow-lg"
                >
                  {saving ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">Delete Item?</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-gray-800">"{deleteTarget.name}"</strong>? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
