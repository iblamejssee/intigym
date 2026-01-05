/**
 * Calcula los días hasta la fecha de vencimiento
 * @param fechaVencimiento - Fecha de vencimiento de la membresía
 * @returns Número de días hasta el vencimiento (negativo si ya venció)
 */
export function getDaysUntilExpiration(fechaVencimiento: Date | string): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const vencimiento = new Date(fechaVencimiento);
    vencimiento.setHours(0, 0, 0, 0);

    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * Verifica si una membresía está próxima a vencer
 * @param fechaVencimiento - Fecha de vencimiento
 * @param days - Días de anticipación para la alerta (default: 5)
 * @returns true si está próximo a vencer
 */
export function isExpiringSoon(fechaVencimiento: Date | string, days: number = 5): boolean {
    const daysUntil = getDaysUntilExpiration(fechaVencimiento);
    return daysUntil > 0 && daysUntil <= days;
}

/**
 * Genera un enlace de WhatsApp con mensaje personalizado
 * @param telefono - Número de teléfono del cliente
 * @param nombre - Nombre del cliente
 * @param fechaVencimiento - Fecha de vencimiento
 * @returns URL de WhatsApp con mensaje pre-configurado
 */
export function generateWhatsAppLink(
    telefono: string,
    nombre: string,
    fechaVencimiento: string
): string {
    if (!telefono) return '';

    // Limpiar el número de teléfono (quitar espacios, guiones, etc.)
    let phone = telefono.replace(/\D/g, '');

    // Agregar código de país de Perú si no lo tiene
    if (!phone.startsWith('51') && phone.length === 9) {
        phone = '51' + phone;
    }

    // Formatear fecha
    const fecha = new Date(fechaVencimiento);
    const fechaFormateada = fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    // Mensaje personalizado
    const mensaje = `Hola ${nombre}, te recordamos que tu membresía en Inti-Gym vence el ${fechaFormateada}. ¡No olvides renovar para seguir entrenando! 💪`;

    // Codificar mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);

    return `https://wa.me/${phone}?text=${mensajeCodificado}`;
}

/**
 * Obtiene el color de alerta según los días restantes
 * @param dias - Días hasta el vencimiento
 * @returns Objeto con colores para el diseño
 */
export function getExpirationAlertColor(dias: number): {
    bg: string;
    border: string;
    text: string;
    badge: string;
} {
    if (dias <= 2) {
        // Urgente - Rojo
        return {
            bg: 'bg-gradient-to-br from-red-500/20 to-red-600/10',
            border: 'border-red-500/40',
            text: 'text-red-400',
            badge: 'bg-red-500'
        };
    } else if (dias <= 5) {
        // Advertencia - Naranja
        return {
            bg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10',
            border: 'border-orange-500/40',
            text: 'text-orange-400',
            badge: 'bg-orange-500'
        };
    }

    // Normal
    return {
        bg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10',
        border: 'border-yellow-500/40',
        text: 'text-yellow-400',
        badge: 'bg-yellow-500'
    };
}
