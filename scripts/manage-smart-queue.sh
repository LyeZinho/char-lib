#!/bin/bash

# Smart Queue Service Manager
# Gerencia o daemon do Smart Queue (start, stop, status, logs, etc.)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="smart-queue"
CONFIG_DIR="/etc/smart-queue"
LOG_FILE="/var/log/smart-queue.log"
PID_FILE="/var/run/smart-queue.pid"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se o serviço está instalado
check_service_installed() {
    if ! systemctl is-enabled "$SERVICE_NAME" &>/dev/null && ! systemctl is-active "$SERVICE_NAME" &>/dev/null; then
        log_error "Serviço $SERVICE_NAME não está instalado."
        log_info "Execute: sudo $SCRIPT_DIR/install-smart-queue-service.sh"
        exit 1
    fi
}

# Iniciar serviço
start_service() {
    log_info "Iniciando Smart Queue daemon..."

    if sudo systemctl start "$SERVICE_NAME"; then
        log_success "Serviço iniciado"
        sleep 2
        show_status
    else
        log_error "Falha ao iniciar serviço"
        exit 1
    fi
}

# Parar serviço
stop_service() {
    log_info "Parando Smart Queue daemon..."

    if sudo systemctl stop "$SERVICE_NAME"; then
        log_success "Serviço parado"
    else
        log_error "Falha ao parar serviço"
        exit 1
    fi
}

# Reiniciar serviço
restart_service() {
    log_info "Reiniciando Smart Queue daemon..."

    if sudo systemctl restart "$SERVICE_NAME"; then
        log_success "Serviço reiniciado"
        sleep 2
        show_status
    else
        log_error "Falha ao reiniciar serviço"
        exit 1
    fi
}

# Mostrar status
show_status() {
    echo
    echo "🧠 Status do Smart Queue Daemon"
    echo "================================"

    if systemctl is-active "$SERVICE_NAME" &>/dev/null; then
        echo -e "${GREEN}● Status:${NC} Ativo (running)"
    else
        echo -e "${RED}● Status:${NC} Inativo (stopped)"
    fi

    echo -n "● Serviço: "
    if systemctl is-enabled "$SERVICE_NAME" &>/dev/null; then
        echo -e "${GREEN}Habilitado${NC}"
    else
        echo -e "${YELLOW}Desabilitado${NC}"
    fi

    # Mostrar PID se estiver rodando
    if [[ -f "$PID_FILE" ]]; then
        PID=$(cat "$PID_FILE" 2>/dev/null)
        if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
            echo "● PID: $PID"
        else
            echo "● PID: Arquivo existe mas processo não encontrado"
        fi
    else
        echo "● PID: Não encontrado"
    fi

    # Estatísticas do log
    if [[ -f "$LOG_FILE" ]]; then
        LOG_SIZE=$(du -h "$LOG_FILE" | cut -f1)
        LOG_LINES=$(wc -l < "$LOG_FILE")
        LAST_LOG=$(tail -1 "$LOG_FILE" 2>/dev/null | cut -d' ' -f1-3 || echo "N/A")
        echo "● Log: $LOG_SIZE ($LOG_LINES linhas)"
        echo "● Último log: $LAST_LOG"
    else
        echo "● Log: Arquivo não encontrado"
    fi

    # Mostrar estatísticas da Smart Queue
    if [[ -f "/home/pedro/projetos/char-lib/data/smart-queue-state.json" ]]; then
        echo
        echo "📊 Estatísticas da Smart Queue:"
        # Usar jq se disponível, senão usar grep
        if command -v jq &> /dev/null; then
            jq -r '
                "● Ciclos executados: \(.stats.totalCycles)",
                "● Obras processadas: \(.stats.totalProcessed)",
                "● Personagens coletados: \(.stats.totalCharacters)",
                "● Iniciado em: \(.startTime)",
                "● Última execução: \(.lastRun // "Nunca")"
            ' "/home/pedro/projetos/char-lib/data/smart-queue-state.json" 2>/dev/null || echo "Erro ao ler estatísticas"
        else
            echo "● Instale jq para ver estatísticas detalhadas"
        fi
    fi

    echo
}

# Mostrar logs
show_logs() {
    local lines="${1:-50}"

    echo "📝 Logs do Smart Queue (últimas $lines linhas)"
    echo "==========================================="

    if [[ -f "$LOG_FILE" ]]; then
        tail -n "$lines" "$LOG_FILE"
    else
        log_error "Arquivo de log não encontrado: $LOG_FILE"
        exit 1
    fi
}

# Seguir logs em tempo real
follow_logs() {
    echo "📝 Seguindo logs do Smart Queue (Ctrl+C para sair)"
    echo "================================================="

    if [[ -f "$LOG_FILE" ]]; then
        tail -f "$LOG_FILE"
    else
        log_error "Arquivo de log não encontrado: $LOG_FILE"
        journalctl -u "$SERVICE_NAME" -f
    fi
}

# Resetar estado
reset_state() {
    log_warn "Isso irá resetar todo o estado da Smart Queue!"
    read -p "Tem certeza? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Resetando estado..."

        # Resetar estado da Smart Queue
        if [[ -f "/home/pedro/projetos/char-lib/data/smart-queue-state.json" ]]; then
            rm "/home/pedro/projetos/char-lib/data/smart-queue-state.json"
            log_success "Estado da Smart Queue resetado"
        fi

        # Limpar logs se solicitado
        read -p "Limpar logs também? (y/N): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ -f "$LOG_FILE" ]]; then
                > "$LOG_FILE"
                log_success "Logs limpos"
            fi
        fi

        log_success "Reset concluído"
    else
        log_info "Operação cancelada"
    fi
}

# Mostrar ajuda
show_help() {
    echo "🧠 Smart Queue Daemon Manager"
    echo "=============================="
    echo
    echo "Uso: $0 <comando>"
    echo
    echo "Comandos:"
    echo "  start           Iniciar o daemon"
    echo "  stop            Parar o daemon"
    echo "  restart         Reiniciar o daemon"
    echo "  status          Mostrar status detalhado"
    echo "  logs [linhas]   Mostrar logs (padrão: 50 linhas)"
    echo "  follow          Seguir logs em tempo real"
    echo "  reset           Resetar estado e logs"
    echo "  help            Mostrar esta ajuda"
    echo
    echo "Exemplos:"
    echo "  $0 start"
    echo "  $0 logs 100"
    echo "  $0 follow"
    echo
}

# Função principal
main() {
    case "${1:-help}" in
        start)
            check_service_installed
            start_service
            ;;
        stop)
            check_service_installed
            stop_service
            ;;
        restart)
            check_service_installed
            restart_service
            ;;
        status)
            check_service_installed
            show_status
            ;;
        logs)
            check_service_installed
            show_logs "${2:-50}"
            ;;
        follow)
            check_service_installed
            follow_logs
            ;;
        reset)
            reset_state
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Comando desconhecido: $1"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Executar
main "$@"