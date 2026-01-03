'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Settings, Building2, DollarSign, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Plan {
  id?: number;
  nombre: string;
  precio: number;
  isNew?: boolean;
}

export default function ConfiguracionPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlanes();
  }, []);

  const loadPlanes = async () => {
    try {
      setLoading(true);

      // Cargar planes desde la base de datos
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .like('clave', 'precio_%')
        .order('clave');

      if (error) {
        console.error('Error al cargar planes:', error);
        // Si no existen, usar valores por defecto
        setPlanes([
          { nombre: 'mensual', precio: 120 },
          { nombre: 'trimestral', precio: 300 },
          { nombre: 'anual', precio: 1000 },
        ]);
        return;
      }

      if (data && data.length > 0) {
        const planesData = data.map(item => ({
          id: item.id,
          nombre: item.clave.replace('precio_', ''),
          precio: parseFloat(item.valor),
        }));
        setPlanes(planesData);
      } else {
        // Valores por defecto si no hay datos
        setPlanes([
          { nombre: 'mensual', precio: 120 },
          { nombre: 'trimestral', precio: 300 },
          { nombre: 'anual', precio: 1000 },
        ]);
      }
    } catch (error) {
      console.error('Error inesperado:', error);
      toast.error('Error al cargar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlan = () => {
    setPlanes([...planes, { nombre: '', precio: 0, isNew: true }]);
  };

  const handleRemovePlan = (index: number) => {
    const newPlanes = planes.filter((_, i) => i !== index);
    setPlanes(newPlanes);
  };

  const handlePlanChange = (index: number, field: 'nombre' | 'precio', value: string | number) => {
    const newPlanes = [...planes];
    if (field === 'nombre') {
      newPlanes[index].nombre = (value as string).toLowerCase().replace(/\s+/g, '_');
    } else {
      newPlanes[index].precio = parseFloat(value as string) || 0;
    }
    setPlanes(newPlanes);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validar que todos los planes tengan nombre y precio
      const planesValidos = planes.filter(p => p.nombre && p.precio > 0);
      if (planesValidos.length === 0) {
        toast.warning('Agrega al menos un plan válido');
        return;
      }

      // Eliminar todos los planes existentes
      await supabase
        .from('configuracion')
        .delete()
        .like('clave', 'precio_%');

      // Insertar los nuevos planes
      const planesParaGuardar = planesValidos.map(plan => ({
        clave: `precio_${plan.nombre}`,
        valor: plan.precio.toString(),
        descripcion: `Precio del plan ${plan.nombre}`,
      }));

      const { error } = await supabase
        .from('configuracion')
        .insert(planesParaGuardar);

      if (error) {
        console.error('Error al guardar:', error);
        toast.error('Error al guardar cambios');
        return;
      }

      toast.success('Cambios guardados exitosamente');
      // Recargar planes
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
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Configuración</h2>
            <p className="text-gray-400">Ajustes y preferencias del sistema</p>
          </div>

          {/* Configuración Cards */}
          <div className="space-y-6">
            {/* Información del Gimnasio */}
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30">
                  <Building2 className="w-6 h-6 text-[#D4A865]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Información del Gimnasio</h3>
                  <p className="text-sm text-gray-400">Datos generales de Inti-Gym Ayacucho</p>
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
            <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#AB8745]/20 rounded-xl flex items-center justify-center border border-[#AB8745]/30">
                    <DollarSign className="w-6 h-6 text-[#D4A865]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Planes y Precios</h3>
                    <p className="text-sm text-gray-400">Configuración de membresías</p>
                  </div>
                </div>
                <button
                  onClick={handleAddPlan}
                  disabled={loading}
                  className="px-4 py-2 bg-[#AB8745]/20 hover:bg-[#AB8745]/30 border border-[#AB8745]/30 rounded-lg text-[#D4A865] font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
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
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Nombre del Plan
                        </label>
                        <input
                          type="text"
                          value={plan.nombre}
                          onChange={(e) => handlePlanChange(index, 'nombre', e.target.value)}
                          placeholder="Ej: mensual, trimestral, anual"
                          className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all capitalize"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Precio (S/)
                        </label>
                        <input
                          type="number"
                          value={plan.precio}
                          onChange={(e) => handlePlanChange(index, 'precio', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2.5 bg-white/5 border border-[#AB8745]/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#AB8745] focus:ring-2 focus:ring-[#AB8745]/20 transition-all"
                        />
                      </div>
                      <button
                        onClick={() => handleRemovePlan(index)}
                        className="p-2.5 text-[#CB9755] hover:text-[#D4A865] hover:bg-[#AB8745]/10 rounded-lg transition-all"
                        title="Eliminar plan"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
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
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-6 py-3 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
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
