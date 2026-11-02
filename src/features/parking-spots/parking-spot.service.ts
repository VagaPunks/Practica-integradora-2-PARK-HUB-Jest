import { isValidObjectId } from 'mongoose';
import { Reservation } from '../reservations/reservation.model';
import { ParkingSpot } from './parking-spot.model';

export async function getActiveSpots() {
  const spots = await ParkingSpot.find({ active: true }).sort({ number: 1 }).lean();
  const now = new Date();

  const currentReservations = await Reservation.find({
    parkingSpotId: { $in: spots.map((spot) => spot._id) },
    status: 'ACTIVE',
    startTime: { $lte: now },
    endTime: { $gt: now }
  }).select('parkingSpotId').lean();

  const occupiedIds = new Set(
    currentReservations.map((reservation) => reservation.parkingSpotId.toString())
  );

  return spots.map((spot) => ({
    id: spot._id.toString(),
    number: spot.number,
    zone: spot.zone,
    type: spot.type,
    active: spot.active,
    available: !occupiedIds.has(spot._id.toString())
  }));
}

export async function getSpotById(id: string) {
  if (!isValidObjectId(id)) {
    return null;
  }

  const spot = await ParkingSpot.findById(id).lean();
  if (!spot) {
    return null;
  }

  const now = new Date();
  const currentReservation = await Reservation.exists({
    parkingSpotId: spot._id,
    status: 'ACTIVE',
    startTime: { $lte: now },
    endTime: { $gt: now }
  });

  return {
    id: spot._id.toString(),
    number: spot.number,
    zone: spot.zone,
    type: spot.type,
    active: spot.active,
    available: spot.active && !currentReservation
  };
}
