// src/controllers/spotify.controller.js
import * as spotifyService from '../services/spotify.services.js';
import * as config from '../config/index.js';

const SCOPES = [
  'user-top-read',
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-follow-read'
].join(' ');

function buildAuthUrl(state = '') {
  const params = new URLSearchParams({
    client_id: config.CLIENT_ID,
    response_type: 'code',
    redirect_uri: config.REDIRECT_URI,
    scope: SCOPES,
    show_dialog: 'true',
    state
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function login(req, res) {
  const url = buildAuthUrl();
  return res.redirect(url);
}

export async function callback(req, res) {
  const code = req.query.code;
  const err = req.query.error;
  if (err) return res.status(400).json({ error: err });

  if (!code) return res.status(400).json({ error: 'No code returned by Spotify' });

  try {
    await spotifyService.exchangeCodeForTokens(code);
    return res.json({
      success: true,
      message: 'Authorized with Spotify. You can now visit /spotify to see aggregated data.'
    });
  } catch (e) {
    console.error('Callback error', e);
    return res.status(500).json({ error: e.message || 'Failed to exchange code' });
  }
}

export async function aggregated(req, res) {
  try {
    const [topTracksResp, nowPlayingResp, followedResp] = await Promise.all([
      spotifyService.getTopTracks(10),
      spotifyService.getNowPlaying(),
      spotifyService.getFollowedArtists(50)
    ]);

    const topTracks = (topTracksResp?.items || []).map(t => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map(a => ({ id: a.id, name: a.name })),
      uri: t.uri,
      album: { id: t.album.id, name: t.album.name, images: t.album.images }
    }));

    const now_playing = nowPlayingResp
      ? {
          is_playing: nowPlayingResp.is_playing,
          progress_ms: nowPlayingResp.progress_ms,
          item: nowPlayingResp.item
            ? {
                id: nowPlayingResp.item.id,
                name: nowPlayingResp.item.name,
                artists: nowPlayingResp.item.artists.map(a => ({ id: a.id, name: a.name })),
                uri: nowPlayingResp.item.uri,
                album: nowPlayingResp.item.album
              }
            : null
        }
      : null;

    const followed_artists =
      followedResp?.artists?.items?.map(a => ({
        id: a.id,
        name: a.name,
        genres: a.genres,
        images: a.images
      })) || [];

    return res.json({
      top_tracks: topTracks,
      now_playing,
      followed_artists
    });
  } catch (e) {
    console.error('Error fetching spotify data', e?.response?.data || e.message || e);
    return res.status(500).json({ error: e.message || 'Failed to fetch spotify data' });
  }
}

export async function play(req, res) {
  try {
    const { trackId, trackUri, deviceId } = req.body;
    if (!trackId && !trackUri) {
      return res.status(400).json({ error: 'Provide trackId or trackUri' });
    }

    const uri = trackUri || `spotify:track:${trackId}`;
    await spotifyService.playTrack({ trackUri: uri, deviceId });
    return res.json({ success: true, message: `Started playback of ${uri}` });
  } catch (e) {
    console.error('Play error', e?.response?.data || e.message || e);
    const errData = e?.response?.data;
    return res.status(500).json({
      error:
        errData ||
        e.message ||
        'Failed to start playback. Make sure you have an active device and Spotify Premium.'
    });
  }
}

export async function stop(req, res) {
  try {
    const { deviceId } = req.body || {};
    await spotifyService.pause(deviceId);
    return res.json({ success: true, message: 'Playback paused' });
  } catch (e) {
    console.error('Pause error', e?.response?.data || e.message || e);
    const errData = e?.response?.data;
    return res.status(500).json({ error: errData || e.message || 'Failed to pause playback' });
  }
}

export async function devices(req, res) {
  try {
    const d = await spotifyService.getDevices();
    return res.json(d);
  } catch (e) {
    console.error('Devices error', e?.response?.data || e.message || e);
    return res.status(500).json({ error: e.message || 'Failed to fetch devices' });
  }
}
