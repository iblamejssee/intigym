'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AddMemberModal, { MemberFormData } from '@/components/AddMemberModal';
import MemberSuccessModal from '@/components/MemberSuccessModal';
import {
  Users,
  Plus,
  QrCode,
  Search,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Clock
} from 'lucide-react';
import { supabase, calcularFechaVencimiento } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function WelcomeLounge() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState<MemberFormData | null>(null);
  const [time, setTime] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    setTime(new Date().toLocaleTimeString('es-PE'));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-PE'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddMember = async (data: MemberFormData) => {
    try {
      // 1. Validaciones
      if (!data.nombres || !data.apellidos || !data.dni || !data.planId || !data.fechaInicio) {
        toast.warning('Por favor, completa los campos obligatorios');
        return;
      }

      // 2. Buscar plan
      const { data: planData } = await (supabase
        .from('planes') as any)
        .select('*')
        .eq('id', data.planId)
        .single();

      if (!planData) {
        toast.error('Plan no encontrado');
        return;
      }

      const fechaVencimiento = calcularFechaVencimiento(planData.duracion_dias, data.fechaInicio);

      // 3. Insertar cliente
      const { data: newCliente, error: clientError } = await (supabase
        .from('clientes') as any)
        .insert([{
          nombres: data.nombres.trim(),
          apellidos: data.apellidos.trim(),
          dni: data.dni.trim(),
          telefono: data.telefono?.trim() || null,
          email: data.email?.trim() || null,
          fecha_nacimiento: data.fechaNacimiento || null,
        }])
        .select()
        .single();

      if (clientError) throw clientError;

      // 4. Insertar matrícula
      const { data: newMatricula, error: matriculaError } = await (supabase
        .from('matriculas') as any)
        .insert([{
          cliente_id: newCliente.id,
          plan_id: planData.id,
          fecha_inicio: data.fechaInicio,
          fecha_vencimiento: fechaVencimiento,
          monto_total: planData.precio_base,
          estado: 'activo'
        }])
        .select()
        .single();

      if (matriculaError) throw matriculaError;

      // 5. Registrar pago
      if (data.montoPagado > 0) {
        await (supabase
          .from('pagos') as any)
          .insert([{
            matricula_id: (newMatricula as any).id,
            monto_pagado: data.montoPagado,
            metodo_pago: data.metodoPago,
            fecha_pago: new Date().toISOString()
          }]);
      }

      setIsAddModalOpen(false);
      toast.success('Socio registrado con éxito');

      setNewMemberData({
        ...data,
        planName: planData.nombre
      } as any);
      setIsSuccessModalOpen(true);
    } catch (error: any) {
      console.error('Error al agregar cliente:', error);
      toast.error(`Error: ${error.message || 'Error inesperado'}`);
    }
  };

  const quickActions = [
    {
      title: 'Validar Acceso',
      desc: 'Control de entrada por DNI',
      icon: QrCode,
      color: 'from-blue-600 to-indigo-600',
      action: () => router.push('/acceso')
    },
    {
      title: 'Ver Dashboard',
      desc: 'Resumen y finanzas',
      icon: LayoutDashboard,
      color: 'from-[#AB8745] to-[#D4A865]',
      action: () => router.push('/dashboard')
    },
    {
      title: 'Lista de Clientes',
      desc: 'Gestionar base de datos',
      icon: Users,
      color: 'from-purple-600 to-pink-600',
      action: () => router.push('/clientes')
    }
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 relative">
        {/* Background Decorative Elements */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#AB8745]/10 rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#AB8745]/5 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col justify-center min-h-full">

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-300">Inti-Gym Ayacucho</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-linear-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
              BIENVENIDO AL <br /> SISTEMA DE GESTIÓN
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
              Administración para el gimnasio, gestión de socios, cobros y accesos con precisión.
            </p>
          </motion.div>

          {/* Core Action Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">

            {/* Registration Card (Primary) */}
            <motion.button
              whileHover={{ scale: 1.02, translateY: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsAddModalOpen(true)}
              className="group relative h-80 bg-linear-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#AB8745]/30 rounded-[2.5rem] p-10 overflow-hidden text-left shadow-2xl"
            >
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-[#AB8745]/10 to-transparent pointer-events-none"></div>

              <div className="flex justify-between items-start mb-6">
                <div className="p-5 bg-linear-to-br from-[#AB8745] to-[#D4A865] rounded-3xl shadow-xl shadow-[#AB8745]/20 group-hover:scale-110 transition-transform">
                  <Plus className="w-10 h-10 text-white" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  <span className="text-[10px] font-black tracking-widest uppercase">Safe & Secure</span>
                </div>
              </div>

              <h3 className="text-3xl font-black mb-3">Registrar Nuevo Socio</h3>
              <p className="text-gray-400 font-medium">Inicia el proceso de inscripción para un nuevo miembro en segundos.</p>

              <div className="absolute bottom-10 right-10 w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-[#AB8745] transition-colors">
                <ChevronRight className="w-6 h-6 text-white group-hover:text-[#AB8745] transition-colors" />
              </div>
            </motion.button>

            {/* Quick Navigation grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={action.action}
                  className={`p-6 rounded-4xl bg-linear-to-br ${action.color} bg-opacity-10 border border-white/10 flex flex-col justify-between items-start text-left group hover:shadow-xl transition-all relative overflow-hidden h-40 ${idx === 2 ? 'sm:col-span-2' : ''}`}
                >
                  <div className="absolute inset-0 bg-black/60 z-0"></div>
                  <div className="absolute inset-0 bg-linear-to-br opacity-20 from-white to-transparent dark:from-white/10 z-0"></div>

                  <div className="relative z-10 p-3 bg-white/10 rounded-xl mb-4 group-hover:scale-110 transition-transform">
                    <action.icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="relative z-10">
                    <h4 className="font-bold text-lg mb-1">{action.title}</h4>
                    <p className="text-[10px] uppercase font-black text-white/50">{action.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>

          </div>

          {/* System Status Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col md:flex-row items-center justify-between gap-6 px-10 py-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[#AB8745]/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#D4A865]" />
              </div>
              <div>
                <h5 className="font-bold">Hora del Servidor</h5>
                <p className="text-sm text-gray-400">{time || '--:--:--'}</p>
              </div>
            </div>

            <div className="flex items-center gap-8 text-center md:text-right">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-xs font-bold">Base de Datos Link</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Versión</p>
                <span className="text-xs font-bold">1.5 Elite Release</span>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddMember}
      />

      {newMemberData && (
        <MemberSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          memberData={{
            nombre: `${(newMemberData as any).nombres} ${(newMemberData as any).apellidos}`,
            dni: (newMemberData as any).dni,
            telefono: (newMemberData as any).telefono,
            plan: (newMemberData as any).planName || 'Plan'
          }}
        />
      )}
    </div>
  );
}
