import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } from 'fs';

const indexPath = './dist/index.js';
let content = readFileSync(indexPath, 'utf8');

if (!content.startsWith('#!/usr/bin/env node')) {
  content = '#!/usr/bin/env node\n' + content;
  writeFileSync(indexPath, content);
  console.log('✅ shebang injected into dist/index.js');
} else {
  console.log('⏭️  shebang already present, skipped');
}

// Copy assets to dist/
if (existsSync('./assets')) {
  if (!existsSync('./dist/assets')) {
    mkdirSync('./dist/assets', { recursive: true });
  }
  cpSync('./assets', './dist/assets', { recursive: true });
  console.log('✅ assets copied to dist/assets');
}
