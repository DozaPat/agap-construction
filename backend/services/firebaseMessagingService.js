const { createSign } = require('crypto');
const { readFileSync } = require('fs');
const PushSubscription = require('../models/PushSubscription');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_MESSAGING_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
let cachedAccessToken = null;
let accessTokenExpiresAt = 0;

const base64Url = (value) => Buffer.from(value)
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

const firebaseCredentials = () => {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credentialPath) {
    try {
      const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8'));
      if (
        serviceAccount.project_id &&
        serviceAccount.client_email &&
        serviceAccount.private_key
      ) {
        return {
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key
        };
      }
    } catch (error) {
      console.error('Unable to read Firebase service account:', error.message);
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
};

const isFirebaseConfigured = () => Boolean(firebaseCredentials());

const getAccessToken = async () => {
  if (cachedAccessToken && Date.now() < accessTokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const credentials = firebaseCredentials();
  if (!credentials) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(JSON.stringify({
    iss: credentials.clientEmail,
    scope: GOOGLE_MESSAGING_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsignedToken = `${header}.${claims}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${base64Url(signer.sign(credentials.privateKey))}`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || 'Firebase authentication failed');
  }

  cachedAccessToken = payload.access_token;
  accessTokenExpiresAt = Date.now() + Number(payload.expires_in || 3600) * 1000;
  return cachedAccessToken;
};

const sendToToken = async ({ accessToken, projectId, token, notification }) => {
  const data = Object.fromEntries(
    Object.entries(notification.data || {}).map(([key, value]) => [key, String(value)])
  );
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: notification.title,
            body: notification.message
          },
          data,
          android: {
            priority: 'high',
            notification: {
              channel_id: 'agap_alerts',
              sound: 'default'
            }
          }
        }
      })
    }
  );

  if (response.ok) return { delivered: true };
  const payload = await response.json().catch(() => ({}));
  const status = payload?.error?.status;
  return {
    delivered: false,
    invalid: response.status === 404 || status === 'NOT_FOUND' || status === 'INVALID_ARGUMENT'
  };
};

const sendPushToUsers = async (userIds, notification) => {
  if (!userIds.length || !isFirebaseConfigured()) return;

  try {
    const credentials = firebaseCredentials();
    const accessToken = await getAccessToken();
    if (!accessToken) return;
    const subscriptions = await PushSubscription.find({
      user: { $in: userIds }
    }).select('token');

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => ({
        subscription,
        result: await sendToToken({
          accessToken,
          projectId: credentials.projectId,
          token: subscription.token,
          notification
        })
      }))
    );

    const invalidIds = results
      .filter((result) => result.status === 'fulfilled' && result.value.result.invalid)
      .map((result) => result.value.subscription._id);
    if (invalidIds.length) {
      await PushSubscription.deleteMany({ _id: { $in: invalidIds } });
    }
  } catch (error) {
    console.error('Firebase push delivery failed:', error.message);
  }
};

module.exports = { isFirebaseConfigured, sendPushToUsers };
