"use client";
/* eslint-disable */
import Image from 'next/image';
import { Plus, Sparkles, Ban } from "lucide-react";

export interface MenuItem {
  id: string | number;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  image?: string;
  is_available?: boolean;
  is_chefs_recommendation?: boolean;
}

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAdd }: Props) {
  const handleAdd = () => {
    if (item.is_available !== false) {
      onAdd(item);
    }
  };

  return (
    <div className="group bg-white rounded-[1.75rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-primary/10 transition-all duration-300 flex flex-col h-full relative cursor-pointer active:scale-[0.98]">
      
      {/* Top badges floating over everything */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-1.5">
          {item.is_chefs_recommendation && (
            <span className="bg-[#b59048]/90 backdrop-blur-md text-white text-[9px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1 w-fit">
              <Sparkles size={10} /> Chef's Pick
            </span>
          )}
        </div>
      </div>

      {/* Floating Image Container */}
      <div className="w-full aspect-square relative bg-gray-50/50 p-2 shrink-0">
        <div className="w-full h-full relative rounded-[1.25rem] overflow-hidden shadow-inner">
          <Image
            src={item.image_url || item.image || "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop"}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
            className={`object-cover transition-transform duration-700 group-hover:scale-110 ${item.is_available === false ? 'opacity-40 grayscale' : ''}`}
          />
          {item.is_available === false && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
              <div className="bg-primary/90 text-white text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xl rotate-[-5deg]">
                <Ban size={12} strokeWidth={3} /> Sold Out
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 bg-white">
        <div className="mb-1">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{item.category}</span>
        </div>
        <h3 className="font-serif text-[15px] sm:text-[17px] font-bold text-primary-dark leading-snug mb-3 line-clamp-2">
          {item.name}
        </h3>
        
        <div className="mt-auto flex items-end justify-between">
          <p className="text-[14px] sm:text-[16px] font-black text-primary-dark">
            Rp {item.price.toLocaleString("id-ID")}
          </p>
          
          <button
            onClick={handleAdd}
            disabled={item.is_available === false}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
              item.is_available === false
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-primary text-secondary hover:bg-primary-dark hover:scale-110 active:scale-95'
            }`}
            aria-label="Add to cart"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
