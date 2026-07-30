seed-keycloak:
    @echo "Seeding Keycloak..."
    @docker compose -f docker/oidc/docker-compose.yml stop keycloak >/dev/null 2>&1 || true
    @docker compose -f docker/oidc/docker-compose.yml rm -f -s keycloak >/dev/null 2>&1 || true
    @docker volume rm portabase-oidc_keycloak-data >/dev/null 2>&1 || true
    @docker compose -f docker/oidc/docker-compose.yml up -d keycloak
    @echo "Keycloak seed import completed from seeds/keycloak/*.json"

seed-pocket:
    @echo "Seeding Pocket ID..."
    @docker compose -f docker/oidc/docker-compose.yml stop pocket-id >/dev/null 2>&1 || true
    @docker compose -f docker/oidc/docker-compose.yml rm -f -s pocket-id >/dev/null 2>&1 || true
    @docker volume rm portabase-oidc_pocket-id-data >/dev/null 2>&1 || true
    @docker compose -f docker/oidc/docker-compose.yml run --rm -v $(pwd)/seeds/oidc/pocket-id/portabase.zip:/tmp/portabase.zip pocket-id ./pocket-id import --yes --path /tmp/portabase.zip >/dev/null
    @docker compose -f docker/oidc/docker-compose.yml up -d pocket-id
    @sleep 2
    @docker compose -f docker/oidc/docker-compose.yml exec pocket-id ./pocket-id one-time-access-token admin
    @echo "Pocket ID data restored from seeds/oidc/pocket-id/portabase.zip"

seed-authentik:
    @echo "Seeding Authentik..."
    @docker compose -f docker/oidc/docker-compose.yml stop authentik-postgresql authentik-server authentik-worker >/dev/null 2>&1 || true
    @docker compose -f docker/oidc/docker-compose.yml rm -f -s authentik-postgresql authentik-server authentik-worker >/dev/null 2>&1 || true
    @docker volume rm portabase-oidc_authentik-data >/dev/null 2>&1 || true
    @docker compose -f docker/oidc/docker-compose.yml up -d authentik-postgresql authentik-server authentik-worker
    @docker compose -f docker/oidc/docker-compose.yml run --rm authentik-bootstrap
    @echo "Authentik seed and bootstrap completed"

seed-auth:
    @echo "Seeding OIDC providers..."
    @just seed-keycloak
    @just seed-authentik
    @echo "OIDC providers seeding completed"

e2e-before:
    @echo "Starting test environment..."
    @just e2e-clean
    @docker network inspect portabase >/dev/null 2>&1 || docker network create portabase
    @docker compose -f docker/database/docker-compose.yml up -d
    @just seed-auth

e2e-after:
    @just e2e-clean
    @echo "All tests completed successfully"

e2e-clean:
    @echo "Cleaning Docker artifacts (containers, images, and volumes)..."
    @docker compose -f docker/server/docker-compose.yml down --volumes
    @docker compose -f docker/oidc/docker-compose.yml down --volumes
    @docker compose -f docker/database/docker-compose.yml down --volumes
    @echo "Docker artifacts cleaned up successfully"

e2e-auto:
    @just e2e-before
    @SKIP_ONBOARDING=false docker compose -f docker/server/docker-compose.yml up -d
    @just e2e-onboarding-auto
    @docker compose -f docker/server/docker-compose.yml down --volumes
    docker compose -f docker/server/docker-compose.yml up -d
    @just e2e-dashboard-auto
    @just e2e-after

e2e-dashboard-manual:
    @just e2e-before
    @SKIP_ONBOARDING=true docker compose -f docker/server/docker-compose.yml up -d
    @echo "Launching dashboard tests in interactive mode..."
    @pnpm playwright test --ui || (just e2e-clean; exit 1)
    @just e2e-after

e2e-dashboard-auto:
    @echo "Launching dashboard tests in non-interactive mode..."
    @SKIP_ONBOARDING=true CI=true pnpm playwright test || (just e2e-clean; exit 1)

e2e-onboarding-manual:
    @just e2e-before
    @SKIP_ONBOARDING=false docker compose -f docker/server/docker-compose.yml up -d
    @echo "Launching onboarding tests in interactive mode..."
    @SKIP_ONBOARDING=false pnpm playwright test --ui --project=onboarding || (just e2e-clean; exit 1)
    @just e2e-after

e2e-onboarding-auto:
    @echo "Launching dashboard tests in non-interactive mode..."
    @SKIP_ONBOARDING=false CI=true pnpm playwright test --project=onboarding || (just e2e-clean; exit 1)
