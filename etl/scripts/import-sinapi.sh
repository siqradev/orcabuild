#!/bin/bash
# scripts/import-sinapi.sh
#
# Importacao mensal automatica do SINAPI via crontab.
# Roda todo dia 16 as 06:00 — apos a janela de publicacao (dias 5-15).
#
# Configurar no crontab:
#   crontab -e
#   0 6 16 * * /path/to/api-orcamento-pro/scripts/import-sinapi.sh
#
# Variaveis de ambiente necessarias:
#   API_URL    — URL base da API (default: http://localhost:3000)
#   API_KEY    — chave mestra da API
#   LOG_DIR    — diretorio de logs (default: ./logs)
#   NOTIFY_EMAIL — email para notificacao (opcional)

set -euo pipefail

# ─── Configuracao ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

API_URL="${API_URL:-http://localhost:3000}"
API_KEY="${API_KEY:-}"
LOG_DIR="${LOG_DIR:-$PROJECT_DIR/logs}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

# Mes e ano atuais
MONTH=$(date +%-m)
YEAR=$(date +%Y)
DATE_TAG=$(date +%Y-%m-%d)

# ─── Log ──────────────────────────────────────────────────────────────────────

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sinapi-import-$DATE_TAG.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# ─── Validacao ────────────────────────────────────────────────────────────────

if [ -z "$API_KEY" ]; then
  # Tenta ler do .env do projeto
  if [ -f "$PROJECT_DIR/.env" ]; then
    API_KEY=$(grep '^MASTER_API_KEY=' "$PROJECT_DIR/.env" | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  fi
fi

if [ -z "$API_KEY" ]; then
  log "ERRO: API_KEY nao definida. Configure a variavel de ambiente ou o .env"
  exit 1
fi

# ─── Verifica se a API esta online ────────────────────────────────────────────

log "Verificando API em $API_URL..."

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")

if [ "$HTTP_STATUS" != "200" ]; then
  log "ERRO: API nao respondeu (status $HTTP_STATUS). Abortando."
  [ -n "$NOTIFY_EMAIL" ] && echo "SINAPI import FALHOU — API offline" | mail -s "[OrcaBuild] Falha import SINAPI $DATE_TAG" "$NOTIFY_EMAIL"
  exit 1
fi

log "API online. Iniciando importacao SINAPI $MONTH/$YEAR..."

# ─── Importacao ───────────────────────────────────────────────────────────────

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/import" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{\"state\": \"CE\", \"month\": $MONTH, \"year\": $YEAR}" \
  --max-time 600)  # timeout de 10 min — scraper + parser pode demorar

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

log "HTTP Status: $HTTP_CODE"
log "Resposta: $BODY"

# ─── Resultado ────────────────────────────────────────────────────────────────

if [ "$HTTP_CODE" = "201" ]; then
  ITEMS=$(echo "$BODY" | grep -o '"itemsCount":[0-9]*' | cut -d':' -f2)
  log "SUCESSO — $ITEMS itens importados (SINAPI $MONTH/$YEAR)"

  [ -n "$NOTIFY_EMAIL" ] && echo "SINAPI $MONTH/$YEAR importado com sucesso. $ITEMS itens." \
    | mail -s "[OrcaBuild] Import SINAPI $DATE_TAG OK" "$NOTIFY_EMAIL"

  exit 0
else
  log "FALHA — HTTP $HTTP_CODE"
  log "Detalhes: $BODY"

  [ -n "$NOTIFY_EMAIL" ] && echo "SINAPI import FALHOU. HTTP $HTTP_CODE. Log: $LOG_FILE" \
    | mail -s "[OrcaBuild] ERRO import SINAPI $DATE_TAG" "$NOTIFY_EMAIL"

  exit 1
fi
