import fs from 'fs';
const buf = fs.readFileSync('public/extension-v12.zip');
console.log("Size:", buf.length);
console.log("Signature:", buf.toString('hex', 0, 4));
