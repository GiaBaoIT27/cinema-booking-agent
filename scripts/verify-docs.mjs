import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Documentation tooling only: no dependency installation or application startup.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const required = [
  'README.md', 'PROJECT-OVERVIEW.md', 'CONTEXT.md', 'docs/README.md',
  'docs/02-architecture/system-map.md', 'docs/02-architecture/http-contracts.md',
  'docs/03-product/cinema-domain.md', 'docs/04-standards/engineering.md',
  'docs/07-guides/contributing.md', 'docs/07-guides/figma-delivery.md',
  'docs/07-guides/local-development.md',
  '.github/ISSUE_TEMPLATE/implementation-task.yml', '.github/PULL_REQUEST_TEMPLATE.md',
  ...['01-overview', '02-architecture', '03-product', '04-standards', '05-specs',
    '06-decisions', '07-guides', '08-runbooks', '99-notes'].map(area => `docs/${area}/README.md`),
  ...['cinema-backend', 'cinema-frontend', 'cinema-mobile', 'cinema-agent']
    .map(app => `apps/${app}/README.md`),
];

for (const path of required) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    errors.push(`Missing required file: ${path}`);
  } else if (!readFileSync(absolute, 'utf8').trim()) {
    errors.push(`Empty required file: ${path}`);
  }
}

const archived = new Set([
  'docs/99-notes/backend-structure-2026-09-27.md',
]);
const files = new Set(required.filter(path => path.endsWith('.md')));
for (const path of ['structure.md', 'docs/frontend-design-workflow.md']) files.add(path);
function collectMarkdown(directory) {
  const absolute = resolve(root, directory);
  if (!existsSync(absolute)) return;
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) collectMarkdown(path);
    else if (entry.isFile() && entry.name.endsWith('.md') && !archived.has(path)) files.add(path);
  }
}
for (const directory of ['docs', '.github']) collectMarkdown(directory);

let checkedFiles = 0;
let checkedLinks = 0;
for (const path of files) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) continue;
  checkedFiles += 1;
  const content = readFileSync(absolute, 'utf8');
  // Inline Markdown targets only; external URLs and heading anchors are out of scope.
  for (const match of content.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('#')) continue;
    let localPath;
    try {
      localPath = decodeURIComponent(target.split('#')[0].split('?')[0]);
    } catch {
      errors.push(`Invalid link encoding in ${path}: ${target}`);
      continue;
    }
    if (!localPath) continue;
    const destination = resolve(dirname(absolute), localPath);
    const withinRoot = relative(root, destination);
    checkedLinks += 1;
    if (withinRoot === '..' || withinRoot.startsWith(`..${sep}`) || isAbsolute(withinRoot)) {
      errors.push(`Link escapes repository in ${path}: ${target}`);
    } else if (!existsSync(destination)) {
      errors.push(`Broken local link in ${path}: ${target}`);
    }
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Shared documentation checks passed: ${checkedFiles} current Markdown files, ${checkedLinks} local link targets.`);
  console.log('Historical snapshot excluded; remote links, heading anchors and application behavior are not verified.');
}
