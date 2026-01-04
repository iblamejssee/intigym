'use client';
// Force deployment v2

import { useState, useEffect } from 'react';
import { X, Upload, User, Calendar, DollarSign, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MemberFormData) => void;
}

export interface MemberFormData {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  fechaNacimiento: string;
  plan: string;
  fechaInicio: string;
  montoPagado: number;
  metodoPago: string;
  foto: File | null;
}

interface PlanOption {
  nombre: string;
  precio: number;
}

export default function AddMemberModal({ isOpen, onClose, onSubmit }: AddMemberModalProps) {
  const [activeStep, setActiveStep] = useState<'personal' | 'plan' | 'foto'>('personal');
  const [formData, setFormData] = useState<MemberFormData>({
    nombre: '',
    dni: '',
    telefono: '',
    email: '',
    fechaNacimiento: '',
    plan: '',
    fechaInicio: '',
    montoPagado: 0,
    metodoPago: 'efectivo',
    foto: null,
  });
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [planes, setPlanes] = useState<PlanOption[]>([]);

  // Cargar planes desde la base de datos
  useEffect(() => {
    if (isOpen) {
      loadPlanes();
    }
  }, [isOpen]);

  const loadPlanes = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('clave, valor')
        .like('clave', 'precio_%')
        .order('valor');

      if (error) {
        console.error('Error al cargar planes:', error);
        toast.error('Error al cargar planes de configuración');
        return;
      }

      if (!data || data.length === 0) {
        toast.warning('No hay planes configurados. Por favor, configura los planes primero.');
        return;
      }

      const planesData = data.map(item => ({
        nombre: item.clave.replace('precio_', ''),
        precio: parseFloat(item.valor),
      }));
      setPlanes(planesData);
    } catch (error) {
      console.error('Error al cargar planes:', error);
      toast.error('Error al cargar planes');
    }
  };

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Si cambia el plan, actualizar automáticamente el monto pagado
    if (name === 'plan') {
      const planSeleccionado = planes.find(p => p.nombre === value);
      setFormData(prev => ({
        ...prev,
        [name]: value,
        montoPagado: planSeleccionado?.precio || 0
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
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
    if (activeStep === 'personal') {
      setActiveStep('plan');
    } else if (activeStep === 'plan') {
      setActiveStep('foto');
    } else {
      onSubmit(formData);
      // Reset form
      setFormData({
        nombre: '',
        dni: '',
        telefono: '',
        email: '',
        fechaNacimiento: '',
        plan: '',
        fechaInicio: '',
        montoPagado: 0,
        metodoPago: 'efectivo',
        foto: null,
      });
      setPreview(null);
      setActiveStep('personal');
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      nombre: '',
      dni: '',
      telefono: '',
      email: '',
      fechaNacimiento: '',
      plan: '',
      fechaInicio: '',
      montoPagado: 0,
      metodoPago: 'efectivo',
      foto: null,
    });
    setPreview(null);
    setActiveStep('personal');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#AB8745]/20 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl">
          <div>
            <h3 className="text-2xl font-bold text-white">Nuevo Socio</h3>
            <p className="text-sm text-gray-400 mt-1">
              {activeStep === 'personal' && 'Datos Personales'}
              {activeStep === 'plan' && 'Plan de Entrenamiento'}
              {activeStep === 'foto' && 'Foto de Perfil'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-[#AB8745]/20">
          <div className="flex items-center justify-between">
            {['personal', 'plan', 'foto'].map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${activeStep === step
                      ? 'bg-[#AB8745] border-[#AB8745] text-white'
                      : activeStep === 'plan' && step === 'personal'
                        ? 'bg-[#AB8745]/20 border-[#AB8745]/50 text-[#D4A865]'
                        : activeStep === 'foto' && (step === 'personal' || step === 'plan')
                          ? 'bg-[#AB8745]/20 border-[#AB8745]/50 text-[#D4A865]'
                          : 'bg-transparent border-gray-700 text-gray-500'
                      }`}
                  >
                    {index + 1}
                  </div>
                  <span className="text-xs mt-2 text-gray-400 capitalize">{step}</span>
                </div>
                {index < 2 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-all ${activeStep === 'plan' && step === 'personal'
                      ? 'bg-[#AB8745]'
                      : activeStep === 'foto'
                        ? 'bg-[#AB8745]'
                        : 'bg-gray-700'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Datos Personales */}
          {activeStep === 'personal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">DNI *</label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    required
                    maxLength={8}
                    className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                    placeholder="12345678"
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
                    placeholder="999 999 999"
                  />
                </div>
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
                  placeholder="correo@ejemplo.com"
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
            </div>
          )}

          {/* Plan de Entrenamiento */}
          {activeStep === 'plan' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Plan *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all appearance-none"
                  >
                    <option value="" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>Selecciona un plan</option>
                    {planes.map((plan) => (
                      <option
                        key={plan.nombre}
                        value={plan.nombre}
                        style={{ backgroundColor: '#1a1a1a', color: 'white' }}
                      >
                        {plan.nombre.charAt(0).toUpperCase() + plan.nombre.slice(1)} - S/ {plan.precio.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Monto Pagado *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    name="montoPagado"
                    value={formData.montoPagado}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                    placeholder="120.00"
                  />
                </div>
                {formData.plan && (() => {
                  const planSeleccionado = planes.find(p => p.nombre === formData.plan);
                  if (planSeleccionado) {
                    const deuda = planSeleccionado.precio - formData.montoPagado;
                    if (deuda > 0) {
                      return (
                        <p className="text-sm text-yellow-400 mt-2 font-semibold">
                          ⚠️ Deuda pendiente: S/ {deuda.toFixed(2)}
                        </p>
                      );
                    } else if (deuda < 0) {
                      return (
                        <p className="text-sm text-green-400 mt-2">
                          ✓ Pago completo (sobra: S/ {Math.abs(deuda).toFixed(2)})
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-sm text-green-400 mt-2">
                          ✓ Pago completo
                        </p>
                      );
                    }
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Método de Pago *</label>
                <select
                  name="metodoPago"
                  value={formData.metodoPago}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-[#AB8745]/20 rounded-lg text-white focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all appearance-none"
                >
                  <option value="efectivo" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>💵 Efectivo</option>
                  <option value="yape" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>📱 Yape</option>
                  <option value="transferencia" style={{ backgroundColor: '#1a1a1a', color: 'white' }}>🏦 Transferencia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de Inicio *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="date"
                    name="fechaInicio"
                    value={formData.fechaInicio}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Foto de Perfil */}
          {activeStep === 'foto' && (
            <div className="space-y-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
                  ? 'border-[#AB8745] bg-[#AB8745]/10'
                  : 'border-[#AB8745]/30 bg-white/5 hover:border-[#AB8745]/50'
                  }`}
              >
                {preview ? (
                  <div className="space-y-4">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-32 h-32 rounded-full mx-auto object-cover border-2 border-[#AB8745]/30"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview(null);
                        setFormData(prev => ({ ...prev, foto: null }));
                      }}
                      className="text-sm text-[#D4A865] hover:text-[#E0BA85]"
                    >
                      Cambiar foto
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto bg-[#AB8745]/20 rounded-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-[#D4A865]" />
                    </div>
                    <div>
                      <p className="text-gray-300 font-medium">Arrastra una imagen aquí</p>
                      <p className="text-sm text-gray-500 mt-1">o</p>
                      <label className="inline-block mt-2 px-4 py-2 bg-[#AB8745] hover:bg-[#8B6935] text-white rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-4 h-4 inline mr-2" />
                        Seleccionar archivo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG hasta 5MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-[#AB8745]/20">
            {activeStep !== 'personal' && (
              <button
                type="button"
                onClick={() => {
                  if (activeStep === 'foto') setActiveStep('plan');
                  else if (activeStep === 'plan') setActiveStep('personal');
                }}
                className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all border border-[#AB8745]/20"
              >
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all border border-[#AB8745]/20"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20"
            >
              {activeStep === 'foto' ? 'Registrar Socio' : 'Siguiente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

