import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Types } from 'mongoose';

// El modelo de Mongoose se sustituye por un doble de prueba: los tests son
// unitarios y no necesitan una base de datos real.
jest.mock('../reservation.model', () => ({
  Reservation: {
    findById: jest.fn(),
    find: jest.fn()
  }
}));

import { Reservation } from '../reservation.model';
import { canExtendReservation, validateExtensionEndTime } from '../reservation.rules';
import { extendReservation, ReservationError } from '../reservation.service';
import app from '../../../app';

const findByIdMock = Reservation.findById as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>;
const findMock = Reservation.find as unknown as jest.Mock<(...args: unknown[]) => Promise<unknown>>;

type FakeReservation = {
  _id: Types.ObjectId;
  parkingSpotId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: 'ACTIVE' | 'CANCELLED';
  save: jest.Mock<() => Promise<unknown>>;
};

const SPOT_ID = new Types.ObjectId();
const NOW = new Date('2026-11-10T12:00:00.000Z');

function fakeReservation(overrides: Partial<FakeReservation> = {}): FakeReservation {
  const reservation: FakeReservation = {
    _id: new Types.ObjectId(),
    parkingSpotId: SPOT_ID,
    startTime: new Date('2026-11-10T11:00:00.000Z'),
    endTime: new Date('2026-11-10T13:00:00.000Z'),
    status: 'ACTIVE',
    save: jest.fn(async () => reservation),
    ...overrides
  };
  return reservation;
}

async function expectReservationError(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ReservationError);
  expect((error as ReservationError).status).toBe(status);
}

beforeEach(() => {
  findByIdMock.mockReset();
  findMock.mockReset();
});

describe('validateExtensionEndTime (regla pura)', () => {
  const currentEnd = new Date('2026-11-10T13:00:00.000Z');

  test('CP-01 devuelve la nueva fecha cuando es posterior a la hora final actual', () => {
    // Arrange
    const newEndTime = '2026-11-10T14:00:00.000Z';

    // Act
    const result = validateExtensionEndTime(currentEnd, newEndTime, NOW);

    // Assert
    expect(result).toEqual(new Date(newEndTime));
  });

  test('CP-08 devuelve null cuando la nueva hora no es una fecha válida', () => {
    const result = validateExtensionEndTime(currentEnd, 'mañana a las 3', NOW);

    expect(result).toBeNull();
  });

  test.each([
    ['null', null],
    ['undefined', undefined],
    ['un número', 1762786800000],
    ['un objeto', { endTime: '2026-11-10T14:00:00.000Z' }]
  ])('CP-09 devuelve null cuando la nueva hora es %s', (_label, value) => {
    const result = validateExtensionEndTime(currentEnd, value, NOW);

    expect(result).toBeNull();
  });

  test('CP-10 devuelve null cuando la nueva hora es anterior a la hora final actual', () => {
    const result = validateExtensionEndTime(currentEnd, '2026-11-10T12:30:00.000Z', NOW);

    expect(result).toBeNull();
  });

  test('CP-13 devuelve null cuando la nueva hora es igual a la hora final actual', () => {
    const result = validateExtensionEndTime(currentEnd, '2026-11-10T13:00:00.000Z', NOW);

    expect(result).toBeNull();
  });

  test('CP-14 acepta una extensión mínima de un minuto', () => {
    const result = validateExtensionEndTime(currentEnd, '2026-11-10T13:01:00.000Z', NOW);

    expect(result).toEqual(new Date('2026-11-10T13:01:00.000Z'));
  });

  test('CP-22 devuelve null cuando la nueva hora es una cadena vacía', () => {
    const result = validateExtensionEndTime(currentEnd, '   ', NOW);

    expect(result).toBeNull();
  });

  test('CP-23 interpreta correctamente una fecha con otra zona horaria', () => {
    // 08:00 en UTC-06:00 equivale a 14:00 UTC.
    const result = validateExtensionEndTime(currentEnd, '2026-11-10T08:00:00-06:00', NOW);

    expect(result?.toISOString()).toBe('2026-11-10T14:00:00.000Z');
  });

  test('CP-07 devuelve null cuando la reservación ya terminó', () => {
    const endedAt = new Date('2026-11-10T11:00:00.000Z');

    const result = validateExtensionEndTime(endedAt, '2026-11-10T14:00:00.000Z', NOW);

    expect(result).toBeNull();
  });
});

describe('canExtendReservation (regla pura)', () => {
  test('CP-20 permite extender una reservación ACTIVE que sigue vigente', () => {
    expect(canExtendReservation('ACTIVE', new Date('2026-11-10T13:00:00.000Z'), NOW)).toBe(true);
  });

  test('CP-06 rechaza una reservación CANCELLED aunque siga vigente', () => {
    expect(canExtendReservation('CANCELLED', new Date('2026-11-10T13:00:00.000Z'), NOW)).toBe(false);
  });

  test('CP-07 rechaza una reservación ACTIVE cuya hora final ya ocurrió', () => {
    expect(canExtendReservation('ACTIVE', new Date('2026-11-10T11:00:00.000Z'), NOW)).toBe(false);
  });

  test('CP-19 rechaza una reservación que termina exactamente en este instante', () => {
    expect(canExtendReservation('ACTIVE', new Date(NOW), NOW)).toBe(false);
  });
});

describe('extendReservation (Service)', () => {
  test('CP-02 actualiza endTime, persiste y devuelve la reservación', async () => {
    // Arrange
    const reservation = fakeReservation();
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([]);
    const newEndTime = '2026-11-10T15:00:00.000Z';

    // Act
    const result = await extendReservation(reservation._id.toString(), newEndTime, NOW);

    // Assert
    expect(result).toBe(reservation);
    expect(reservation.endTime).toEqual(new Date(newEndTime));
    expect(reservation.save).toHaveBeenCalledTimes(1);
  });

  test('CP-02 solo modifica endTime (startTime, estado y espacio se conservan)', async () => {
    const reservation = fakeReservation();
    const originalStart = reservation.startTime;
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([]);

    await extendReservation(reservation._id.toString(), '2026-11-10T15:00:00.000Z', NOW);

    expect(reservation.startTime).toBe(originalStart);
    expect(reservation.status).toBe('ACTIVE');
    expect(reservation.parkingSpotId).toBe(SPOT_ID);
  });

  test('CP-04 lanza 404 cuando el ID no tiene un formato localizable', async () => {
    await expectReservationError(extendReservation('abc-123', '2026-11-10T15:00:00.000Z', NOW), 404);
    expect(findByIdMock).not.toHaveBeenCalled();
  });

  test('CP-05 lanza 404 cuando la reservación no existe', async () => {
    findByIdMock.mockResolvedValue(null);

    await expectReservationError(
      extendReservation(new Types.ObjectId().toString(), '2026-11-10T15:00:00.000Z', NOW),
      404
    );
  });

  test('CP-06 lanza 409 y no guarda cuando la reservación está CANCELLED', async () => {
    const reservation = fakeReservation({ status: 'CANCELLED' });
    findByIdMock.mockResolvedValue(reservation);

    await expectReservationError(
      extendReservation(reservation._id.toString(), '2026-11-10T15:00:00.000Z', NOW),
      409
    );
    expect(reservation.save).not.toHaveBeenCalled();
  });

  test('CP-07 lanza 409 y no guarda cuando la reservación ya terminó', async () => {
    const reservation = fakeReservation({
      startTime: new Date('2026-11-10T09:00:00.000Z'),
      endTime: new Date('2026-11-10T10:00:00.000Z')
    });
    findByIdMock.mockResolvedValue(reservation);

    await expectReservationError(
      extendReservation(reservation._id.toString(), '2026-11-10T15:00:00.000Z', NOW),
      409
    );
    expect(reservation.save).not.toHaveBeenCalled();
  });

  test('CP-08 lanza 400 y no modifica la reservación cuando la fecha es inválida', async () => {
    const reservation = fakeReservation();
    const originalEnd = reservation.endTime;
    findByIdMock.mockResolvedValue(reservation);

    await expectReservationError(extendReservation(reservation._id.toString(), 'no-es-fecha', NOW), 400);
    expect(reservation.endTime).toBe(originalEnd);
    expect(reservation.save).not.toHaveBeenCalled();
  });

  test('CP-10 lanza 400 cuando la nueva hora es anterior a la actual', async () => {
    const reservation = fakeReservation();
    findByIdMock.mockResolvedValue(reservation);

    await expectReservationError(
      extendReservation(reservation._id.toString(), '2026-11-10T12:30:00.000Z', NOW),
      400
    );
    expect(reservation.save).not.toHaveBeenCalled();
  });

  test('CP-11 lanza 409 y no guarda cuando choca con otra reservación ACTIVE del espacio', async () => {
    const reservation = fakeReservation();
    const other = fakeReservation({
      startTime: new Date('2026-11-10T14:00:00.000Z'),
      endTime: new Date('2026-11-10T16:00:00.000Z')
    });
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([other]);

    await expectReservationError(
      extendReservation(reservation._id.toString(), '2026-11-10T15:00:00.000Z', NOW),
      409
    );
    expect(reservation.endTime).toEqual(new Date('2026-11-10T13:00:00.000Z'));
    expect(reservation.save).not.toHaveBeenCalled();
  });

  test('CP-15 permite una extensión adyacente que termina justo cuando empieza otra', async () => {
    const reservation = fakeReservation();
    const next = fakeReservation({
      startTime: new Date('2026-11-10T15:00:00.000Z'),
      endTime: new Date('2026-11-10T16:00:00.000Z')
    });
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([next]);

    const result = await extendReservation(reservation._id.toString(), '2026-11-10T15:00:00.000Z', NOW);

    expect(result.endTime).toEqual(new Date('2026-11-10T15:00:00.000Z'));
    expect(reservation.save).toHaveBeenCalledTimes(1);
  });

  test('CP-16 rechaza con 409 un traslape mínimo de un minuto con la siguiente reservación', async () => {
    const reservation = fakeReservation();
    const next = fakeReservation({
      startTime: new Date('2026-11-10T15:00:00.000Z'),
      endTime: new Date('2026-11-10T16:00:00.000Z')
    });
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([next]);

    await expectReservationError(
      extendReservation(reservation._id.toString(), '2026-11-10T15:01:00.000Z', NOW),
      409
    );
  });

  test('CP-17 una reservación CANCELLED en el nuevo horario no bloquea la extensión', async () => {
    const reservation = fakeReservation();
    const cancelled = fakeReservation({
      status: 'CANCELLED',
      startTime: new Date('2026-11-10T14:00:00.000Z'),
      endTime: new Date('2026-11-10T16:00:00.000Z')
    });
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([cancelled]);

    const result = await extendReservation(reservation._id.toString(), '2026-11-10T15:00:00.000Z', NOW);

    expect(result.endTime).toEqual(new Date('2026-11-10T15:00:00.000Z'));
    expect(findMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }));
  });

  test('CP-18 la propia reservación no se cuenta como conflicto', async () => {
    const reservation = fakeReservation();
    findByIdMock.mockResolvedValue(reservation);
    // Aunque la consulta devolviera la misma reservación, no debe bloquearse.
    findMock.mockResolvedValue([reservation]);

    const result = await extendReservation(reservation._id.toString(), '2026-11-10T15:00:00.000Z', NOW);

    expect(result.endTime).toEqual(new Date('2026-11-10T15:00:00.000Z'));
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({ _id: { $ne: reservation._id } })
    );
  });

  test('CP-21 la búsqueda de conflictos se limita al mismo espacio y al nuevo periodo', async () => {
    const reservation = fakeReservation();
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([]);
    const newEnd = new Date('2026-11-10T15:00:00.000Z');

    await extendReservation(reservation._id.toString(), newEnd.toISOString(), NOW);

    expect(findMock).toHaveBeenCalledWith({
      _id: { $ne: reservation._id },
      parkingSpotId: SPOT_ID,
      status: 'ACTIVE',
      startTime: { $lt: newEnd },
      endTime: { $gt: reservation.startTime }
    });
  });

  test('CP-20 permite extender una reservación que ya comenzó pero no ha terminado', async () => {
    const reservation = fakeReservation({
      startTime: new Date('2026-11-10T10:00:00.000Z'),
      endTime: new Date('2026-11-10T12:05:00.000Z')
    });
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([]);

    const result = await extendReservation(reservation._id.toString(), '2026-11-10T13:00:00.000Z', NOW);

    expect(result.endTime).toEqual(new Date('2026-11-10T13:00:00.000Z'));
  });
});

describe('PATCH /api/reservations/:id/extend (Route)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function patchExtend(id: string, body: unknown) {
    return fetch(`${baseUrl}/api/reservations/${id}/extend`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  // En la ruta se usa la hora real, por eso las fechas son relativas a Date.now().
  const hour = 3600000;
  const liveReservation = () =>
    fakeReservation({
      startTime: new Date(Date.now() - hour),
      endTime: new Date(Date.now() + hour)
    });

  test('CP-03 responde 200 con la reservación y su nueva hora final', async () => {
    const reservation = liveReservation();
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([]);
    const newEnd = new Date(Date.now() + 3 * hour).toISOString();

    const response = await patchExtend(reservation._id.toString(), { endTime: newEnd });
    const body = (await response.json()) as { endTime: string; status: string };

    expect(response.status).toBe(200);
    expect(body.endTime).toBe(newEnd);
    expect(body.status).toBe('ACTIVE');
  });

  test('CP-08 responde 400 cuando el horario es inválido', async () => {
    const reservation = liveReservation();
    findByIdMock.mockResolvedValue(reservation);

    const response = await patchExtend(reservation._id.toString(), { endTime: 'invalid' });

    expect(response.status).toBe(400);
    expect(reservation.save).not.toHaveBeenCalled();
  });

  test('CP-09 responde 400 cuando el cuerpo no incluye endTime', async () => {
    const reservation = liveReservation();
    findByIdMock.mockResolvedValue(reservation);

    const response = await patchExtend(reservation._id.toString(), {});

    expect(response.status).toBe(400);
  });

  test('CP-04 responde 404 cuando el ID no es localizable', async () => {
    const response = await patchExtend('no-existe', { endTime: new Date().toISOString() });
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(404);
    expect(body.message).toBe('Reservation not found');
  });

  test('CP-05 responde 404 cuando la reservación no existe', async () => {
    findByIdMock.mockResolvedValue(null);

    const response = await patchExtend(new Types.ObjectId().toString(), {
      endTime: new Date(Date.now() + hour).toISOString()
    });

    expect(response.status).toBe(404);
  });

  test('CP-06 responde 409 cuando la reservación está cancelada', async () => {
    const reservation = { ...liveReservation(), status: 'CANCELLED' as const };
    findByIdMock.mockResolvedValue(reservation);

    const response = await patchExtend(reservation._id.toString(), {
      endTime: new Date(Date.now() + 3 * hour).toISOString()
    });

    expect(response.status).toBe(409);
  });

  test('CP-11 responde 409 cuando la extensión choca con otra reservación', async () => {
    const reservation = liveReservation();
    const other = fakeReservation({
      startTime: new Date(Date.now() + 2 * hour),
      endTime: new Date(Date.now() + 4 * hour)
    });
    findByIdMock.mockResolvedValue(reservation);
    findMock.mockResolvedValue([other]);

    const response = await patchExtend(reservation._id.toString(), {
      endTime: new Date(Date.now() + 3 * hour).toISOString()
    });
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(409);
    expect(body.message).toContain('not available');
  });

  test('CP-24 responde 500 ante un error inesperado de persistencia', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    findByIdMock.mockRejectedValue(new Error('Database down'));

    const response = await patchExtend(new Types.ObjectId().toString(), {
      endTime: new Date(Date.now() + hour).toISOString()
    });

    expect(response.status).toBe(500);
    spy.mockRestore();
  });
});
