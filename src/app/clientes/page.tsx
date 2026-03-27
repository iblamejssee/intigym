'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AddMemberModal, { MemberFormData } from '@/components/AddMemberModal';
import EditMemberModal from '@/components/EditMemberModal';
import RenewMemberModal, { RenewalFormData } from '@/components/RenewMemberModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import QRScannerModal from '@/components/QRScannerModal';
import QRViewModal from '@/components/QRViewModal';
import { Users, Plus, Edit, Trash2, QrCode, User as UserIcon, Loader2, Search, Eye, MessageCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import { supabase, ClienteDB, calcularFechaVencimiento, actualizarEstadosMatriculas } from '@/lib/supabase';
import { toast } from 'sonner';
import { getDaysUntilExpiration, isExpiringSoon } from '@/lib/utils';
import WhatsAppButton from '@/components/WhatsAppButton';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface Cliente {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  planId: number;
  planNombre: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  estado: 'activo' | 'vencido' | 'congelado' | 'cancelado';
  foto?: string;
  qrCode?: string;
}

type CategoryTab = 'todos' | 'activos' | 'porVencer' | 'vencidos';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isQRViewModalOpen, setIsQRViewModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [clienteQRView, setClienteQRView] = useState<Cliente | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [selectedClienteForRenewal, setSelectedClienteForRenewal] = useState<Cliente | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>('todos');

  // Cargar clientes desde Supabase
  useEffect(() => {
    loadClientes();
  }, []);

  // Filtrar clientes cuando cambia el término de búsqueda o la pestaña
  useEffect(() => {
    let filtered = [...clientes];

    // 1. Filtrar por pestaña activa
    if (activeTab === 'activos') {
      filtered = filtered.filter(c => getDaysUntilExpiration(c.fechaVencimiento || '') > 7);
    } else if (activeTab === 'porVencer') {
      filtered = filtered.filter(c => isExpiringSoon(c.fechaVencimiento || '', 7));
    } else if (activeTab === 'vencidos') {
      filtered = filtered.filter(c => getDaysUntilExpiration(c.fechaVencimiento || '') <= 0);
    }

    // 2. Filtrar por término de búsqueda
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        cliente =>
          cliente.nombres.toLowerCase().includes(term) ||
          cliente.apellidos.toLowerCase().includes(term) ||
          cliente.dni.includes(term)
      );
    }

    setClientesFiltrados(filtered);
  }, [searchTerm, clientes, activeTab]);

  const loadClientes = async () => {
    try {
      setLoading(true);

      // Actualizar estados de matrículas antes de cargar
      await actualizarEstadosMatriculas();

      const { data, error } = await (supabase
        .from('clientes') as any)
        .select(`
          *,
          matriculas (
            id,
            plan_id,
            fecha_inicio,
            fecha_vencimiento,
            estado,
            planes (nombre)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error al cargar clientes:', error);
        toast.error('Error al cargar clientes');
        return;
      }

      if (data) {
        const clientesData: Cliente[] = (data as any[]).map((c: any) => {
          // Buscamos la matrícula más reciente (o la activa)
          const matricula = c.matriculas && c.matriculas.length > 0
            ? (c.matriculas as any[]).sort((a: any, b: any) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime())[0]
            : null;

          return {
            id: c.id,
            nombres: c.nombres,
            apellidos: c.apellidos,
            dni: c.dni,
            telefono: c.telefono || undefined,
            email: c.email || undefined,
            fechaNacimiento: c.fecha_nacimiento || undefined,
            planId: matricula?.plan_id || 0,
            planNombre: (matricula?.planes as any)?.nombre || 'Sin Plan',
            fechaInicio: matricula?.fecha_inicio || undefined,
            fechaVencimiento: matricula?.fecha_vencimiento || undefined,
            estado: (matricula?.estado as any) || 'vencido',
            foto: c.huella_digital_id || undefined, // Nota: el campo foto_url parece haber sido reemplazado o no está en el nuevo schema, usaré huella_digital_id temporalmente si es necesario o ignorar
            qrCode: c.dni,
          };
        });
        setClientes(clientesData);
        setClientesFiltrados(clientesData);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (data: MemberFormData) => {
    try {
      // No hay campos obligatorios

      let planData = null;
      if (data.planId) {
        const { data: pData } = await (supabase
          .from('planes') as any)
          .select('*')
          .eq('id', data.planId)
          .single();
        planData = pData;
      }

      // Calcular fecha de vencimiento si hay plan
      const fechaVencimiento = planData ? calcularFechaVencimiento((planData as any).duracion_dias, data.fechaInicio) : null;

      // 1. Insertar cliente
      const { data: newCliente, error: clientError } = await (supabase
        .from('clientes') as any)
        .insert([
          {
            nombres: data.nombres?.trim() || 'Sin Nombre',
            apellidos: data.apellidos?.trim() || '',
            dni: data.dni?.trim() || null,
            telefono: data.telefono?.trim() || null,
            email: data.email || null,
            fecha_nacimiento: data.fechaNacimiento || null,
          },
        ])
        .select()
        .single();

      if (clientError) {
        console.error('Error al agregar cliente:', clientError);
        toast.error(`Error al agregar cliente: ${clientError.message}`);
        return;
      }

      if (newCliente) {
        // 2. Insertar matrícula solo si hay plan seleccionado
        if (planData) {
          const { data: newMatricula, error: matriculaError } = await (supabase
            .from('matriculas') as any)
            .insert([
              {
                cliente_id: (newCliente as any).id,
                plan_id: (planData as any).id,
                fecha_inicio: data.fechaInicio,
                fecha_vencimiento: fechaVencimiento,
                monto_total: (planData as any).precio_base,
                estado: 'activo'
              }
            ])
            .select()
            .single();

          if (matriculaError) {
            console.error('Error al crear matrícula:', matriculaError);
            toast.error('Cliente creado pero hubo un error al asignar el plan');
            // No retornamos aquí para que al menos se recargue la lista con el nuevo cliente
          }

          // 3. Registrar el pago si existe monto pagado
          if (data.montoPagado && data.montoPagado > 0 && newMatricula) {
            const { error: pagoError } = await (supabase
              .from('pagos') as any)
              .insert([{
                matricula_id: (newMatricula as any).id,
                monto_pagado: data.montoPagado,
                metodo_pago: data.metodoPago,
                fecha_pago: new Date().toISOString()
              }]);

            if (pagoError) {
              console.error('Error al registrar pago:', pagoError);
            }
          }
        }


        // Recargar la lista
        await loadClientes();
        setIsAddModalOpen(false);
        toast.success('Cliente registrado exitosamente');
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error inesperado al agregar cliente');
    }
  };

  const handleEditMember = async (data: MemberFormData) => {
    if (!selectedCliente) return;

    try {
      // No hay campos obligatorios

      // Actualizar cliente en la base de datos
      const { data: updatedCliente, error } = await (supabase
        .from('clientes') as any)
        .update({
          nombres: data.nombres?.trim() || 'Sin Nombre',
          apellidos: data.apellidos?.trim() || '',
          dni: data.dni?.trim() || null,
          telefono: data.telefono?.trim() || null,
          email: data.email || null,
          fecha_nacimiento: data.fechaNacimiento || null,
        })
        .eq('id', selectedCliente.id)
        .select()
        .single();

      if (error) {
        console.error('Error al actualizar cliente:', error);
        toast.error(`Error al actualizar cliente: ${error.message}`);
        return;
      }

      if (updatedCliente) {
        // En un sistema real, si cambia el plan o fecha inicio en EDIT, 
        // deberíamos decidir si creamos nueva matrícula o editamos la actual.

        // 1. Actualizar el pago si existe monto pagado o método de pago
        const { data: matriculas } = await (supabase
          .from('matriculas') as any)
          .select('id')
          .eq('cliente_id', selectedCliente.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (matriculas && matriculas.length > 0) {
          const lastMatriculaId = matriculas[0].id;

          // Buscar el último pago de esta matrícula
          const { data: pagos } = await (supabase
            .from('pagos') as any)
            .select('id')
            .eq('matricula_id', lastMatriculaId)
            .order('fecha_pago', { ascending: false })
            .limit(1);

          if (pagos && pagos.length > 0) {
            await (supabase
              .from('pagos') as any)
              .update({
                monto_pagado: data.montoPagado,
                metodo_pago: data.metodoPago
              })
              .eq('id', pagos[0].id);
          }
        }

        await loadClientes();
        setIsEditModalOpen(false);
        setSelectedCliente(null);
        toast.success('Cliente actualizado exitosamente');
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error inesperado al actualizar cliente');
    }
  };

  const handleDeleteMember = async () => {
    if (!clienteToDelete) return;

    try {
      const { error } = await (supabase
        .from('clientes') as any)
        .delete()
        .eq('id', clienteToDelete.id);

      if (error) {
        console.error('Error al eliminar cliente:', error);
        toast.error(`Error al eliminar cliente: ${error.message}`);
        return;
      }

      // Recargar la lista completa desde Supabase para asegurar consistencia
      await loadClientes();
      setIsDeleteModalOpen(false);
      setClienteToDelete(null);
      toast.success('Cliente eliminado exitosamente');
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error inesperado al eliminar cliente');
    }
  };

  const openEditModal = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setIsDeleteModalOpen(true);
  };

  const openQRViewModal = (cliente: Cliente) => {
    setClienteQRView(cliente);
    setIsQRViewModalOpen(true);
  };

  const openRenewModal = (cliente: Cliente) => {
    setSelectedClienteForRenewal(cliente);
    setIsRenewModalOpen(true);
  };

  const handleRenewMember = async (formData: RenewalFormData) => {
    if (!selectedClienteForRenewal) return;

    try {
      // 0. Buscar plan
      const { data: planData } = await (supabase
        .from('planes') as any)
        .select('*')
        .eq('nombre', formData.planNombre)
        .single();

      if (!planData) throw new Error('Plan no encontrado');

      // 1. Crear nueva matrícula
      const { data: newMatricula, error: matriculaError } = await (supabase
        .from('matriculas') as any)
        .insert([{
          cliente_id: selectedClienteForRenewal.id,
          plan_id: (planData as any).id,
          fecha_inicio: formData.fechaInicio,
          fecha_vencimiento: formData.fechaVencimiento,
          monto_total: formData.montoPagado,
          estado: 'activo'
        }])
        .select()
        .single();

      if (matriculaError) throw matriculaError;

      // 2. Insertar pago
      const { error: historyError } = await (supabase
        .from('pagos') as any)
        .insert([{
          matricula_id: (newMatricula as any).id,
          monto_pagado: formData.montoPagado,
          metodo_pago: formData.metodoPago as any,
          fecha_pago: new Date().toISOString()
        }]);

      if (historyError) throw historyError;

      // 3. Recargar y cerrar
      await loadClientes();
      setIsRenewModalOpen(false);
      setSelectedClienteForRenewal(null);
      toast.success('Membresía renovada exitosamente');
    } catch (error) {
      console.error('Error al renovar:', error);
      toast.error('Error al renovar membresía');
    }
  };

  const handleQRScan = (qrData: string) => {
    // Buscar cliente por DNI (que es el QR code)
    const cliente = clientes.find(c => c.dni === qrData);
    if (cliente) {
      setSelectedCliente(cliente);
      setIsEditModalOpen(true);
      toast.success(`Cliente encontrado: ${cliente.nombres} ${cliente.apellidos}`);
    } else {
      toast.error(`Cliente no encontrado con DNI: ${qrData}`);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-4 md:p-8">
          {/* Header */}
          {/* Tabs de Estado */}
          <div className="flex flex-wrap gap-2 md:gap-4 mb-8">
            {[
              { id: 'todos', label: 'Todos', color: 'from-gray-600 to-gray-800', count: clientes.length },
              { id: 'activos', label: 'Activos', color: 'from-emerald-600 to-teal-700', count: clientes.filter((c: Cliente) => c.fechaVencimiento && getDaysUntilExpiration(c.fechaVencimiento) > 7).length },
              { id: 'porVencer', label: 'Por Vencer', color: 'from-[#D4A865] to-[#8B6935]', count: clientes.filter((c: Cliente) => c.fechaVencimiento && isExpiringSoon(c.fechaVencimiento, 7)).length },
              { id: 'vencidos', label: 'Vencidos', color: 'from-rose-600 to-red-800', count: clientes.filter((c: Cliente) => !c.fechaVencimiento || getDaysUntilExpiration(c.fechaVencimiento) <= 0).length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CategoryTab)}
                className={`relative group px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border transition-all duration-300 flex items-center gap-2 md:gap-3 overflow-hidden ${activeTab === tab.id
                  ? `border-[#D4A865]/50 bg-white/10 shadow-[0_0_20px_rgba(171,135,69,0.1)]`
                  : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-linear-to-r from-[#AB8745]/10 to-transparent pointer-events-none"
                  />
                )}
                <div className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-linear-to-r ${tab.color} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                <span className={`text-xs md:text-sm font-bold transition-colors ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'}`}>
                  {tab.label}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-black ${activeTab === tab.id ? 'text-[#D4A865]' : 'text-gray-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Clientes</h2>
              <p className="text-gray-400">Gestión de socios y miembros del gimnasio</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="flex-1 md:flex-none justify-center px-4 py-3 bg-white/5 hover:bg-white/10 border border-[#AB8745]/20 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
              >
                <QrCode className="w-5 h-5 text-[#D4A865]" />
                <span className="md:inline">Escanear</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex-2 md:flex-none justify-center px-6 py-3 bg-linear-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-[#AB8745]/20 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Nuevo Cliente</span>
              </button>
            </div>
          </div>

          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
              />
            </div>
          </div>

          {/* Tabla de Clientes */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#D4A865] animate-spin" />
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[#AB8745]/20 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Lista de Clientes</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Total: {clientesFiltrados.length} {searchTerm ? 'resultados' : 'socios registrados'}
                  </p>
                </div>
              </div>

              {clientesFiltrados.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay clientes registrados aún'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Vista Desktop (Tabla) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-[#AB8745]/20">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Plan</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Membresia</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AB8745]/10">
                        {clientesFiltrados.map((cliente) => (
                          <tr key={cliente.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#AB8745]/20 flex items-center justify-center border border-[#AB8745]/30 overflow-hidden">
                                  {cliente.foto ? (
                                    <img src={cliente.foto} alt={`${cliente.nombres} ${cliente.apellidos}`} className="w-full h-full object-cover" />
                                  ) : (
                                    <UserIcon className="w-6 h-6 text-[#D4A865]" />
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {(cliente.nombres || cliente.apellidos)
                                      ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim()
                                      : 'Sin nombre'}
                                  </div>
                                  {cliente.email && (
                                    <div className="text-xs text-gray-500">{cliente.email}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-300">{cliente.dni || 'S/D'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-300 capitalize">{cliente.planNombre}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {(() => {
                                // Calcular estado en tiempo real basado en fecha_vencimiento
                                const hoy = new Date();
                                hoy.setHours(0, 0, 0, 0);
                                const vencimiento = cliente.fechaVencimiento
                                  ? new Date(cliente.fechaVencimiento)
                                  : null;
                                if (vencimiento) {
                                  vencimiento.setHours(0, 0, 0, 0);
                                }
                                const estaVencido = vencimiento && vencimiento < hoy;

                                return (
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${estaVencido
                                      ? 'bg-[#AB8745]/20 text-[#D4A865] border border-[#AB8745]/30'
                                      : 'bg-green-600/20 text-green-400 border border-green-600/30'
                                      }`}
                                  >
                                    {estaVencido ? 'Vencido' : 'Al Día'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {/* Indicador de vencimiento próximo */}
                                {cliente.fechaVencimiento && isExpiringSoon(cliente.fechaVencimiento) && (
                                  <div className="relative group">
                                    <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/40 animate-pulse">
                                      <AlertTriangle className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                      Vence en {getDaysUntilExpiration(cliente.fechaVencimiento)} días
                                    </div>
                                  </div>
                                )}

                                {/* Botón WhatsApp */}
                                {cliente.fechaVencimiento && (
                                  <WhatsAppButton
                                    telefono={cliente.telefono || ''}
                                    nombre={(cliente.nombres || cliente.apellidos) ? `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim() : 'Socio'}
                                    fechaVencimiento={cliente.fechaVencimiento}
                                    size="sm"
                                  />
                                )}

                                <button
                                  onClick={() => openRenewModal(cliente)}
                                  className="p-2 text-green-400 hover:text-green-300 hover:bg-green-600/10 rounded-lg transition-all"
                                  title="Renovar Membresía"
                                >
                                  <RefreshCcw className="w-4 h-4" />
                                </button>

                                <Link
                                  href={`/clientes/${cliente.id}`}
                                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded-lg transition-all"
                                  title="Ver Perfil Elite"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>

                                <button
                                  onClick={() => openQRViewModal(cliente)}
                                  className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/10 rounded-lg transition-all"
                                  title="Ver QR"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(cliente)}
                                  className="p-2 text-[#D4A865] hover:text-[#E0BA85] hover:bg-[#AB8745]/10 rounded-lg transition-all"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteModal(cliente)}
                                  className="p-2 text-[#CB9755] hover:text-[#D4A865] hover:bg-[#AB8745]/10 rounded-lg transition-all"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista Mobile (Tarjetas) */}
                  <div className="md:hidden divide-y divide-[#AB8745]/10">
                    <AnimatePresence>
                      {clientesFiltrados.map((cliente) => {
                        const hoy = new Date();
                        hoy.setHours(0, 0, 0, 0);
                        const vencimiento = cliente.fechaVencimiento ? new Date(cliente.fechaVencimiento) : null;
                        const estaVencido = vencimiento && vencimiento < hoy;

                        return (
                          <motion.div
                            key={cliente.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="p-5 flex flex-col gap-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[#AB8745]/20 flex items-center justify-center border border-[#AB8745]/30 shrink-0 overflow-hidden">
                                  {cliente.foto ? (
                                    <img src={cliente.foto} alt={cliente.nombres} className="w-full h-full object-cover" />
                                  ) : (
                                    <UserIcon className="w-6 h-6 text-[#D4A865]" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-bold text-white leading-tight">
                                    {cliente.nombres} {cliente.apellidos}
                                  </h4>
                                  <div className="flex gap-2 items-center mt-1">
                                    <span className="text-xs text-gray-500">DNI: {cliente.dni || 'S/D'}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                                    <span className="text-xs text-[#AB8745] font-bold uppercase tracking-wider">{cliente.planNombre}</span>
                                  </div>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${estaVencido ? 'bg-red-600/20 text-red-400 border border-red-600/30' : 'bg-green-600/20 text-green-400 border border-green-600/30'}`}>
                                {estaVencido ? 'Vencido' : 'Activo'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Vencimiento</span>
                                <span className={`text-sm font-bold ${estaVencido ? 'text-red-400' : 'text-gray-300'}`}>
                                  {cliente.fechaVencimiento ? new Date(cliente.fechaVencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : 'No asignado'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {cliente.fechaVencimiento && (
                                  <WhatsAppButton
                                    telefono={cliente.telefono || ''}
                                    nombre={`${cliente.nombres} ${cliente.apellidos}`}
                                    fechaVencimiento={cliente.fechaVencimiento}
                                    size="sm"
                                  />
                                )}
                                <button
                                  onClick={() => openRenewModal(cliente)}
                                  className="w-10 h-10 bg-green-600/20 border border-green-600/30 rounded-lg flex items-center justify-center text-green-400"
                                >
                                  <RefreshCcw className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link
                                href={`/clientes/${cliente.id}`}
                                className="flex-1 py-2.5 bg-blue-600/20 border border-blue-600/30 rounded-xl flex items-center justify-center gap-2 text-blue-400 text-xs font-bold"
                              >
                                <Eye className="w-4 h-4" />
                                Perfil
                              </Link>
                              <button
                                onClick={() => openQRViewModal(cliente)}
                                className="flex-1 py-2.5 bg-indigo-600/20 border border-indigo-600/30 rounded-xl flex items-center justify-center gap-2 text-indigo-400 text-xs font-bold"
                              >
                                <QrCode className="w-4 h-4" />
                                Pase
                              </button>
                              <button
                                onClick={() => openEditModal(cliente)}
                                className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-gray-400"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(cliente)}
                                className="w-11 h-11 bg-red-600/10 border border-red-600/20 rounded-xl flex items-center justify-center text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modales */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddMember}
      />

      {selectedCliente && (
        <EditMemberModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCliente(null);
          }}
          onSubmit={handleEditMember}
          memberData={{
            ...selectedCliente,
            nombres: selectedCliente.nombres,
            apellidos: selectedCliente.apellidos,
            dni: selectedCliente.dni,
            telefono: selectedCliente.telefono || '',
            email: selectedCliente.email || '',
            fechaNacimiento: selectedCliente.fechaNacimiento || '',
            planId: selectedCliente.planId,
            fechaInicio: selectedCliente.fechaInicio || '',
            montoPagado: 0,
            metodoPago: 'efectivo',
            foto: null,
          }}
        />
      )}

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setClienteToDelete(null);
        }}
        onConfirm={handleDeleteMember}
        memberName={`${clienteToDelete?.nombres} ${clienteToDelete?.apellidos}`}
      />

      <QRScannerModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onScan={handleQRScan}
      />

      {clienteQRView && (
        <QRViewModal
          isOpen={isQRViewModalOpen}
          onClose={() => {
            setIsQRViewModalOpen(false);
            setClienteQRView(null);
          }}
          nombre={`${clienteQRView.nombres} ${clienteQRView.apellidos}`}
          dni={clienteQRView.dni}
          telefono={clienteQRView.telefono}
          plan={clienteQRView.planNombre}
        />
      )}

      {selectedClienteForRenewal && (
        <RenewMemberModal
          isOpen={isRenewModalOpen}
          onClose={() => {
            setIsRenewModalOpen(false);
            setSelectedClienteForRenewal(null);
          }}
          onSubmit={handleRenewMember}
          memberData={{
            id: selectedClienteForRenewal.id,
            nombre: `${selectedClienteForRenewal.nombres} ${selectedClienteForRenewal.apellidos}`,
            dni: selectedClienteForRenewal.dni,
            planActual: selectedClienteForRenewal.planNombre,
            fechaVencimiento: selectedClienteForRenewal.fechaVencimiento || ''
          }}
        />
      )}
    </div>
  );
}
