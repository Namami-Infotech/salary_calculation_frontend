'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Receipt,
  CalendarCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Salary & Payroll', href: '/salary', icon: Receipt },
  { label: 'Leave Management', href: '/leave/requests', icon: CalendarCheck },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-900 flex flex-col select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-md shadow-indigo-600/30">
          H
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-base block leading-snug">
            HRMS Global
          </span>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">
            Enterprise Suite
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Main Navigation
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/25'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-white',
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-200',
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="border-t border-slate-800/80 p-4">
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/60 p-3 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              System Live
            </span>
            <span className="text-[11px] font-semibold text-slate-400">v1.0.0</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Multi-Tenant Isolation Active
          </div>
        </div>
      </div>
    </aside>
  );
}

