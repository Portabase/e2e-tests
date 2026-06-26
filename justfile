seed-keycloak:
	@docker compose -f docker/oidc/docker-compose.yml stop keycloak >/dev/null 2>&1 || true
	@docker compose -f docker/oidc/docker-compose.yml rm -f -s keycloak >/dev/null 2>&1 || true
	@docker volume rm portabase-oidc_keycloak-data >/dev/null 2>&1 || true
	@docker compose -f docker/oidc/docker-compose.yml up -d keycloak
	@echo "Keycloak seed import triggered from seeds/keycloak/*.json"

seed-pocket:
	@docker compose -f docker/oidc/docker-compose.yml stop pocket-id >/dev/null 2>&1 || true
	@docker compose -f docker/oidc/docker-compose.yml rm -f -s pocket-id >/dev/null 2>&1 || true
	@docker volume rm portabase-oidc_pocket-id-data >/dev/null 2>&1 || true
	@docker compose -f docker/oidc/docker-compose.yml run --rm -v $(pwd)/seeds/oidc/pocket-id/portabase.zip:/tmp/portabase.zip pocket-id ./pocket-id import --yes --path /tmp/portabase.zip >/dev/null
	@docker compose -f docker/oidc/docker-compose.yml up -d pocket-id
	@sleep 2
	@docker compose -f docker/oidc/docker-compose.yml exec pocket-id ./pocket-id one-time-access-token admin
	@echo "Pocket ID data restored from seeds/oidc/pocket-id/portabase.zip"

seed-authentik:
	@docker compose -f docker/oidc/docker-compose.yml stop authentik-postgresql authentik-server authentik-worker >/dev/null 2>&1 || true
	@docker compose -f docker/oidc/docker-compose.yml rm -f -s authentik-postgresql authentik-server authentik-worker >/dev/null 2>&1 || true
	@docker volume rm portabase-oidc_authentik-data >/dev/null 2>&1 || true
	@docker compose -f docker/oidc/docker-compose.yml up -d authentik-postgresql authentik-server authentik-worker
	@docker compose -f docker/oidc/docker-compose.yml run --rm authentik-bootstrap
	@echo "Authentik seed/bootstrap completed"

seed-auth:
	@echo "Starting seeding..."
	@just seed-keycloak
	@just seed-authentik
	@echo "Finished seeding."

e2e-before skip_onboarding="true":
	@echo "Starting E2E testing..."
	@docker network inspect portabase >/dev/null 2>&1 || docker network create portabase
	@docker compose -f docker/database/docker-compose.yml down --volumes
	@docker compose -f docker/database/docker-compose.yml up -d
	@just seed-auth
	@docker compose -f docker/server/docker-compose.yml down --volumes
	@SKIP_ONBOARDING={{skip_onboarding}} docker compose -f docker/server/docker-compose.yml up -d

e2e-clean:
	@docker compose -f docker/server/docker-compose.yml down --volumes
	@docker compose -f docker/oidc/docker-compose.yml down --volumes

e2e-auto:
	@just e2e-before false
	@just e2e-onboarding-auto
	@just e2e-clean
	@just e2e-before
	@just e2e-dashboard-auto
	@just e2e-clean
	@echo "Finished E2E testing successfully."

e2e-dashboard-manual:
	@just e2e-before
	@pnpm playwright test --ui || (just e2e-clean; exit 1)
	@just e2e-clean
	@echo "Finished E2E testing successfully."

e2e-dashboard-auto:
	@CI=true pnpm playwright test || (just e2e-clean; exit 1)
	@echo "Finished E2E testing successfully."

e2e-onboarding-manual:
	@just e2e-before false
	@SKIP_ONBOARDING=false pnpm playwright test --ui --project setup onboarding || (just e2e-clean; exit 1)
	@just e2e-clean
	@echo "Finished onboarding E2E testing successfully."

e2e-onboarding-auto:
	@SKIP_ONBOARDING=false CI=true pnpm playwright test --project=onboarding || (just e2e-clean; exit 1)
	@echo "Finished onboarding E2E testing successfully."
