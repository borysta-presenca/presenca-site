#!/usr/bin/env bash
# ==============================================================================
# Presença Site — Esteira Unificada de Varredura de Segurança (100% Docker First)
# Espelha presenca/scripts/security-scan.sh:
#   1. Gitleaks  (zricethezav/gitleaks:v8.21.2) — Segredos na árvore + histórico Git
#   2. Opengrep  (ghcr.io/opengrep/opengrep / semgrep/semgrep) — SAST JavaScript/YAML
#   3. Bandit    (ghcr.io/pycqa/bandit/bandit) — SAST Python (tools/*.py)
# ==============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker não encontrado no PATH. A política Docker-First exige Docker ativo." >&2
  exit 1
fi

OVERALL_EXIT=0

echo "======================================================================"
echo "🛡️  Presença Site Security Suite (100% Docker First)"
echo "📂 Repositório: ${REPO_ROOT}"
echo "======================================================================"

echo ""
echo "🔍 [1/3] Gitleaks — Varredura de segredos na árvore de trabalho (--no-git)..."
if docker run --rm \
  -v "${REPO_ROOT}:/repo:ro" \
  zricethezav/gitleaks:v8.21.2 \
  detect --source=/repo --config=/repo/.gitleaks.toml --no-git --no-banner --verbose --redact; then
  echo "✅ [1a/3] Gitleaks (working tree): zero segredos detectados."
else
  echo "❌ [1a/3] Gitleaks (working tree): segredo(s) exposto(s) detectado(s)!" >&2
  OVERALL_EXIT=1
fi

echo ""
echo "🔍 [1b/3] Gitleaks — Varredura de segredos no histórico Git..."
if [[ -d "${REPO_ROOT}/.git" ]]; then
  if docker run --rm \
    -v "${REPO_ROOT}:/repo:ro" \
    zricethezav/gitleaks:v8.21.2 \
    detect --source=/repo --config=/repo/.gitleaks.toml --no-banner --verbose --redact; then
    echo "✅ [1b/3] Gitleaks (git history): zero segredos detectados."
  else
    echo "❌ [1b/3] Gitleaks (git history): segredo(s) detectado(s) no histórico de commits!" >&2
    OVERALL_EXIT=1
  fi
fi

echo ""
echo "🔍 [2/3] Opengrep / Semgrep — Análise Estática (SAST - .opengrep.yml)..."
if docker image inspect "ghcr.io/opengrep/opengrep:latest" >/dev/null 2>&1; then
  SAST_IMAGE="ghcr.io/opengrep/opengrep:latest"
  SAST_BIN="opengrep"
elif docker image inspect "semgrep/semgrep:latest" >/dev/null 2>&1; then
  SAST_IMAGE="semgrep/semgrep:latest"
  SAST_BIN="semgrep"
elif docker pull "ghcr.io/opengrep/opengrep:latest" >/dev/null 2>&1; then
  SAST_IMAGE="ghcr.io/opengrep/opengrep:latest"
  SAST_BIN="opengrep"
else
  SAST_IMAGE="semgrep/semgrep:latest"
  SAST_BIN="semgrep"
fi

if docker run --rm \
  -v "${REPO_ROOT}:/repo:ro" \
  -w /repo \
  "${SAST_IMAGE}" \
  "${SAST_BIN}" scan \
  --config /repo/.opengrep.yml \
  --exclude .git \
  --exclude .terraform \
  --metrics=off \
  --quiet \
  --severity ERROR --error \
  /repo; then
  echo "✅ [2/3] Opengrep SAST Gate: aprovado (zero violações bloqueantes)."
else
  echo "❌ [2/3] Opengrep SAST Gate: violações bloqueantes detectadas!" >&2
  OVERALL_EXIT=1
fi

echo ""
echo "🔍 [3/3] Bandit — Verificando scripts Python (*.py)..."
PY_COUNT="$(find "${REPO_ROOT}" \
  -path "${REPO_ROOT}/.git" -prune -o \
  -path "${REPO_ROOT}/infra" -prune -o \
  -name "*.py" -print | wc -l | tr -d ' ')"

if [[ "${PY_COUNT}" -gt 0 ]]; then
  echo "🐍 Encontrados ${PY_COUNT} arquivo(s) Python. Executando Bandit via Docker..."
  if docker run --rm \
    -v "${REPO_ROOT}:/repo:ro" \
    -w /repo \
    ghcr.io/pycqa/bandit/bandit:latest \
    -r /repo -x /repo/.git,/repo/infra -ll -ii; then
    echo "✅ [3/3] Bandit (Python SAST): aprovado."
  else
    echo "❌ [3/3] Bandit (Python SAST): vulnerabilidades detectadas!" >&2
    OVERALL_EXIT=1
  fi
fi

echo ""
echo "======================================================================"
if [[ "${OVERALL_EXIT}" -eq 0 ]]; then
  echo "✅ Varredura de segurança concluída com sucesso (Exit 0)."
else
  echo "❌ Varredura de segurança encontrou problemas bloqueantes (Exit ${OVERALL_EXIT})."
fi
echo "======================================================================"
exit "${OVERALL_EXIT}"
