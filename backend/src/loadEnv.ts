import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Try cwd first (when running "npm run dev" from repo root), then monorepo root relative to this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const envPath of candidates) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) break;
}
