import fs from 'fs';
let content = fs.readFileSync('public/titanleap-extension/background.js', 'utf8');

const oldRobust = `  function robustType(element, text) {
    if (!text) return;
    element.focus();
    
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    element.dispatchEvent(pasteEvent);
    
    setTimeout(() => {
      const success = document.execCommand('insertText', false, text);
      if (!success) {
        if(element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          element.value = text;
          element.dispatchEvent(new Event('input', {bubbles: true}));
        } else {
          element.innerText = text;
          element.dispatchEvent(new Event('input', {bubbles: true}));
        }
      }
    }, 50);
  }`;

const newRobust = `  function robustType(element, text) {
    if (!text) return;
    element.focus();
    
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
    element.dispatchEvent(pasteEvent);
    
    setTimeout(() => {
      const success = document.execCommand('insertText', false, text);
      if (!success) {
        if(element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
          const nativeSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
          if (nativeSetter) {
            nativeSetter.call(element, text);
          } else {
            element.value = text;
          }
          element.dispatchEvent(new Event('input', {bubbles: true}));
        } else {
          element.innerText = text;
          element.dispatchEvent(new Event('input', {bubbles: true}));
        }
      }
    }, 50);
  }`;

const replaced = content.split(oldRobust).join(newRobust);
fs.writeFileSync('public/titanleap-extension/background.js', replaced);
console.log("Successfully replaced robustType occurrences.", content.split(oldRobust).length - 1, "found.");
