"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        router.replace("/admin/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Spinner while checking auth state — prevents dashboard "flash"
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Verifying session...</p>
      </div>
    );
  }

  // Not authenticated → render nothing while redirect fires
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
