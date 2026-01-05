'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import AddMemberModal, { MemberFormData } from '@/components/AddMemberModal';
import MemberSuccessModal from '@/components/MemberSuccessModal';
import { Users, CreditCard, DollarSign, Plus, Loader2, QrCode, Search, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase, cargarPreciosPlanes, calcularFechaVencimiento } from '@/lib/supabase';
import { toast } from 'sonner';
import { getDaysUntilExpiration, isExpiringSoon, getExpirationAlertColor } from '@/lib/utils';
import WhatsAppButton from '@/components/WhatsAppButton';

interface DashboardStats {
  totalSocios: number;
  pagosPendientes: number;
  ingresosMes: number;
  ingresosPorMetodo: {
    efectivo: number;
    yape: number;
  };
}

interface ExpiringMember {
  id: number;
  nombre: string;
  telefono: string;
  plan: string;
  fecha_vencimiento: string;
  dias_restantes: number;
}

interface MonthlyRevenue {
  mes: string; // 'YYYY-MM'
  mesNombre: string; // 'Enero 2026'
  efectivo: number;
  yape: number;
  total: number;
}

export default function Dashboard() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [newMemberData, setNewMemberData] = useState<MemberFormData | null>(null);
  const [dniSearch, setDniSearch] = useState('');
  const [searchResult, setSearchResult] = useState<{ nombre: string; plan: string; vencido: boolean } | null>(null);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalSocios: 0,
    pagosPendientes: 0,
    ingresosMes: 0,
    ingresosPorMetodo: {
      efectivo: 0,
      yape: 0,
    },
  });
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const hoy = new Date().toISOString().split('T')[0];
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().split('T')[0];

      // Cargar precios desde configuración
      const planPrices = await cargarPreciosPlanes();

      // Total Socios
      const { count: totalCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      // Pagos Pendientes (fecha_vencimiento < hoy)
      const { count: pendientesCount } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .lt('fecha_vencimiento', hoy);

      // Ingresos del Mes - Calcular desde historial_pagos
      const { data: pagosMes } = await supabase
        .from('historial_pagos')
        .select('monto, metodo_pago, created_at')
        .gte('created_at', inicioMesStr);

      let ingresos = 0;
      const ingresosPorMetodo = {
        efectivo: 0,
        yape: 0,
      };

      if (pagosMes) {
        pagosMes.forEach(pago => {
          ingresos += pago.monto || 0;

          // Acumular por método de pago
          const metodo = pago.metodo_pago || 'efectivo';
          if (metodo in ingresosPorMetodo) {
            ingresosPorMetodo[metodo as keyof typeof ingresosPorMetodo] += (pago.monto || 0);
          }
        });
      }

      setStats({
        totalSocios: totalCount || 0,
        pagosPendientes: pendientesCount || 0,
        ingresosMes: ingresos,
        ingresosPorMetodo,
      });

      // Cargar socios próximos a vencer
      await loadExpiringMembers();
      await loadMonthlyRevenue();
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      toast.error('Error al cargar estadísticas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadExpiringMembers = async () => {
    try {
      const hoy = new Date();
      const en5Dias = new Date();
      en5Dias.setDate(hoy.getDate() + 5);

      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('id, nombre, telefono, plan, fecha_vencimiento')
        .gte('fecha_vencimiento', hoy.toISOString().split('T')[0])
        .lte('fecha_vencimiento', en5Dias.toISOString().split('T')[0])
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;

      if (clientes) {
        const membersWithDays: ExpiringMember[] = clientes.map(cliente => ({
          ...cliente,
          dias_restantes: getDaysUntilExpiration(cliente.fecha_vencimiento)
        }));

        setExpiringMembers(membersWithDays);
      }
    } catch (error) {
      console.error('Error al cargar socios próximos a vencer:', error);
    }
  };
  const loadMonthlyRevenue = async () => {
    try {
      const { data: pagos, error } = await supabase
        .from('historial_pagos')
        .select('monto, metodo_pago, created_at')
        .gte('created_at', '2025-10-01')
        .lt('created_at', '2027-01-01');

      if (error) throw error;

      const meses: MonthlyRevenue[] = [];
      const startDate = new Date(2025, 9, 1);
      const endDate = new Date(2026, 11, 31);

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const mesKey = `${year}-${String(month + 1).padStart(2, '0')}`;

        const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        meses.push({
          mes: mesKey,
          mesNombre: `${mesesNombres[month]} ${year}`,
          efectivo: 0,
          yape: 0,
          total: 0
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      if (pagos) {
        pagos.forEach(pago => {
          const fecha = new Date(pago.created_at);
          const year = fecha.getFullYear();
          const month = fecha.getMonth();
          const mesKey = `${year}-${String(month + 1).padStart(2, '0')}`;

          const mesData = meses.find(m => m.mes === mesKey);
          if (mesData) {
            const monto = pago.monto || 0;
            mesData.total += monto;

            if (pago.metodo_pago === 'efectivo') {
              mesData.efectivo += monto;
            } else if (pago.metodo_pago === 'yape') {
              mesData.yape += monto;
            }
          }
        });
      }

      meses.sort((a, b) => b.mes.localeCompare(a.mes));
      setMonthlyRevenue(meses);
    } catch (error) {
      console.error('Error al cargar ingresos mensuales:', error);
    }
  };

  const handleAddMember = async (data: MemberFormData) => {
    try {
      // Validación de campos obligatorios
      if (!data.nombre || !data.dni || !data.plan || !data.fechaInicio) {
        toast.warning('Por favor, completa los campos obligatorios');
        return;
      }

      // Validar DNI (debe tener 8 dígitos)
      if (data.dni.length !== 8 || !/^\d+$/.test(data.dni)) {
        toast.warning('El DNI debe tener 8 dígitos numéricos');
        return;
      }

      // Calcular fecha de vencimiento
      const fechaVencimiento = calcularFechaVencimiento(data.plan, data.fechaInicio);

      // Subir foto si existe
      let fotoUrl = null;
      if (data.foto) {
        const fileExt = data.foto.name.split('.').pop();
        const fileName = `${data.dni}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-clientes')
          .upload(fileName, data.foto);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('fotos-clientes')
            .getPublicUrl(fileName);
          fotoUrl = urlData.publicUrl;
        }
      }

      // Insertar cliente en la base de datos
      const { error } = await supabase
        .from('clientes')
        .insert([
          {
            nombre: data.nombre.trim(),
            dni: data.dni.trim(),
            telefono: data.telefono?.trim() || null,
            email: data.email?.trim() || null,
            fecha_nacimiento: data.fechaNacimiento || null,
            plan: data.plan,
            fecha_inicio: data.fechaInicio,
            fecha_vencimiento: fechaVencimiento || null,
            estado_pago: 'al-dia',
            foto_url: fotoUrl,
            monto_pagado: data.montoPagado,
          },
        ]);

      if (error) {
        console.error('Error al agregar cliente:', error);
        toast.error(`Error al agregar cliente: ${error.message}`);
        return;
      }

      setIsAddModalOpen(false);
      toast.success('Cliente agregado exitosamente');

      // Mostrar modal de éxito con QR
      setNewMemberData(data);
      setIsSuccessModalOpen(true);

      // Recargar estadísticas
      await loadStats();
      // No redirigir para que el usuario vea el modal con QR
      // router.push('/clientes');
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error inesperado al agregar cliente');
    }
  };

  const handleValidateAccess = async () => {
    if (!dniSearch || dniSearch.length !== 8) {
      toast.error('Ingresa un DNI válido (8 dígitos)');
      return;
    }

    setSearching(true);
    setSearchResult(null);

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('nombre, plan, fecha_vencimiento')
        .eq('dni', dniSearch)
        .single();

      if (error || !data) {
        toast.error('Socio no encontrado');
        setSearchResult(null);
        return;
      }

      // Verificar si está vencido
      const hoy = new Date();
      const fechaVenc = data.fecha_vencimiento ? new Date(data.fecha_vencimiento) : null;
      const vencido = fechaVenc ? hoy > fechaVenc : true;

      setSearchResult({
        nombre: data.nombre,
        plan: data.plan,
        vencido: vencido,
      });

      if (vencido) {
        toast.error(`${data.nombre} - Membresía vencida`);
      } else {
        toast.success(`${data.nombre} - Acceso permitido`);
      }
    } catch (error) {
      console.error('Error al validar acceso:', error);
      toast.error('Error al validar acceso');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar expiringCount={expiringMembers.length} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-gray-400">Bienvenido al sistema de gestión de Inti-Gym Ayacucho</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Socios */}
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30 group-hover:bg-[#AB8745]/30 transition-all">
                  <Users className="w-6 h-6 text-[#D4A865]" />
                </div>
                {loading ? (
                  <Loader2 className="w-8 h-8 text-[#D4A865] animate-spin" />
                ) : (
                  <span className="text-3xl font-bold text-[#D4A865]">{stats.totalSocios}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Total Socios</h3>
              <p className="text-sm text-gray-500">Miembros activos</p>
            </div>

            {/* Pagos Pendientes */}
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30 group-hover:bg-[#AB8745]/30 transition-all">
                  <CreditCard className="w-6 h-6 text-[#D4A865]" />
                </div>
                {loading ? (
                  <Loader2 className="w-8 h-8 text-[#D4A865] animate-spin" />
                ) : (
                  <span className="text-3xl font-bold text-[#D4A865]">{stats.pagosPendientes}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Renovaciones Pendientes</h3>
              <p className="text-sm text-gray-500">Membresías vencidas</p>
            </div>

            {/* Ingresos del Mes */}
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl hover:shadow-[#AB8745]/10 transition-all duration-300 hover:border-[#AB8745]/40 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30 group-hover:bg-[#AB8745]/30 transition-all">
                  <DollarSign className="w-6 h-6 text-[#D4A865]" />
                </div>
                {loading ? (
                  <Loader2 className="w-8 h-8 text-[#D4A865] animate-spin" />
                ) : (
                  <span className="text-3xl font-bold text-[#D4A865]">S/ {stats.ingresosMes.toLocaleString()}</span>
                )}
              </div>
              <h3 className="text-gray-300 font-semibold mb-1">Ingresos del Mes</h3>
              <p className="text-sm text-gray-500">Mes actual</p>
            </div>
          </div>

          {/* Payment Method Breakdown - Enhanced 3D Design */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#AB8745] to-[#D4A865] rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              Desglose por Método de Pago
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Efectivo - Enhanced Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative bg-gradient-to-br from-green-500/10 via-green-600/5 to-transparent border border-green-500/30 rounded-2xl p-6 hover:border-green-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
                        <span className="text-2xl">💵</span>
                      </div>
                      <div>
                        <h4 className="text-green-400 font-bold text-lg">Efectivo</h4>
                        <p className="text-xs text-gray-500">Pagos en efectivo</p>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <p className="text-3xl font-bold text-white mb-1">S/ {stats.ingresosPorMetodo.efectivo.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">
                          {stats.ingresosMes > 0 ? ((stats.ingresosPorMetodo.efectivo / stats.ingresosMes) * 100).toFixed(1) : 0}% del total
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative h-2 bg-green-950/30 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: stats.ingresosMes > 0 ? `${(stats.ingresosPorMetodo.efectivo / stats.ingresosMes) * 100}%` : '0%' }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Yape - Enhanced Card */}
              <div className="group relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative bg-gradient-to-br from-purple-500/10 via-purple-600/5 to-transparent border border-purple-500/30 rounded-2xl p-6 hover:border-purple-400/50 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                        <span className="text-2xl">📱</span>
                      </div>
                      <div>
                        <h4 className="text-purple-400 font-bold text-lg">Yape</h4>
                        <p className="text-xs text-gray-500">Pagos digitales</p>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        <p className="text-3xl font-bold text-white mb-1">S/ {stats.ingresosPorMetodo.yape.toLocaleString()}</p>
                        <p className="text-sm text-gray-400">
                          {stats.ingresosMes > 0 ? ((stats.ingresosPorMetodo.yape / stats.ingresosMes) * 100).toFixed(1) : 0}% del total
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative h-2 bg-purple-950/30 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: stats.ingresosMes > 0 ? `${(stats.ingresosPorMetodo.yape / stats.ingresosMes) * 100}%` : '0%' }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Próximos Vencimientos */}
          {expiringMembers.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Próximos Vencimientos</h3>
                  <p className="text-sm text-gray-400">Membresías que vencen en los próximos 5 días</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expiringMembers.map((member) => {
                  const colors = getExpirationAlertColor(member.dias_restantes);

                  return (
                    <div
                      key={member.id}
                      className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-5 shadow-xl hover:scale-105 transition-all duration-300 backdrop-blur-xl`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-lg mb-1">{member.nombre}</h4>
                          <p className="text-gray-400 text-sm">{member.plan}</p>
                        </div>
                        <div className={`${colors.badge} px-3 py-1 rounded-full flex items-center gap-1.5`}>
                          <Clock className="w-4 h-4 text-white" />
                          <span className="text-white font-bold text-sm">
                            {member.dias_restantes} {member.dias_restantes === 1 ? 'día' : 'días'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Vence el</p>
                          <p className={`${colors.text} font-semibold text-sm`}>
                            {new Date(member.fecha_vencimiento).toLocaleDateString('es-PE', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <WhatsAppButton
                          telefono={member.telefono}
                          nombre={member.nombre}
                          fechaVencimiento={member.fecha_vencimiento}
                          size="md"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Ingresos Mensuales */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-[#AB8745] to-[#D4A865] rounded-xl flex items-center justify-center shadow-lg shadow-[#AB8745]/30">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Ingresos por Mes</h3>
                <p className="text-sm text-gray-400">Octubre 2025 - Diciembre 2026</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyRevenue.map((mes) => {
                const porcentajeEfectivo = mes.total > 0 ? (mes.efectivo / mes.total) * 100 : 0;
                const porcentajeYape = mes.total > 0 ? (mes.yape / mes.total) * 100 : 0;

                return (
                  <div
                    key={mes.mes}
                    className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-5 shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-bold text-lg">{mes.mesNombre}</h4>
                      <div className="text-2xl font-bold text-[#D4A865]">
                        S/ {mes.total.toLocaleString()}
                      </div>
                    </div>

                    {mes.total > 0 ? (
                      <>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                Efectivo
                              </span>
                              <span className="text-sm font-semibold text-green-400">
                                S/ {mes.efectivo.toLocaleString()} ({porcentajeEfectivo.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${porcentajeEfectivo}%` }}
                              ></div>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-400 flex items-center gap-2">
                                <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                                Yape
                              </span>
                              <span className="text-sm font-semibold text-purple-400">
                                S/ {mes.yape.toLocaleString()} ({porcentajeYape.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-700/50 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-purple-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${porcentajeYape}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-500 text-sm">Sin ingresos registrados</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          {/* Resumen Rápido */}
          <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Resumen Rápido</h3>
            <p className="text-gray-400">
              Bienvenido al dashboard principal. Desde aquí puedes acceder a todas las secciones del sistema:
              <span className="block mt-2">
                • <strong className="text-[#D4A865]">Clientes</strong>: Gestiona todos los socios registrados
              </span>
              <span className="block">
                • <strong className="text-[#D4A865]">Pagos</strong>: Administra los pagos y facturación
              </span>
              <span className="block">
                • <strong className="text-[#D4A865]">Configuración</strong>: Ajusta los parámetros del sistema
              </span>
            </p>
          </div>
        </div>
      </main>

      {/* Botón Flotante - Nuevo Socio */}
      <button
        onClick={() => setIsAddModalOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-full shadow-lg shadow-[#AB8745]/50 flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 group"
      >
        <Plus className="w-6 h-6" />
        <span className="absolute right-full mr-4 px-4 py-2 bg-[#0a0a0a]/95 backdrop-blur-xl text-white text-sm font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[#AB8745]/20">
          Nuevo Socio
        </span>
      </button>

      {/* Modal para Nuevo Socio */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddMember}
      />

      {/* Modal de Éxito con QR */}
      {newMemberData && (
        <MemberSuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          memberData={{
            nombre: newMemberData.nombre,
            dni: newMemberData.dni,
            telefono: newMemberData.telefono,
            plan: newMemberData.plan,
          }}
        />
      )}
    </div>
  );
}
