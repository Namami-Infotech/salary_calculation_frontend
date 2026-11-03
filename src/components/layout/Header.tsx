'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, Building, Bell, Search, Sparkles } from 'lucide-react';
import api from '@/lib/axios';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch { }
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-sm px-6">
      {/* Left side: Company Pill & Quick Search */}
      <div className="flex items-center gap-4">
    

        {/* Global Quick Search Mock */}
        <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-400 w-64 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search roster, payroll, docs..."
            className="w-full bg-transparent text-slate-700 placeholder-slate-400 outline-none text-xs"
          />
          <kbd className="hidden lg:inline-block rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Right side: Notifications, User Profile & Logout */}
      <div className="flex items-center gap-3.5">
        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs shadow-2xs">
            {user?.email ? user.email[0].toUpperCase() : <UserIcon className="h-4 w-4" />}
          </div>
          <div className="hidden sm:block text-left">
            <span className="block text-xs font-semibold text-slate-900 leading-tight">
              {user?.email}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block rounded-md bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 tracking-wider">
                {user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 shadow-2xs transition-all"
          title="Logout"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

