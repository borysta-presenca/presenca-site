#!/usr/bin/env node
/**
 * Production Readiness, Environment URL Hygiene, CSP & LGPD Gate for presenca-site (presenca.borysta.com)
 *
 * - Runs on every push/PR (`develop`, `homol`, `main`):
 *   1. Always blocks stale corporate data (`56.842.193/0001-85`, `Sala 1104`), stale plan prices
 *      (`299.00`, `499.00`, `999.00`), missing official CNPJ (`61.487.538/0001-67`), missing DPO
 *      contact (`privacidade@borysta.com`), or accidental naming of "WhatsApp" on HTML pages before
 *      Meta approval.
 *   2. Enforces `/app/#/login` and `/app/#/cadastro` mount paths (never root `/#/login` or `/#/cadastro`
 *      which would collide with the Landing Page at `/`) and forbids inline executable `<script>` tags
 *      so strict `Content-Security-Policy: script-src 'self'` works without `'unsafe-inline'`.
 *   3. Tracks `LGPD-01` (`politica-de-privacidade.html` and `termos-de-uso.html` showing
 *      "Texto em revisão jurídica" or `noindex`) as technical debt warning on `develop` and `homol`,
 *      and HARD-BLOCKS (`exit 1`) any PR or push targeting `main` (or `--enforce-prod`).
 *   4. Enforces strict environment URL isolation:
 *      - Targeting `homol`: blocks any leftover `dev.presenca.borysta.com` URL.
 *      - Targeting `develop`: blocks accidental `staging.presenca.borysta.com` URL.
 *      - Targeting `main` (or `--enforce-prod`): blocks both `dev.presenca.borysta.com` and
 *        `staging.presenca.borysta.com`.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function evaluateSiteReadiness({
  rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  baseRef = process.env.GITHUB_BASE_REF || '',
  refName = process.env.GITHUB_REF_NAME || '',
  enforceProd = false,
} = {}) {
  const effectiveTarget = enforceProd ? 'main' : baseRef || refName;
  const isMainTarget = effectiveTarget === 'main';
  const isHomolTarget = effectiveTarget === 'homol';
  const isDevelopTarget = effectiveTarget === 'develop';
  const errors = [];
  const warnings = [];

  const read = (relPath) => readFileSync(resolve(rootDir, relPath), 'utf8');

  const indexHtml = read('index.html');
  const duvidasHtml = read('duvidas.html');
  const llmsTxt = read('llms.txt');
  const llmsFullTxt = read('llms-full.txt');
  const aiPluginJson = read('.well-known/ai-plugin.json');
  const privacyHtml = read('politica-de-privacidade.html');
  const termsHtml = read('termos-de-uso.html');
  const sitemapXml = read('sitemap.xml');

  // 1. Always enforce official corporate data, plans & DPO contact across all branches
  const allCatalogFiles = [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
    ['llms.txt', llmsTxt],
    ['llms-full.txt', llmsFullTxt],
    ['politica-de-privacidade.html', privacyHtml],
    ['termos-de-uso.html', termsHtml],
  ];

  for (const [name, content] of allCatalogFiles) {
    if (content.includes('56.842.193/0001-85')) {
      errors.push(`[LGPD-02] ${name} still contains legacy CNPJ 56.842.193/0001-85 (expected 61.487.538/0001-67).`);
    }
    if (content.includes('Sala 1104')) {
      errors.push(`[LGPD-02] ${name} still contains legacy address Sala 1104 (expected Sala 701).`);
    }
    if (!content.includes('61.487.538/0001-67')) {
      errors.push(`[LGPD-02] ${name} is missing official CNPJ 61.487.538/0001-67.`);
    }
  }

  for (const stalePrice of ['"299.00"', '"499.00"', '"999.00"']) {
    if (indexHtml.includes(stalePrice)) {
      errors.push(`[LGPD-02] index.html JSON-LD still contains stale offer price ${stalePrice}.`);
    }
  }
  if (indexHtml.includes('"offers"')) {
    for (const expectedPrice of ['"498.00"', '"1498.00"', '"2998.00"']) {
      if (!indexHtml.includes(expectedPrice)) {
        errors.push(`[LGPD-02] index.html JSON-LD offers block is missing official price ${expectedPrice}.`);
      }
    }
  }

  for (const [name, content] of [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
    ['llms.txt', llmsTxt],
    ['llms-full.txt', llmsFullTxt],
  ]) {
    if (!content.includes('privacidade@borysta.com')) {
      errors.push(`[LGPD-02] ${name} must publish DPO e-mail privacidade@borysta.com (LGPD Art. 41 §1º).`);
    }
    if (!content.includes('Sala 701')) {
      errors.push(`[LGPD-02] ${name} must publish official corporate address Sala 701 (Decreto 7.962/2013 Art. 2º).`);
    }
    if (!content.includes('Pix Automático')) {
      errors.push(`[LGPD-02] ${name} must list Pix Automático among official payment methods.`);
    }
  }

  for (const [name, content] of [
    ['llms.txt', llmsTxt],
    ['llms-full.txt', llmsFullTxt],
  ]) {
    for (const stalePlanText of ['R$ 299', 'R$ 499', 'R$ 999', '+R$ 59', '+R$ 79']) {
      if (content.includes(stalePlanText)) {
        errors.push(`[LGPD-02] ${name} still contains stale plan price ${stalePlanText}.`);
      }
    }
  }

  // House rule (README.md): HTML pages do not name "WhatsApp" until Meta approval
  for (const [name, content] of [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
  ]) {
    if (/whatsapp/i.test(content)) {
      errors.push(`[BRAND] ${name} mentions "WhatsApp" directly (house rule requires "mensagens" until Meta approval).`);
    }
  }

  // 2. Enforce /app/#/ SPA mount path (no root /#/login or /#/cadastro collision) & strict CSP (no inline JS)
  for (const [name, html] of [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
    ['politica-de-privacidade.html', privacyHtml],
    ['termos-de-uso.html', termsHtml],
  ]) {
    const scriptTags = html.match(/<script\b[^>]*>/gi) || [];
    for (const tag of scriptTags) {
      const isJsonLd = /type\s*=\s*["']application\/ld\+json["']/i.test(tag);
      const hasExternalSrc = /\bsrc\s*=\s*["'][^"']+["']/i.test(tag);
      if (!isJsonLd && !hasExternalSrc) {
        errors.push(`[CSP] ${name} contains inline executable <script> (${tag}); extract to external JS for script-src 'self'.`);
      }
    }
  }

  for (const [name, content] of [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
    ['llms-full.txt', llmsFullTxt],
  ]) {
    if (/presenca\.borysta\.com\/#\/(login|cadastro)/.test(content)) {
      errors.push(`[SPA-PATH] ${name} points to root /#/(login|cadastro) instead of /app/#/(login|cadastro).`);
    }
  }

  for (const [name, html] of [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
  ]) {
    if (/data-dialog|data-login\b|<dialog\b[^>]*class\s*=\s*["'][^"']*login/i.test(html)) {
      errors.push(`[LOGIN-SINGLE] ${name} still contains a duplicate Landing Page login modal/trigger; all "Entrar" links must navigate directly to /app/#/login.`);
    }
  }

  // 3. LGPD-01: Legal pages placeholder & noindex check (warning on develop/homol, hard block on main)
  for (const [name, html] of [
    ['politica-de-privacidade.html', privacyHtml],
    ['termos-de-uso.html', termsHtml],
  ]) {
    const hasPlaceholder = /revis[aã]o jur[ií]dica/i.test(html);
    const hasNoIndex = /noindex/i.test(html);
    const textLength = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;

    if (hasPlaceholder || hasNoIndex || textLength < 1200) {
      const msg = `[LGPD-01] ${name} is still in placeholder/noindex state (textLength=${textLength}). Must contain full approved legal text before merging to main.`;
      if (isMainTarget) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  }

  if (isMainTarget) {
    if (!sitemapXml.includes('politica-de-privacidade.html') || !sitemapXml.includes('termos-de-uso.html')) {
      errors.push('[LGPD-01] sitemap.xml must list politica-de-privacidade.html and termos-de-uso.html before merging to main.');
    }
  }

  // 4. Environment URL isolation (develop vs homol vs main)
  const urlBearingFiles = [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
    ['llms.txt', llmsTxt],
    ['llms-full.txt', llmsFullTxt],
    ['.well-known/ai-plugin.json', aiPluginJson],
  ];

  for (const [name, content] of urlBearingFiles) {
    const hasDevUrl = content.includes('dev.presenca.borysta.com');
    const hasStagingUrl = content.includes('staging.presenca.borysta.com');

    if (isMainTarget && (hasDevUrl || hasStagingUrl)) {
      errors.push(`[PROD-URL] ${name} points to non-production host (dev./staging.presenca.borysta.com). Replace with production app URL before merging to main.`);
    } else if (isHomolTarget && hasDevUrl) {
      errors.push(`[ENV-URL] ${name} still points to dev.presenca.borysta.com when targeting homol (expected staging.presenca.borysta.com).`);
    } else if (isDevelopTarget && hasStagingUrl) {
      errors.push(`[ENV-URL] ${name} points to staging.presenca.borysta.com when targeting develop (expected dev.presenca.borysta.com).`);
    } else if (hasDevUrl || hasStagingUrl) {
      warnings.push(`[PROD-URL] ${name} points to non-production host (expected on develop/homol; blocked on main).`);
    }
  }

  return { ok: errors.length === 0, isMainTarget, isHomolTarget, errors, warnings };
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const enforceProd = process.argv.includes('--enforce-prod');
  const result = evaluateSiteReadiness({ enforceProd });

  for (const w of result.warnings) {
    console.warn(`WARN: ${w}`);
  }
  if (!result.ok) {
    console.error('\n❌ presenca-site Production Readiness / LGPD Gate FAILED:');
    for (const e of result.errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }
  const modeLabel = result.isMainTarget ? 'main/production' : result.isHomolTarget ? 'homol/staging' : 'develop';
  console.log(`✅ presenca-site gate passed (mode=${modeLabel}, warnings=${result.warnings.length}).`);
}
