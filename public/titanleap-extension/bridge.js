// Listens for messages from the TitanLeap web app
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TITANLEAP_PING_EXTENSION") {
     window.postMessage({ type: "TITANLEAP_EXTENSION_READY" }, "*");
  }

  if (event.data && event.data.type === "TITANLEAP_EXECUTE_POST") {
    console.log("TitanLeap Bridge received post command:", event.data.payload);
    
    // Forward the command to the background service worker
    chrome.runtime.sendMessage({
      action: "EXECUTE_POST",
      payload: event.data.payload
    });
  }
});

// Let the web app know the extension is installed and active
window.postMessage({ type: "TITANLEAP_EXTENSION_READY" }, "*");
console.log("TitanLeap Bridge injected successfully!");

// DOM-based fallback check (bulletproof injection verification)
const setupProbe = () => {
  if (!document.getElementById('titanleap-extension-probe')) {
    const probe = document.createElement('div');
    probe.id = 'titanleap-extension-probe';
    probe.style.display = 'none';
    // Add it to the body
    document.body.appendChild(probe);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupProbe);
} else {
  setupProbe();
}
