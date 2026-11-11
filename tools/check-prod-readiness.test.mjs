import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSiteReadiness } from './check-prod-readiness.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function copyFixtureSite(tmp) {
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
}

test('passes on develop with tracked LGPD-01 warnings when corporate data, CSP, and /app/ paths are valid', () => {
  const res = evaluateSiteReadiness({ rootDir: repoRoot, baseRef: 'develop', refName: 'feature/test', enforceProd: false });
  assert.equal(res.ok, true, `Expected develop gate to pass, got errors: ${res.errors.join('; ')}`);
  assert.equal(res.isMainTarget, false);
  assert.ok(res.warnings.some((w) => w.includes('[LGPD-01] politica-de-privacidade.html')));
  assert.ok(res.warnings.some((w) => w.includes('[LGPD-01] termos-de-uso.html')));
});

test('blocks merge to homol if any dev.presenca.borysta.com URL remains and passes once updated to staging', () => {
  const blocked = evaluateSiteReadiness({ rootDir: repoRoot, baseRef: 'homol', refName: 'develop', enforceProd: false });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.isHomolTarget, true);
  assert.ok(blocked.errors.some((e) => e.includes('[ENV-URL] index.html')));

  const tmp = mkdtempSync(join(tmpdir(), 'presenca-site-homol-'));
  try {
    copyFixtureSite(tmp);
    for (const f of ['index.html', 'duvidas.html', 'llms-full.txt', '.well-known/ai-plugin.json']) {
      const cur = readFileSync(join(tmp, f), 'utf8');
      writeFileSync(join(tmp, f), cur.replaceAll('dev.presenca.borysta.com', 'staging.presenca.borysta.com'), 'utf8');
    }
    const cleanHomol = evaluateSiteReadiness({ rootDir: tmp, baseRef: 'homol', refName: 'homol' });
    assert.equal(cleanHomol.ok, true, `Expected clean homol to pass, got: ${cleanHomol.errors.join('; ')}`);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('blocks merge to main while LGPD-01 legal placeholders or dev/staging URLs remain', () => {
  const res = evaluateSiteReadiness({ rootDir: repoRoot, baseRef: 'main', refName: 'homol', enforceProd: false });
  assert.equal(res.ok, false);
  assert.equal(res.isMainTarget, true);
  assert.ok(res.errors.some((e) => e.includes('[LGPD-01] politica-de-privacidade.html')));
  assert.ok(res.errors.some((e) => e.includes('[LGPD-01] termos-de-uso.html')));
  assert.ok(res.errors.some((e) => e.includes('[PROD-URL] index.html')));
});

test('blocks stale CNPJ, stale plan prices, inline executable scripts, or root /#/login collision on any branch', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'presenca-site-gate-'));
  try {
    copyFixtureSite(tmp);
    writeFileSync(join(tmp, 'llms.txt'), 'CNPJ 56.842.193/0001-85 R$ 299/mês', 'utf8');
    const htmlWithInline = readFileSync(join(tmp, 'index.html'), 'utf8')
      .replace('<script src="assets/init.js"></script>', '<script>alert(1)</script>')
      .replace('https://dev.presenca.borysta.com/app/#/login', 'https://dev.presenca.borysta.com/#/login');
    writeFileSync(join(tmp, 'index.html'), htmlWithInline, 'utf8');

    const res = evaluateSiteReadiness({ rootDir: tmp, baseRef: 'develop', refName: 'feature/broken' });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.includes('56.842.193/0001-85')));
    assert.ok(res.errors.some((e) => e.includes('R$ 299')));
    assert.ok(res.errors.some((e) => e.includes('[CSP] index.html')));
    assert.ok(res.errors.some((e) => e.includes('[SPA-PATH] index.html')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('validates JSON-LD in index.html, CSP init.js hash bridge, and referral sanitizer in assets/site.js', () => {
  const indexHtml = readFileSync(join(repoRoot, 'index.html'), 'utf8');
  const match = indexHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(match, 'index.html must include JSON-LD structured data');
  const parsed = JSON.parse(match[1]);
  const org = parsed['@graph'].find((n) => n['@type'] === 'Organization');
  assert.equal(org.taxID, '61.487.538/0001-67');
  assert.match(org.address.streetAddress, /Sala 701/);
  assert.ok(Array.isArray(org.sameAs) && org.sameAs.includes('https://borysta.com'));

  const initJs = readFileSync(join(repoRoot, 'assets/init.js'), 'utf8');
  assert.ok(initJs.includes("classList.add('js')"));
  assert.ok(initJs.includes("window.location.replace('/app/'"));

  const siteJs = readFileSync(join(repoRoot, 'assets/site.js'), 'utf8');
  assert.ok(siteJs.includes('presenca.referral.v1'));
  assert.ok(!siteJs.includes('document.cookie'), 'site.js must never set or read cookies');

  assert.ok(indexHtml.includes('<h3>Quem precisa voltar, volta.</h3>'), 'Recall tab title must match Anna report');
  assert.ok(indexHtml.includes('src="assets/img/app/recall.webp" width="1600" height="1000"'), 'Recall screenshot must declare 1600x1000');
  const siteCss = readFileSync(join(repoRoot, 'assets/site.css'), 'utf8');
  assert.match(siteCss, /\.figs__note\s*\{[^}]*font-size:\s*14px;/, '.figs__note must respect 14px minimum font-size');
});
