import { useEffect, useRef, useState, useId } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, AlertTriangle } from 'lucide-react';

export default function QrScannerModal({ label, onResult, onClose }) {
  const rawId = useId();
  const scannerElementId = `nebeng-qr-reader-${rawId.replace(/:/g, '')}`;
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let isUnmounted = false;
    const html5Qrcode = new Html5Qrcode(scannerElementId);
    scannerRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          if (!isScanningRef.current || isUnmounted) return;
          isScanningRef.current = false;
          
          try {
            await html5Qrcode.stop();
          } catch {
            // Abaikan jika pemindai sudah dalam posisi berhenti
          } finally {
            if (!isUnmounted) {
              onResult(decodedText);
            }
          }
        },
        () => {}
      )
      .then(() => {
        if (!isUnmounted) {
          isScanningRef.current = true;
          setIsStarting(false);
        }
      })
      .catch(() => {
        if (isUnmounted) return;
        setIsStarting(false);
        setError(
          'Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan pada browser, atau tutup jendela ini dan gunakan input manual.'
        );
      });

    return () => {
      isUnmounted = true;
      const instance = scannerRef.current;
      if (instance) {
        if (isScanningRef.current) {
          isScanningRef.current = false;
          instance
            .stop()
            .catch(() => {})
            .finally(() => {
              instance.clear().catch(() => {});
            });
        } else {
          instance.clear().catch(() => {});
        }
      }
    };
  }, [scannerElementId, onResult]);

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-60 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-neutral-900">{label}</h3>
          <button
            onClick={onClose}
            aria-label="Tutup pemindai"
            className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center hover:bg-neutral-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <div
              id={scannerElementId}
              className="w-full rounded-2xl overflow-hidden bg-neutral-900 min-h-55"
            />
            <p className="text-[14px] text-neutral-500 text-center mt-3">
              {isStarting ? 'Mengaktifkan kamera...' : 'Arahkan kamera ke QR Code hingga terbaca otomatis.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}