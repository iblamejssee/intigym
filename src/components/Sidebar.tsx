'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CreditCard, Settings, ChevronLeft, ChevronRight, LogOut, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#0a0a0a]/95 backdrop-blur-xl border-r border-[#AB8745]/20 transition-all duration-300 flex flex-col`}>
      {/* Logo */}
      <div className="p-6 border-b border-[#AB8745]/20">
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
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={index}
              href={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                ? 'bg-[#AB8745]/20 text-[#AB8745] border border-[#AB8745]/30 shadow-lg shadow-[#AB8745]/10'
                : 'text-gray-400 hover:bg-white/5 hover:text-[#AB8745]'
                }`}
            >
              <Icon className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-[#AB8745]/20 space-y-2">
        {sidebarOpen && user && (
          <div className="px-4 py-2 bg-white/5 rounded-lg mb-2">
            <p className="text-xs text-gray-400">Usuario</p>
            <p className="text-sm text-white truncate">{user.email}</p>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-600/10 hover:text-red-300 transition-all"
        >
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
        </button>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-[#AB8745] transition-all"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          {sidebarOpen && <span>Ocultar</span>}
        </button>
      </div>
    </aside>
  );
}
