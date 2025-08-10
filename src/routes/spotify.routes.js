// src/routes/spotify.routes.js
import express from 'express';
import * as ctrl from '../controllers/spotify.controllers.js';

const router = express.Router();

// OAuth
router.get('/login', ctrl.login);
router.get('/callback', ctrl.callback);

// Data endpoints
router.get('/', ctrl.aggregated); // GET /spotify -> aggregated JSON
router.get('/devices', ctrl.devices);

// Playback control
router.post('/play', ctrl.play);   // body: { trackId: "...", deviceId?: "..." } or { trackUri: "spotify:track:..." }
router.post('/stop', ctrl.stop);   // body: { deviceId?: "..." }

export default router;
