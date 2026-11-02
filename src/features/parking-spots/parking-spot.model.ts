import { model, Schema } from 'mongoose';

const parkingSpotSchema = new Schema({
  number: { type: String, required: true, unique: true },
  zone: { type: String, required: true },
  type: {
    type: String,
    enum: ['STANDARD', 'ELECTRIC', 'ACCESSIBLE'],
    required: true
  },
  active: { type: Boolean, default: true }
});

export const ParkingSpot = model('ParkingSpot', parkingSpotSchema);
