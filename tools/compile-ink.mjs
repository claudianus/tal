// script/*.ink → src/story.json
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { Compiler, CompilerOptions } = require('inkjs/full');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'script');
const errs = [];
const fh = {
  ResolveInkFilename: (f) => path.join(dir, f),
  LoadInkFileContents: (f) => fs.readFileSync(f, 'utf8'),
};
const src = fs.readFileSync(path.join(dir, 'main.ink'), 'utf8');
const story = new Compiler(src, new CompilerOptions('main.ink', [], false, (m, t) => errs.push(`${t}: ${m}`), fh)).Compile();
if (errs.length) { console.error(errs.join('\n')); }
if (!story) process.exit(1);
fs.writeFileSync(path.join(root, 'src', 'story.json'), story.ToJson());
console.log(`ink → src/story.json (${errs.length} messages)`);
