'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CreditCard, Settings, ChevronLeft, ChevronRight, LogOut, QrCode, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SidebarProps {
  expiringCount?: number;
}

export default function Sidebar({ expiringCount = 0 }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Inicio', path: '/' },
    { icon: QrCode, label: 'Acceso', path: '/acceso' },
    { icon: Users, label: 'Clientes', path: '/clientes' },
    { icon: CreditCard, label: 'Pagos', path: '/pagos' },
    { icon: Settings, label: 'Configuración', path: '/configuracion' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#0a0a0a]/90 border border-[#AB8745]/30 text-[#D4A865] rounded-lg shadow-lg backdrop-blur-xl"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed md:relative z-40 h-full
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarOpen ? 'w-64' : 'w-20'}
          bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-[#AB8745]/20 
          transition-all duration-300 flex flex-col
          inset-y-0 left-0
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#AB8745]/20 mt-14 md:mt-0">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 relative flex-shrink-0">
              <img
                src="/intigym-logo.png"
                alt="IntiGym Logo"
                className="w-full h-full object-contain filter drop-shadow-lg"
              />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">INTI-GYM</h1>
                <p className="text-xs text-[#AB8745] font-semibold">Ayacucho</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            const isClientes = item.label === 'Clientes';
            const showBadge = isClientes && expiringCount > 0;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-gradient-to-r from-[#AB8745]/20 to-[#AB8745]/10 border border-[#AB8745]/30 text-[#D4A865] shadow-lg shadow-[#AB8745]/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#D4A865]' : ''
                    }`} />
                  {showBadge && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white animate-pulse shadow-lg shadow-red-500/50">
                      {expiringCount}
                    </span>
                  )}
                </div>
                {sidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-[#AB8745]/20 space-y-2 bg-[#0a0a0a]/50">
          {sidebarOpen && user && (
            <div className="px-4 py-2 bg-white/5 rounded-lg mb-2">
              <p className="text-xs text-gray-400">Usuario</p>
              <p className="text-sm text-white truncate">{user.email}</p>
            </div>
          )}

          <button
            onClick={() => {
              handleSignOut();
              setIsMobileOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-600/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-[#AB8745] transition-all hidden md:flex"
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            {sidebarOpen && <span>Ocultar</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
