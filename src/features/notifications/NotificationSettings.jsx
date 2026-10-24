import { useState, useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Bell, Save, Loader2 } from 'lucide-react';

export default function NotificationSettings() {
  const { preferences, fetchPreferences, updateNotificationPreferences, loading } = useNotification();
  const [localPreferences, setLocalPreferences] = useState({
    enablePushNotifications: true,
    enableEmailNotifications: true,
    orderNotifications: true,
    tripNotifications: true,
    chatNotifications: true,
    paymentNotifications: true,
    promotionNotifications: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        enablePushNotifications: preferences.enablePushNotifications ?? true,
        enableEmailNotifications: preferences.enableEmailNotifications ?? true,
        orderNotifications: preferences.orderNotifications ?? true,
        tripNotifications: preferences.tripNotifications ?? true,
        chatNotifications: preferences.chatNotifications ?? true,
        paymentNotifications: preferences.paymentNotifications ?? true,
        promotionNotifications: preferences.promotionNotifications ?? false,
      });
    }
  }, [preferences]);

  const handleToggle = (key) => {
    setLocalPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateNotificationPreferences(localPreferences);
      setMessage({ type: 'success', text: 'Pengaturan notifikasi berhasil disimpan' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal menyimpan pengaturan notifikasi' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({ enabled, onChange, label }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
      <span className="text-gray-700">{label}</span>
      <button
        onClick={onChange}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-300'
        } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Pengaturan Notifikasi</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Kelola jenis notifikasi yang ingin Anda terima
          </p>
        </div>

        <div className="p-6">
          {message.text && (
            <div
              className={`mb-4 p-4 rounded-md ${
                message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Umum</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <ToggleSwitch
                  enabled={localPreferences.enablePushNotifications}
                  onChange={() => handleToggle('enablePushNotifications')}
                  label="Notifikasi Push"
                />
                <ToggleSwitch
                  enabled={localPreferences.enableEmailNotifications}
                  onChange={() => handleToggle('enableEmailNotifications')}
                  label="Notifikasi Email"
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Kategori Notifikasi</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <ToggleSwitch
                  enabled={localPreferences.orderNotifications}
                  onChange={() => handleToggle('orderNotifications')}
                  label="Notifikasi Pesanan"
                />
                <ToggleSwitch
                  enabled={localPreferences.tripNotifications}
                  onChange={() => handleToggle('tripNotifications')}
                  label="Notifikasi Perjalanan"
                />
                <ToggleSwitch
                  enabled={localPreferences.chatNotifications}
                  onChange={() => handleToggle('chatNotifications')}
                  label="Notifikasi Chat"
                />
                <ToggleSwitch
                  enabled={localPreferences.paymentNotifications}
                  onChange={() => handleToggle('paymentNotifications')}
                  label="Notifikasi Pembayaran"
                />
                <ToggleSwitch
                  enabled={localPreferences.promotionNotifications}
                  onChange={() => handleToggle('promotionNotifications')}
                  label="Notifikasi Promosi"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
