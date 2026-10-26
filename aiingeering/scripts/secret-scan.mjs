import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve(import.meta.dirname, '..');
const target = resolve(process.argv[2] || join(root, 'dist'));
const findings = [];
const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['github-token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/],
  ['openai-project-token', /\bsk-proj-[A-Za-z0-9_-]{70,}\b/],
  ['anthropic-token', /\bsk-ant-api\d+-[A-Za-z0-9_-]{80,}\b/],
  ['aws-access-id', /\bAKIA[A-Z0-9]{16}\b/]
];
let files = 0;
let documentedFixtures = 0;
// Exact Docker proxy sentinel documented in the imported sbx manual. It is a
// stand-in shown inside the sandbox; the capture states no GitHub request used it.
const proxySentinelHash = '4f4a70aae7238131b9775a37bb8e16b268905073c33bdcfef7553398ba869c52';
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name), rel = relative(target, path);
    if (name.startsWith('.') || /^(?:secrets\.|.*\.(?:pem|key)$)/i.test(name)) { findings.push({ path: rel, rule: 'private-filename' }); continue; }
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) { findings.push({ path: rel, rule: 'symlink' }); continue; }
    if (stat.isDirectory()) { walk(path); continue; }
    files++;
    const bytes = readFileSync(path);
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    for (const [rule, pattern] of patterns) {
      for (const match of text.matchAll(new RegExp(pattern.source, 'g'))) {
        const digest = createHash('sha256').update(match[0]).digest('hex');
        if (rule === 'github-token' && digest === proxySentinelHash || rule === 'aws-access-id' && match[0] === 'AKIAIOSFODNN7EXAMPLE') { documentedFixtures++; continue; }
        findings.push({ path: rel, rule });
      }
    }
  }
}
walk(target);
console.log(JSON.stringify({ passed: findings.length === 0, files, documentedFixtures, findings }));
if (findings.length) process.exitCode = 1;
