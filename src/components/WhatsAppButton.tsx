'use client';

import { MessageCircle } from 'lucide-react';
import { generateWhatsAppLink } from '@/lib/utils';

interface WhatsAppButtonProps {
    telefono: string;
    nombre: string;
    fechaVencimiento: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'icon' | 'full';
}

export default function WhatsAppButton({
    telefono,
    nombre,
    fechaVencimiento,
    size = 'md',
    variant = 'icon'
}: WhatsAppButtonProps) {
    const handleClick = () => {
        if (!telefono) return;

        const link = generateWhatsAppLink(telefono, nombre, fechaVencimiento);
        if (link) {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base'
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    if (!telefono) {
        return (
            <div className="relative group">
                <button
                    disabled
                    className={`${sizeClasses[size]} bg-gray-700/50 text-gray-500 rounded-lg flex items-center justify-center cursor-not-allowed opacity-50`}
                >
                    <MessageCircle className={iconSizes[size]} />
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Sin teléfono
                </div>
            </div>
        );
    }

    if (variant === 'full') {
        return (
            <button
                onClick={handleClick}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg shadow-green-500/20"
            >
                <MessageCircle className="w-5 h-5" />
                Enviar Recordatorio
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={`${sizeClasses[size]} bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg shadow-green-500/20 group relative`}
            title="Enviar recordatorio por WhatsApp"
        >
            <MessageCircle className={iconSizes[size]} />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                WhatsApp
            </div>
        </button>
    );
}
