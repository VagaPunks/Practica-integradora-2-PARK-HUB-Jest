import { Router } from 'express';
import * as parkingSpotService from './parking-spot.service';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const spots = await parkingSpotService.getActiveSpots();
    res.json(spots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load parking spots' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const spot = await parkingSpotService.getSpotById(req.params.id);
    if (!spot) {
      res.status(404).json({ message: 'Parking spot not found' });
      return;
    }

    res.json(spot);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load parking spot' });
  }
});

export default router;
