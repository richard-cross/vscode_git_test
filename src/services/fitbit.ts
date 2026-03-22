/**
 * Fitbit OAuth2 integration — runs entirely on-device.
 *
 * Uses Expo AuthSession for the OAuth flow and stores tokens in local SQLite.
 * Register your app at https://dev.fitbit.com with redirect URI:
 *   fittrack://fitbit-callback
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getSetting, setSetting } from '@/db/database';

WebBrowser.maybeCompleteAuthSession();

const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
const FITBIT_API_BASE = 'https://api.fitbit.com';
const SCOPES = ['activity', 'heartrate', 'profile'];

interface FitbitTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function getFitbitCredentials() {
  const clientId = await getSetting('fitbit_client_id');
  const clientSecret = await getSetting('fitbit_client_secret');
  return { clientId, clientSecret };
}

export async function isConnected(): Promise<boolean> {
  const token = await getSetting('fitbit_access_token');
  return token !== null;
}

export async function authorize(): Promise<boolean> {
  const { clientId, clientSecret } = await getFitbitCredentials();
  if (!clientId || !clientSecret) {
    throw new Error('Fitbit credentials not set. Go to Settings.');
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'fittrack', path: 'fitbit-callback' });

  const discovery = {
    authorizationEndpoint: FITBIT_AUTH_URL,
    tokenEndpoint: FITBIT_TOKEN_URL,
  };

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: SCOPES,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) {
    return false;
  }

  // Exchange code for tokens
  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      clientSecret,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : {},
    },
    discovery,
  );

  await setSetting('fitbit_access_token', tokenResult.accessToken);
  if (tokenResult.refreshToken) {
    await setSetting('fitbit_refresh_token', tokenResult.refreshToken);
  }
  const expiresAt = Date.now() + (tokenResult.expiresIn ?? 28800) * 1000;
  await setSetting('fitbit_expires_at', String(expiresAt));

  return true;
}

async function getAccessToken(): Promise<string> {
  let token = await getSetting('fitbit_access_token');
  const expiresAt = Number(await getSetting('fitbit_expires_at') ?? '0');

  if (!token) throw new Error('Fitbit not connected.');

  // Refresh if expired
  if (Date.now() > expiresAt - 60_000) {
    const refreshToken = await getSetting('fitbit_refresh_token');
    const { clientId, clientSecret } = await getFitbitCredentials();
    if (!refreshToken || !clientId || !clientSecret) {
      throw new Error('Cannot refresh Fitbit token. Re-connect.');
    }

    const resp = await fetch(FITBIT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
    });

    if (!resp.ok) throw new Error('Fitbit token refresh failed.');

    const data = await resp.json();
    await setSetting('fitbit_access_token', data.access_token);
    await setSetting('fitbit_refresh_token', data.refresh_token);
    await setSetting('fitbit_expires_at', String(Date.now() + data.expires_in * 1000));
    token = data.access_token;
  }

  return token!;
}

async function fitbitGet(path: string) {
  const token = await getAccessToken();
  const resp = await fetch(`${FITBIT_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new Error(`Fitbit API ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

export interface NormalizedActivity {
  source: 'fitbit';
  activity_type: string;
  date: string;
  start_time: string | null;
  duration_seconds: number;
  distance_miles: number;
  calories_burned: number;
  steps: number;
  avg_heart_rate: number | null;
  heart_rate_zones: string | null;
  elevation_gain_ft: number | null;
  fitbit_activity_id: string;
}

export async function fetchRecentActivities(days = 7): Promise<NormalizedActivity[]> {
  const results: NormalizedActivity[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    try {
      const data = await fitbitGet(`/1/user/-/activities/date/${dateStr}.json`);
      for (const act of data.activities ?? []) {
        const hrZones: Record<string, { minutes: number }> = {};
        for (const z of act.heartRateZones ?? []) {
          hrZones[z.name.toLowerCase().replace(/\s/g, '_')] = { minutes: z.minutes ?? 0 };
        }

        results.push({
          source: 'fitbit',
          activity_type: (act.activityName ?? 'walk').toLowerCase(),
          date: dateStr,
          start_time: act.startTime ?? null,
          duration_seconds: Math.round((act.duration ?? 0) / 1000),
          distance_miles: Math.round((act.distance ?? 0) * 0.621371 * 100) / 100,
          calories_burned: act.calories ?? 0,
          steps: act.steps ?? 0,
          avg_heart_rate: act.averageHeartRate ?? null,
          heart_rate_zones: Object.keys(hrZones).length ? JSON.stringify(hrZones) : null,
          elevation_gain_ft: act.elevationGain ?? null,
          fitbit_activity_id: String(act.logId ?? ''),
        });
      }
    } catch {
      // skip days with errors
    }
  }

  return results;
}

export async function disconnect(): Promise<void> {
  await setSetting('fitbit_access_token', '');
  await setSetting('fitbit_refresh_token', '');
  await setSetting('fitbit_expires_at', '0');
}
