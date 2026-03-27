'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Settings, Building2, DollarSign, Save, Plus, Trash2, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Plan {
  id?: number;
  nombre: string;
  precio_base: number;
  duracion_dias: number;
  isNew?: boolean;
}

export default function ConfiguracionPage() {
  const [planes, setPlanes] = useState<any[]>([]);
  const [originalPlanIds, setOriginalPlanIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlanes();
  }, []);

  const loadPlanes = async () => {
    try {
      setLoading(true);

      // Cargar planes desde la tabla 'planes'
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error al cargar planes:', error);
        // Si no existen, usar valores por defecto
        const defaultPlanes = [
          { nombre: '1 Mes', precio_base: 60, duracion_dias: 30 },
          { nombre: '3 Meses', precio_base: 140, duracion_dias: 90 },
          { nombre: 'Interdiario', precio_base: 40, duracion_dias: 30 },
        ];
        setPlanes(defaultPlanes);
        return;
      }

      if (data && data.length > 0) {
        setPlanes(data);
        setOriginalPlanIds(data.map(p => p.id as number));
      } else {
        // Valores por defecto si no hay datos
        const defaultPlanes = [
          { nombre: '1 Mes', precio_base: 60, duracion_dias: 30 },
          { nombre: '3 Meses', precio_base: 140, duracion_dias: 90 },
          { nombre: 'Interdiario', precio_base: 40, duracion_dias: 30 },
        ];
        setPlanes(defaultPlanes);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = () => {
    setPlanes([...planes, { nombre: '', precio_base: 0, duracion_dias: 30, isNew: true }]);
  };

  const handleRemovePlan = (index: number) => {
    const newPlanes = planes.filter((_, i) => i !== index);
    setPlanes(newPlanes);
  };

  const handlePlanChange = (index: number, field: keyof Plan, value: string | number) => {
    const newPlanes = [...planes];
    if (field === 'nombre') {
      newPlanes[index].nombre = value as string;
    } else if (field === 'precio_base') {
      newPlanes[index].precio_base = parseFloat(value as string) || 0;
    } else if (field === 'duracion_dias') {
      newPlanes[index].duracion_dias = parseInt(value as string) || 0;
    }
    setPlanes(newPlanes);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validar que todos los planes tengan nombre, precio y duración
      const planesValidos = planes.filter(p => p.nombre && p.precio_base >= 0 && p.duracion_dias > 0);
      if (planesValidos.length === 0) {
        toast.warning('Agrega al menos un plan válido');
        setSaving(false);
        return;
      }

      // 1. Identificar planes para eliminar
      const currentIds = planesValidos.filter(p => p.id).map(p => p.id as number);
      const idsToDelete = originalPlanIds.filter(id => !currentIds.includes(id));

      if (idsToDelete.length > 0) {
        // Verificar si los planes a eliminar están en uso en matriculas
        const { count, error: countError } = await supabase
          .from('matriculas')
          .select('*', { count: 'exact', head: true })
          .in('plan_id', idsToDelete);

        if (count && count > 0) {
          toast.error('No se pueden eliminar planes que tienen socios activos');
          setSaving(false);
          return;
        }

        const { error: deleteError } = await supabase
          .from('planes')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('Error al eliminar planes:', deleteError);
          toast.error('Error al eliminar planes antiguos');
          setSaving(false);
          return;
        }
      }

      // 2. Guardar (Upsert) los planes actuales
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const planesParaGuardar = planesValidos.map(({ isNew, ...rest }) => ({
        ...rest,
        descripcion: rest.nombre // Guardamos el nombre como descripción por defecto
      }));

      const { error: upsertError } = await supabase
        .from('planes')
        .upsert(planesParaGuardar as any);

      if (upsertError) {
        console.error('Error al guardar planes:', upsertError);
        toast.error('Error al guardar cambios');
        setSaving(false);
        return;
      }

      toast.success('Configuración de planes actualizada');
      await loadPlanes();
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error inesperado al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-4 md:p-8">
          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Configuración</h2>
            <p className="text-gray-400 text-sm md:text-base">Ajustes y preferencias del sistema</p>
          </div>

          {/* Configuración Cards */}
          <div className="space-y-6">
            {/* Información del Gimnasio */}
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-5 md:p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30">
                  <Building2 className="w-5 h-5 md:w-6 md:h-6 text-[#D4A865]" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white">Información del Gimnasio</h3>
                  <p className="text-[10px] md:text-sm text-gray-400">Datos generales de Inti-Gym Ayacucho</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Gimnasio</label>
                  <input
                    type="text"
                    defaultValue="Inti-Gym Ayacucho"
                    className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Dirección</label>
                  <input
                    type="text"
                    defaultValue="Ayacucho, Perú"
                    className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono</label>
                  <input
                    type="text"
                    defaultValue="+51 999 999 999"
                    className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Planes y Precios */}
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-5 md:p-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30">
                    <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-[#D4A865]" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-white">Planes y Precios</h3>
                    <p className="text-[10px] md:text-sm text-gray-400">Configuración de membresías actuales</p>
                  </div>
                </div>
                <button
                  onClick={handleAddPlan}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-3 bg-[#AB8745]/20 hover:bg-[#AB8745]/30 border border-[#AB8745]/30 rounded-xl text-[#D4A865] font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Plan
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-[#D4A865] animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {planes.map((plan, index) => (
                    <div key={index} className="flex flex-col gap-4 bg-white/5 p-5 rounded-2xl border border-white/5 relative group">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-[2] w-full">
                          <label className="block text-[10px] md:text-sm font-black text-gray-500 uppercase tracking-widest mb-2">
                            Nombre del Plan
                          </label>
                          <input
                            type="text"
                            value={plan.nombre}
                            onChange={(e) => handlePlanChange(index, 'nombre', e.target.value)}
                            placeholder="Ej: Mensual, Trimestral"
                            className="w-full px-4 py-3 bg-white/5 border border-[#AB8745]/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] transition-all font-bold"
                          />
                        </div>
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] md:text-sm font-black text-gray-500 uppercase tracking-widest mb-2">
                            Precio (S/)
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AB8745]" />
                            <input
                              type="number"
                              value={plan.precio_base}
                              onChange={(e) => handlePlanChange(index, 'precio_base', e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-[#AB8745]/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] transition-all font-bold"
                            />
                          </div>
                        </div>
                        <div className="flex-1 w-full relative">
                          <label className="block text-[10px] md:text-sm font-black text-gray-500 uppercase tracking-widest mb-2">
                            Duración (Días)
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AB8745]" />
                              <input
                                type="number"
                                value={plan.duracion_dias}
                                onChange={(e) => handlePlanChange(index, 'duracion_dias', e.target.value)}
                                placeholder="30"
                                min="1"
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-[#AB8745]/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] transition-all font-bold"
                              />
                            </div>
                            <button
                              onClick={() => handleRemovePlan(index)}
                              className="p-3 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl transition-all"
                              title="Eliminar plan"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {planes.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      No hay planes configurados. Haz clic en "Añadir Plan" para crear uno.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Botón Guardar */}
            <div className="flex justify-center md:justify-end pb-10">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="w-full md:w-auto px-10 py-4 bg-linear-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-[#AB8745]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-6 h-6" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
