import {test, expect} from "@playwright/test";
import {apiPath, endpoints, missingId} from "./endpoints";

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
