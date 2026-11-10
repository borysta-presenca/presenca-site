#!/usr/bin/env node
/**
 * Production Readiness & LGPD Gate for presenca-site (presenca.borysta.com)
 *
 * - Runs on every push/PR (`develop`, `hml`, `main`):
 *   1. Always blocks stale corporate data (`56.842.193/0001-85`, `Sala 1104`), stale plan prices
 *      (`299.00`, `499.00`, `999.00`), missing official CNPJ (`61.487.538/0001-67`), missing DPO
 *      contact (`privacidade@borysta.com`), or accidental naming of "WhatsApp" on HTML pages before
 *      Meta approval.
 *   2. Tracks `LGPD-01` (`politica-de-privacidade.html` and `termos-de-uso.html` showing
 *      "Texto em revisão jurídica" or `noindex`) as technical debt warning on `develop` and `hml`,
 *      and HARD-BLOCKS (`exit 1`) any PR or push targeting `main` (or `--enforce-prod`).
 *   3. Blocks non-production app URLs (`dev.presenca.borysta.com`, `staging.presenca.borysta.com`)
 *      when targeting `main` (or `--enforce-prod`).
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
  const isMainTarget = enforceProd || baseRef === 'main' || refName === 'main';
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
  for (const expectedPrice of ['"498.00"', '"1498.00"', '"2998.00"']) {
    if (!indexHtml.includes(expectedPrice)) {
      errors.push(`[LGPD-02] index.html JSON-LD is missing official offer price ${expectedPrice}.`);
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
    if (!content.includes('Pix Automático')) {
      errors.push(`[LGPD-02] ${name} must list Pix Automático among official payment methods.`);
    }
  }

  for (const [name, content] of [
    ['llms.txt', llmsTxt],
    ['llms-full.txt', llmsFullTxt],
  ]) {
    for (const stalePlanText of ['R$ 299', 'R$ 499', 'R$ 999']) {
      if (content.includes(stalePlanText)) {
        errors.push(`[LGPD-02] ${name} still contains stale plan price ${stalePlanText}.`);
      }
    }
    for (const officialPlanText of ['R$ 498,00', 'R$ 1.498,00', 'R$ 2.998,00']) {
      if (!content.includes(officialPlanText)) {
        errors.push(`[LGPD-02] ${name} is missing official plan price ${officialPlanText}.`);
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

  // 2. LGPD-01: Legal pages placeholder & noindex check (warning on develop/hml, hard block on main)
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

  // 3. Environment URL check when targeting main (production)
  const urlBearingFiles = [
    ['index.html', indexHtml],
    ['duvidas.html', duvidasHtml],
    ['llms.txt', llmsTxt],
    ['llms-full.txt', llmsFullTxt],
    ['.well-known/ai-plugin.json', aiPluginJson],
  ];

  for (const [name, content] of urlBearingFiles) {
    if (content.includes('dev.presenca.borysta.com') || content.includes('staging.presenca.borysta.com')) {
      const msg = `[PROD-URL] ${name} points to non-production host (dev./staging.presenca.borysta.com).`;
      if (isMainTarget) {
        errors.push(`${msg} Replace with production app URL before merging to main.`);
      } else {
        warnings.push(`${msg} Expected on develop/hml; blocked on main.`);
      }
    }
  }

  return { ok: errors.length === 0, isMainTarget, errors, warnings };
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
  console.log(
    `✅ presenca-site gate passed (mode=${result.isMainTarget ? 'main/production' : 'develop/staging'}, warnings=${result.warnings.length}).`,
  );
}
