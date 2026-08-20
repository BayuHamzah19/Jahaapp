"use client";
/* eslint-disable */

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, ChefHat, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // If already logged in, skip the login page
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/kds");
      } else {
        setChecking(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back! Redirecting...");
      router.replace("/kds");
    } catch (err: any) {
      console.error("Login failed:", err);
      let message = "Invalid email or password.";
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        message = "Wrong email or password. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your connection.";
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF7] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#1B3022]/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#C5A059]/5 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 200 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,0.06)] border border-gray-100/80 p-10">

          {/* Logo mark */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-[#1B3022] rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-[#1B3022]/20 mb-5 border border-[#C5A059]/20 ring-8 ring-[#1B3022]/5">
              <ChefHat size={28} className="text-[#C5A059]" />
            </div>
            <h1 className="font-serif text-3xl font-black text-[#1B3022] tracking-tight">Jaha Admin</h1>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-[0.2em] mt-2">Kitchen Staff Portal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider pl-1">
                Email Address
              </label>
              <div className="relative group">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C5A059] transition-colors"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jahacafe.com"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none text-sm font-medium text-gray-800 placeholder:text-gray-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider pl-1">
                Password
              </label>
              <div className="relative group">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C5A059] transition-colors"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-2xl border border-gray-200 focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/20 outline-none text-sm font-medium text-gray-800 placeholder:text-gray-400 transition-all"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#1B3022] hover:bg-[#0D1A10] disabled:opacity-60 disabled:cursor-not-allowed text-[#C5A059] font-bold py-4 rounded-2xl text-xs uppercase tracking-[0.15em] transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-[#1B3022]/10 border border-[#C5A059]/10 flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Login to Dashboard
                  <ArrowRight size={14} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-center text-[11px] text-gray-400 mt-8">
            Access restricted to authorized staff only.
          </p>
        </div>
      </motion.div>

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "1rem",
            background: "#1B3022",
            color: "#F5F2E8",
            fontSize: "13px",
            fontWeight: "600",
          },
        }}
      />
    </div>
  );
}
