#!/bin/bash

# UBI-CMS Startup Orchestration Script
# This script ensures services start in the correct order with proper health checks

set -e

# Colors for output
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Health check function
wait_for_service() {
    local service=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=0

    log_info "Waiting for $service to be healthy..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_info "$service is healthy!"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log_warn "$service not ready yet (attempt $attempt/$max_attempts)"
        sleep 2
    done
    
    log_error "$service failed to become healthy"
    return 1
}

# Start infrastructure services
start_infrastructure() {
    log_info "Starting infrastructure services..."
    
    # Start PostgreSQL
    log_info "Starting PostgreSQL..."
    podman compose -f docker/docker-compose.yml up -d postgres
    wait_for_service "PostgreSQL" "http://localhost:5432" 15 || {
        podman exec ubi-cms-postgres pg_isready -U postgres || exit 1
    }
    
    # Start Redis
    log_info "Starting Redis..."
    podman compose -f docker/docker-compose.yml up -d redis
    sleep 3
    podman exec ubi-cms-redis redis-cli ping || exit 1
    
    # Start NATS
    log_info "Starting NATS..."
    podman compose -f docker/docker-compose.yml up -d nats
    wait_for_service "NATS" "http://localhost:8222/healthz" 20
    
    # Start MinIO
    log_info "Starting MinIO..."
    podman compose -f docker/docker-compose.yml up -d minio
    wait_for_service "MinIO" "http://localhost:9000/minio/health/live" 15
    
    log_info "Infrastructure services started successfully!"
}

# Start observability stack
start_observability() {
    log_info "Starting observability stack..."
    
    podman compose -f docker/compose/docker-compose.observability.yml up -d
    
    wait_for_service "Prometheus" "http://localhost:9090/-/healthy" 15
    wait_for_service "Loki" "http://localhost:3100/ready" 15
    wait_for_service "Grafana" "http://localhost:3000/api/health" 20
    
    log_info "Observability stack started successfully!"
}

# Start IAM and Policy services
start_iam() {
    log_info "Starting IAM services..."
    
    # Start Keycloak
    log_info "Starting Keycloak..."
    podman compose -f docker/docker-compose.yml up -d keycloak
    wait_for_service "Keycloak" "http://localhost:8080/health/ready" 60
    
    # Start OPA
    log_info "Starting OPA..."
    podman compose -f docker/compose/docker-compose.foundation-ext.yml up -d opa
    wait_for_service "OPA" "http://localhost:8181/health" 15
    
    log_info "IAM services started successfully!"
}

# Start workflow engine
start_temporal() {
    log_info "Starting Temporal..."
    podman compose -f docker/docker-compose.yml up -d temporal
    wait_for_service "Temporal" "http://localhost:7233" 30
    
    log_info "Temporal started successfully!"
}

# Start core business services
start_core_services() {
    log_info "Starting core business services..."
    
    # Layer 1: Foundation services (no dependencies on other business services)
    log_info "Starting Layer 1: Foundation services..."
    podman compose -f docker/docker-compose.yml up -d \
        auth-service \
        ledger-service \
        reputation-service
    
    sleep 5
    wait_for_service "Auth Service" "http://localhost:3001/health" 20
    wait_for_service "Ledger Service" "http://localhost:3003/health" 20
    wait_for_service "Reputation Service" "http://localhost:3007/health" 20
    
    # Layer 2: Services dependent on Layer 1
    log_info "Starting Layer 2: Dependent services..."
    podman compose -f docker/docker-compose.yml up -d \
        ubi-engine \
        treasury-engine \
        rewards-engine \
        notifications-service
    
    sleep 5
    wait_for_service "UBI Engine" "http://localhost:3002/health" 20
    wait_for_service "Treasury Engine" "http://localhost:3004/health" 20
    wait_for_service "Rewards Engine" "http://localhost:3008/health" 20
    wait_for_service "Notifications Service" "http://localhost:3009/health" 20
    
    # Layer 3: Higher-level services
    log_info "Starting Layer 3: Business logic services..."
    podman compose -f docker/docker-compose.yml up -d \
        governance-service \
        task-marketplace \
        referral-service
    
    sleep 5
    wait_for_service "Governance Service" "http://localhost:3005/health" 20
    wait_for_service "Task Marketplace" "http://localhost:3006/health" 20
    wait_for_service "Referral Service" "http://localhost:3010/health" 20
    
    log_info "Core business services started successfully!"
}

# Start AI/Agent services
start_agent_services() {
    log_info "Starting AI Agent services..."
    
    podman compose -f docker/docker-compose.yml up -d \
        agent-control-plane \
        agent-runner \
        knowledge-service
    
    sleep 5
    wait_for_service "Agent Control Plane" "http://localhost:3011/health" 20
    wait_for_service "Agent Runner" "http://localhost:3012/health" 20
    wait_for_service "Knowledge Service" "http://localhost:3014/health" 20
    
    log_info "AI Agent services started successfully!"
}

# Start API Gateway
start_gateway() {
    log_info "Starting API Gateway..."
    podman compose -f docker/docker-compose.yml up -d gateway
    wait_for_service "API Gateway" "http://localhost:2025/ping" 15
    
    log_info "API Gateway started successfully!"
}

# Main startup sequence
main() {
    log_info "========================================="
    log_info "UBI-CMS Platform Startup"
    log_info "========================================="
    
    # Check if Podman is running
    if ! podman info > /dev/null 2>&1; then
        log_error "Podman is not running. Please start Podman and try again."
        exit 1
    fi
    
    # Create networks if they don't exist
    podman network create ubi-cms-network 2>/dev/null || log_info "Network already exists"
    
    # Start services in order
    start_infrastructure
    start_observability
    start_iam
    start_temporal
    start_core_services
    start_agent_services
    start_gateway
    
    log_info "========================================="
    log_info "All services started successfully!"
    log_info "========================================="
    log_info ""
    log_info "Access points:"
    log_info "  - API Gateway: http://localhost:2025"
    log_info "  - Grafana: http://localhost:3000 (admin/admin)"
    log_info "  - Prometheus: http://localhost:9090"
    log_info "  - Keycloak: http://localhost:8080"
    log_info "  - MinIO Console: http://localhost:9001"
    log_info "  - NATS Monitoring: http://localhost:8222"
    log_info ""
    log_info "To view logs: podman compose logs -f [service-name]"
    log_info "To stop all: ./scripts/shutdown.sh"
}

# Run main function
main
