'use client';

import { useState, useEffect } from 'react';
import { X, User, Calendar, DollarSign, Image as ImageIcon, Upload } from 'lucide-react';
import { MemberFormData } from './AddMemberModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PlanOption {
  id: number;
  nombre: string;
  precio: number;
}

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MemberFormData) => void;
  memberData: MemberFormData & { id: string };
}

export default function EditMemberModal({ isOpen, onClose, onSubmit, memberData }: EditMemberModalProps) {
  const [formData, setFormData] = useState<MemberFormData>({
    nombres: '',
    apellidos: '',
    dni: '',
    telefono: '',
    email: '',
    fechaNacimiento: '',
    planId: '',
    fechaInicio: '',
    montoPagado: 0,
    metodoPago: 'efectivo',
    foto: null,
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [planes, setPlanes] = useState<PlanOption[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadPlanes();
      if (memberData) {
        setFormData({
          nombres: memberData.nombres || '',
          apellidos: memberData.apellidos || '',
          dni: memberData.dni || '',
          telefono: memberData.telefono || '',
          email: memberData.email || '',
          fechaNacimiento: memberData.fechaNacimiento || '',
          planId: memberData.planId || '',
          fechaInicio: memberData.fechaInicio || '',
          montoPagado: memberData.montoPagado || 0,
          metodoPago: memberData.metodoPago || 'efectivo',
          foto: null,
        });
        setPreview(null);
      }
    }
  }, [isOpen, memberData]);

  const loadPlanes = async () => {
    try {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .order('nombre');

      if (error) {
        console.error('Error al cargar planes:', error);
        toast.error('Error al cargar planes');
        return;
      }

      setPlanes((data as any[]).map(p => ({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio_base
      })));
    } catch (error) {
      console.error('Error al cargar planes:', error);
      toast.error('Error al cargar planes');
    }
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, foto: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#AB8745]/20 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl">
          <div>
            <h3 className="text-2xl font-bold text-white">Editar Socio</h3>
            <p className="text-sm text-gray-400 mt-1">Modifica la información del miembro</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Foto de Perfil */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Foto de Perfil</label>
              <div className="flex items-center gap-4">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#AB8745]/30"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#AB8745]/20 flex items-center justify-center border-2 border-[#AB8745]/30">
                    <User className="w-12 h-12 text-[#D4A865]" />
                  </div>
                )}
                <label className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-[#AB8745]/20 rounded-lg cursor-pointer transition-all flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm text-gray-300">Cambiar foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Datos Personales */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombres</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}

                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Apellidos</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}

                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">DNI</label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}

                maxLength={8}
                className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Nacimiento</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="date"
                  name="fechaNacimiento"
                  value={formData.fechaNacimiento}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Plan</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <select
                  name="planId"
                  value={formData.planId}
                  onChange={handleChange}

                  className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all appearance-none"
                >
                  <option value="">Selecciona un plan</option>
                  {planes.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} - S/ {plan.precio}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Inicio</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="date"
                  name="fechaInicio"
                  value={formData.fechaInicio}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                />
              </div>
            </div>

            {/* Información de Pago */}
            <div className="md:col-span-2 mt-4 pt-4 border-t border-[#AB8745]/10">
              <h4 className="text-[#D4A865] font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Información del Último Pago
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Monto Cancelado</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="number"
                      name="montoPagado"
                      value={formData.montoPagado}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Método de Pago</label>
                  <select
                    name="metodoPago"
                    value={formData.metodoPago}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all appearance-none"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="yape">📱 Yape</option>
                    <option value="plin">📱 Plin</option>
                    <option value="transferencia">💳 Transferencia</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#AB8745]/20">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all border border-[#AB8745]/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-linear-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

