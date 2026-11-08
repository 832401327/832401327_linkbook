import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

const children = [
  spawn(node, [join(root, 'server', 'src', 'index.js')], {
    cwd: root,
    env: { ...process.env, PORT: process.env.PORT ?? '3000' },
    stdio: 'inherit',
  }),
  spawn(node, [join(root, 'client', 'node_modules', 'vite', 'bin', 'vite.js')], {
    cwd: join(root, 'client'),
    env: { ...process.env },
    stdio: 'inherit',
  }),
];

let stopping = false;
function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
for (const child of children) child.on('exit', (code) => shutdown(code ?? 0));
