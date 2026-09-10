import {test, expect} from "@playwright/test";

const endpoints = [
    ["GET", "/agents"], ["POST", "/agents"],
    ["GET", "/agents/{id}"], ["DELETE", "/agents/{id}"], ["GET", "/agents/{id}/key"],
    ["GET", "/databases"], ["GET", "/databases/{id}"], ["PATCH", "/databases/{id}"],
    ["GET", "/databases/{id}/status"], ["GET", "/databases/{id}/backup"], ["POST", "/databases/{id}/backup"],
    ["GET", "/databases/{id}/backup/{backupId}"], ["POST", "/databases/{id}/restore"],
    ["PUT", "/databases/{id}/backup-policy"],
    ["GET", "/organizations"], ["POST", "/organizations"],
    ["GET", "/organizations/{id}"], ["DELETE", "/organizations/{id}"],
    ["GET", "/organizations/{id}/projects"], ["POST", "/organizations/{id}/projects"],
    ["GET", "/organizations/{id}/agents"], ["POST", "/organizations/{id}/agents"],
    ["DELETE", "/organizations/{id}/agents/{agentId}"],
    ["GET", "/projects/{id}"], ["DELETE", "/projects/{id}"],
] as const;
const missingId = "438e5292-1e7a-49d8-a3c0-3f4c24aceeb0";
const apiPath = (path: string) => `/api/v1${path}`;

test.describe.serial(() => {
    test("OpenAPI exposes every mapped REST operation and API-key authentication", async ({request}) => {
        const response = await request.get(apiPath("/openapi"));
        expect(response.status()).toBe(200);
        const spec = await response.json();
        expect(spec.openapi).toMatch(/^3\./);
        expect(spec.components.securitySchemes.apiKeyAuth).toMatchObject({type: "apiKey", in: "header", name: "x-api-key"});
        const actual = Object.entries(spec.paths).flatMap(([path, item]) => Object.keys(item as object)
            .filter(method => ["get", "post", "put", "patch", "delete"].includes(method))
            .map(method => `${method.toUpperCase()} ${path}`));
        expect(actual.sort()).toEqual(endpoints.map(([method, path]) => `${method} ${path}`).sort());
    });

    test("Swagger documentation is available", async ({request}) => {
        const docs = await request.get(apiPath("/docs"));
        expect(docs.status()).toBe(200);
        expect(await docs.text()).toContain("swagger");
    });

    for (const [method, template] of endpoints) {
        for (const key of [undefined, "invalid-e2e-api-key"]) {
            test(`${method} ${template} rejects ${key ? "invalid" : "missing"} API key`, async ({request}) => {
                const response = await request.fetch(apiPath(template.replace(/\{\w+\}/g, missingId)), {
                    method,
                    headers: key ? {"x-api-key": key} : {},
                    ...(["POST", "PUT", "PATCH"].includes(method) ? {data: {}} : {}),
                });
                expect(response.status()).toBe(401);
                expect(await response.json()).toMatchObject({error: expect.any(String)});
            });
        }
    }
});
