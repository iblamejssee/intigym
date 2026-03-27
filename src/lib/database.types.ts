export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            clientes: {
                Row: {
                    id: string
                    dni: string | null
                    nombres: string | null
                    apellidos: string | null
                    telefono: string | null
                    email: string | null
                    fecha_nacimiento: string | null
                    huella_digital_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    dni?: string | null
                    nombres?: string | null
                    apellidos?: string | null
                    telefono?: string | null
                    email?: string | null
                    fecha_nacimiento?: string | null
                    huella_digital_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    dni?: string
                    nombres?: string
                    apellidos?: string
                    telefono?: string | null
                    email?: string | null
                    fecha_nacimiento?: string | null
                    huella_digital_id?: string | null
                    created_at?: string
                }
            }
            planes: {
                Row: {
                    id: number
                    nombre: string
                    descripcion: string | null
                    duracion_dias: number
                    precio_base: number
                }
                Insert: {
                    id?: number
                    nombre: string
                    descripcion?: string | null
                    duracion_dias: number
                    precio_base: number
                }
                Update: {
                    id?: number
                    nombre?: string
                    descripcion?: string | null
                    duracion_dias?: number
                    precio_base?: number
                }
            }
            matriculas: {
                Row: {
                    id: string
                    cliente_id: string
                    plan_id: number
                    fecha_inicio: string
                    fecha_vencimiento: string
                    monto_total: number
                    estado: 'activo' | 'vencido' | 'congelado' | 'cancelado'
                    observaciones: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    cliente_id: string
                    plan_id: number
                    fecha_inicio?: string
                    fecha_vencimiento: string
                    monto_total: number
                    estado?: 'activo' | 'vencido' | 'congelado' | 'cancelado'
                    observaciones?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    cliente_id?: string
                    plan_id?: number
                    fecha_inicio?: string
                    fecha_vencimiento?: string
                    monto_total?: number
                    estado?: 'activo' | 'vencido' | 'congelado' | 'cancelado'
                    observaciones?: string | null
                    created_at?: string
                }
            }
            pagos: {
                Row: {
                    id: string
                    matricula_id: string
                    monto_pagado: number
                    metodo_pago: 'efectivo' | 'yape' | 'plin' | 'transferencia' | null
                    nro_operacion: string | null
                    fecha_pago: string
                }
                Insert: {
                    id?: string
                    matricula_id: string
                    monto_pagado: number
                    metodo_pago?: 'efectivo' | 'yape' | 'plin' | 'transferencia' | null
                    nro_operacion?: string | null
                    fecha_pago?: string
                }
                Update: {
                    id?: string
                    matricula_id?: string
                    monto_pagado?: number
                    metodo_pago?: 'efectivo' | 'yape' | 'plin' | 'transferencia' | null
                    nro_operacion?: string | null
                    fecha_pago?: string
                }
            }
            asistencias: {
                Row: {
                    id: string
                    cliente_id: string
                    fecha_hora: string
                }
                Insert: {
                    id?: string
                    cliente_id: string
                    fecha_hora?: string
                }
                Update: {
                    id?: string
                    cliente_id?: string
                    fecha_hora?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
