import { model, Schema } from 'mongoose';

const reservationSchema = new Schema({
  parkingSpotId: { type: Schema.Types.ObjectId, ref: 'ParkingSpot', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'CANCELLED'], default: 'ACTIVE' }
});

export const Reservation = model('Reservation', reservationSchema);
