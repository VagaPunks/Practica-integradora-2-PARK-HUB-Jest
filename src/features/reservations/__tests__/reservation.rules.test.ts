import {
  canReserveSpot,
  hasTimeConflict,
  validateReservationPeriod,
} from "../reservation.rules";
import { describe, expect, test } from "@jest/globals";

describe("validateReservationPeriod", () => {
  test("returns the dates when the start is before the end", () => {
    // TODO S19 PROF 1 (completado): comprueba que un período válido devuelve ambas fechas.
    // Arrange
    const startTime = "2026-10-13T10:00:00.000Z";
    const endTime = "2026-10-13T11:00:00.000Z";

    // Act
    const period = validateReservationPeriod(startTime, endTime);

    // Assert
    expect(period).toEqual({
      start: new Date(startTime),
      end: new Date(endTime),
    });
  });

  test("returns null when the start is after the end", () => {
    // TODO S19 STUDENT 1 (completado): rechaza un período con inicio posterior al fin.
    const period = validateReservationPeriod(
      "2026-10-13T11:00:00.000Z",
      "2026-10-13T10:00:00.000Z",
    );

    expect(period).toBeNull();
  });

  test("returns null when the start equals the end", () => {
    // TODO S19 STUDENT 2 (completado): rechaza un período de duración cero.
    const period = validateReservationPeriod(
      "2026-10-13T10:00:00.000Z",
      "2026-10-13T10:00:00.000Z",
    );

    expect(period).toBeNull();
  });

  test("accepts another valid period", () => {
    const startTime = "2026-10-14T14:15:00.000Z";
    const endTime = "2026-10-14T16:45:00.000Z";

    const period = validateReservationPeriod(startTime, endTime);

    expect(period).toEqual({
      start: new Date(startTime),
      end: new Date(endTime),
    });
  });

  test("returns null for an invalid date string", () => {
    // TODO S19 STUDENT 3 (completado): rechaza una fecha inválida.
    const period = validateReservationPeriod(
      "not a date",
      "2026-10-13T11:00:00.000Z",
    );

    expect(period).toBeNull();
  });

  test("returns null when an input is not a string", () => {
    const period = validateReservationPeriod(null, "2026-10-13T11:00:00.000Z");

    expect(period).toBeNull();
  });
});

describe("hasTimeConflict", () => {
  const existingStart = new Date("2026-10-13T10:00:00.000Z");
  const existingEnd = new Date("2026-10-13T11:00:00.000Z");

  test("reports a conflict for the exact same period", () => {
    // TODO S19 PROF 2 (completado): detecta el conflicto entre períodos idénticos.
    const newStart = new Date("2026-10-13T10:00:00.000Z");
    const newEnd = new Date("2026-10-13T11:00:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(true);
  });

  test("reports a conflict when the new period starts inside the existing period", () => {
    // TODO S19 STUDENT 4 (completado): detecta el solapamiento por el inicio.
    const newStart = new Date("2026-10-13T10:30:00.000Z");
    const newEnd = new Date("2026-10-13T11:30:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(true);
  });

  test("reports a conflict when the new period ends inside the existing period", () => {
    // TODO S19 STUDENT 5 (completado): detecta el solapamiento por el fin.
    const newStart = new Date("2026-10-13T09:30:00.000Z");
    const newEnd = new Date("2026-10-13T10:30:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(true);
  });

  test("reports a conflict when the new period is completely inside the existing period", () => {
    // TODO S19 STUDENT 6 (completado): detecta un período contenido en otro.
    const newStart = new Date("2026-10-13T10:15:00.000Z");
    const newEnd = new Date("2026-10-13T10:45:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(true);
  });

  test("reports a conflict when the new period contains the existing period", () => {
    const newStart = new Date("2026-10-13T09:00:00.000Z");
    const newEnd = new Date("2026-10-13T12:00:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(true);
  });

  test("allows a period ending exactly when the existing period starts", () => {
    // TODO S19 PROF 3 (completado): permite períodos adyacentes por el inicio.
    const newStart = new Date("2026-10-13T09:00:00.000Z");
    const newEnd = new Date("2026-10-13T10:00:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(false);
  });

  test("allows a period starting exactly when the existing period ends", () => {
    // TODO S19 STUDENT 7 (completado): permite períodos adyacentes por el fin.
    const newStart = new Date("2026-10-13T11:00:00.000Z");
    const newEnd = new Date("2026-10-13T12:00:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(false);
  });

  test("allows a period completely before the existing period", () => {
    // TODO S19 STUDENT 8 (completado): permite un período anterior sin solapamiento.
    const newStart = new Date("2026-10-13T08:00:00.000Z");
    const newEnd = new Date("2026-10-13T09:00:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(false);
  });

  test("allows a period completely after the existing period", () => {
    const newStart = new Date("2026-10-13T12:00:00.000Z");
    const newEnd = new Date("2026-10-13T13:00:00.000Z");

    const conflict = hasTimeConflict(
      newStart,
      newEnd,
      existingStart,
      existingEnd,
    );

    expect(conflict).toBe(false);
  });
});

describe("canReserveSpot", () => {
  test("allows an active spot with no conflict", () => {
    // TODO S19 PROF 4 (completado): permite reservar un espacio activo sin conflicto.
    const allowed = canReserveSpot(true, false);

    expect(allowed).toBe(true);
  });

  test("rejects an inactive spot even without a conflict", () => {
    // TODO S19 STUDENT 9 (completado): rechaza un espacio inactivo sin conflicto.
    const allowed = canReserveSpot(false, false);

    expect(allowed).toBe(false);
  });

  test("rejects an active spot when there is a conflict", () => {
    // TODO S19 STUDENT 10 (completado): rechaza un espacio activo con conflicto.
    const allowed = canReserveSpot(true, true);

    expect(allowed).toBe(false);
  });

  test("rejects an inactive spot when there is also a conflict", () => {
    const allowed = canReserveSpot(false, true);

    expect(allowed).toBe(false);
  });
});
