/**
 * Helper validasi audit checkpoint untuk fitur pelaporan (Report)
 * Berlaku 3 arah: Customer, Mitra Driver, dan Mitra Pos.
 *
 * Aturan:
 * 1. Customer:
 *    - Harus sudah sampai / check-in di Pos 1 (Pos Asal) atau Pos Tujuan.
 *    - Mitra Driver harus sudah datang di Pos.
 *    - Pos Tujuan (Pos 2) HANYA BISA DILAPORKAN jika customer sudah tiba di Pos Tujuan (tidak bisa dilaporkan saat masih dalam perjalanan / in_transit).
 * 2. Mitra Driver:
 *    - Harus sudah datang / check-in di Pos Asal atau Pos Tujuan.
 *    - Pos Tujuan HANYA BISA DILAPORKAN jika driver sudah tiba di Pos Tujuan.
 *    - Jika lapor Penumpang: Penumpang harus sudah sampai di Pos.
 * 3. Mitra Pos:
 *    - Jika lapor Driver: Driver harus sudah datang di Pos.
 *    - Jika lapor Penumpang: Penumpang harus sudah sampai di Pos.
 */

export const AUDIT_STATUS = {
  CHECKED_IN_ORIGIN: 'checked_in_origin',
  IN_TRANSIT: 'in_transit',
  ARRIVED_DESTINATION: 'arrived_destination',
  COMPLETED: 'completed',
  IN_ORIGIN_POS: 'in_origin_pos',
  ARRIVED_DEST_POS: 'arrived_dest_pos',
};

/**
 * Cek apakah Customer sudah check-in di Pos Asal (Pos 1)
 */
export function isCustomerArrivedAtOriginPos(ticketOrOrder) {
  if (!ticketOrOrder) return false;

  const status = ticketOrOrder.currentStatusText || ticketOrOrder.status;

  const originValidStatuses = [
    'checked_in_origin',
    'in_transit',
    'arrived_destination',
    'completed',
    'Selesai',
  ];

  if (originValidStatuses.includes(status)) {
    return true;
  }

  const logs = ticketOrOrder.checkpointsLogs || [];
  return logs.some((l) => l.scanType === 'checkin_origin');
}

/**
 * Cek apakah Customer sudah tiba di Pos Tujuan (Pos 2)
 * PENTING: Saat status masih 'in_transit' / dalam perjalanan, fungsi ini mengembalikan FALSE.
 */
export function isCustomerArrivedAtDestPos(ticketOrOrder) {
  if (!ticketOrOrder) return false;

  const status = ticketOrOrder.currentStatusText || ticketOrOrder.status;

  const destValidStatuses = [
    'arrived_destination',
    'completed',
    'Selesai',
  ];

  if (destValidStatuses.includes(status)) {
    return true;
  }

  const logs = ticketOrOrder.checkpointsLogs || [];
  return logs.some((l) => l.scanType === 'checkin_destination');
}

/**
 * Cek apakah Customer sudah sampai di minimal satu pos (Pos Asal ATAU Pos Tujuan)
 */
export function isCustomerArrivedAtPos(ticketOrOrder) {
  return isCustomerArrivedAtOriginPos(ticketOrOrder) || isCustomerArrivedAtDestPos(ticketOrOrder);
}

/**
 * Cek apakah Driver sudah tiba di Pos Asal (Pos 1)
 */
export function isDriverArrivedAtOriginPos(ticketOrTrip) {
  if (!ticketOrTrip) return false;

  const tripStatus = ticketOrTrip.tripStatus || ticketOrTrip.status;

  const originValidTripStatuses = [
    'in_origin_pos',
    'in_transit',
    'arrived_dest_pos',
    'completed',
    'Selesai',
  ];

  if (originValidTripStatuses.includes(tripStatus)) {
    return true;
  }

  const logs = ticketOrTrip.checkpointsLogs || [];
  return logs.some((l) => l.isTripLog || l.scanType === 'checkin_origin');
}

/**
 * Cek apakah Driver sudah tiba di Pos Tujuan (Pos 2)
 * PENTING: Saat status masih 'in_transit' / dalam perjalanan, fungsi ini mengembalikan FALSE.
 */
export function isDriverArrivedAtDestPos(ticketOrTrip) {
  if (!ticketOrTrip) return false;

  const tripStatus = ticketOrTrip.tripStatus || ticketOrTrip.status;

  const destValidTripStatuses = [
    'arrived_dest_pos',
    'completed',
    'Selesai',
  ];

  if (destValidTripStatuses.includes(tripStatus)) {
    return true;
  }

  const logs = ticketOrTrip.checkpointsLogs || [];
  return logs.some((l) => l.scanType === 'checkin_destination');
}

/**
 * Cek apakah Driver sudah datang / tiba di minimal satu pos
 */
export function isDriverArrivedAtPos(ticketOrTrip) {
  return isDriverArrivedAtOriginPos(ticketOrTrip) || isDriverArrivedAtDestPos(ticketOrTrip);
}

/**
 * Evaluasi izin melapor untuk Customer terhadap Driver / Pos
 */
export function evaluateCustomerReportEligibility(ticket) {
  if (!ticket) {
    return { canReport: false, reason: 'Data tiket tidak ditemukan.' };
  }

  const isCancelled =
    ticket.status === 'Batal' ||
    ticket.currentStatusText === 'cancelled' ||
    ticket.currentStatusText === 'cancelled_by_mitra' ||
    ticket.tripStatus === 'cancelled';

  // Jika trip/pesanan dibatalkan (misal mitra driver tidak datang / mangkir / batalkan sepihak),
  // customer tetap dapat melaporkan mitra driver.
  if (isCancelled) {
    return {
      canReport: true,
      reason: null,
      isCancelled: true,
      customerArrived: false,
      driverArrived: false,
    };
  }

  const customerArrived = isCustomerArrivedAtPos(ticket);
  const driverArrived = isDriverArrivedAtPos(ticket);

  if (!customerArrived) {
    return {
      canReport: false,
      reason: 'Laporan terkunci: Anda belum sampai / check-in di Pos 1 (Pos Asal) atau Pos Tujuan.',
      customerArrived,
      driverArrived,
    };
  }

  if (!driverArrived) {
    return {
      canReport: false,
      reason: 'Laporan terkunci: Mitra Driver belum datang / tiba di Pos.',
      customerArrived,
      driverArrived,
    };
  }

  return {
    canReport: true,
    reason: null,
    customerArrived,
    driverArrived,
  };
}

/**
 * Evaluasi izin melapor untuk Mitra Driver
 */
export function evaluateDriverReportEligibility(trip, passenger = null) {
  const driverArrived = isDriverArrivedAtPos(trip);

  if (!driverArrived) {
    return {
      canReport: false,
      reason: 'Laporan terkunci: Anda belum tiba / check-in di Pos Asal atau Pos Tujuan.',
    };
  }

  if (passenger) {
    const isCompleted = trip?.status === 'completed' || trip?.status === 'Selesai';
    if (!isCompleted) {
      return {
        canReport: false,
        reason: 'Laporan terkunci: Pelaporan customer/penumpang hanya dapat diajukan saat perjalanan (trip) sudah selesai.',
      };
    }
  }

  return {
    canReport: true,
    reason: null,
  };
}

/**
 * Evaluasi izin khusus melapor Customer untuk Mitra Driver saat trip sudah selesai
 */
export function evaluateDriverReportCustomerEligibility(trip) {
  if (!trip) {
    return { canReport: false, reason: 'Data perjalanan (trip) tidak ditemukan.' };
  }

  const isCompleted = trip.status === 'completed' || trip.status === 'Selesai';
  if (!isCompleted) {
    return {
      canReport: false,
      reason: 'Laporan terkunci: Pelaporan customer hanya dapat dilakukan saat perjalanan (trip) sudah selesai.',
    };
  }

  return {
    canReport: true,
    reason: null,
  };
}

/**
 * Evaluasi izin melapor untuk Mitra Pos (Operator)
 */
export function evaluateOperatorReportEligibility({ targetType, trip, passenger }) {
  if (targetType === 'driver') {
    const driverArrived = isDriverArrivedAtPos(trip);
    if (!driverArrived) {
      return {
        canReport: false,
        reason: 'Driver belum tiba di pos. Jika driver mangkir/tidak hadir, gunakan fitur Supir Tidak Hadir (No-Show).',
      };
    }
    return { canReport: true, reason: null };
  }

  if (targetType === 'passenger') {
    const passengerArrived = isCustomerArrivedAtPos(passenger);
    if (!passengerArrived) {
      return {
        canReport: false,
        reason: 'Penumpang belum sampai / check-in di Pos.',
      };
    }
    return { canReport: true, reason: null };
  }

  return { canReport: true, reason: null };
}
