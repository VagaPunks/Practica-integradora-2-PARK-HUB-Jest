import mongoose from 'mongoose';
import app from './app';
import { mongodbUri, port } from './config/env';

async function startServer() {
  try {
    await mongoose.connect(mongodbUri);
    app.listen(port, () => {
      console.log(`ParkHub running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Could not connect to MongoDB:', error);
    process.exitCode = 1;
  }
}

startServer();
