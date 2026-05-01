import fs from 'fs';
import path from 'path';

const outPath = path.join(process.cwd(), 'public', 'codebase.txt');
let outContent = `This is the complete TitanLeap codebase.\\n\\n`;

const includeFiles = [
  'package.json',
  'server.ts',
  'vite.config.ts',
  'tsconfig.json',
];

for (const file of includeFiles) {
  if (fs.existsSync(file)) {
    outContent += `\\n\\n--- FILE: ${file} ---\\n\\n`;
    outContent += fs.readFileSync(file, 'utf8');
  }
}

function traverse(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverse(fullPath);
    } else {
      if (
        fullPath.endsWith('.ts') || 
        fullPath.endsWith('.tsx') || 
        fullPath.endsWith('.css') || 
        fullPath.endsWith('.html') ||
        fullPath.endsWith('.json') ||
        fullPath.endsWith('.js')
      ) {
        outContent += `\\n\\n--- FILE: ${fullPath.replace(process.cwd() + '/', '')} ---\\n\\n`;
        outContent += fs.readFileSync(fullPath, 'utf8');
      }
    }
  }
}

traverse(path.join(process.cwd(), 'src'));
traverse(path.join(process.cwd(), 'public', 'titanleap-extension'));

fs.writeFileSync(outPath, outContent);
console.log('Codebase extracted to public/codebase.txt');
