'use client';

import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memberName: string;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, memberName }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#AB8745]/30 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-300">
        <div className="p-6">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 bg-[#AB8745]/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[#CB9755]" />
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">¿Eliminar Socio?</h3>
            <p className="text-gray-400">
              Estás a punto de eliminar a <span className="font-semibold text-white">{memberName}</span>.
              Esta acción no se puede deshacer.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all border border-[#AB8745]/20"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#AB8745] to-[#8B6935] hover:from-[#8B6935] hover:to-red-800 text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#AB8745]/20"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

