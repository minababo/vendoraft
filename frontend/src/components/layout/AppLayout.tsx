'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';

const navLinks = [
  { label: 'Dashboard',   href: '/dashboard' },
  { label: 'Products',    href: '/products' },
  { label: 'Categories',  href: '/categories' },
  { label: 'Stock',       href: '/stock' },
  { label: 'Sales',       href: '/sales' },
  { label: 'Reports',     href: '/reports' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const pathname = usePathname();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="flex w-56 flex-col bg-gray-900 text-white">
          {/* Logo */}
          <div className="px-6 py-5 text-xl font-bold tracking-tight">
            Vendoraft
          </div>

          {/* Nav */}
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {navLinks.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:bg-gray-800 hover:text-white"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-gray-50 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
