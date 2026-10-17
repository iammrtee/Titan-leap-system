import express from 'express';
import crypto from 'crypto';

export const twitterManualRouter = express.Router();

// OAuth 1.0a keys for the legacy one-account poster. Set in the server environment only.
const API_KEY = process.env.TWITTER_API_KEY || '';
const API_SECRET = process.env.TWITTER_API_SECRET || '';
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET || '';

function percentEncode(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateOAuth1Header(method: string, url: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '');

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: ACCESS_TOKEN,
    oauth_version: '1.0'
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`).join('&');

  const signatureBaseString = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;
  const signingKey = `${percentEncode(API_SECRET)}&${percentEncode(ACCESS_TOKEN_SECRET)}`;

  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
  oauthParams['oauth_signature'] = signature;

  const headerString = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerString}`;
}

twitterManualRouter.post('/post', async (req, res) => {
  if (!API_KEY || !API_SECRET || !ACCESS_TOKEN || !ACCESS_TOKEN_SECRET) {
    return res.status(503).json({ success: false, error: 'X posting keys are not set. Use Connected Accounts → X instead.' });
  }
  try {
    const { text, mediaBase64 } = req.body;
    let mediaIds: string[] = [];

    if (mediaBase64 && mediaBase64.length > 0) {
      for (const b64 of mediaBase64) {
        // Extract base64 data
        const matches = b64.match(/^data:(.+);base64,(.+)$/);
        if (!matches) continue;
        const base64Data = matches[2];

        const uploadUrl = 'https://upload.twitter.com/1.1/media/upload.json';
        const authHeader = generateOAuth1Header('POST', uploadUrl);

        const formData = new FormData();
        formData.append('media_data', base64Data);

        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader
          },
          body: formData
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(`Media upload failed: ${JSON.stringify(uploadData)}`);
        }
        mediaIds.push(uploadData.media_id_string);
      }
    }

    const tweetUrl = 'https://api.twitter.com/2/tweets';
    const tweetAuthHeader = generateOAuth1Header('POST', tweetUrl);

    const tweetBody: any = { text };
    if (mediaIds.length > 0) {
      tweetBody.media = { media_ids: mediaIds };
    }

    const tweetRes = await fetch(tweetUrl, {
      method: 'POST',
      headers: {
        'Authorization': tweetAuthHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tweetBody)
    });

    const tweetData = await tweetRes.json();
    if (!tweetRes.ok) {
      throw new Error(`Tweet failed: ${JSON.stringify(tweetData)}`);
    }

    res.json({ success: true, data: tweetData });
  } catch (error: any) {
    console.error('Twitter Manual Post Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
