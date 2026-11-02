import express from 'express';
import path from 'node:path';
import parkingSpotRoutes from './features/parking-spots/parking-spot.routes';
import reservationRoutes from './features/reservations/reservation.routes';

const app = express();

app.use(express.json());
app.use('/api/spots', parkingSpotRoutes);
app.use('/api/reservations', reservationRoutes);
app.use(express.static(path.join(process.cwd(), 'src', 'public')));

export default app;
