/**
 * Utility untuk memformat jam keberangkatan dan jadwal trip secara konsisten di seluruh aplikasi.
 */

export const formatTripTime = (timeVal, dateVal = null) => {
  const parseTime = (val) => {
    if (!val) return null;
    try {
      if (typeof val === 'string') {
        if (val.includes('T')) {
          const part = val.split('T')[1].substring(0, 5);
          if (part && part !== '00:00') return `${part} WIB`;
          if (part === '00:00' && val.startsWith('1970-01-01')) return '00:00 WIB';
          return null;
        }
        if (val.includes(':')) {
          return `${val.substring(0, 5)} WIB`;
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  return parseTime(timeVal) || parseTime(dateVal) || null;
};

export const formatTripSchedule = (dateVal, timeVal) => {
  const datePart = (typeof dateVal === 'string' && dateVal.includes('T'))
    ? dateVal.split('T')[0]
    : (dateVal || 'Segera');
  const timePart = formatTripTime(timeVal, dateVal);

  if (timePart) {
    return `${datePart} • ${timePart} • Sesuai Jadwal`;
  }
  return `${datePart} • Sesuai Jadwal`;
};

/**
 * Mengonversi tanggal dan jam trip ke Date object dengan zona waktu WIB (+07:00)
 */
export const parseTripDateTimeWib = (dateVal, timeVal) => {
  if (!dateVal) return null;
  try {
    let datePart = typeof dateVal === 'string' && dateVal.includes('T')
      ? dateVal.split('T')[0]
      : String(dateVal).substring(0, 10);
    
    let timePart = '23:59:59';
    if (timeVal) {
      if (typeof timeVal === 'string') {
        if (timeVal.includes('T')) {
          timePart = timeVal.split('T')[1].substring(0, 8);
        } else {
          timePart = timeVal.substring(0, 8);
          if (timePart.length === 5) timePart += ':00';
        }
      } else if (timeVal instanceof Date) {
        timePart = timeVal.toISOString().split('T')[1].substring(0, 8);
      }
    }

    const dt = new Date(`${datePart}T${timePart}+07:00`);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
};

/**
 * Cek apakah jadwal trip sudah melewati batas toleransi keterlambatan
 */
export const isTripPastTolerance = (dateVal, timeVal, toleranceMinutes = 15) => {
  const tripDt = parseTripDateTimeWib(dateVal, timeVal);
  if (!tripDt) return false;
  const toleranceMs = Number(toleranceMinutes || 15) * 60 * 1000;
  return Date.now() > tripDt.getTime() + toleranceMs;
};

/**
 * Format durasi menit ke teks ramah bahasa Indonesia
 * Contoh: 45 -> "45 mnt", 75 -> "1 jam 15 mnt", 120 -> "2 jam"
 */
export const formatDurationMinutes = (minutes) => {
  const m = Number(minutes);
  if (!m || isNaN(m) || m <= 0) return null;
  const hours = Math.floor(m / 60);
  const remainingMinutes = Math.round(m % 60);

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} jam ${remainingMinutes} mnt`;
  }
  if (hours > 0) {
    return `${hours} jam`;
  }
  return `${remainingMinutes} mnt`;
};

/**
 * Menghitung perkiraan jam tiba berdasarkan jam berangkat dan durasi menit
 * Contoh: ("2026-11-03", "14:00:00", 45) -> "14.45 WIB"
 * Juga mendukung 2 argumen: ("14:00:00", 45) -> "14.45 WIB"
 */
export const getEstimatedArrivalTime = (dateVal, timeVal, durationMinutes) => {
  let actualDate = dateVal;
  let actualTime = timeVal;
  let actualDuration = durationMinutes;

  if (actualDuration === undefined && (typeof actualTime === 'number' || !isNaN(Number(actualTime)))) {
    actualDuration = Number(actualTime);
    actualTime = actualDate;
    actualDate = new Date().toISOString().split('T')[0];
  }

  const tripDt = parseTripDateTimeWib(actualDate, actualTime);
  if (!tripDt || !actualDuration) return null;
  const arrivalDt = new Date(tripDt.getTime() + Number(actualDuration) * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
  return `${formatter.format(arrivalDt).replace(':', '.')} WIB`;
};

