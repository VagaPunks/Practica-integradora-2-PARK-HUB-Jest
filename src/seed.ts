import mongoose from 'mongoose';
import { mongodbUri } from './config/env';
import { ParkingSpot } from './features/parking-spots/parking-spot.model';

const spots = [
  { number: 'A01', zone: 'A', type: 'STANDARD', active: true },
  { number: 'A02', zone: 'A', type: 'STANDARD', active: true },
  { number: 'A03', zone: 'A', type: 'ELECTRIC', active: true },
  { number: 'B01', zone: 'B', type: 'ACCESSIBLE', active: true },
  { number: 'B02', zone: 'B', type: 'STANDARD', active: true }
];

async function seed() {
  try {
    await mongoose.connect(mongodbUri);

    for (const spot of spots) {
      await ParkingSpot.updateOne(
        { number: spot.number },
        { $set: spot },
        { upsert: true }
      );
    }

    console.log('Seeded 5 parking spots.');
  } catch (error) {
    console.error('Could not seed parking spots:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seed();
