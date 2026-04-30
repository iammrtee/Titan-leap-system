import fs from 'fs';

const CONST_UTILS = `
  function logToScreen(msg) {
    let overlay = document.getElementById('titanleap-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'titanleap-overlay';
        overlay.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999;background:rgba(0,0,0,0.9);color:#0f0;padding:15px;border-radius:8px;font-family:monospace;font-size:14px;max-width:400px;pointer-events:none;box-shadow:0 4px 6px rgba(0,0,0,0.5);border:1px solid #333;';
        document.body.appendChild(overlay);
        const title = document.createElement('div');
        title.style.cssText = 'font-weight:bold;margin-bottom:10px;border-bottom:1px solid #333;padding-bottom:5px;';
        title.innerText = '🚀 TitanLeap Bot Automation (v19)';
        overlay.appendChild(title);
    }
    const div = document.createElement('div');
    div.style.marginBottom = '5px';
    div.innerText = '> ' + msg;
    overlay.appendChild(div);
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
    if (!element || !text) return false;
    element.focus();
    element.click();
    
    // 1. Direct value bypass for Native Inputs & Textareas (Bypasses React)
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set 
            || Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(element, text);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }
    }
    
    // 2. Draft.js / Quill / Lexical bypass via simulated Paste Event
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    element.dispatchEvent(pasteEvent);
    
    // 3. Fallback execCommand
    setTimeout(() => {
        const injected = document.execCommand('insertText', false, text);
        if (!injected && element.isContentEditable) {
            element.textContent = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 100);
    return true;
  }

  function simulateDragDrop(element, dt) {
    if(!element) return;
    ['dragenter', 'dragover', 'drop'].forEach(eventName => {
      const event = new DragEvent(eventName, {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt
      });
      element.dispatchEvent(event);
    });
  }

  function triggerFileInput(fileInput, dt) {
    if(!fileInput) return false;
    try {
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        fileInput.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    } catch(e) {
        console.error("TitanLeap File Input Error:", e);
        return false;
    }
  }
`;

const bg = `chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        const delayStart = 5000;
        
        if (platforms.includes('tw') || platforms.includes('x')) {
          chrome.tabs.create({ url: "https://twitter.com/compose/tweet" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectTwitterPost }); }, delayStart);
          });
        }
        if (platforms.includes('li') && linkedinCompanyId) {
          chrome.tabs.create({ url: \`https://www.linkedin.com/company/\${linkedinCompanyId}/admin/\` }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectLinkedInPost }); }, delayStart + 1500);
          });
        }
        if (platforms.includes('fb') || platforms.includes('ig')) {
          chrome.tabs.create({ url: "https://business.facebook.com/latest/composer" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectMetaBusinessPost }); }, delayStart + 3000);
          });
        }
        if (platforms.includes('tt')) {
          chrome.tabs.create({ url: "https://www.tiktok.com/creator-center/upload" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectTikTokPost }); }, delayStart + 2000);
          });
        }
      });
    };
    startAutomation();
  }
});

function injectTwitterPost() {
  CONST_UTILS_PLACEHOLDER
  logToScreen("Twitter Bot Initialized. Awaiting Local Storage Payload...");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) { logToScreen("Fatal: Payload dropped!"); return; }
    logToScreen("Payload received! Securing target...");
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      const textBox = document.querySelector('.public-DraftEditor-content'); // X DraftJS
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
              triggerFileInput(fileInput, dt);
              logToScreen("Media Files forcefully bound to input.");
            } else {
              logToScreen("Warning: fileInput missing. Trying Drag-and-Drop...");
              simulateDragDrop(document.querySelector('div[data-testid="primaryColumn"]'), dt);
            }
          }
          let attempts = 0;
          logToScreen("Hunting for Publish Button...");
          const checkReady = setInterval(() => {
            attempts++;
            const tweetBtn = document.querySelector('button[data-testid="tweetButton"]');
            if (tweetBtn && tweetBtn.getAttribute('aria-disabled') !== 'true' && tweetBtn.getAttribute('disabled') === null && !tweetBtn.classList.contains('is-disabled')) {
              clearInterval(checkReady);
              logToScreen("Publish button is Active! Clicking in 3s...");
              setTimeout(() => { tweetBtn.click(); logToScreen("✅ SUCCESS: Post Published!"); }, 3000);
            } else if (attempts > 120) {
              clearInterval(checkReady); logToScreen("Timed out awaiting Publish button readiness.");
            }
          }, 1000);
        }, 1500);
      } else if (initAttempts > 60) {
        clearInterval(initCheck); logToScreen("Failed to locate Tweet box.");
      }
    }, 500);
  });
}

function injectMetaBusinessPost() {
  CONST_UTILS_PLACEHOLDER
  logToScreen("Meta Business Suite Bot Initialized.");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) { logToScreen("Fatal error: Payload unavailable."); return; }
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      // Auto-close dialogs/coachmarks
      const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-label="Dialog"]');
      dialogs.forEach(d => {
        const closeBtn = Array.from(d.querySelectorAll('div[aria-label="Close"], button[aria-label="Close"], i')).find(el => el);
        if (closeBtn) closeBtn.click();
        const doneBtn = Array.from(d.querySelectorAll('div[role="button"], button')).find(b => b.innerText && b.innerText.trim().toLowerCase() === 'done');
        if (doneBtn) doneBtn.click();
      });
      // Locate editor
      const editor = document.querySelector('textarea, div[contenteditable="true"][role="textbox"]');
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      let mediaInput = fileInputs.find(i => i.accept && (i.accept.includes('video') || i.accept.includes('image')));
      if(!mediaInput && fileInputs.length > 0) mediaInput = fileInputs[0];

      if (editor || mediaInput) {
        clearInterval(initCheck);
        if (editor) { logToScreen("Found Meta Editor. Injecting..."); universalInjectText(editor, caption); }
        setTimeout(() => {
          if (mediaData && mediaData.length > 0) {
            logToScreen("Attaching Media to Meta...");
            const dt = getFilesFromBase64(mediaData);
            if(mediaInput) {
                triggerFileInput(mediaInput, dt);
                logToScreen("Media Files forcefully bound to Meta input.");
            } else if (editor) {
               logToScreen("Injecting via Drag-and-Drop fallback.");
               simulateDragDrop(editor, dt);
            }
          }
          let attempts = 0;
          logToScreen("Awaiting Meta publish permissions...");
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
            } else if (attempts > 120) {
              clearInterval(checkReady); logToScreen("Timeout: Meta processing took over 120 cycles.");
            }
          }, 1000);
        }, 3000);
      } else if (initAttempts > 60) {
        clearInterval(initCheck); logToScreen("Failed to locate Composer interface.");
      }
    }, 1000);
  });
}

function injectLinkedInPost() {
  CONST_UTILS_PLACEHOLDER
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
        logToScreen("Opening Post Dialog...");
        startPostBtn.click();
        let editorAttempts = 0;
        const editorCheck = setInterval(() => {
          editorAttempts++;
          const editor = document.querySelector('.ql-editor, div[role="textbox"]');
          if (editor) {
            clearInterval(editorCheck);
            logToScreen("Editor found. Submitting caption...");
            universalInjectText(editor, caption);
            setTimeout(() => {
              if (mediaData && mediaData.length > 0) {
                logToScreen("Injecting media...");
                const dt = getFilesFromBase64(mediaData);
                const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
                if (fileInputs.length > 0) {
                  triggerFileInput(fileInputs[0], dt);
                } else {
                   simulateDragDrop(editor, dt);
                }
              }
              let attempts = 0;
              logToScreen("Waiting for confirmation sequence...");
              const checkReady = setInterval(() => {
                attempts++;
                const postBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Post' || b.innerText.trim() === 'Done');
                if (postBtn && !postBtn.disabled && !postBtn.ariaDisabled) {
                  clearInterval(checkReady);
                  setTimeout(() => { postBtn.click(); logToScreen("✅ SUCCESS: Pushed to LinkedIn!"); }, 1500);
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
  CONST_UTILS_PLACEHOLDER
  logToScreen("TikTok Studio Bot Live! Booting up...");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) return;
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;
    if (!mediaData || mediaData.length === 0) { logToScreen("Error: TikTok explicitly requires Video files."); return; }
    
    let dt = getFilesFromBase64(mediaData);
    let initAttempts = 0;
    
    const initCheck = setInterval(() => {
      initAttempts++;
      
      // Look globally for file inputs, then specifically inside iframes (TikTok sometimes frames the uploader)
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      let fileInput = fileInputs.find(i => i.accept && i.accept.includes('video'));
      if(!fileInput && fileInputs.length > 0) fileInput = fileInputs[0];
      
      // Fallback Dropzone
      const iframe = document.querySelector('iframe');
      let dropZone = document.querySelector('.upload-btn-input, .container-upload-btn, .tiktok-upload-btn, .upload-container') || document.body;
      let targetDoc = document;

      // Unpack iframe if it exists
      if (iframe && iframe.contentDocument) {
          logToScreen("Iframe detected. Scanning internal DOM...");
          targetDoc = iframe.contentDocument;
          const iframeInputs = Array.from(targetDoc.querySelectorAll('input[type="file"]'));
          if (iframeInputs.length > 0) fileInput = iframeInputs[0];
          dropZone = targetDoc.querySelector('.upload-btn-input, .container-upload-btn, .tiktok-upload-btn, .upload-container') || targetDoc.body;
      }

      if (fileInput || targetDoc.querySelector('div[class*="upload"]')) {
        clearInterval(initCheck);
        logToScreen("TikTok Uploader target acquired!");

        // METHOD 1: Force File Input Change (The most reliable React bypass)
        if (fileInput) {
          logToScreen("Binding physical video files to hidden input.");
          triggerFileInput(fileInput, dt);
        } else {
          // METHOD 2: Drag and Drop Simulate
          logToScreen("File input masked. Forcing Native Drag & Drop payload.");
          simulateDragDrop(dropZone, dt);
        }
        
        // Start watching for the next phase: The Edit Upload / Caption screen.
        let uploadWaitAttempts = 0;
        logToScreen("Waiting for TikTok to transition to video processing UI...");
        
        const captionCheck = setInterval(() => {
          uploadWaitAttempts++;
          let editor = targetDoc.querySelector('.public-DraftEditor-content, div[contenteditable="true"]');
          
          if (editor && editor.offsetParent !== null) {
            clearInterval(captionCheck);
            logToScreen("TikTok processing screen loaded! Injecting text...");
            universalInjectText(editor, caption);
            
            let attempts = 0;
            const checkReady = setInterval(() => {
              attempts++;
              const buttons = Array.from(targetDoc.querySelectorAll('button'));
              const postBtn = buttons.find(b => {
                 const t = b.innerText.trim().toLowerCase();
                 return t === 'post' || t === 'publish' || t === 'upload';
              });
              
              if (postBtn && !postBtn.disabled && !postBtn.className.includes('disabled')) {
                clearInterval(checkReady);
                logToScreen("System clear! Post Button Unlocked. Executing in 3s...");
                setTimeout(() => { postBtn.click(); logToScreen("✅ SUCCESS: Pushed to TikTok!"); }, 3000);
              } else if (attempts > 120) {
                clearInterval(checkReady); logToScreen("Timeout: Post button remained locked.");
              }
            }, 1000);
            
          } else {
             if (uploadWaitAttempts === 15) logToScreen("TikTok is processing the video...");
             if (uploadWaitAttempts === 45) logToScreen("Still waiting for video to process. (If it failed, refreshing helps).");
             if (uploadWaitAttempts > 180) {
                clearInterval(captionCheck); logToScreen("Fatal: TikTok took over 3 minutes to handle the file block.");
             }
          }
        }, 1000);
      } else if (initAttempts > 60) {
        clearInterval(initCheck); logToScreen("Failed to find TikTok uploader. Are you logged in?");
      }
    }, 1000);
  });
}
`;

fs.writeFileSync('public/titanleap-extension/background.js', bg.replace(/CONST_UTILS_PLACEHOLDER/g, CONST_UTILS));
console.log("Success Built v19");