# REST API E2E coverage

Reference: https://portabase.io/docs/dashboard/api/introduction

Enable `API_ENABLED=true` and `OPENAPI_ENABLED=true` (included in `docker/server/.env`).
The API project runs after the notification, storage and project tests, and checks
the organizations, agents, projects and databases created through the UI.
The cleanup project waits for the API tests before revoking the shared UI session.

Run the suite with `pnpm exec playwright test --project=api`. Against an already
initialized E2E environment and saved authenticated session, add `--no-deps`.
One API key is created through Account Settings, stored in `src/api-key.json`
and reused by every API test. No external account or manual token is required.

`contract.spec.ts` compares all 25 operations with `/api/v1/openapi`, checks Swagger
UI, and tests missing and invalid `x-api-key` headers on every operation.

| Test | Methods and paths under `/api/v1` | Behavior |
| --- | --- | --- |
| agent.spec.ts | GET/POST `/agents`, GET/DELETE `/agents/{id}`, GET `/agents/{id}/key` | Create, list, read, edge key, delete; invalid payload/JSON and missing IDs |
| organisation.spec.ts | GET/POST `/organizations`, GET/DELETE `/organizations/{id}` | Create, list, read, duplicate slug, delete, validation and missing IDs |
| organisation.spec.ts | GET/POST `/organizations/{id}/agents`, DELETE `/organizations/{id}/agents/{agentId}` | Attach, list, duplicate attachment, detach and invalid IDs |
| project.spec.ts | GET/POST `/organizations/{id}/projects`, GET/DELETE `/projects/{id}` | Create, list, read, duplicate slug, archive; reject deleting an organization with a live project |
| database.spec.ts | GET `/databases`, GET/PATCH `/databases/{id}`, PUT `/databases/{id}/backup-policy` | Discover agent source, read, attach/detach, save/clear cron and reject invalid input |
| database.spec.ts | GET `/databases/{id}/status`, GET/POST `/databases/{id}/backup`, GET `/databases/{id}/backup/{backupId}`, POST `/databases/{id}/restore` | Backup an existing managed database, poll success and storage records, restore it; invalid restore and missing backups |

The backup-policy request uses `schedule`, as accepted by the route implementation.
The OpenAPI version originally inspected described this property as `backupPolicy`;
this discrepancy is deliberately documented instead of sending an unsupported body.
