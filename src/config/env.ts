import 'dotenv/config';

export const port = Number(process.env.PORT ?? 3000);
export const mongodbUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/parkhub';
