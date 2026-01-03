'use client';

import { User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface MemberCardProps {
  member: {
    id: number;
    nombre: string;
    dni: string;
    plan: string;
    estado: 'al-dia' | 'vencido';
    foto?: string;
  };
}

export default function MemberCard({ member }: MemberCardProps) {
  // El QR code se genera basado en el DNI
  const qrValue = member.dni;

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl p-6 shadow-2xl">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Foto de Perfil */}
        <div className="flex-shrink-0">
          <div className="w-32 h-32 rounded-full bg-[#AB8745]/20 border-2 border-[#AB8745]/30 flex items-center justify-center overflow-hidden">
            {member.foto ? (
              <img src={member.foto} alt={member.nombre} className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-[#D4A865]" />
            )}
          </div>
        </div>

        {/* Información */}
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white mb-2">{member.nombre}</h3>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">DNI:</span>
              <span className="text-sm text-gray-300">{member.dni}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Plan:</span>
              <span className="text-sm text-gray-300 capitalize">{member.plan}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Estado:</span>
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                  member.estado === 'al-dia'
                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                    : 'bg-[#AB8745]/20 text-[#D4A865] border border-[#AB8745]/30'
                }`}
              >
                {member.estado === 'al-dia' ? 'Al Día' : 'Vencido'}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex-shrink-0">
          <div className="bg-white p-4 rounded-lg border border-[#AB8745]/20">
            <div className="w-32 h-32 flex items-center justify-center">
              <QRCodeSVG
                value={qrValue}
                size={128}
                level="H"
                includeMargin={false}
                fgColor="#AB8745"
                bgColor="#ffffff"
              />
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">DNI: {member.dni}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
