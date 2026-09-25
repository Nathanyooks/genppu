import React, { useState, useEffect } from 'react';
import { COMMON_PERMISSION_REASONS } from '../data/initialData';
import { X, Check } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  jamaahName: string;
  type: 'izin' | 'sakit';
  initialValue?: string;
  onSave: (reason: string) => void;
}

export const PermissionModal: React.FC<PermissionModalProps> = ({
  isOpen,
  onClose,
  jamaahName,
  type,
  initialValue = '',
  onSave,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (type === 'izin') {
        if (COMMON_PERMISSION_REASONS.includes(initialValue)) {
          setSelectedReason(initialValue);
          setCustomReason('');
        } else if (initialValue) {
          setSelectedReason('Lainnya');
          setCustomReason(initialValue);
        } else {
          setSelectedReason(COMMON_PERMISSION_REASONS[0]);
          setCustomReason('');
        }
      } else {
        // Sakit
        setCustomReason(initialValue || 'Demam / Sakit');
      }
    }
  }, [isOpen, initialValue, type]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'izin') {
      const finalReason = selectedReason === 'Lainnya' && customReason.trim()
        ? customReason.trim()
        : selectedReason || 'Izin Kepentingan Pribadi';
      onSave(finalReason);
    } else {
      onSave(customReason.trim() || 'Sakit');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              {type === 'izin' ? 'Keterangan Izin Jamaah' : 'Keterangan Sakit'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">{jamaahName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {type === 'izin' ? (
            <>
              <label className="block text-xs font-semibold text-slate-700">
                Pilih Alasan Izin:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_PERMISSION_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`px-3 py-2 text-left rounded-lg text-xs font-medium border transition-colors flex items-center justify-between ${
                      selectedReason === reason
                        ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span>{reason}</span>
                    {selectedReason === reason && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </button>
                ))}
              </div>

              {selectedReason === 'Lainnya' && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tuliskan Alasan Khusus:
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Contoh: Menghadiri rapat RT / ronda malam"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Keterangan Sakit (Opsional):
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Contoh: Demam & flu / Rawat inap / Istirahat dokter"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${
              type === 'izin' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Simpan Keterangan
          </button>
        </div>
      </div>
    </div>
  );
};
