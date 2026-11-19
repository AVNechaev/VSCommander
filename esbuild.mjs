// Builds the extension host bundle, the webview bundle and stylesheet, and copies Codicons (ADR 0010).
import * as esbuild from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

/** @type {esbuild.BuildOptions} */
const common = { bundle: true, sourcemap: !production, minify: production, logLevel: 'info' };

/** @type {esbuild.BuildOptions[]} */
const configs = [
  {
    ...common,
    entryPoints: ['src/extension.ts'],
    outfile: 'dist/extension.cjs',
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode'],
  },
  {
    ...common,
    entryPoints: ['src/webview/main.ts'],
    outfile: 'dist/webview.js',
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
  },
  {
    ...common,
    entryPoints: ['src/webview/style.css'],
    outfile: 'dist/webview.css',
  },
];

await mkdir('dist/codicons', { recursive: true });
for (const file of ['codicon.css', 'codicon.ttf']) {
  await cp(`node_modules/@vscode/codicons/dist/${file}`, `dist/codicons/${file}`);
}

if (watch) {
  for (const config of configs) await (await esbuild.context(config)).watch();
} else {
  await Promise.all(configs.map(config => esbuild.build(config)));
}
