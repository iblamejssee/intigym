'use client';

import { X, CheckCircle, XCircle, Camera, Search, Keyboard } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase, estaVencido } from '@/lib/supabase';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qrData: string) => void;
}

interface ClienteInfo {
  nombre: string;
  dni: string;
  fecha_vencimiento?: string;
  plan: string;
}

export default function QRScannerModal({ isOpen, onClose, onScan }: QRScannerModalProps) {
  const [scanning, setScanning] = useState(true);
  const [manualDNI, setManualDNI] = useState('');
  const [clienteInfo, setClienteInfo] = useState<ClienteInfo | null>(null);
  const [accessGranted, setAccessGranted] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen && scanning) {
      // Inicializar el scanner
      const scanner = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(onScanSuccess, onScanError);
      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [isOpen, scanning]);

  const onScanSuccess = async (decodedText: string) => {
    console.log('QR Escaneado:', decodedText);

    // Detener el scanner
    if (scannerRef.current) {
      await scannerRef.current.clear();
    }
    setScanning(false);

    // Buscar cliente en Supabase por DNI
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('nombre, dni, fecha_vencimiento, plan')
        .eq('dni', decodedText)
        .single();

      if (error || !data) {
        // Cliente no encontrado
        setAccessGranted(false);
        setClienteInfo({
          nombre: 'NO ENCONTRADO',
          dni: decodedText,
          plan: '',
        });
        return;
      }

      // Cliente encontrado - verificar si está vencido
      const vencido = estaVencido(data.fecha_vencimiento);
      setAccessGranted(!vencido);
      setClienteInfo(data);

      // Notificar al componente padre
      onScan(decodedText);
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      setAccessGranted(false);
      setClienteInfo({
        nombre: 'ERROR',
        dni: decodedText,
        plan: '',
      });
    }
  };

  const handleManualSearch = async () => {
    if (!manualDNI || manualDNI.length !== 8) {
      return;
    }

    // Detener scanner si está activo
    if (scannerRef.current && scanning) {
      await scannerRef.current.clear();
      setScanning(false);
    }

    // Buscar por DNI manual
    await onScanSuccess(manualDNI);
  };

  const onScanError = (errorMessage: string) => {
    // Ignorar errores de escaneo continuo
    if (!errorMessage.includes('NotFoundException')) {
      console.log('Error de escaneo:', errorMessage);
    }
  };

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
    setScanning(true);
    setClienteInfo(null);
    setAccessGranted(null);
    onClose();
  };

  const handleScanAnother = () => {
    setScanning(true);
    setClienteInfo(null);
    setAccessGranted(null);
  };

  if (!isOpen) return null;

  // Pantalla de resultado (ACCESO PERMITIDO / SOCIO VENCIDO)
  if (!scanning && clienteInfo) {
    return (
      <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
        <div className={`w-full max-w-2xl p-12 rounded-3xl text-center ${accessGranted
          ? 'bg-green-600/20 border-4 border-green-500'
          : 'bg-[#AB8745]/20 border-4 border-[#CB9755]'
          }`}>
          {/* Ícono gigante */}
          <div className="mb-8">
            {accessGranted ? (
              <CheckCircle className="w-32 h-32 text-green-500 mx-auto animate-bounce" />
            ) : (
              <XCircle className="w-32 h-32 text-[#CB9755] mx-auto animate-pulse" />
            )}
          </div>

          {/* Mensaje principal */}
          <h1 className={`text-6xl font-black mb-6 ${accessGranted ? 'text-green-400' : 'text-[#D4A865]'
            }`}>
            {accessGranted ? '✓ ACCESO PERMITIDO' : '✗ SOCIO VENCIDO'}
          </h1>

          {/* Información del socio */}
          <div className="mb-8 space-y-2">
            <p className="text-3xl font-bold text-white">{clienteInfo.nombre}</p>
            <p className="text-xl text-gray-300">DNI: {clienteInfo.dni}</p>
            {clienteInfo.plan && (
              <p className="text-lg text-gray-400 capitalize">Plan: {clienteInfo.plan}</p>
            )}
            {clienteInfo.fecha_vencimiento && (
              <p className="text-lg text-gray-400">
                Vence: {new Date(clienteInfo.fecha_vencimiento).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleScanAnother}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-lg transition-all border-2 border-white/30"
            >
              Escanear Otro
            </button>
            <button
              onClick={handleClose}
              className="px-8 py-4 bg-white text-black hover:bg-gray-200 rounded-xl font-bold text-lg transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de escaneo
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#AB8745]/20 rounded-2xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-[#AB8745]/20 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-white">Escanear QR</h3>
            <p className="text-sm text-gray-400 mt-1">Apunta la cámara al código QR del socio</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera View */}
        <div className="p-6">
          <div id="qr-reader" className="w-full rounded-xl overflow-hidden"></div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-[#AB8745]/20">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-[#D4A865]" />
              <p className="text-sm text-gray-400">
                Mantén el código QR dentro del marco para escanearlo automáticamente
              </p>
            </div>
          </div>

          {/* Cancel Button */}
          <div className="mt-6">
            <button
              onClick={handleClose}
              className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-semibold transition-all border border-[#AB8745]/20"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
