import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const vault = '/Users/tj/Documents/obsidian/AI';
const posts = path.resolve('source/_posts/ai');
const images = path.resolve('source/img/ai');
const ignored = new Set(['.git', '.obsidian', '.smart-env']);

const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name === '.DS_Store') continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(absolute);
  }
}

function readField(frontmatter, name) {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*["']?(.+?)["']?\\s*$`, 'm'));
  return match?.[1]?.replace(/^['"]|['"]$/g, '').trim();
}

function escapeYaml(value) {
  return JSON.stringify(value);
}

function toDate(value) {
  return value.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function imageUrl(file) {
  return `/img/ai/${file.split('/').map(encodeURIComponent).join('/')}`;
}

function convert(body) {
  return body
    .replace(/^> \[!(.+?)\](.*)$/gm, (_, kind, text) => `> **${kind}**${text}`)
    .replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (_, file) => `![${file}](${imageUrl(file.trim())})`)
    .replace(/\[\[#([^\]]+)\]\]/g, (_, heading) => `[#${heading}](#${heading})`)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_, _target, label) => label)
    .replace(/\[\[([^\]]+)\]\]/g, (_, label) => label);
}

await walk(vault);
await rm(posts, { recursive: true, force: true });
await rm(images, { recursive: true, force: true });
await mkdir(posts, { recursive: true });
await cp(path.join(vault, 'attachments'), images, {
  recursive: true,
  filter: source => !source.endsWith('.DS_Store'),
});

let imported = 0;
for (const file of files) {
  const raw = await readFile(file, 'utf8');
  if (!raw.trim()) continue;
  const relative = path.relative(vault, file);
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  const frontmatter = match?.[1] ?? '';
  let body = raw.slice(match?.[0].length ?? 0);
  const title = readField(frontmatter, 'title') ?? path.basename(file, '.md');
  const source = readField(frontmatter, 'source');
  const created = readField(frontmatter, 'created') ?? readField(frontmatter, 'updated');
  const modified = await stat(file);
  const date = created && /^\d{4}-\d{2}-\d{2}/.test(created) ? `${created} 00:00:00` : toDate(modified.mtime);
  body = convert(body).replace(new RegExp(`^#\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n+`), '');
  const header = [
    '---',
    `title: ${escapeYaml(title)}`,
    `date: ${date}`,
    'categories:',
    '  - ai',
    'tags:',
    '  - ai',
    source ? `source: ${escapeYaml(source)}` : '',
    relative.startsWith('Clippings/') ? 'original: true' : '',
    '---',
    '',
  ].filter(Boolean).join('\n');
  const attribution = relative.startsWith('Clippings/') && source
    ? `> 原文来源：${source}\n\n`
    : '';
  const destination = path.join(posts, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${header}\n\n${attribution}${body.trim()}\n`);
  imported += 1;
}

console.log(`Imported ${imported} AI notes and copied attachments to ${images}`);
