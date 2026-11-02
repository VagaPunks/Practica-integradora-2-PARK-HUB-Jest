export function validateReservationPeriod(startTime: unknown, endTime: unknown) {
  if (typeof startTime !== 'string' || typeof endTime !== 'string') {
    return null;
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return null;
  }

  return { start, end };
}

export function hasTimeConflict(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date
) {
  return newStart < existingEnd && newEnd > existingStart;
}

export function canReserveSpot(active: boolean, hasConflict: boolean) {
  return active && !hasConflict;
}

export function canExtendReservation(status: unknown, currentEnd: Date, now: Date) {
  // Solo una reservación ACTIVE cuya hora final todavía no ocurre puede extenderse.
  return status === 'ACTIVE' && currentEnd.getTime() > now.getTime();
}

export function validateExtensionEndTime(
  currentEnd: Date,
  newEndTime: unknown,
  now: Date
): Date | null {
  // La nueva hora final debe llegar como texto con una fecha y hora válida.
  if (typeof newEndTime !== 'string' || newEndTime.trim() === '') {
    return null;
  }

  const newEnd = new Date(newEndTime);
  if (Number.isNaN(newEnd.getTime())) {
    return null;
  }

  // Una reservación que ya terminó no tiene una extensión válida.
  if (currentEnd.getTime() <= now.getTime()) {
    return null;
  }

  // Debe ser estrictamente posterior a la hora final actual.
  if (newEnd.getTime() <= currentEnd.getTime()) {
    return null;
  }

  return newEnd;
}
