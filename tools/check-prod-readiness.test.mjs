import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSiteReadiness } from './check-prod-readiness.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('passes on develop with tracked LGPD-01 warnings when corporate data and plans are official', () => {
  const res = evaluateSiteReadiness({ rootDir: repoRoot, baseRef: 'develop', refName: 'feature/test', enforceProd: false });
  assert.equal(res.ok, true, `Expected develop gate to pass, got errors: ${res.errors.join('; ')}`);
  assert.equal(res.isMainTarget, false);
  assert.ok(res.warnings.some((w) => w.includes('[LGPD-01] politica-de-privacidade.html')));
  assert.ok(res.warnings.some((w) => w.includes('[LGPD-01] termos-de-uso.html')));
});

test('blocks merge to main while LGPD-01 legal placeholders or dev/staging URLs remain', () => {
  const res = evaluateSiteReadiness({ rootDir: repoRoot, baseRef: 'main', refName: 'hml', enforceProd: false });
  assert.equal(res.ok, false);
  assert.equal(res.isMainTarget, true);
  assert.ok(res.errors.some((e) => e.includes('[LGPD-01] politica-de-privacidade.html')));
  assert.ok(res.errors.some((e) => e.includes('[LGPD-01] termos-de-uso.html')));
  assert.ok(res.errors.some((e) => e.includes('[PROD-URL] index.html')));
});

test('blocks stale CNPJ or stale plan prices on any branch including develop', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'presenca-site-gate-'));
  try {
    mkdirSync(join(tmp, '.well-known'), { recursive: true });
    for (const f of [
      'index.html',
      'duvidas.html',
      'llms.txt',
      'llms-full.txt',
      '.well-known/ai-plugin.json',
      'politica-de-privacidade.html',
      'termos-de-uso.html',
      'sitemap.xml',
    ]) {
      cpSync(join(repoRoot, f), join(tmp, f));
    }
    writeFileSync(join(tmp, 'llms.txt'), 'CNPJ 56.842.193/0001-85 R$ 299/mês', 'utf8');
    const res = evaluateSiteReadiness({ rootDir: tmp, baseRef: 'develop', refName: 'feature/broken' });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.includes('56.842.193/0001-85')));
    assert.ok(res.errors.some((e) => e.includes('R$ 299')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('validates JSON-LD in index.html and referral sanitizer in assets/site.js', () => {
  const indexHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');
  const match = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html must include JSON-LD structured data');
  const parsed = JSON.parse(match[1]);
  const org = parsed['@graph'].find((n) => n['@type'] === 'Organization');
  const app = parsed['@graph'].find((n) => n['@type'] === 'SoftwareApplication');
  assert.equal(org.taxID, '61.487.538/0001-67');
  assert.match(org.address.streetAddress, /Sala 701/);
  assert.deepEqual(
    app.offers.map((o) => o.price),
    ['498.00', '1498.00', '2998.00'],
  );

  const siteJs = readFileSync(join(repoRoot, 'assets/site.js'), 'utf8');
  assert.ok(siteJs.includes('presenca.referral.v1'));
  assert.ok(!siteJs.includes('document.cookie'), 'site.js must never set or read cookies');
});

