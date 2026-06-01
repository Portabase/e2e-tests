# Authentik seed contract

This directory defines the deterministic Authentik seed used by the local OIDC stack in `docker-compose.yml`.

## Bootstrap contract

The compose stack must provide these first-start bootstrap values on the `authentik-worker` container:

- `AUTHENTIK_BOOTSTRAP_PASSWORD`
- `AUTHENTIK_BOOTSTRAP_TOKEN`
- `AUTHENTIK_BOOTSTRAP_EMAIL`

Per Authentik's automated install flow, those values are only read on the first startup of a fresh Authentik database volume.

## Mounted assets

- `blueprints/portabase-oidc.yaml`
  - mounted into `/blueprints/portabase-oidc.yaml`
  - auto-discovered by the Authentik worker
  - kept as an in-repo reference blueprint for the intended provider/application shape
- `bootstrap.sh`
  - executed by the dedicated `authentik-bootstrap` compose service
  - waits for the server and required default Authentik objects
  - grants the bootstrap admin deterministic `authentik Admins` membership from inside Authentik
  - resolves the required default flow, scope-mapping, and signing-key objects from inside Authentik with `ak shell`
  - then reconciles the deterministic Portabase seed objects through Authentik's ORM before proving the public discovery URL over HTTP

## Seeded objects

The bootstrap flow is expected to reconcile, idempotently:

- an OAuth2/OIDC provider named `portabase`
- an application named `Portabase` with slug `portabase`
- a confidential client id `portabase`
- a client secret `portabase-e2e-secret`
- a strict redirect URI `http://localhost:8887/api/auth/sso/callback/authentik`
- an internal test user:
  - username: `auth.entik@example.com`
  - email: `auth.entik@example.com`
  - password: `testPASS123456!`
- an `admin` group containing the test user

## Expected runtime outputs

After a fresh `docker compose -f docker/oidc/docker-compose.yml up`, the seeded Authentik instance should expose:

- `http://localhost:3057/-/health/live/`
- `http://localhost:3057/application/o/portabase/.well-known/openid-configuration`

That discovery document is the canonical proof that the bootstrap completed successfully. The runtime source of truth is `bootstrap.sh`, which first normalizes the bootstrap admin's permissions inside Authentik and then reconciles the provider, application, user, and group directly inside Authentik even if blueprint auto-application semantics or bootstrap-token permissions change between Authentik releases.

## Portabase env contract

This seed is aligned with the current E2E environment:

- `AUTH_OIDC_AUTHENTIK_ID=authentik`
- `AUTH_OIDC_AUTHENTIK_CLIENT=portabase`
- `AUTH_OIDC_AUTHENTIK_SECRET=portabase-e2e-secret`
- `AUTH_OIDC_AUTHENTIK_DISCOVERY_ENDPOINT=http://authentik-server:9000/application/o/portabase/.well-known/openid-configuration`
- `AUTH_OIDC_AUTHENTIK_HOST=authentik-server:9000`
- `AUTH_OIDC_AUTHENTIK_SCOPES=openid profile email`
- `AUTH_OIDC_AUTHENTIK_ALLOWED_GROUP=admin`
