// Screenshots use @sparticuz/chromium (a compact Chrome shipped inside npm), so skip
// Puppeteer's own ~170MB Chrome download on every build. See src/services/pageShots.ts.
module.exports = { skipDownload: true };
