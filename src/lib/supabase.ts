import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL o Anon Key no están configuradas. Asegúrate de agregar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Tipos extraídos de la base de datos
export type ClienteDB = Database['public']['Tables']['clientes']['Row'];
export type PlanDB = Database['public']['Tables']['planes']['Row'];
export type MatriculaDB = Database['public']['Tables']['matriculas']['Row'];
export type PagoDB = Database['public']['Tables']['pagos']['Row'];
export type AsistenciaDB = Database['public']['Tables']['asistencias']['Row'];

// Función para calcular fecha de vencimiento basada en duración en días
export function calcularFechaVencimiento(duracionDias: number, fechaInicio: string): string {
  if (!fechaInicio) return '';

  const inicio = new Date(fechaInicio);
  const vencimiento = new Date(inicio);
  vencimiento.setDate(vencimiento.getDate() + duracionDias);

  return vencimiento.toISOString().split('T')[0];
}

// Función para verificar si un cliente está vencido
export function estaVencido(fechaVencimiento?: string): boolean {
  if (!fechaVencimiento) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  return vencimiento < hoy;
}

// Función para actualizar estado de matrículas basado en fecha_vencimiento
export async function actualizarEstadosMatriculas() {
  const hoy = new Date().toISOString().split('T')[0];

  // Actualizar matrículas vencidas
  const { error: errorVencidos } = await supabase
    .from('matriculas')
    .update({ estado: 'vencido' as const })
    .lt('fecha_vencimiento', hoy)
    .neq('estado', 'vencido' as const)
    .neq('estado', 'congelado' as const)
    .neq('estado', 'cancelado' as const);

  if (errorVencidos) {
    console.error('Error al actualizar estados vencidos:', errorVencidos);
  }

  // Actualizar matrículas activas (que no estén vencidas)
  const { error: errorActivos } = await supabase
    .from('matriculas')
    .update({ estado: 'activo' as const })
    .gte('fecha_vencimiento', hoy)
    .eq('estado', 'vencido' as const);


  if (errorActivos) {
    console.error('Error al actualizar estados activos:', errorActivos);
  }
}

