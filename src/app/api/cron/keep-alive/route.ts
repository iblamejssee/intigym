import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    // 1. Intentamos todo dentro de un bloque try para capturar cualquier falla
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        // Verificación de seguridad para tu laptop y Vercel
        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json(
                { error: "Faltan las llaves en el .env.local" },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 2. Consulta a la tabla 'clientes' que confirmaste que existe
        const { error } = await supabase
            .from('clientes')
            .select('id')
            .limit(1);

        if (error) {
            // Si Supabase responde con error, igual devolvemos un NextResponse
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 200 } // Usamos 200 para que Vercel no piense que el sistema crasheó
            );
        }

        // 3. ¡Éxito total!
        return NextResponse.json({
            success: true,
            message: "Supabase despertado correctamente"
        });

    } catch (err: any) {
        // 4. Si algo explota catastróficamente, también devolvemos respuesta
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}