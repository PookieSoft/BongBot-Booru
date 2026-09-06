import { build } from 'esbuild';
import { cpSync } from 'node:fs';

await build({
    entryPoints: ['src/index.ts', 'src/standalone.ts'],
    bundle: true,
    platform: 'node',
    target: 'node24',
    format: 'esm',
    outdir: 'dist',
    packages: 'external',
    minify: process.argv.includes('--minify'),
    sourcemap: true,
});
cpSync('node_modules/@pookiesoft/bongbot-core/dist/responses', 'dist/responses', { recursive: true });
