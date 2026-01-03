'use client';

import { X, Download, Send, CheckCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useRef } from 'react';
import { toast } from 'sonner';

interface MemberSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberData: {
        nombre: string;
        dni: string;
        telefono?: string;
        plan: string;
    };
}

export default function MemberSuccessModal({ isOpen, onClose, memberData }: MemberSuccessModalProps) {
    const qrRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handleDownloadQR = () => {
        const svg = qrRef.current?.querySelector('svg');
        if (!svg) return;

        // Convertir SVG a canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgData = new XMLSerializer().serializeToString(svg);
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            // Descargar como PNG
            const link = document.createElement('a');
            link.download = `QR_${memberData.nombre.replace(/\s+/g, '_')}_${memberData.dni}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast.success('QR descargado exitosamente');
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handleSendWhatsApp = () => {
        if (!memberData.telefono) {
            toast.error('No hay número de teléfono registrado');
            return;
        }

        // Limpiar número de teléfono (quitar espacios, guiones, etc)
        const cleanPhone = memberData.telefono.replace(/\D/g, '');

        // Mensaje personalizado
        const message = `¡Hola ${memberData.nombre}! 👋\n\n` +
            `Bienvenido a Inti-Gym Ayacucho 💪\n\n` +
            `Tu registro ha sido exitoso:\n` +
            `📋 DNI: ${memberData.dni}\n` +
            `📦 Plan: ${memberData.plan.charAt(0).toUpperCase() + memberData.plan.slice(1)}\n\n` +
            `Tu código QR de acceso es: ${memberData.dni}\n\n` +
            `Presenta este código al ingresar al gimnasio.\n\n` +
            `¡Nos vemos en el gym! 🏋️‍♂️`;

        // Abrir WhatsApp con el mensaje
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');

        toast.success('Abriendo WhatsApp...');
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-[#AB8745]/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-600/20 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">¡Socio Registrado!</h3>
                            <p className="text-sm text-gray-400">Código QR generado</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Member Info */}
                    <div className="bg-white/5 rounded-lg p-4 border border-[#AB8745]/20">
                        <h4 className="text-white font-semibold mb-2">{memberData.nombre}</h4>
                        <div className="space-y-1 text-sm">
                            <p className="text-gray-400">DNI: <span className="text-white">{memberData.dni}</span></p>
                            <p className="text-gray-400">Plan: <span className="text-[#AB8745]">{memberData.plan.charAt(0).toUpperCase() + memberData.plan.slice(1)}</span></p>
                            {memberData.telefono && (
                                <p className="text-gray-400">Teléfono: <span className="text-white">{memberData.telefono}</span></p>
                            )}
                        </div>
                    </div>

                    {/* QR Code */}
                    <div ref={qrRef} className="bg-white p-6 rounded-lg border border-[#AB8745]/20 flex items-center justify-center">
                        <QRCode
                            value={memberData.dni}
                            size={200}
                            level="H"
                            fgColor="#AB8745"
                            bgColor="#ffffff"
                        />
                    </div>

                    <p className="text-center text-sm text-gray-400">
                        Escanea este código para registrar asistencias
                    </p>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleDownloadQR}
                            className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-[#AB8745]/20 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Descargar
                        </button>
                        <button
                            onClick={handleSendWhatsApp}
                            disabled={!memberData.telefono}
                            className="px-4 py-3 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-[#AB8745] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-4 h-4" />
                            WhatsApp
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#AB8745]/20">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all border border-[#AB8745]/20"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
