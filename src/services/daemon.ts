export async function executePublishingDaemon(jobConfig: any) {
  const { platforms, mediaUrls, caption, tokens, linkedinCompanyId } = jobConfig;
  const logs: string[] = [];
  
  const log = (msg: string) => {
    console.log(`[DAEMON] ${msg}`);
    logs.push(msg);
  };

  log('Initializing API publishing sequence...');
  let hasErrors = false;

  try {
    for (const platform of platforms) {
      log(`Starting API sequence for ${platform}...`);
      
      if (platform === 'linkedin') {
        const token = tokens?.linkedin;
        if (!token) {
          log(`[ERROR] No LinkedIn access token provided.`);
          hasErrors = true;
          continue;
        }

        try {
          let authorUrn = '';

          if (linkedinCompanyId) {
            authorUrn = `urn:li:organization:${linkedinCompanyId}`;
            log(`Targeting LinkedIn Company Page: ${linkedinCompanyId}`);
          } else {
            log('Fetching LinkedIn user profile...');
            const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!userRes.ok) {
               const errText = await userRes.text();
               throw new Error(`Failed to fetch user info: ${errText}`);
            }
            
            const userData = await userRes.json();
            authorUrn = `urn:li:person:${userData.sub}`;
            log(`Authenticated as ${userData.name || authorUrn}`);
          }

          log('Publishing post to LinkedIn...');
          const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              author: authorUrn,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {
                    text: caption
                  },
                  shareMediaCategory: 'NONE'
                }
              },
              visibility: {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
              }
            })
          });

          if (!postRes.ok) {
            const errText = await postRes.text();
            throw new Error(`Failed to publish: ${errText}`);
          }

          log(`Successfully posted to LinkedIn via Official API!`);
        } catch (err: any) {
          log(`API failed on LinkedIn: ${err.message}`);
          hasErrors = true;
        }
      } else {
        log(`Platform '${platform}' API integration is pending. Skipping...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { success: !hasErrors, logs, error: hasErrors ? "One or more platforms failed to publish." : undefined };
  } catch (error: any) {
    log(`CRITICAL DAEMON ERROR: ${error.message}`);
    return { success: false, error: error.message, logs };
  }
}
