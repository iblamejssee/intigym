'use client';

import { X, Download, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRef } from 'react';
import { toast } from 'sonner';

interface QRViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  nombre: string;
  dni: string;
  telefono?: string;
  plan?: string;
}

export default function QRViewModal({ isOpen, onClose, nombre, dni, telefono, plan }: QRViewModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) {
      toast.error('Error al generar QR');
      return;
    }

    try {
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
        link.download = `QR_${nombre.replace(/\s+/g, '_')}_${dni}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        toast.success('QR descargado exitosamente');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (error) {
      console.error('Error al descargar QR:', error);
      toast.error('Error al descargar QR');
    }
  };

  const handleSendWhatsApp = () => {
    if (!telefono) {
      toast.error('No hay número de teléfono registrado');
      return;
    }

    // Limpiar número de teléfono
    const cleanPhone = telefono.replace(/\D/g, '');

    // Mensaje personalizado
    const message = `¡Hola ${nombre}! 👋\n\n` +
      `Tu código QR de acceso a Inti-Gym Ayacucho:\n\n` +
      `📋 DNI: ${dni}\n` +
      (plan ? `📦 Plan: ${plan.charAt(0).toUpperCase() + plan.slice(1)}\n` : '') +
      `\nPresenta este código al ingresar al gimnasio.\n\n` +
      `¡Nos vemos en el gym! 🏋️‍♂️`;

    // Abrir WhatsApp
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    toast.success('Abriendo WhatsApp...');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#AB8745]/20 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Código QR</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div ref={qrRef} className="bg-white p-6 rounded-lg border border-[#AB8745]/20 mb-4 flex items-center justify-center">
            <QRCodeSVG
              value={dni}
              size={200}
              level="H"
              includeMargin={false}
              fgColor="#AB8745"
              bgColor="#ffffff"
            />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">{nombre}</h4>
          <p className="text-sm text-gray-400">DNI: {dni}</p>
          {plan && <p className="text-sm text-[#AB8745] mt-1">Plan: {plan.charAt(0).toUpperCase() + plan.slice(1)}</p>}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadQR}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-[#AB8745]/20 rounded-lg text-white font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
            <button
              onClick={handleSendWhatsApp}
              disabled={!telefono}
              className="px-4 py-2.5 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-[#AB8745] text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
