const fs = require('fs');

const backgroundCode = `chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXECUTE_POST") {
    let { platforms, caption, mediaBase64, mediaUrls, linkedinCompanyId } = request.payload;

    const startAutomation = async () => {
      if ((!mediaBase64 || mediaBase64.length === 0) && mediaUrls && mediaUrls.length > 0) {
        console.log("TitanLeap: Recovering missing media...");
        const newB64 = [];
        for (const url of mediaUrls) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const buffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
            }
            newB64.push(\`data:\${blob.type};base64,\${btoa(binary)}\`);
          } catch(e) {}
        }
        mediaBase64 = newB64;
      }

      chrome.storage.local.set({ 
        'titanleap_payload': { caption, mediaBase64 }
      }, () => {
        if (platforms.includes('tw') || platforms.includes('x')) {
          chrome.tabs.create({ url: "https://twitter.com/compose/tweet" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectTwitterPost }); }, 5000);
          });
        }
        if (platforms.includes('li') && linkedinCompanyId) {
          chrome.tabs.create({ url: \`https://www.linkedin.com/company/\${linkedinCompanyId}/admin/\` }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectLinkedInPost }); }, 6500);
          });
        }
        if (platforms.includes('fb') || platforms.includes('ig')) {
          chrome.tabs.create({ url: "https://business.facebook.com/latest/composer" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectMetaBusinessPost }); }, 8000);
          });
        }
        if (platforms.includes('tt')) {
          chrome.tabs.create({ url: "https://www.tiktok.com/creator-center/upload" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectTikTokPost }); }, 7000);
          });
        }
      });
    };
    startAutomation();
  }
});

function logToScreen(msg) {
  let overlay = document.getElementById('titanleap-overlay');
  if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'titanleap-overlay';
      overlay.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999;background:rgba(0,0,0,0.85);color:#0f0;padding:15px;border-radius:8px;font-family:monospace;font-size:14px;max-width:400px;pointer-events:none;box-shadow:0 4px 6px rgba(0,0,0,0.5);border:1px solid #333;';
      document.body.appendChild(overlay);
      const title = document.createElement('div');
      title.style.cssText = 'font-weight:bold;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:5px;';
      title.innerText = '🚀 TitanLeap Bot Automation';
      overlay.appendChild(title);
  }
  const div = document.createElement('div');
  div.style.marginBottom = '5px';
  div.innerText = '> ' + msg;
  overlay.appendChild(div);
  console.log("TitanLeap:", msg);
}

function getFilesFromBase64(mediaDataArray) {
  if (!mediaDataArray) return new DataTransfer();
  const dt = new DataTransfer();
  mediaDataArray.forEach((b64, i) => {
    try {
      const matches = b64.match(/^data:(.+?);base64,(.+)$/);
      if (matches) {
        const mime = matches[1];
        let ext = mime.split('/')[1] || 'png';
        if (ext === 'jpeg') ext = 'jpg';
        if (ext === 'quicktime') ext = 'mov';
        const byteString = atob(matches[2].replace(/\\s/g, ''));
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
        const file = new File([ab], \`media_\${String(i).padStart(3, '0')}.\${ext}\`, { type: mime });
        dt.items.add(file);
      }
    } catch(e) {}
  });
  return dt;
}

function universalInjectText(element, text) {
  if (!element || !text) return;
  element.focus();
  element.click();
  
  if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set 
          || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      if (nativeInputValueSetter) {
          nativeInputValueSetter.call(element, text);
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return;
      }
  }
  
  const dt = new DataTransfer();
  dt.setData('text/plain', text);
  const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
  element.dispatchEvent(pasteEvent);
  
  setTimeout(() => {
      const injected = document.execCommand('insertText', false, text);
      if (!injected && element.isContentEditable) {
          element.textContent = text;
          element.dispatchEvent(new Event('input', { bubbles: true }));
      }
  }, 100);
}

function injectTwitterPost() {
  ${'`' + 'logToScreen, getFilesFromBase64, universalInjectText are passed down normally but since this is injected as a function, chrome scripting isolation means we MUST nest them' + '`'}
}
`;

const actualBackgroundCode = `chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXECUTE_POST") {
    let { platforms, caption, mediaBase64, mediaUrls, linkedinCompanyId } = request.payload;

    const startAutomation = async () => {
      if ((!mediaBase64 || mediaBase64.length === 0) && mediaUrls && mediaUrls.length > 0) {
        const newB64 = [];
        for (const url of mediaUrls) {
          try {
            const resp = await fetch(url);
            const blob = await resp.blob();
            const buffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i += 8192) {
              binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
            }
            newB64.push(\`data:\${blob.type};base64,\${btoa(binary)}\`);
          } catch(e) {}
        }
        mediaBase64 = newB64;
      }

      chrome.storage.local.set({ 'titanleap_payload': { caption, mediaBase64 } }, () => {
        if (platforms.includes('tw') || platforms.includes('x')) {
          chrome.tabs.create({ url: "https://twitter.com/compose/tweet" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectTwitterPost }); }, 5000);
          });
        }
        if (platforms.includes('li') && linkedinCompanyId) {
          chrome.tabs.create({ url: \`https://www.linkedin.com/company/\${linkedinCompanyId}/admin/\` }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectLinkedInPost }); }, 6500);
          });
        }
        if (platforms.includes('fb') || platforms.includes('ig')) {
          chrome.tabs.create({ url: "https://business.facebook.com/latest/composer" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectMetaBusinessPost }); }, 8000);
          });
        }
        if (platforms.includes('tt')) {
          chrome.tabs.create({ url: "https://www.tiktok.com/creator-center/upload" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectTikTokPost }); }, 7000);
          });
        }
      });
    };
    startAutomation();
  }
});

const utilsObj = {
  logToScreen: function(msg) {
    let overlay = document.getElementById('titanleap-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'titanleap-overlay';
        overlay.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999;background:rgba(0,0,0,0.85);color:#0f0;padding:15px;border-radius:8px;font-family:monospace;font-size:14px;max-width:400px;pointer-events:none;box-shadow:0 4px 6px rgba(0,0,0,0.5);border:1px solid #333;';
        document.body.appendChild(overlay);
        const title = document.createElement('div');
        title.style.cssText = 'font-weight:bold;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:5px;';
        title.innerText = '🚀 TitanLeap Bot Automation';
        overlay.appendChild(title);
    }
    const div = document.createElement('div');
    div.style.marginBottom = '5px';
    div.innerText = '> ' + msg;
    overlay.appendChild(div);
  },
  getFilesFromBase64: function(mediaDataArray) {
    if (!mediaDataArray) return new DataTransfer();
    const dt = new DataTransfer();
    mediaDataArray.forEach((b64, i) => {
      try {
        const matches = b64.match(/^data:(.+?);base64,(.+)$/);
        if (matches) {
          const mime = matches[1];
          let ext = mime.split('/')[1] || 'png';
          if (ext === 'jpeg') ext = 'jpg';
          if (ext === 'quicktime') ext = 'mov';
          const byteString = atob(matches[2].replace(/\\s/g, ''));
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
          const file = new File([ab], \`media_\${String(i).padStart(3, '0')}.\${ext}\`, { type: mime });
          dt.items.add(file);
        }
      } catch(e) {}
    });
    return dt;
  },
  universalInjectText: function(element, text) {
    if (!element || !text) return;
    element.focus();
    element.click();
    
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set 
            || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, text);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }
    }
    
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    element.dispatchEvent(pasteEvent);
    
    setTimeout(() => {
        const injected = document.execCommand('insertText', false, text);
        if (!injected && element.isContentEditable) {
            element.textContent = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 100);
  }
};

const utilDefs = \`\n\${utilsObj.logToScreen.toString()}\n\${utilsObj.getFilesFromBase64.toString()}\n\${utilsObj.universalInjectText.toString()}\n\`;

function injectTwitterPost() {
  eval(\`\${logToScreen}\`); eval(\`\${getFilesFromBase64}\`); eval(\`\${universalInjectText}\`);
  logToScreen("Twitter Bot Initialized. Awaiting Local Storage Payload...");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) { logToScreen("Fatal: Payload dropped!"); return; }
    logToScreen("Payload received! Securing target...");
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      const textBox = document.querySelector('div[data-testid="tweetTextarea_0"]');
      if (textBox) {
        clearInterval(initCheck);
        logToScreen("Found Tweet Text Box. Injecting caption...");
        universalInjectText(textBox, caption);
        setTimeout(() => {
          if (mediaData && mediaData.length > 0) {
            logToScreen("Processing " + mediaData.length + " media files...");
            const dt = getFilesFromBase64(mediaData);
            const fileInput = document.querySelector('input[data-testid="fileInput"]');
            if (fileInput) {
              fileInput.files = dt.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
              logToScreen("Media Files forcefully bound to input.");
            } else logToScreen("Warning: Could not find media input layer.");
          }
          let attempts = 0;
          logToScreen("Hunting for Publish Button readiness...");
          const checkReady = setInterval(() => {
            attempts++;
            const tweetBtn = document.querySelector('button[data-testid="tweetButton"]');
            if (tweetBtn && tweetBtn.getAttribute('aria-disabled') !== 'true') {
              clearInterval(checkReady);
              logToScreen("Publish button is Active! Clicking in 2s...");
              setTimeout(() => { tweetBtn.click(); logToScreen("✅ SUCCESS: Post Published to X!"); }, 2000);
            } else if (attempts > 50) {
              clearInterval(checkReady);
              logToScreen("Timed out awaiting Publish button readiness.");
            }
          }, 500);
        }, 1500);
      } else if (initAttempts > 60) {
        clearInterval(initCheck);
        logToScreen("Failed to locate Tweet box after 30 seconds. DOM might have changed.");
      }
    }, 500);
  });
}

function injectMetaBusinessPost() {
  eval(\`\${logToScreen}\`); eval(\`\${getFilesFromBase64}\`); eval(\`\${universalInjectText}\`);
  logToScreen("Meta Business Suite Bot Initialized.");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) { logToScreen("Fatal error: Payload unavailable."); return; }
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-label="Dialog"]');
      dialogs.forEach(d => {
        const closeBtn = Array.from(d.querySelectorAll('div[aria-label="Close"], button[aria-label="Close"], i')).find(el => el);
        if (closeBtn) closeBtn.click();
        const doneBtn = Array.from(d.querySelectorAll('div[role="button"], button')).find(b => b.innerText && b.innerText.trim().toLowerCase() === 'done');
        if (doneBtn) doneBtn.click();
      });
      const editor = document.querySelector('textarea, div[contenteditable="true"][role="textbox"]');
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      const mediaInput = fileInputs.find(input => input.accept && (input.accept.includes('video') || input.accept.includes('image')));
      if (editor || mediaInput) {
        clearInterval(initCheck);
        if (editor) { logToScreen("Found Meta Text Editor. Sending payload..."); universalInjectText(editor, caption); }
        setTimeout(() => {
          if (mediaData && mediaData.length > 0) {
            logToScreen("Encoding Base64 to ArrayBuffer for Meta...");
            const dt = getFilesFromBase64(mediaData);
            let injected = false;
            for (const input of fileInputs) {
              if (input.accept && (input.accept.includes('video') || input.accept.includes('image'))) {
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                injected = true;
                logToScreen("Media files successfully mapped to Meta DOM.");
                break;
              }
            }
            if (!injected && editor) {
               logToScreen("Injecting via drag-and-drop fallback.");
               const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
               editor.dispatchEvent(dropEvent);
            }
          }
          let attempts = 0;
          logToScreen("Awaiting processing block & publish permissions...");
          const checkReady = setInterval(() => {
            attempts++;
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            const publishBtn = buttons.find(btn => {
               const text = btn.textContent ? btn.textContent.trim().toLowerCase() : "";
               return text === 'publish' || text === 'schedule' || text === 'post';
            });
            if (publishBtn && publishBtn.getAttribute('aria-disabled') !== 'true') {
              clearInterval(checkReady);
              logToScreen("Publish active! Queuing final click...");
              setTimeout(() => { publishBtn.click(); logToScreen("✅ SUCCESS: Pushed to Meta Business!"); }, 3000);
            } else if (attempts > 80) {
              clearInterval(checkReady);
              logToScreen("Timeout: Meta processing took over 80 cycles.");
            }
          }, 1000);
        }, 3000);
      } else if (initAttempts > 60) {
        clearInterval(initCheck);
        logToScreen("Failed to locate Composer interface.");
      }
    }, 1000);
  });
}

function injectLinkedInPost() {
  eval(\`\${logToScreen}\`); eval(\`\${getFilesFromBase64}\`); eval(\`\${universalInjectText}\`);
  logToScreen("LinkedIn Bot Initiated.");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) return;
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      const startPostBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(el => {
        const txt = (el.innerText || "").toLowerCase();
        return txt.includes('start a post') || txt.includes('create a post');
      });
      if (startPostBtn) {
        clearInterval(initCheck);
        logToScreen("Found standard 'Start a Post' button. Bypassing...");
        startPostBtn.click();
        let editorAttempts = 0;
        const editorCheck = setInterval(() => {
          editorAttempts++;
          const editor = document.querySelector('div.ql-editor, div[role="textbox"]');
          if (editor) {
            clearInterval(editorCheck);
            logToScreen("Editor found. Submitting caption...");
            universalInjectText(editor, caption);
            setTimeout(() => {
              if (mediaData && mediaData.length > 0) {
                logToScreen("Injecting media structures...");
                const dt = getFilesFromBase64(mediaData);
                const fileInput = document.querySelector('input[type="file"]');
                if (fileInput) {
                  fileInput.files = dt.files;
                  fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                   const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
                   editor.dispatchEvent(dropEvent);
                }
              }
              let attempts = 0;
              logToScreen("Waiting for confirmation sequence...");
              const checkReady = setInterval(() => {
                attempts++;
                const postBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Post' || b.innerText.trim() === 'Done');
                if (postBtn && !postBtn.disabled && !postBtn.ariaDisabled) {
                  clearInterval(checkReady);
                  setTimeout(() => { postBtn.click(); logToScreen("✅ SUCCESS: Pushed to LinkedIn Company!"); }, 1500);
                } else if (attempts > 60) {
                  clearInterval(checkReady);
                }
              }, 500);
            }, 1500);
          } else if (editorAttempts > 60) {
            clearInterval(editorCheck);
          }
        }, 500);
      } else if (initAttempts > 60) {
        clearInterval(initCheck);
      }
    }, 500);
  });
}

function injectTikTokPost() {
  eval(\`\${logToScreen}\`); eval(\`\${getFilesFromBase64}\`); eval(\`\${universalInjectText}\`);
  logToScreen("TikTok Studio Bot Live.");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) return;
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;
    if (!mediaData || mediaData.length === 0) { logToScreen("Warning: TikTok explicitly requires Video Media payloads."); return; }
    let dt = getFilesFromBase64(mediaData);
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      const fileInput = document.querySelector('input[type="file"], input[accept="video/*"]');
      const dropZone = document.querySelector('.upload-btn-input, .container-upload-btn') || document.body;
      if (fileInput || document.querySelector('.upload-btn-input')) {
        clearInterval(initCheck);
        logToScreen("TikTok Uploader located.");
        if (fileInput) {
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
          dropZone.dispatchEvent(dropEvent);
        }
        let uploadWaitAttempts = 0;
        logToScreen("Awaiting TikTok Media verification engine...");
        const captionCheck = setInterval(() => {
          uploadWaitAttempts++;
          const editor = document.querySelector('.public-DraftEditor-content, div[contenteditable="true"]');
          if (editor && editor.offsetParent !== null) {
            clearInterval(captionCheck);
            logToScreen("TikTok Parser complete. Attaching caption...");
            universalInjectText(editor, caption);
            let attempts = 0;
            const checkReady = setInterval(() => {
              attempts++;
              const buttons = Array.from(document.querySelectorAll('button'));
              const postBtn = buttons.find(b => b.innerText.trim() === 'Post' || b.innerText.trim() === 'Publish');
              if (postBtn && !postBtn.disabled && !postBtn.className.includes('disabled')) {
                clearInterval(checkReady);
                logToScreen("System clear! Posting in 2s...");
                setTimeout(() => { postBtn.click(); logToScreen("✅ SUCCESS: Pushed to TikTok!"); }, 2000);
              } else if (attempts > 80) {
                clearInterval(checkReady);
                logToScreen("Timed out awaiting Post button.");
              }
            }, 1000);
          } else if (uploadWaitAttempts > 90) {
            clearInterval(captionCheck);
            logToScreen("TikTok taking too long to verify video.");
          }
        }, 1000);
      } else if (initAttempts > 60) {
        clearInterval(initCheck);
      }
    }, 1000);
  });
}
\`.replace(/eval\\\(\\\`\\\$\\{/g, '').replace(/\\}\\\`\\\)/g, '').replace(/logToScreen;/g, utilsObj.logToScreen.toString())
.replace(/getFilesFromBase64;/g, utilsObj.getFilesFromBase64.toString())
.replace(/universalInjectText;/g, utilsObj.universalInjectText.toString());

fs.writeFileSync('public/titanleap-extension/background.js', actualBackgroundCode);
console.log("SUCCESS!");
