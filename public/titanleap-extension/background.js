chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "EXECUTE_POST") {
    let { platforms, caption, mediaBase64, mediaUrls, linkedinCompanyId } = request.payload;

    const startAutomation = async () => {
      // Proxy missing Base64 from media Urls.
      if ((!mediaBase64 || mediaBase64.length === 0) && mediaUrls && mediaUrls.length > 0) {
        console.log("TitanLeap: Recovering missing media files via background proxy...");
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
            newB64.push(`data:${blob.type};base64,${btoa(binary)}`);
          } catch(e) {
            console.error("TitanLeap: Extension failed to fetch media", e);
          }
        }
        mediaBase64 = newB64;
      }

      // 1. Unlimited Storage to bypass Quota limits
      chrome.storage.local.set({ 
        'titanleap_payload': { caption, mediaBase64 }
      }, () => {
        if (chrome.runtime.lastError) {
           console.error("TitanLeap Storage Error:", chrome.runtime.lastError);
           return;
        }
        
        // 2. Spawn Tabs and Wait
        if (platforms.includes('tw') || platforms.includes('x')) {
          chrome.tabs.create({ url: "https://twitter.com/compose/tweet" }, (tab) => {
            setTimeout(() => { chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectTwitterPost }); }, 5000);
          });
        }

        if (platforms.includes('li') && linkedinCompanyId) {
          chrome.tabs.create({ url: `https://www.linkedin.com/company/${linkedinCompanyId}/admin/` }, (tab) => {
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


// --- X / TWITTER ---
function injectTwitterPost() {
  console.log("TitanLeap: Twitter Bot inside DOM! Awaiting Payload...");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) {
      console.error("TitanLeap Fatal: Chrome payload dropped.");
      return;
    }
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;

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
            const byteString = atob(matches[2].replace(/\s/g, ''));
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
            const file = new File([ab], `media_${String(i).padStart(3, '0')}.${ext}`, { type: mime });
            dt.items.add(file);
          }
        } catch(e) {}
      });
      return dt;
    }

    function robustType(element, text) {
      if (!text) return;
      element.focus();
      element.click();
      
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      
      setTimeout(() => {
        if (!document.execCommand('insertText', false, text)) {
           const textEvent = document.createEvent('TextEvent');
           if (textEvent.initTextEvent) {
             textEvent.initTextEvent('textInput', true, true, window, text);
             element.dispatchEvent(textEvent);
           }
        }
      }, 50);
    }
    
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      const textBox = document.querySelector('div[data-testid="tweetTextarea_0"]');
      
      if (textBox) {
        clearInterval(initCheck);
        console.log("TitanLeap: Found X text box. Bypassing React layer...");
        robustType(textBox, caption);

        setTimeout(() => {
          if (mediaData && mediaData.length > 0) {
            const dt = getFilesFromBase64(mediaData);
            const fileInput = document.querySelector('input[data-testid="fileInput"]');
            if (fileInput) {
              fileInput.files = dt.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          let attempts = 0;
          const checkReady = setInterval(() => {
            attempts++;
            const tweetBtn = document.querySelector('button[data-testid="tweetButton"]');
            if (tweetBtn && tweetBtn.getAttribute('aria-disabled') !== 'true') {
              clearInterval(checkReady);
              setTimeout(() => {
                tweetBtn.click();
                console.log("TitanLeap: AUTO-POSTED TO X!");
              }, 1500);
            } else if (attempts > 50) {
              clearInterval(checkReady);
            }
          }, 500);
        }, 1000);
      } else if (initAttempts > 60) {
        clearInterval(initCheck);
      }
    }, 500);
  });
}


// --- LINKEDIN ---
function injectLinkedInPost() {
  console.log("TitanLeap: LinkedIn Bot inside DOM! Awaiting Payload...");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) return;
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;

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
            const byteString = atob(matches[2].replace(/\s/g, ''));
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
            const file = new File([ab], `media_${String(i).padStart(3, '0')}.${ext}`, { type: mime });
            dt.items.add(file);
          }
        } catch(e) {}
      });
      return dt;
    }

    function robustType(element, text) {
      if (!text) return;
      element.focus();
      element.click();
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      setTimeout(() => {
        if (!document.execCommand('insertText', false, text)) {
           const textEvent = document.createEvent('TextEvent');
           if (textEvent.initTextEvent) {
             textEvent.initTextEvent('textInput', true, true, window, text);
             element.dispatchEvent(textEvent);
           }
        }
      }, 50);
    }
    
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      const startPostBtn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(el => {
        const txt = (el.innerText || "").toLowerCase();
        return txt.includes('start a post') || txt.includes('create a post');
      });

      if (startPostBtn) {
        clearInterval(initCheck);
        startPostBtn.click();
        
        let editorAttempts = 0;
        const editorCheck = setInterval(() => {
          editorAttempts++;
          const editor = document.querySelector('div.ql-editor, div[role="textbox"]');
          
          if (editor) {
            clearInterval(editorCheck);
            robustType(editor, caption);
            setTimeout(() => {
              if (mediaData && mediaData.length > 0) {
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
              const checkReady = setInterval(() => {
                attempts++;
                const postBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Post' || b.innerText.trim() === 'Done');
                if (postBtn && !postBtn.disabled && !postBtn.ariaDisabled) {
                  clearInterval(checkReady);
                  setTimeout(() => {
                    postBtn.click();
                    console.log("TitanLeap: AUTO-POSTED TO LINKEDIN COMPANY!");
                  }, 1500);
                } else if (attempts > 50) {
                  clearInterval(checkReady);
                }
              }, 500);
            }, 1000);
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


// --- META APP ---
function injectMetaBusinessPost() {
  console.log("TitanLeap [Antigravity]: Meta Bot inside DOM. Deep Scanning Protocol Initiated...");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) return;
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;

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
            const byteString = atob(matches[2].replace(/\s/g, ''));
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
            const file = new File([ab], `media_${String(i).padStart(3, '0')}.${ext}`, { type: mime });
            dt.items.add(file);
          }
        } catch(e) {}
      });
      return dt;
    }

    function robustType(element, text) {
      if (!text) return;
      element.focus();
      element.click();
      
      const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
      if (['TEXTAREA', 'INPUT'].includes(element.tagName) && nativeSetter) {
        nativeSetter.call(element, text);
        element.dispatchEvent(new Event('input', {bubbles: true}));
        element.dispatchEvent(new Event('change', {bubbles: true}));
        return;
      }
      
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      setTimeout(() => {
        if (!document.execCommand('insertText', false, text)) {
           const textEvent = document.createEvent('TextEvent');
           if (textEvent.initTextEvent) {
             textEvent.initTextEvent('textInput', true, true, window, text);
             element.dispatchEvent(textEvent);
           }
        }
      }, 50);
    }
    
    let initAttempts = 0;
    const initCheck = setInterval(() => {
      initAttempts++;
      
      // DESTROY COACHMARKS
      const dialogs = document.querySelectorAll('div[role="dialog"], div[aria-label="Dialog"]');
      dialogs.forEach(d => {
        const closeBtn = Array.from(d.querySelectorAll('div[aria-label="Close"], button[aria-label="Close"], i.img')).find(el => el && el.offsetParent !== null);
        if (closeBtn) closeBtn.click();
        const doneBtn = Array.from(d.querySelectorAll('div[role="button"], button')).find(b => b.innerText && b.innerText.trim().toLowerCase() === 'done' && b.offsetParent !== null);
        if (doneBtn) doneBtn.click();
      });

      // HUNT EDITOR (Extremely Aggressive fallback)
      let editor = document.querySelector('textarea, div[contenteditable="true"][role="textbox"], div[data-lexical-editor="true"]');
      if (!editor) {
        const editables = Array.from(document.querySelectorAll('*')).filter(el => el.isContentEditable);
        if (editables.length > 0) editor = editables[editables.length - 1];
      }

      const mediaNodes = mediaData ? getFilesFromBase64(mediaData) : new DataTransfer();
      let fileInput = document.querySelector('input[type="file"][accept*="video"], input[type="file"][accept*="image"]');
      if (!fileInput) fileInput = document.querySelector('input[type="file"]');
      
      // Attempt to spawn hidden file inputs if not found
      if (!fileInput && mediaNodes.files.length > 0 && initAttempts % 2 === 0) {
         const addBtns = Array.from(document.querySelectorAll('div[role="button"], span')).filter(b => {
            const txt = (b.innerText || '').toLowerCase();
            return txt === 'add photo' || txt === 'add video' || txt === 'add media';
         });
         if (addBtns.length > 0 && addBtns[0].offsetParent !== null) {
            console.log("TitanLeap: Triggering Add Media UI to spawn hidden elements...");
            addBtns[0].click();
         }
      }

      if (editor || fileInput) {
        clearInterval(initCheck);
        console.log("TitanLeap: Meta Composer locked on.");
        
        if (editor) {
          console.log("TitanLeap: Injecting Text...");
          setTimeout(() => { robustType(editor, caption); }, 500);
        }

        setTimeout(() => {
          if (mediaNodes.files.length > 0) {
            console.log("TitanLeap: Injecting Media files...");
            // Re-query file input after UI clicks
            let finalInput = document.querySelector('input[type="file"][accept*="video"], input[type="file"][accept*="image"]');
            if(!finalInput) finalInput = document.querySelector('input[type="file"]');
            
            if (finalInput) {
              finalInput.files = mediaNodes.files;
              finalInput.dispatchEvent(new Event('change', { bubbles: true }));
              console.log("TitanLeap: Attached via physical hidden input.");
            } else {
               console.log("TitanLeap: Input missing. Fallback to global drag-and-drop overlay.");
               const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: mediaNodes });
               const dropzone = document.querySelector('div[role="presentation"]') || document.body;
               dropzone.dispatchEvent(dropEvent);
               if(editor) editor.dispatchEvent(dropEvent);
            }
          }

          let attempts = 0;
          console.log("TitanLeap: Awaiting Meta publish processing & network sync...");
          const checkReady = setInterval(() => {
            attempts++;
            const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
            const publishBtn = buttons.find(btn => {
               const text = btn.textContent ? btn.textContent.trim().toLowerCase() : "";
               return text === 'publish' || text === 'schedule' || text === 'post';
            });
            
            if (publishBtn && publishBtn.getAttribute('aria-disabled') !== 'true' && !publishBtn.disabled && publishBtn.offsetParent !== null) {
              clearInterval(checkReady);
              console.log("TitanLeap: Final checks passed! Executing publish payload in 3...");
              setTimeout(() => {
                publishBtn.click();
                console.log("TitanLeap: 🚀 AUTO-POSTED TO META!");
              }, 3000); 
            } else if (attempts > 70) {
              clearInterval(checkReady);
              console.log("TitanLeap: Meta execution timed out awaiting publish unlock! Did the media upload freeze?");
            }
          }, 1000);
        }, 3000); // Wait 3s to let text settle and modal animate
      } else if (initAttempts > 60) {
        clearInterval(initCheck);
        console.log("TitanLeap: Critical Error. Meta Composer DOM not found.");
      }
    }, 1000);
  });
}


// --- TIKTOK STUDIO --- 
function injectTikTokPost() {
  console.log("TitanLeap: TikTok Bot inside DOM...");
  chrome.storage.local.get(['titanleap_payload'], (res) => {
    if (!res.titanleap_payload) return;
    const { caption, mediaBase64: mediaData } = res.titanleap_payload;

    if (!mediaData || mediaData.length === 0) return;

    function getFilesFromBase64(mediaDataArray) {
      if (!mediaDataArray) return new DataTransfer();
      const dt = new DataTransfer();
      mediaDataArray.forEach((b64, i) => {
        try {
          const matches = b64.match(/^data:(.+?);base64,(.+)$/);
          if (matches) {
            const mime = matches[1];
            let ext = mime.split('/')[1] || 'png';
            if (ext === 'quicktime') ext = 'mov';
            const byteString = atob(matches[2].replace(/\s/g, ''));
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
            const file = new File([ab], `media_${String(i).padStart(3, '0')}.${ext}`, { type: mime });
            dt.items.add(file);
          }
        } catch(e) {}
      });
      return dt;
    }

    function robustType(element, text) {
      if (!text) return;
      element.focus();
      element.click();
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
      setTimeout(() => {
        if (!document.execCommand('insertText', false, text)) {
           const textEvent = document.createEvent('TextEvent');
           if (textEvent.initTextEvent) {
             textEvent.initTextEvent('textInput', true, true, window, text);
             element.dispatchEvent(textEvent);
           }
        }
      }, 50);
    }

    let dt = getFilesFromBase64(mediaData);
    let initAttempts = 0;
    
    const initCheck = setInterval(() => {
      initAttempts++;
      const fileInput = document.querySelector('input[type="file"], input[accept="video/*"]');
      const dropZone = document.querySelector('.upload-btn-input, .container-upload-btn') || document.body;

      if (fileInput || document.querySelector('.upload-btn-input')) {
        clearInterval(initCheck);

        if (fileInput) {
          fileInput.files = dt.files;
          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
          dropZone.dispatchEvent(dropEvent);
        }

        let uploadWaitAttempts = 0;
        const captionCheck = setInterval(() => {
          uploadWaitAttempts++;
          const editor = document.querySelector('.public-DraftEditor-content, div[contenteditable="true"]');
          
          if (editor && editor.offsetParent !== null) {
            clearInterval(captionCheck);
            robustType(editor, caption);
            
            let attempts = 0;
            const checkReady = setInterval(() => {
              attempts++;
              const buttons = Array.from(document.querySelectorAll('button'));
              const postBtn = buttons.find(b => b.innerText.trim() === 'Post' || b.innerText.trim() === 'Publish');
              
              if (postBtn && !postBtn.disabled && !postBtn.className.includes('disabled')) {
                clearInterval(checkReady);
                setTimeout(() => {
                  postBtn.click();
                }, 2000);
              } else if (attempts > 50) {
                clearInterval(checkReady);
              }
            }, 1000);
            
          } else if (uploadWaitAttempts > 60) {
            clearInterval(captionCheck);
          }
        }, 1000);
      } else if (initAttempts > 60) {
        clearInterval(initCheck);
      }
    }, 1000);
  });
}