import {test, expect, data, error} from "./fixtures";

const missingId = "438e5292-1e7a-49d8-a3c0-3f4c24aceeb0";
const apiPath = (path: string) => `/api/v1${path}`;

test.describe.serial(() => {
    test("Agent API creates, lists, reads, retrieves an edge key and deletes an agent", async ({api}) => {
        expect(await data<any[]>(await api.get(apiPath("/agents")))).toEqual(expect.arrayContaining([
            expect.objectContaining({name: "Agent A Updated"}),
            expect.objectContaining({name: "Agent B"}),
        ]));
        const name = "API Agent A";
        const agent = await data(await api.post(apiPath("/agents"), {data: {name}}), 201);
        expect(agent).toMatchObject({id: expect.any(String), name});
        try {
            expect(await data(await api.get(apiPath("/agents")))).toEqual(expect.arrayContaining([expect.objectContaining({id: agent.id, name})]));
            expect(await data(await api.get(apiPath(`/agents/${agent.id}`)))).toMatchObject({id: agent.id, name});
            const key = await data<string>(await api.get(apiPath(`/agents/${agent.id}/key`)));
            expect(key.length).toBeGreaterThan(0);
        } finally {
            const deleted = await api.delete(apiPath(`/agents/${agent.id}`));
            expect(deleted.status()).toBe(204);
            expect(await deleted.body()).toHaveLength(0);
        }
        await error(await api.get(apiPath(`/agents/${agent.id}`)), 404);
        expect(await data(await api.get(apiPath("/agents")))).not.toEqual(expect.arrayContaining([expect.objectContaining({id: agent.id})]));
    });

    test("Agent API validates payloads and unknown IDs", async ({api}) => {
        await error(await api.post(apiPath("/agents"), {data: {name: ""}}), 422);
        await error(await api.post(apiPath("/agents"), {data: "{", headers: {"Content-Type": "application/json"}}), 422);
        for (const suffix of ["", "/key"]) await error(await api.get(apiPath(`/agents/${missingId}${suffix}`)), 404);
        await error(await api.delete(apiPath(`/agents/${missingId}`)), 404);
    });
});
