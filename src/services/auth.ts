import express from 'express';

const router = express.Router();

// 1. Get OAuth URL for Twitter
router.get('/twitter/url', (req, res) => {
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`;
  
  // Twitter OAuth 2.0 parameters
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID || '',
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: 'state', // In production, use a secure random string
    code_challenge: 'challenge', // In production, use PKCE
    code_challenge_method: 'plain'
  });

  res.json({ url: `https://twitter.com/i/oauth2/authorize?${params.toString()}` });
});

// 2. Twitter OAuth Callback
router.get('/twitter/callback', async (req, res) => {
  const { code, state } = req.query;
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/twitter/callback`;

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code: code as string,
        grant_type: 'authorization_code',
        client_id: process.env.TWITTER_CLIENT_ID || '',
        redirect_uri: redirectUri,
        code_verifier: 'challenge' // Must match the code_challenge from step 1
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Twitter Token Error:', tokenData);
      throw new Error('Failed to get Twitter tokens');
    }

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            // Send the tokens back to the main window
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                platform: 'twitter',
                tokens: ${JSON.stringify(tokenData)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send('Authentication failed');
  }
});

// 3. Get OAuth URL for LinkedIn
router.get('/linkedin/url', (req, res) => {
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`;
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID || '',
    redirect_uri: redirectUri,
    state: 'state', // In production, use a secure random string
    scope: 'w_member_social w_organization_social rw_organization_admin' // Scopes for posting to personal and company pages
  });

  res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}` });
});

// 4. LinkedIn OAuth Callback
router.get('/linkedin/callback', async (req, res) => {
  const { code, state } = req.query;
  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/linkedin/callback`;

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || ''
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('LinkedIn Token Error:', tokenData);
      throw new Error('Failed to get LinkedIn tokens');
    }

    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                platform: 'linkedin',
                tokens: ${JSON.stringify(tokenData)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send('Authentication failed');
  }
});

export const authRouter = router;
