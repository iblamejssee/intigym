'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import AddMemberModal, { MemberFormData } from '@/components/AddMemberModal';
import EditMemberModal from '@/components/EditMemberModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import QRScannerModal from '@/components/QRScannerModal';
import QRViewModal from '@/components/QRViewModal';
import { Users, Plus, Edit, Trash2, QrCode, User as UserIcon, Loader2, Search, Eye, MessageCircle, AlertTriangle } from 'lucide-react';
import { supabase, ClienteDB, calcularFechaVencimiento, actualizarEstadosPago } from '@/lib/supabase';
import { toast } from 'sonner';
import { getDaysUntilExpiration, isExpiringSoon } from '@/lib/utils';
import WhatsAppButton from '@/components/WhatsAppButton';

// Tipo para los clientes (compatible con la interfaz anterior)
interface Cliente {
  id: number;
  nombre: string;
  dni: string;
  telefono?: string;
  email?: string;
  fechaNacimiento?: string;
  plan: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  estado: 'al-dia' | 'vencido';
  foto?: string;
  qrCode?: string;
  metodo_pago?: string;
}

// Función para convertir ClienteDB a Cliente
const dbToCliente = (db: ClienteDB): Cliente => ({
  id: db.id,
  nombre: db.nombre,
  dni: db.dni,
  telefono: db.telefono,
  email: db.email,
  fechaNacimiento: db.fecha_nacimiento,
  plan: db.plan,
  fechaInicio: db.fecha_inicio,
  fechaVencimiento: db.fecha_vencimiento,
  estado: db.estado_pago,
  foto: db.foto_url,
  qrCode: db.dni, // El QR code será el DNI
});

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

  // Cargar clientes desde Supabase
  useEffect(() => {
    loadClientes();
  }, []);

  // Filtrar clientes cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setClientesFiltrados(clientes);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clientes.filter(
        cliente =>
          cliente.nombre.toLowerCase().includes(term) ||
          cliente.dni.includes(term)
      );
      setClientesFiltrados(filtered);
    }
  }, [searchTerm, clientes]);

  const loadClientes = async () => {
    try {
      setLoading(true);

      // Actualizar estados de pago antes de cargar
      await actualizarEstadosPago();

      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error al cargar clientes:', error);
        return;
      }

      if (data) {
        const clientesData = data.map(dbToCliente);
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
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fotos-clientes')
          .upload(fileName, data.foto);

        if (uploadError) {
          console.error('Error al subir foto:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('fotos-clientes')
            .getPublicUrl(fileName);
          fotoUrl = urlData.publicUrl;
        }
      }

      // Insertar cliente en la base de datos
      const { data: newCliente, error } = await supabase
        .from('clientes')
        .insert([
          {
            nombre: data.nombre.trim(),
            dni: data.dni.trim(),
            telefono: data.telefono?.trim() || null,
            email: data.email || null,
            fecha_nacimiento: data.fechaNacimiento || null,
            plan: data.plan,
            fecha_inicio: data.fechaInicio || null,
            fecha_vencimiento: fechaVencimiento || null,
            estado_pago: 'al-dia',
            foto_url: fotoUrl,
            monto_pagado: data.montoPagado || 0,
            metodo_pago: data.metodoPago || 'efectivo',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error al agregar cliente:', error);
        toast.error(`Error al agregar cliente: ${error.message}`);
        return;
      }

      if (newCliente) {
        // Registrar el pago inicial en historial_pagos si hay monto pagado
        if (data.montoPagado && data.montoPagado > 0) {
          const { error: pagoError } = await supabase
            .from('historial_pagos')
            .insert([{
              cliente_id: newCliente.id,
              monto: data.montoPagado,
              metodo_pago: data.metodoPago || 'efectivo',
              concepto: 'Pago inicial de membresía',
              created_at: data.fechaInicio ? new Date(data.fechaInicio).toISOString() : new Date().toISOString()
            }]);

          if (pagoError) {
            console.error('Error al registrar pago:', pagoError);
            // No bloqueamos la creación del cliente por error en historial
          }
        }

        // Recargar la lista completa desde Supabase para asegurar consistencia
        await loadClientes();
        setIsAddModalOpen(false);
        toast.success('Cliente agregado exitosamente');
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error inesperado al agregar cliente');
    }
  };

  const handleEditMember = async (data: MemberFormData) => {
    if (!selectedCliente) return;

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

      // Calcular nueva fecha de vencimiento si cambió el plan o fecha_inicio
      const fechaVencimiento = calcularFechaVencimiento(data.plan, data.fechaInicio);

      // Subir nueva foto si existe
      let fotoUrl = selectedCliente.foto;
      if (data.foto) {
        const fileExt = data.foto.name.split('.').pop();
        const fileName = `${data.dni}-${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('fotos-clientes')
          .upload(fileName, data.foto);

        if (uploadError) {
          console.error('Error al subir foto:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('fotos-clientes')
            .getPublicUrl(fileName);
          fotoUrl = urlData.publicUrl;
        }
      }

      // Actualizar cliente en la base de datos
      const { data: updatedCliente, error } = await supabase
        .from('clientes')
        .update({
          nombre: data.nombre.trim(),
          dni: data.dni.trim(),
          telefono: data.telefono?.trim() || null,
          email: data.email || null,
          fecha_nacimiento: data.fechaNacimiento || null,
          plan: data.plan,
          fecha_inicio: data.fechaInicio || null,
          fecha_vencimiento: fechaVencimiento || null,
          foto_url: fotoUrl,
          updated_at: new Date().toISOString(),
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
        // Actualizar estados después de editar
        await actualizarEstadosPago();
        // Recargar la lista completa desde Supabase para asegurar consistencia
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
      const { error } = await supabase
        .from('clientes')
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

  const handleQRScan = (qrData: string) => {
    // Buscar cliente por DNI (que es el QR code)
    const cliente = clientes.find(c => c.dni === qrData);
    if (cliente) {
      setSelectedCliente(cliente);
      setIsEditModalOpen(true);
      toast.success(`Cliente encontrado: ${cliente.nombre}`);
    } else {
      toast.error(`Cliente no encontrado con DNI: ${qrData}`);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Clientes</h2>
              <p className="text-gray-400">Gestión de socios y miembros del gimnasio</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsQRModalOpen(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-[#AB8745]/20 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
              >
                <QrCode className="w-5 h-5" />
                Escanear QR
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nuevo Cliente
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
                <div className="overflow-x-auto">
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
                                  <img src={cliente.foto} alt={cliente.nombre} className="w-full h-full object-cover" />
                                ) : (
                                  <UserIcon className="w-6 h-6 text-[#D4A865]" />
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">{cliente.nombre}</div>
                                {cliente.email && (
                                  <div className="text-xs text-gray-500">{cliente.email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300">{cliente.dni}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-300 capitalize">{cliente.plan}</div>
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
                                  nombre={cliente.nombre}
                                  fechaVencimiento={cliente.fechaVencimiento}
                                  size="sm"
                                />
                              )}

                              <button
                                onClick={() => openQRViewModal(cliente)}
                                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 rounded-lg transition-all"
                                title="Ver QR"
                              >
                                <Eye className="w-4 h-4" />
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
            nombre: selectedCliente.nombre,
            dni: selectedCliente.dni,
            telefono: selectedCliente.telefono || '',
            email: selectedCliente.email || '',
            fechaNacimiento: selectedCliente.fechaNacimiento || '',
            plan: selectedCliente.plan,
            fechaInicio: selectedCliente.fechaInicio || '',
            montoPagado: 0,
            metodoPago: selectedCliente.metodo_pago || 'efectivo',
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
        memberName={clienteToDelete?.nombre || ''}
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
          nombre={clienteQRView.nombre}
          dni={clienteQRView.dni}
          telefono={clienteQRView.telefono}
          plan={clienteQRView.plan}
        />
      )}
    </div>
  );
}
