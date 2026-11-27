import { useState, useEffect } from 'react';
import {
  Bike,
  Car,
  Percent,
  Save,
  Scale,
  Package,
  CheckCircle2,
  AlertCircle,
  QrCode,
} from 'lucide-react';
import {
  updateCompletePricingPolicy,
  getPricingPolicy,
  getPosCommissionSettings,
  updatePosCommissionSettings,
} from '../../../services/pricingService';

export default function PricingPolicyManagement() {
  const [transportPricing, setTransportPricing] = useState({
    motorPerKm: 2500,
    carPerKm: 5000,
    motorBaseFare: 5000,
    carBaseFare: 10000,
    motorBaseDistanceKm: 5,
    carBaseDistanceKm: 5
  });

  const [platformFee, setPlatformFee] = useState({
    rideFeePercent: 15,
    parcelFeePercent: 12,
    rideCustomerFee: 0,
    parcelCustomerFee: 0
  });

  const [posCommission, setPosCommission] = useState({
    enabled: false,
    flatRate: 0,
    perCustomerHead: true,
  });

  const [parcelMatrix, setParcelMatrix] = useState([
    { size: "XXS", maxWeightKg: 1, baseRate: 6000, description: "Dokumen / Kunci / Flashdisk" },
    { size: "XS", maxWeightKg: 3, baseRate: 10000, description: "Kotak Kecil / Kosmetik" },
    { size: "S", maxWeightKg: 5, baseRate: 15000, description: "Tas Kecil / Sepatu" },
    { size: "M", maxWeightKg: 10, baseRate: 25000, description: "Kardus Sedang / Helm" },
    { size: "L", maxWeightKg: 20, baseRate: 40000, description: "Kardus Besar / Galon Air" },
    { size: "XL", maxWeightKg: 25, baseRate: 70000, description: "Barang Besar / Elektronik" }
  ]);

  const [notification, setNotification] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const MIN_FARE = 0;
  const MAX_FARE = 1000000;
  const MAX_BASE_DISTANCE_KM = 100;
  const MIN_FEE_PERCENT = 0;
  const MAX_FEE_PERCENT = 50;

  useEffect(() => {
    async function fetchPricingData() {
      try {
        const [data, posCommissionData] = await Promise.all([
          getPricingPolicy(),
          getPosCommissionSettings().catch(() => null),
        ]);

        if (posCommissionData) {
          setPosCommission({
            enabled: Boolean(posCommissionData.enabled),
            flatRate: Number(posCommissionData.flatRate) || 0,
            perCustomerHead:
              posCommissionData.perCustomerHead === undefined
                ? true
                : Boolean(posCommissionData.perCustomerHead),
          });
        }

        if (Array.isArray(data) && data.length > 0) {
          const motorData = data.find(item => item.serviceType === 'motor');
          const carData = data.find(item => item.serviceType === 'mobil');
          const barangList = data.filter(
            item => item.serviceType === 'barang' && item.size
          );

          if (motorData) {
            setTransportPricing(prev => ({
              ...prev,
              motorPerKm: Number(motorData.farePerKm) || 2500,
              motorBaseFare: Number(motorData.baseFare) || 5000,
              motorBaseDistanceKm: motorData.baseDistanceKm !== undefined && motorData.baseDistanceKm !== null
                ? Number(motorData.baseDistanceKm)
                : 0,
            }));

            setPlatformFee(prev => ({
              ...prev,
              rideFeePercent: Number(motorData.adminFeePercentage) || 15,
              rideCustomerFee: Number(motorData.customerServiceFee) || 0,
            }));
          }

          if (carData) {
            setTransportPricing(prev => ({
              ...prev,
              carPerKm: Number(carData.farePerKm) || 5000,
              carBaseFare: Number(carData.baseFare) || 10000,
              carBaseDistanceKm: carData.baseDistanceKm !== undefined && carData.baseDistanceKm !== null
                ? Number(carData.baseDistanceKm)
                : 0,
            }));
          }

          if (barangList.length > 0) {
            setPlatformFee(prev => ({
              ...prev,
              parcelFeePercent:
                Number(barangList[0].adminFeePercentage) || 12,
              parcelCustomerFee:
                Number(barangList[0].customerServiceFee) || 0,
            }));

            setParcelMatrix(prevMatrix =>
              prevMatrix.map(item => {
                const found = barangList.find(
                  b => b.size === item.size
                );

                return found
                  ? {
                      ...item,
                      baseRate:
                        Number(found.baseFare) || item.baseRate,
                      maxWeightKg:
                        found.maxWeightKg !== null
                          ? Number(found.maxWeightKg)
                          : item.maxWeightKg
                    }
                  : item;
              })
            );
          }
        }
      } catch (err) {
        console.error(
          'Gagal memuat data tarif dari database:',
          err
        );
      }
    }

    fetchPricingData();
  }, []);

  const clamp = (value, min, max) =>
    Math.min(Math.max(value, min), max);

  const handleFareChange = (field) => (e) => {
    const raw = e.target.value;

    if (raw === '') {
      setTransportPricing(prev => ({
        ...prev,
        [field]: ''
      }));
      return;
    }

    const num = Number(raw);

    if (Number.isNaN(num)) return;

    const isDistanceField = field === 'motorBaseDistanceKm' || field === 'carBaseDistanceKm';
    setTransportPricing(prev => ({
      ...prev,
      [field]: clamp(num, MIN_FARE, isDistanceField ? MAX_BASE_DISTANCE_KM : MAX_FARE)
    }));
  };

  const handleFeeChange = (field) => (e) => {
    const raw = e.target.value;

    if (raw === '') {
      setPlatformFee(prev => ({
        ...prev,
        [field]: ''
      }));
      return;
    }

    const num = Number(raw);

    if (Number.isNaN(num)) return;

    const isPercentField = field === 'rideFeePercent' || field === 'parcelFeePercent';
    setPlatformFee(prev => ({
      ...prev,
      [field]: isPercentField
        ? clamp(num, MIN_FEE_PERCENT, MAX_FEE_PERCENT)
        : clamp(num, MIN_FARE, MAX_FARE)
    }));
  };

  const handleMatrixChange = (index, field, value) => {
    if (value === '') {
      const updated = [...parcelMatrix];

      updated[index] = {
        ...updated[index],
        [field]: ''
      };

      setParcelMatrix(updated);
      return;
    }

    const num = Number(value);

    if (Number.isNaN(num)) return;

    const updated = [...parcelMatrix];

    updated[index] = {
      ...updated[index],
      [field]: clamp(
        num,
        MIN_FARE,
        MAX_FARE
      )
    };

    setParcelMatrix(updated);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();

    const errors = [];

    Object.entries(transportPricing).forEach(
      ([key, value]) => {
        if (
          value === '' ||
          Number.isNaN(Number(value)) ||
          Number(value) < MIN_FARE
        ) {
          errors.push(
            `Nilai tarif "${key}" tidak valid.`
          );
        }
      }
    );

    ['rideFeePercent', 'parcelFeePercent'].forEach((key) => {
      const value = platformFee[key];
      if (
        value === '' ||
        Number.isNaN(Number(value)) ||
        Number(value) < MIN_FEE_PERCENT ||
        Number(value) > MAX_FEE_PERCENT
      ) {
        errors.push(
          `Komisi "${key}" harus di antara ${MIN_FEE_PERCENT}% - ${MAX_FEE_PERCENT}%.`
        );
      }
    });

    ['rideCustomerFee', 'parcelCustomerFee'].forEach((key) => {
      const value = platformFee[key];
      if (
        value === '' ||
        Number.isNaN(Number(value)) ||
        Number(value) < MIN_FARE
      ) {
        errors.push(
          `Biaya aplikasi customer "${key}" tidak valid.`
        );
      }
    });

    if (
      posCommission.flatRate === '' ||
      Number.isNaN(Number(posCommission.flatRate)) ||
      Number(posCommission.flatRate) < 0
    ) {
      errors.push('Tarif flat komisi scan Mitra Pos tidak valid.');
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      setNotification(false);
      return;
    }

    setFormErrors([]);
    setIsSubmitting(true);

    try {
      const payload = {
        motorPerKm: Number(
          transportPricing.motorPerKm
        ),
        carPerKm: Number(
          transportPricing.carPerKm
        ),
        motorBaseFare: Number(
          transportPricing.motorBaseFare
        ),
        carBaseFare: Number(
          transportPricing.carBaseFare
        ),
        motorBaseDistanceKm: Number(
          transportPricing.motorBaseDistanceKm || 0
        ),
        carBaseDistanceKm: Number(
          transportPricing.carBaseDistanceKm || 0
        ),
        rideFeePercent: Number(
          platformFee.rideFeePercent
        ),
        parcelFeePercent: Number(
          platformFee.parcelFeePercent
        ),
        rideCustomerFee: Number(
          platformFee.rideCustomerFee || 0
        ),
        parcelCustomerFee: Number(
          platformFee.parcelCustomerFee || 0
        ),
        parcelMatrix: parcelMatrix.map(item => ({
          size: item.size,
          maxWeightKg: Number(item.maxWeightKg),
          baseRate: Number(item.baseRate)
        }))
      };

      await Promise.all([
        updateCompletePricingPolicy(payload),
        updatePosCommissionSettings({
          enabled: Boolean(posCommission.enabled),
          flatRate: Number(posCommission.flatRate || 0),
          perCustomerHead: Boolean(posCommission.perCustomerHead),
        }),
      ]);

      setNotification(true);

      setTimeout(
        () => setNotification(false),
        3000
      );
    } catch (err) {
      console.error(
        'Gagal menyimpan kebijakan tarif:',
        err
      );

      setFormErrors([
        err.response?.data?.message ||
          'Terjadi kesalahan saat menyimpan ke database.'
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen font-['Inter']">

      {/* ── BANNER GRADIENT ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 via-brand-500 to-[#2684ff] px-6 py-5 sm:py-0 sm:h-[104px] flex items-center text-white shadow-card">
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent truncate">
                GLOBAL PRICING POLICY & COMMISSION SETTINGS
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              Konfigurasi Tarif Global & Komisi
            </h1>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-blue-50 text-[#1356d6] rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shadow-sm shrink-0 whitespace-nowrap self-start sm:self-auto disabled:opacity-50"
          >
            <Save size={16} />
            <span>
              {isSubmitting
                ? 'Menyimpan...'
                : 'Simpan Kebijakan Tarif'}
            </span>
          </button>
        </div>
      </section>

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-[13px] font-bold">
          <CheckCircle2
            size={16}
            className="text-emerald-600"
          />

          <span>
            Kebijakan tarif global dan matriks berat paket berhasil disinkronkan ke database!
          </span>
        </div>
      )}

      {formErrors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-rose-800 text-[13px] font-bold">
          <AlertCircle
            size={16}
            className="text-rose-600 shrink-0 mt-0.5"
          />

          <div>
            <p className="mb-0.5">
              Gagal menyimpan, periksa nilai berikut:
            </p>

            <ul className="list-disc list-inside font-medium text-[12px]">
              {formErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSaveAll}
        className="space-y-6"
      >
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 bg-[#1356d6]/10 text-[#1356d6] rounded-xl">
              <Car size={16} />
            </div>

            <div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                1. Tarif Dasar Perjalanan
              </h2>

              <p className="text-[12px] text-neutral-400">
                Pengaturan tarif per kilometer dan buka pintu awal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-[#1356d6] font-bold text-[13px]">
                <Bike size={14} />
                <span>SATURUTE MOTOR</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Tarif Dasar / Buka Pintu (Rp)
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={transportPricing.motorBaseFare}
                    onChange={handleFareChange('motorBaseFare')}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Batas Jarak Tarif Flat (KM)
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={MAX_BASE_DISTANCE_KM}
                    step="0.5"
                    value={transportPricing.motorBaseDistanceKm}
                    onChange={handleFareChange('motorBaseDistanceKm')}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Jarak 0 – {transportPricing.motorBaseDistanceKm || 0} km dikenakan tarif dasar flat; di atasnya ditambah tarif per KM.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Tarif Per KM Setelah Batas Jarak (Rp)
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={transportPricing.motorPerKm}
                    onChange={handleFareChange('motorPerKm')}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-[#1356d6] font-bold text-[13px]">
                <Car size={14} />
                <span>SATURUTE MOBIL</span>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Tarif Dasar / Buka Pintu (Rp)
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={transportPricing.carBaseFare}
                    onChange={handleFareChange('carBaseFare')}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Batas Jarak Tarif Flat (KM)
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={MAX_BASE_DISTANCE_KM}
                    step="0.5"
                    value={transportPricing.carBaseDistanceKm}
                    onChange={handleFareChange('carBaseDistanceKm')}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                  />
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Jarak 0 – {transportPricing.carBaseDistanceKm || 0} km dikenakan tarif dasar flat; di atasnya ditambah tarif per KM.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Tarif Per KM Setelah Batas Jarak (Rp)
                  </label>

                  <input
                    type="number"
                    min={0}
                    value={transportPricing.carPerKm}
                    onChange={handleFareChange('carPerKm')}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 bg-[#1356d6]/10 text-[#1356d6] rounded-xl">
              <Package size={16} />
            </div>

            <div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                2. Matriks Biaya Pengiriman Paket & Batas Berat
              </h2>

              <p className="text-[12px] text-neutral-400">
                Atur batas berat (Kg) dan tarif dasar sesuai kapasitas muatan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-neutral-400 text-[12px] uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-4">Ukuran</th>
                  <th className="py-2.5 px-4">Batas Berat Maksimum (KG)</th>
                  <th className="py-2.5 px-4">Deskripsi</th>
                  <th className="py-2.5 px-4">Tarif Dasar (Rp)</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 text-[12px]">
                {parcelMatrix.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 bg-[#1356d6]/10 text-[#1356d6] rounded-md font-bold font-mono">
                        {item.size}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 font-semibold text-neutral-700">
                      <div className="flex items-center gap-1.5">
                        <Scale size={11} className="text-neutral-400" />
                        <input
                          type="number"
                          min={0}
                          value={item.maxWeightKg}
                          onChange={(e) =>
                            handleMatrixChange(index, 'maxWeightKg', e.target.value)
                          }
                          className="bg-neutral-50 border border-neutral-200 rounded-lg px-2 py-0.5 w-20 font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                        />
                        <span>KG</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-4 text-neutral-500">
                      {item.description}
                    </td>

                    <td className="py-2.5 px-4">
                      <input
                        type="number"
                        min={0}
                        value={item.baseRate}
                        onChange={(e) =>
                          handleMatrixChange(index, 'baseRate', e.target.value)
                        }
                        className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1 w-28 font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-100">
            <div className="p-2 bg-[#1356d6]/10 text-[#1356d6] rounded-xl">
              <Percent size={16} />
            </div>

            <div>
              <h2 className="text-[17px] font-bold text-neutral-800">
                3. Biaya Admin Transportasi & Biaya Admin Paket
              </h2>

              <p className="text-[12px] text-neutral-400">
                Potongan biaya admin platform dari setiap transaksi (ditampilkan sebagai Biaya Aplikasi di sisi Customer &amp; Mitra Driver).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-2">
              <label className="block text-[12px] font-bold uppercase text-neutral-500">
                Biaya Admin Transportasi (%)
              </label>

              <input
                type="number"
                min={0}
                value={platformFee.rideFeePercent}
                onChange={handleFeeChange('rideFeePercent')}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
              />
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-2">
              <label className="block text-[12px] font-bold uppercase text-neutral-500">
                Biaya Admin Paket (%)
              </label>

              <input
                type="number"
                min={0}
                value={platformFee.parcelFeePercent}
                onChange={handleFeeChange('parcelFeePercent')}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
              />
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-2">
              <label className="block text-[12px] font-bold uppercase text-neutral-500">
                Biaya Aplikasi Customer - Transportasi (Rp)
              </label>

              <input
                type="number"
                min={0}
                value={platformFee.rideCustomerFee}
                onChange={handleFeeChange('rideCustomerFee')}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
              />
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-2">
              <label className="block text-[12px] font-bold uppercase text-neutral-500">
                Biaya Aplikasi Customer - Paket (Rp)
              </label>

              <input
                type="number"
                min={0}
                value={platformFee.parcelCustomerFee}
                onChange={handleFeeChange('parcelCustomerFee')}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#1356d6]/10 text-[#1356d6] rounded-xl">
                <QrCode size={16} />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-neutral-800">
                  4. Komisi Scan Mitra Pos (Ditanggung Platform)
                </h2>
                <p className="text-[12px] text-neutral-400">
                  Komisi flat untuk Mitra Pos setiap kali melakukan scan tiket customer (tidak memotong pendapatan Mitra Driver maupun tagihan Customer).
                </p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none self-start sm:self-auto">
              <span className={`text-xs font-bold ${posCommission.enabled ? 'text-emerald-700' : 'text-neutral-500'}`}>
                {posCommission.enabled ? 'AKTIF (ON)' : 'NONAKTIF (OFF)'}
              </span>
              <input
                type="checkbox"
                checked={posCommission.enabled}
                onChange={(e) =>
                  setPosCommission((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="relative w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 space-y-2">
              <label className="block text-[12px] font-bold uppercase text-neutral-500">
                Tarif Flat Komisi Scan (Rp)
              </label>
              <input
                type="number"
                min={0}
                disabled={!posCommission.enabled}
                value={posCommission.flatRate}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setPosCommission((prev) => ({ ...prev, flatRate: '' }));
                    return;
                  }
                  const num = Number(raw);
                  if (!Number.isNaN(num)) {
                    setPosCommission((prev) => ({
                      ...prev,
                      flatRate: clamp(num, MIN_FARE, MAX_FARE),
                    }));
                  }
                }}
                className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-1.5 text-[13px] font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#74B4D9] disabled:opacity-50"
              />
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/80 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase text-neutral-500">
                  Hitung Per Kepala Customer
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {posCommission.perCustomerHead
                    ? 'Aktif: Tarif flat dikalikan jumlah penumpang per order.'
                    : 'Nonaktif: Tarif flat berlaku 1x per order yang discan.'}
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  disabled={!posCommission.enabled}
                  checked={posCommission.perCustomerHead}
                  onChange={(e) =>
                    setPosCommission((prev) => ({
                      ...prev,
                      perCustomerHead: e.target.checked,
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-neutral-200 rounded-full peer peer-checked:bg-[#1356d6] peer-disabled:opacity-50 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}