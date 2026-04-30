import AdmZip from 'adm-zip';
import path from 'path';

const zip = new AdmZip();
zip.addLocalFolder('./public/titanleap-extension');
zip.writeZip('./public/extension-v21.zip');
console.log('Successfully created extension-v21.zip with adm-zip!');
