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
  assert.equal(org.taxID, '61.487.538/0001-67');
  assert.match(org.address.streetAddress, /Sala 701/);
  assert.ok(Array.isArray(org.sameAs) && org.sameAs.includes('https://borysta.com'));

  const siteJs = readFileSync(join(repoRoot, 'assets/site.js'), 'utf8');
  assert.ok(siteJs.includes('presenca.referral.v1'));
  assert.ok(!siteJs.includes('document.cookie'), 'site.js must never set or read cookies');

  assert.ok(indexHtml.includes('<h3>Quem precisa voltar, volta.</h3>'), 'Recall tab title must match Anna report');
  assert.ok(indexHtml.includes('src="assets/img/app/recall.webp" width="1600" height="1000"'), 'Recall screenshot must declare 1600x1000');
  const siteCss = readFileSync(join(repoRoot, 'assets/site.css'), 'utf8');
  assert.match(siteCss, /\.figs__note\s*\{[^}]*font-size:\s*14px;/, '.figs__note must respect 14px minimum font-size');
});

