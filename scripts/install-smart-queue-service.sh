#!/bin/bash

# Smart Queue Service Installer
# Instala e configura o Smart Queue como serviço systemd

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_NAME="smart-queue"
SERVICE_FILE="$SCRIPT_DIR/smart-queue.service"
SYSTEMD_DIR="/etc/systemd/system"
CONFIG_DIR="/etc/smart-queue"
LOG_DIR="/var/log"
RUN_DIR="/var/run"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Verificar se está rodando como root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Este script deve ser executado como root (sudo)"
        exit 1
    fi
}

# Criar usuário do serviço
create_service_user() {
    log_info "Criando usuário do serviço..."

    if id "smartqueue" &>/dev/null; then
        log_warn "Usuário smartqueue já existe"
    else
        useradd --system --shell /bin/false --home-dir /nonexistent --create-home smartqueue
        log_success "Usuário smartqueue criado"
    fi
}

# Criar diretórios necessários
create_directories() {
    log_info "Criando diretórios necessários..."

    mkdir -p "$CONFIG_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$RUN_DIR"

    # Ajustar permissões
    chown smartqueue:smartqueue "$CONFIG_DIR"
    chown smartqueue:smartqueue "$LOG_DIR"
    chown smartqueue:smartqueue "$RUN_DIR"

    log_success "Diretórios criados e permissões ajustadas"
}

# Instalar arquivo de serviço
install_service_file() {
    log_info "Instalando arquivo de serviço..."

    cp "$SERVICE_FILE" "$SYSTEMD_DIR/"
    chmod 644 "$SYSTEMD_DIR/$SERVICE_NAME.service"

    log_success "Arquivo de serviço instalado"
}

# Criar arquivo de configuração padrão
create_default_config() {
    log_info "Criando configuração padrão..."

    cat > "$CONFIG_DIR/config.json" << EOF
{
  "baseDir": "/home/pedro/projetos/char-lib/data",
  "supportedTypes": ["anime", "manga"],
  "maxWorksPerCycle": 2,
  "characterLimit": 15,
  "delayBetweenTypes": 300000,
  "delayBetweenCycles": 600000,
  "enrich": true
}
EOF

    chown smartqueue:smartqueue "$CONFIG_DIR/config.json"
    chmod 644 "$CONFIG_DIR/config.json"

    log_success "Configuração padrão criada"
}

# Recarregar systemd
reload_systemd() {
    log_info "Recarregando systemd..."

    systemctl daemon-reload

    log_success "Systemd recarregado"
}

# Habilitar serviço
enable_service() {
    log_info "Habilitando serviço..."

    systemctl enable "$SERVICE_NAME"

    log_success "Serviço habilitado para iniciar automaticamente"
}

# Mostrar instruções de uso
show_usage() {
    echo
    log_success "Smart Queue instalado com sucesso!"
    echo
    echo "Comandos disponíveis:"
    echo "  sudo systemctl start smart-queue     # Iniciar serviço"
    echo "  sudo systemctl stop smart-queue      # Parar serviço"
    echo "  sudo systemctl restart smart-queue   # Reiniciar serviço"
    echo "  sudo systemctl status smart-queue    # Ver status"
    echo "  sudo systemctl enable smart-queue    # Habilitar auto-início"
    echo "  sudo systemctl disable smart-queue   # Desabilitar auto-início"
    echo
    echo "Logs:"
    echo "  journalctl -u smart-queue -f         # Seguir logs em tempo real"
    echo "  journalctl -u smart-queue --since today  # Logs de hoje"
    echo
    echo "Configuração:"
    echo "  Arquivo: $CONFIG_DIR/config.json"
    echo "  Logs: $LOG_DIR/smart-queue.log"
    echo "  PID: $RUN_DIR/smart-queue.pid"
    echo
}

# Função principal
main() {
    echo "🚀 Instalador do Smart Queue Daemon"
    echo "=================================="

    check_root
    create_service_user
    create_directories
    install_service_file
    create_default_config
    reload_systemd
    enable_service
    show_usage
}

# Executar
main "$@"