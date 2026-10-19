// `npm run check:dist`, after `npm run build`: fails when the build output holds a local secrets
// file, or the value of any secret from the local `.dev.vars` / `.env` files (G-72). CI writes a
// canary `.dev.vars` before it builds, so there the check runs against known values.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { parseEnv } from 'node:util';

const root = join(import.meta.dirname, '../..');
const dist = join(root, 'dist');

/** Where wrangler and the Cloudflare Vite plugin read local secrets from. */
const SECRET_FILES = ['.dev.vars', '.env', '.env.local'];
/** `.dev.vars`, `.dev.vars.production`, `.env`, `.env.local`… none of them belongs in a build. */
const SECRET_FILE_NAME = /^\.(dev\.vars|env)(\..+)?$/;
/** Names whose values are secrets; the others (provider names, URLs) are not. */
const SECRET_NAME = /SECRET|KEY|TOKEN|PASSWORD/i;
/** Shorter values would match by accident; real secrets are far longer. */
const MIN_SECRET_LENGTH = 8;

if (!existsSync(dist)) {
  console.error('check:dist: no dist/ folder; run `npm run build` first');
  process.exit(2);
}

const secrets = localSecrets();
const files = listFiles(dist);
const problems: string[] = [];
for (const file of files) {
  const name = relative(root, file);
  if (SECRET_FILE_NAME.test(basename(file))) problems.push(`${name}: a local secrets file`);
  const bytes = readFileSync(file);
  for (const [key, value] of secrets) {
    if (bytes.includes(value)) problems.push(`${name}: contains the value of ${key}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error(`\ncheck:dist found ${problems.length} leak(s) of local secrets in dist/`);
  process.exit(1);
}
console.log(
  `check:dist: ${files.length} files in dist/, no secrets file, none of ${secrets.size} local secret value(s)`,
);

/** Secret values from the local env files (the first file that sets a name wins, as in wrangler). */
function localSecrets(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of SECRET_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const [key, value] of Object.entries(parseEnv(readFileSync(path, 'utf8')))) {
      if (SECRET_NAME.test(key) && value && value.length >= MIN_SECRET_LENGTH && !found.has(key)) {
        found.set(key, value);
      }
    }
  }
  return found;
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}
