import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // 1. EXTRAER LA API KEY DEL HEADER
        const authHeader = request.headers.get('authorization');

        // 2. VALIDAR: ¿Viene la llave y coincide con nuestro secreto?
        // Vercel envía automáticamente el secreto en este formato: "Bearer TU_SECRETO"
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json(
                { error: "No autorizado. Acceso denegado." },
                { status: 401 } // Error 401: Unauthorized
            );
        }

        // --- Si pasa el filtro, procedemos con Supabase ---
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: "Faltan variables" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { error } = await supabase.from('clientes').select('id').limit(1);

        if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

        return NextResponse.json({ success: true, message: "Base de datos protegida y despierta" });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}