'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  Tag,
  ArrowLeftRight,
  ShoppingCart,
  BarChart2,
  Settings,
  UserCircle,
  LogOut,
  Menu,
} from 'lucide-react';

const navLinks = [
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Sales',      href: '/sales',      icon: ShoppingCart },
  { label: 'Stock',      href: '/stock',      icon: ArrowLeftRight },
  { label: 'Products',   href: '/products',   icon: Package },
  { label: 'Categories', href: '/categories', icon: Tag },
  { label: 'Reports',    href: '/reports',    icon: BarChart2 },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout, user, token } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    async function fetchLowStock() {
      try {
        const res = await api.get('/api/dashboard');
        setLowStockCount(res.data.lowStockCount ?? 0);
      } catch {
        // silently ignore
      }
    }

    fetchLowStock();
    const interval = setInterval(fetchLowStock, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col bg-slate-900 text-white transition-transform duration-200 md:static md:translate-x-0 md:transition-none ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-5 py-5">
            <svg
              viewBox="0 0 32 32"
              width="24"
              height="24"
              fill="#e11d48"
              fillRule="nonzero"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M4 5 L10 5 L16 21 L22 5 L28 5 L16 27 Z" />
            </svg>
            <span className="text-base font-semibold tracking-tight text-white">
              Vendoraft
            </span>
          </div>

          {/* Nav */}
          <nav className="flex flex-1 flex-col gap-0.5 px-2">
            {navLinks.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-l-2 border-rose-500 bg-slate-800 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  {label}
                  {label === 'Stock' && lowStockCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {lowStockCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer: settings + user + logout */}
          <div className="px-3 pb-4 pt-3">
            <div className="mb-1 border-t border-slate-700/60 pt-3">
              <Link
                href="/settings"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === '/settings'
                    ? 'border-l-2 border-rose-500 bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Settings size={16} className="shrink-0" />
                Settings
              </Link>
            </div>
            {user?.email && (
              <div className="mt-2 flex items-center gap-2 px-2 py-1.5">
                <UserCircle size={15} className="shrink-0 text-slate-500" />
                <span className="truncate text-xs text-slate-400">{user.email}</span>
              </div>
            )}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-slate-400 hover:bg-slate-800 hover:text-white"
              onClick={logout}
            >
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6 md:p-8">
          {/* Hamburger — mobile only */}
          <button
            className="mb-4 flex items-center gap-2 text-gray-600 md:hidden"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
