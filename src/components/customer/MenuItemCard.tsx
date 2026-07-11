"use client";
import { Plus, Sparkles, Ban } from "lucide-react";

export interface MenuItem {
  id: string | number;
  name: string;
  price: number;
  category: string;
  image: string;
}

interface Props {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAdd }: Props) {
  return (
    <div className={`relative flex flex-col bg-white rounded-[1.25rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden group transition-all duration-300 h-full`}>

      {/* Image Container */}
      <div className="w-full aspect-square relative bg-secondary-dark overflow-hidden shrink-0">
        <img
          src={item.image}
          alt={item.name}
          className={`object-cover w-full h-full transition-transform duration-500 group-hover:scale-105`}
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop";
          }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        <h3 className="font-serif font-bold text-primary-dark text-[13px] leading-snug line-clamp-2 mb-2">{item.name}</h3>
        
        <div className="flex justify-between items-end mt-auto">
          <span className={`font-bold text-[13px] text-primary-dark`}>
            Rp {item.price.toLocaleString("id-ID")}
          </span>
          <button
            onClick={() => onAdd(item)}
            className="w-7 h-7 flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-full shadow-md active:scale-95 transition-all shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
