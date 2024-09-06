"use server"
let at: string | undefined;
let att: number | undefined;

const AUTH0_CLIENT_ID = process.env.M2M_AUTH0_CLIENT_ID ?? ''
const AUTH0_CLIENT_SECRET = process.env.M2M_AUTH0_CLIENT_SECRET ?? ''
const AUTH0_AUDIENCE = process.env.M2M_AUTH0_AUDIENCE ?? ''
const AUTH0_TOKEN_URL = process.env.M2M_AUTH0_TOKEN_URL ?? ''

const CACHE_EXPIRY_MS = 3600000; 

export const getAuthToken = async () => {
  const now = Date.now();

  if (at && att && now - att < CACHE_EXPIRY_MS) {
    return at;
  }

  const response = await fetch(AUTH0_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      audience: AUTH0_AUDIENCE,
      grant_type: 'client_credentials'
    })
  });
  const data = await response.json();
  const token = data.access_token;

  at = token;
  att = now;

  return token;
};
