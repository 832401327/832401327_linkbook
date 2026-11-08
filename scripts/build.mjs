import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [join(root, 'client', 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  cwd: join(root, 'client'),
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
