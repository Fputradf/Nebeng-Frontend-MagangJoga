import { createContext, useState, useCallback, useMemo } from 'react';
import {
  estimateFare,
  nextTripId,
  nextWithdrawalId,
  nextIncomeId,
  initialTrips,
  initialHistory,
} from '../utils/mitraUtils';

const MitraDataContext = createContext(null);

export function MitraDataProvider({ children }) {
  const [trips, setTrips] = useState(initialTrips);
  const [availableBalance, setAvailableBalance] = useState(3850000);
  const [walletHistory, setWalletHistory] = useState(initialHistory);
  const [bankInfo, setBankInfo] = useState({
    bankName: 'Bank BCA',
    accountNumber: '1234567890',
    accountHolder: 'Budi Santoso (Mitra)',
  });

  const escrowHold = useMemo(() => {
    return trips
      .filter((t) => t.status === 'Aktif' || t.status === 'In Transit')
      .reduce((sum, t) => sum + (t.escrowAmount || 0), 0);
  }, [trips]);

  const addTrip = useCallback((formData) => {
    const fare = estimateFare(formData.origin, formData.destination, formData.vehicle);
    const newTrip = {
      ...formData,
      id: nextTripId(),
      estimation: fare,
      status: 'Aktif',
      escrowAmount: fare,
    };
    setTrips((prev) => [newTrip, ...prev]);
    return newTrip;
  }, []);

  const cancelTrip = useCallback((tripId) => {
    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, status: 'Dibatalkan' } : t)));
  }, []);

  const updateTripStatus = useCallback((tripId, nextStatus) => {
    setTrips((prevTrips) => {
      const targetTrip = prevTrips.find((t) => t.id === tripId);
      
      if (!targetTrip || targetTrip.status === nextStatus) {
        return prevTrips;
      }

      if (nextStatus === 'Selesai' && targetTrip.status !== 'Selesai') {
        const releaseAmount = targetTrip.escrowAmount || 0;

        if (releaseAmount > 0) {
          setAvailableBalance((bal) => bal + releaseAmount);
          setWalletHistory((hist) => [
            {
              id: nextIncomeId(),
              date: 'Hari ini',
              type: `Komisi Trip ${tripId}`,
              amount: releaseAmount,
              status: 'success',
              statusLabel: 'Masuk ke Saldo Utama (Dana Perjalanan Cair)',
            },
            ...hist,
          ]);
        }
      }

      return prevTrips.map((t) =>
        t.id === tripId
          ? {
              ...t,
              status: nextStatus,
              escrowAmount: nextStatus === 'Selesai' ? 0 : t.escrowAmount,
            }
          : t
      );
    });
  }, []);

  const requestWithdrawal = useCallback((amount) => {
    if (!amount || amount <= 0) {
      return { ok: false, reason: 'invalid_amount' };
    }

    let isSuccess = false;

    setAvailableBalance((prevBalance) => {
      if (amount > prevBalance) {
        isSuccess = false;
        return prevBalance;
      }
      isSuccess = true;
      return prevBalance - amount;
    });

    if (!isSuccess) {
      return { ok: false, reason: 'insufficient' };
    }

    const id = nextWithdrawalId();
    const newTx = {
      id,
      date: 'Hari ini',
      type: 'Pencairan (Withdrawal)',
      amount: -amount,
      status: 'processing',
      statusLabel: `Diproses ke ${bankInfo.bankName}`,
    };
    
    setWalletHistory((prev) => [newTx, ...prev]);

    setTimeout(() => {
      setWalletHistory((prev) =>
        prev.map((tx) =>
          tx.id === id
            ? { ...tx, status: 'success', statusLabel: `Berhasil ke ${bankInfo.bankName}` }
            : tx
        )
      );
    }, 4000);

    return { ok: true, id };
  }, [bankInfo.bankName]);

  const value = useMemo(
    () => ({
      trips,
      availableBalance,
      escrowHold,
      walletHistory,
      bankInfo,
      setBankInfo,
      addTrip,
      cancelTrip,
      updateTripStatus,
      requestWithdrawal,
    }),
    [
      trips,
      availableBalance,
      escrowHold,
      walletHistory,
      bankInfo,
      addTrip,
      cancelTrip,
      updateTripStatus,
      requestWithdrawal,
    ]
  );

  return (
    <MitraDataContext.Provider value={value}>
      {children}
    </MitraDataContext.Provider>
  );
}

// export function useMitraData() {
//   const ctx = useContext(MitraDataContext);
//   if (!ctx) {
//     throw new Error('useMitraData harus dipakai di dalam <MitraDataProvider>');
//   }
//   return ctx;
// }