import axios from 'axios';
import querystring from 'querystring';
import Token from '../models/token.model.js';
import * as config from '../config/index.js';

const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SPOTIFY_API = 'https://api.spotify.com/v1';

function basicAuthHeader() {
  const creds = `${config.CLIENT_ID}:${config.CLIENT_SECRET}`;
  return 'Basic ' + Buffer.from(creds).toString('base64');
}

async function getTokenDoc() {
  return await Token.findOne().exec();
}

async function upsertToken({ access_token, refresh_token, expires_in, scope, token_type }) {
  const expires_at = new Date(Date.now() + expires_in * 1000);
  const doc = await Token.findOne();
  if (doc) {
    doc.access_token = access_token;
    if (refresh_token) doc.refresh_token = refresh_token;
    doc.scope = scope || doc.scope;
    doc.token_type = token_type || doc.token_type;
    doc.expires_at = expires_at;
    await doc.save();
    return doc;
  } else {
    return await Token.create({ access_token, refresh_token, scope, token_type, expires_at });
  }
}

async function exchangeCodeForTokens(code) {
  const data = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.REDIRECT_URI
  });

  const res = await axios.post(`${SPOTIFY_ACCOUNTS}/api/token`, data, {
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return upsertToken(res.data);
}

async function refreshAccessToken() {
  const doc = await getTokenDoc();
  if (!doc || !doc.refresh_token) {
    throw new Error('No refresh token stored. Authorize first via /spotify/login.');
  }

  const data = querystring.stringify({
    grant_type: 'refresh_token',
    refresh_token: doc.refresh_token
  });

  const res = await axios.post(`${SPOTIFY_ACCOUNTS}/api/token`, data, {
    headers: {
      Authorization: basicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return upsertToken(res.data);
}

async function ensureAccessToken() {
  let doc = await getTokenDoc();
  if (!doc) throw new Error('No tokens found. Complete the OAuth login at /spotify/login');

  const timeLeft = new Date(doc.expires_at).getTime() - Date.now();
  if (!doc.expires_at || timeLeft < 60 * 1000) {
    doc = await refreshAccessToken();
  }
  return doc.access_token;
}

async function spotifyFetch(path, method = 'get', data = null, params = {}) {
  const accessToken = await ensureAccessToken();
  const resp = await axios.request({
    url: `${SPOTIFY_API}${path}`,
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    data,
    params
  });
  return resp;
}

async function getTopTracks(limit = 10) {
  const resp = await spotifyFetch(`/me/top/tracks`, 'get', null, { limit });
  return resp.data;
}

async function getNowPlaying() {
  try {
    const resp = await spotifyFetch(`/me/player/currently-playing`, 'get');
    if (resp.status === 204) return null;
    return resp.data;
  } catch (err) {
    if (err.response && err.response.status === 204) return null;
    throw err;
  }
}

async function getFollowedArtists(limit = 50) {
  const resp = await spotifyFetch(`/me/following`, 'get', null, { type: 'artist', limit });
  return resp.data;
}

async function getDevices() {
  const resp = await spotifyFetch(`/me/player/devices`, 'get');
  return resp.data;
}

async function playTrack({ trackUri, deviceId }) {
  const params = {};
  if (deviceId) params.device_id = deviceId;
  const body = { uris: [trackUri] };
  const resp = await spotifyFetch(`/me/player/play`, 'put', body, params);
  return resp.data;
}

async function pause(deviceId) {
  const params = {};
  if (deviceId) params.device_id = deviceId;
  const resp = await spotifyFetch(`/me/player/pause`, 'put', null, params);
  return resp.data;
}

export {
  exchangeCodeForTokens,
  getTopTracks,
  getNowPlaying,
  getFollowedArtists,
  getDevices,
  playTrack,
  pause
};
