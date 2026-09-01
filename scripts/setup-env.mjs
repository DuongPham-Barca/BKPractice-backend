import { constants } from 'node:fs';
import { access, copyFile } from 'node:fs/promises';

try {
  await access('.env', constants.F_OK);
  console.log('.env already exists; no file was overwritten.');
} catch {
  await copyFile('.env.example', '.env', constants.COPYFILE_EXCL);
  console.log('Created .env from .env.example. Replace all placeholder secrets before startup.');
}
