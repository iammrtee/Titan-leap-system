import { auditLandingPage } from './src/services/ai.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function test() {
  try {
    console.log('Testing auditLandingPage...');
    const result = await auditLandingPage('https://example.com', 'A test website');
    console.log('Success!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Failed:', error);
  }
}

test();
