#!/bin/bash

# Mizan Backend Deployment Script
# Deploys the application to production environment

set -e

echo "🚀 Starting Mizan Backend Deployment..."

# Configuration
ENVIRONMENT=${1:-production}
DOCKER_COMPOSE_FILE="docker-compose.prod.yml"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    log_info "Checking environment variables..."
    
    required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "GRAFANA_PASSWORD")
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log_info "All required environment variables are set"
}

# Create backup of current deployment
create_backup() {
    log_info "Creating backup of current deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if docker-compose -f "$DOCKER_COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose -f "$DOCKER_COMPOSE_FILE" exec -T postgres pg_dump -U mizan_user mizan_prod > "$BACKUP_DIR/database.sql"
    fi
    
    # Backup application data
    if [ -d "./data" ]; then
        log_info "Backing up application data..."
        cp -r ./data "$BACKUP_DIR/"
    fi
    
    log_info "Backup created at $BACKUP_DIR"
}

# Run pre-deployment tests
run_tests() {
    log_info "Running pre-deployment tests..."
    
    # Run unit tests
    npm test
    
    # Run integration tests
    if [ -f "./__tests__/integration/run-tests.sh" ]; then
        ./__tests__/integration/run-tests.sh
    fi
    
    log_info "All tests passed"
}

# Build and deploy application
deploy_application() {
    log_info "Building and deploying application..."
    
    # Pull latest images
    docker-compose -f "$DOCKER_COMPOSE_FILE" pull
    
    # Build application
    docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache
    
    # Stop existing services
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    
    # Start services
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    check_service_health
}

# Check if all services are healthy
check_service_health() {
    log_info "Checking service health..."
    
    services=("postgres" "redis" "app" "nginx")
    
    for service in "${services[@]}"; do
        if docker-compose -f "$DOCKER_COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            log_info "$service is running"
        else
            log_error "$service is not running"
            exit 1
        fi
    done
    
    # Test API endpoint
    if curl -f http://localhost/health > /dev/null 2>&1; then
        log_info "API health check passed"
    else
        log_error "API health check failed"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    docker-compose -f "$DOCKER_COMPOSE_FILE" exec app npm run migrate:prod
    
    log_info "Database migrations completed"
}

# Setup monitoring
setup_monitoring() {
    log_info "Setting up monitoring..."
    
    # Wait for Grafana to be ready
    sleep 10
    
    # Import dashboards (if needed)
    if [ -d "./monitoring/grafana/dashboards" ]; then
        log_info "Grafana dashboards will be available at http://localhost:3001"
    fi
    
    log_info "Monitoring setup completed"
}

# Main deployment process
main() {
    log_info "Starting deployment to $ENVIRONMENT environment"
    
    # Pre-deployment checks
    check_env_vars
    run_tests
    
    # Create backup
    create_backup
    
    # Deploy application
    deploy_application
    
    # Run migrations
    run_migrations
    
    # Setup monitoring
    setup_monitoring
    
    log_info "🎉 Deployment completed successfully!"
    log_info "Application is available at: https://localhost"
    log_info "Grafana monitoring: http://localhost:3001"
    log_info "Prometheus metrics: http://localhost:9090"
}

# Run main function
main "$@"
