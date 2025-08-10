// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
// import routes from './routes/index.js'; 

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// app.use('/spotify', routes.spotifyRoutes);

// health
app.get('/', (req, res) => res.json({ status: 'ok' }));


export default app;