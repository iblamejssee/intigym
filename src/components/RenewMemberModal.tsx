'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, CreditCard, CheckCircle } from 'lucide-react';
import { supabase, calcularFechaVencimiento } from '@/lib/supabase';
import { toast } from 'sonner';

interface RenewMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: RenewalFormData) => void;
    memberData: {
        id: number;
        nombre: string;
        dni: string;
        planActual: string;
        fechaVencimiento: string;
    } | null;
}

export interface RenewalFormData {
    plan: string;
    fechaInicio: string;
    montoPagado: number;
    metodoPago: string;
    fechaVencimiento: string;
}

interface PlanOption {
    nombre: string;
    precio: number;
}

export default function RenewMemberModal({ isOpen, onClose, onSubmit, memberData }: RenewMemberModalProps) {
    const [formData, setFormData] = useState<RenewalFormData>({
        plan: '',
        fechaInicio: new Date().toISOString().split('T')[0],
        montoPagado: 0,
        metodoPago: 'efectivo',
        fechaVencimiento: '',
    });
    const [planes, setPlanes] = useState<PlanOption[]>([]);
    const [loading, setLoading] = useState(false);

    // Cargar planes
    useEffect(() => {
        if (isOpen) {
            loadPlanes();
            // Reset form or set defaults if needed
            setFormData(prev => ({
                ...prev,
                fechaInicio: new Date().toISOString().split('T')[0],
            }));
        }
    }, [isOpen]);

    // Si cambia el plan o la fecha de inicio, recalcular vencimiento
    useEffect(() => {
        if (formData.plan && formData.fechaInicio) {
            const fechaVenc = calcularFechaVencimiento(formData.plan, formData.fechaInicio);
            setFormData(prev => ({ ...prev, fechaVencimiento: fechaVenc }));
        }
    }, [formData.plan, formData.fechaInicio]);

    // Pre-seleccionar el plan actual del miembro si existe en la lista
    useEffect(() => {
        if (memberData && planes.length > 0 && !formData.plan) {
            const currentPlan = planes.find(p => p.nombre === memberData.planActual);
            if (currentPlan) {
                setFormData(prev => ({
                    ...prev,
                    plan: currentPlan.nombre,
                    montoPagado: currentPlan.precio
                }));
            }
        }
    }, [memberData, planes, formData.plan]);

    const loadPlanes = async () => {
        try {
            const { data, error } = await supabase
                .from('configuracion')
                .select('clave, valor')
                .like('clave', 'precio_%')
                .order('valor');

            if (error) throw error;

            if (data) {
                const planesData = data.map(item => ({
                    nombre: item.clave.replace('precio_', ''),
                    precio: parseFloat(item.valor),
                }));
                setPlanes(planesData);
            }
        } catch (error) {
            console.error('Error al cargar planes:', error);
            toast.error('Error al cargar planes');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.plan || !formData.montoPagado || !formData.fechaInicio) {
            toast.error('Por favor completa los campos requeridos');
            return;
        }
        onSubmit(formData);
    };

    if (!isOpen || !memberData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-[#AB8745]/30 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#AB8745]/20 bg-gradient-to-r from-[#AB8745]/10 to-transparent">
                    <div>
                        <h2 className="text-xl font-bold text-white">Renovar Membresía</h2>
                        <p className="text-sm text-[#AB8745] font-medium">{memberData.nombre}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        {/* Plan Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Selecciona el Plan</label>
                            <div className="grid grid-cols-2 gap-3">
                                {planes.map((plan) => (
                                    <button
                                        key={plan.nombre}
                                        type="button"
                                        onClick={() => {
                                            setFormData(prev => ({
                                                ...prev,
                                                plan: plan.nombre,
                                                montoPagado: plan.precio
                                            }));
                                        }}
                                        className={`p-3 rounded-xl border transition-all text-left relative overflow-hidden group ${formData.plan === plan.nombre
                                                ? 'border-[#AB8745] bg-[#AB8745]/20 text-white shadow-[0_0_15px_rgba(171,135,69,0.3)]'
                                                : 'border-white/10 bg-white/5 text-gray-400 hover:border-[#AB8745]/50 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="font-semibold capitalize text-lg">{plan.nombre}</div>
                                        <div className="text-sm opacity-80 mt-1">S/ {plan.precio}</div>
                                        {formData.plan === plan.nombre && (
                                            <div className="absolute top-2 right-2 text-[#AB8745]">
                                                <CheckCircle className="w-4 h-4 fill-[#AB8745] text-black" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fecha Inicio & Vencimiento */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Fecha de Inicio</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="date"
                                        name="fechaInicio"
                                        value={formData.fechaInicio}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#AB8745] focus:ring-1 focus:ring-[#AB8745]"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Nuevo Vencimiento</label>
                                <div className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-gray-400 flex items-center justify-between cursor-not-allowed opacity-80">
                                    <span>{formData.fechaVencimiento || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Monto y Método */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Monto a Pagar</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <input
                                        type="number"
                                        name="montoPagado"
                                        value={formData.montoPagado}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#AB8745] focus:ring-1 focus:ring-[#AB8745]"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Método de Pago</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                                    <select
                                        name="metodoPago"
                                        value={formData.metodoPago}
                                        onChange={handleChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#AB8745] focus:ring-1 focus:ring-[#AB8745] appearance-none"
                                    >
                                        <option value="efectivo">Efectivo</option>
                                        <option value="yape">Yape</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all duration-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!formData.plan}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#AB8745] to-[#D4A865] hover:from-[#8B6935] hover:to-[#B68A45] text-white rounded-xl font-bold shadow-lg shadow-[#AB8745]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            Renovar Membresía
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
