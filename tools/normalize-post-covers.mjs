import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('source/_posts');
const coverFor = file => file.includes(`${path.sep}ai${path.sep}`) ? '/img/covers/ai.svg' :
  /browser|http|react|redux|event-loop|mini-program|electron|umd/i.test(file) ? '/img/covers/web.svg' : '/img/covers/notes.svg';

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.isFile() && entry.name.endsWith('.md')) await update(file);
  }
}

async function update(file) {
  const source = await readFile(file, 'utf8');
  if (!source.startsWith('---\n')) return;
  const end = source.indexOf('\n---', 4);
  if (end < 0) return;
  let frontmatter = source.slice(4, end);
  const cover = coverFor(file);
  for (const field of ['index_img', 'banner_img']) {
    const pattern = new RegExp(`^${field}:.*$`, 'm');
    const existing = frontmatter.match(pattern)?.[0].slice(field.length + 1).trim();
    if (!existing) frontmatter = pattern.test(frontmatter) ? frontmatter.replace(pattern, `${field}: ${cover}`) : `${frontmatter}\n${field}: ${cover}`;
  }
  const body = source.slice(end + 4);
  if (/\$\$|\\\(|\\\[/.test(body) && !/^math:/m.test(frontmatter)) frontmatter += '\nmath: true';
  if (/^```mermaid/m.test(body) && !/^mermaid:/m.test(frontmatter)) frontmatter += '\nmermaid: true';
  if (!/^updated:/m.test(frontmatter)) frontmatter += `\nupdated: ${new Date((await stat(file)).mtime).toISOString().slice(0, 10)}`;
  await writeFile(file, `---\n${frontmatter}\n---${source.slice(end + 4)}`);
}

await walk(root);
console.log('Normalized covers, rendering options, and update dates for all posts.');
