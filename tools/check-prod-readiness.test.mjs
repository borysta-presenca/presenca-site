import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateSiteReadiness } from './check-prod-readiness.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function copyFixtureSite(tmp, targetHost = 'dev.presenca.borysta.com') {
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
    let content = readFileSync(join(repoRoot, f), 'utf8');
    if (['index.html', 'duvidas.html', 'llms-full.txt', '.well-known/ai-plugin.json'].includes(f)) {
      content = content
        .replaceAll('dev.presenca.borysta.com', targetHost)
        .replaceAll('staging.presenca.borysta.com', targetHost);
    }
    writeFileSync(join(tmp, f), content, 'utf8');
  }
}

test('passes on develop with V2.0 legal pages published (no LGPD-01 warnings) when corporate data, CSP, and /app/ paths are valid', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'presenca-site-dev-'));
  try {
    copyFixtureSite(tmp, 'dev.presenca.borysta.com');
    const res = evaluateSiteReadiness({ rootDir: tmp, baseRef: 'develop', refName: 'feature/test', enforceProd: false });
    assert.equal(res.ok, true, `Expected develop gate to pass, got errors: ${res.errors.join('; ')}`);
    assert.equal(res.isMainTarget, false);
    assert.equal(res.warnings.filter((w) => w.includes('[LGPD-01]')).length, 0);
    assert.ok(res.warnings.some((w) => w.includes('[PROD-URL] index.html')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('blocks merge to homol if any dev.presenca.borysta.com URL remains and passes once updated to staging', () => {
  const tmpDev = mkdtempSync(join(tmpdir(), 'presenca-site-homol-blocked-'));
  const tmpStaging = mkdtempSync(join(tmpdir(), 'presenca-site-homol-clean-'));
  try {
    copyFixtureSite(tmpDev, 'dev.presenca.borysta.com');
    const blocked = evaluateSiteReadiness({ rootDir: tmpDev, baseRef: 'homol', refName: 'develop', enforceProd: false });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.isHomolTarget, true);
    assert.ok(blocked.errors.some((e) => e.includes('[ENV-URL] index.html')));

    copyFixtureSite(tmpStaging, 'staging.presenca.borysta.com');
    const cleanHomol = evaluateSiteReadiness({ rootDir: tmpStaging, baseRef: 'homol', refName: 'homol' });
    assert.equal(cleanHomol.ok, true, `Expected clean homol to pass, got: ${cleanHomol.errors.join('; ')}`);
  } finally {
    rmSync(tmpDev, { recursive: true, force: true });
    rmSync(tmpStaging, { recursive: true, force: true });
  }
});

test('allows main target once URLs are prod (zero LGPD-01/02 errors), and hard-blocks placeholder/noindex or dev/staging URLs on main', () => {
  const repoMainRes = evaluateSiteReadiness({ rootDir: repoRoot, baseRef: 'main', refName: 'homol', enforceProd: false });
  assert.equal(repoMainRes.ok, false);
  assert.equal(repoMainRes.isMainTarget, true);
  assert.equal(repoMainRes.errors.filter((e) => e.includes('[LGPD-01]') || e.includes('[LGPD-02]')).length, 0);
  assert.ok(repoMainRes.errors.some((e) => e.includes('[PROD-URL] index.html')));

  const cleanProdTmp = mkdtempSync(join(tmpdir(), 'presenca-site-prod-clean-'));
  try {
    copyFixtureSite(cleanProdTmp, 'presenca.borysta.com');
    const cleanProd = evaluateSiteReadiness({ rootDir: cleanProdTmp, baseRef: 'main', refName: 'homol', enforceProd: true });
    assert.equal(cleanProd.ok, true, `Expected clean prod target to pass, got: ${cleanProd.errors.join('; ')}`);
  } finally {
    rmSync(cleanProdTmp, { recursive: true, force: true });
  }

  const draftTmp = mkdtempSync(join(tmpdir(), 'presenca-site-lgpd-draft-'));
  try {
    copyFixtureSite(draftTmp, 'presenca.borysta.com');
    const draftStub = '<html><head><meta name="robots" content="noindex"></head><body><p>Texto em revisão jurídica · CNPJ 61.487.538/0001-67 · Sala 20 Altos, Eusébio/CE · support@borysta.com</p></body></html>';
    writeFileSync(join(draftTmp, 'politica-de-privacidade.html'), draftStub, 'utf8');
    writeFileSync(join(draftTmp, 'termos-de-uso.html'), draftStub, 'utf8');

    const devRes = evaluateSiteReadiness({ rootDir: draftTmp, baseRef: 'develop', refName: 'feature/draft' });
    assert.equal(devRes.ok, true);
    assert.ok(devRes.warnings.some((w) => w.includes('[LGPD-01] politica-de-privacidade.html')));
    assert.ok(devRes.warnings.some((w) => w.includes('[LGPD-01] termos-de-uso.html')));

    const mainRes = evaluateSiteReadiness({ rootDir: draftTmp, baseRef: 'main', refName: 'homol' });
    assert.equal(mainRes.ok, false);
    assert.ok(mainRes.errors.some((e) => e.includes('[LGPD-01] politica-de-privacidade.html')));
    assert.ok(mainRes.errors.some((e) => e.includes('[LGPD-01] termos-de-uso.html')));
  } finally {
    rmSync(draftTmp, { recursive: true, force: true });
  }
});

test('blocks stale CNPJ, stale Fortaleza address, legacy DPO e-mail, stale plan prices, inline executable scripts, or root /#/login collision on any branch', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'presenca-site-gate-'));
  try {
    copyFixtureSite(tmp);
    writeFileSync(join(tmp, 'llms.txt'), 'CNPJ 56.842.193/0001-85 Sala 701 CEP 60150-161 privacidade@borysta.com R$ 299/mês', 'utf8');
    const htmlWithInline = readFileSync(join(tmp, 'index.html'), 'utf8')
      .replace('<script src="assets/init.js"></script>', '<script>alert(1)</script>')
      .replace('https://dev.presenca.borysta.com/app/#/login', 'https://dev.presenca.borysta.com/#/login')
      .replace('</body>', '<dialog class="login" data-dialog></dialog></body>');
    writeFileSync(join(tmp, 'index.html'), htmlWithInline, 'utf8');

    const res = evaluateSiteReadiness({ rootDir: tmp, baseRef: 'develop', refName: 'feature/broken' });
    assert.equal(res.ok, false);
    assert.ok(res.errors.some((e) => e.includes('56.842.193/0001-85')));
    assert.ok(res.errors.some((e) => e.includes('legacy Fortaleza address')));
    assert.ok(res.errors.some((e) => e.includes('legacy contact email')));
    assert.ok(res.errors.some((e) => e.includes('R$ 299')));
    assert.ok(res.errors.some((e) => e.includes('[CSP] index.html')));
    assert.ok(res.errors.some((e) => e.includes('[SPA-PATH] index.html')));
    assert.ok(res.errors.some((e) => e.includes('[LOGIN-SINGLE] index.html')));
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
  assert.match(org.address.streetAddress, /Sala 20 Altos/);
  assert.equal(org.address.addressLocality, 'Eusébio');
  assert.equal(org.address.postalCode, '61768-680');
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
