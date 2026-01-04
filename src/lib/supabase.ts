import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL o Anon Key no están configuradas. Asegúrate de agregar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la tabla de clientes
export interface ClienteDB {
  id: number;
  nombre: string;
  dni: string;
  telefono?: string;
  email?: string;
  fecha_nacimiento?: string;
  plan: string;
  fecha_inicio?: string;
  fecha_vencimiento?: string;
  estado_pago: 'al-dia' | 'vencido';
  foto_url?: string;
  monto_pagado?: number;
  created_at?: string;
  updated_at?: string;
}

// Función para cargar precios de planes desde la configuración
export async function cargarPreciosPlanes(): Promise<Record<string, number>> {
  const { data: configData } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .like('clave', 'precio_%');

  const precios: Record<string, number> = {};
  if (configData) {
    configData.forEach(config => {
      const planName = config.clave.replace('precio_', '');
      precios[planName] = parseFloat(config.valor);
    });
  }

  return precios;
}

// Función para calcular fecha de vencimiento basada en plan y fecha_inicio
export function calcularFechaVencimiento(plan: string, fechaInicio: string): string {
  if (!fechaInicio) return '';

  const inicio = new Date(fechaInicio);
  let meses = 0;

  switch (plan) {
    case 'mensual':
      meses = 1;
      break;
    case 'trimestral':
      meses = 3;
      break;
    case 'anual':
      meses = 12;
      break;
    default:
      return '';
  }

  const vencimiento = new Date(inicio);
  vencimiento.setMonth(vencimiento.getMonth() + meses);

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

// Función para actualizar estado de pago basado en fecha_vencimiento
export async function actualizarEstadosPago() {
  const hoy = new Date().toISOString().split('T')[0];

  // Actualizar clientes vencidos
  const { error: errorVencidos } = await supabase
    .from('clientes')
    .update({ estado_pago: 'vencido' })
    .lt('fecha_vencimiento', hoy)
    .neq('estado_pago', 'vencido');

  if (errorVencidos) {
    console.error('Error al actualizar estados vencidos:', errorVencidos);
  }

  // Actualizar clientes al día (que no estén vencidos)
  const { error: errorAlDia } = await supabase
    .from('clientes')
    .update({ estado_pago: 'al-dia' })
    .gte('fecha_vencimiento', hoy)
    .neq('estado_pago', 'al-dia');

  if (errorAlDia) {
    console.error('Error al actualizar estados al día:', errorAlDia);
  }
}
