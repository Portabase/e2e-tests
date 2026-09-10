import {test, expect, data, error} from "./fixtures";

const missingId = "438e5292-1e7a-49d8-a3c0-3f4c24aceeb0";
const apiPath = (path: string) => `/api/v1${path}`;
const name = "API Organization A";
let org: {id: string; name: string};
let agent: {id: string};

test.describe.serial(() => {
    test("Create organization", async ({api}) => {
        org = await data(await api.post(apiPath("/organizations"), {data: {name}}), 201);
        expect(org).toMatchObject({id: expect.any(String), name});
        await error(await api.post(apiPath("/organizations"), {data: {name}}), 409);
    });

    test("List and get organization", async ({api}) => {
        expect(await data(await api.get(apiPath("/organizations")))).toEqual(
            expect.arrayContaining([
                expect.objectContaining({name: "Organization A"}),
                expect.objectContaining({name: "Organization B"}),
                expect.objectContaining({id: org.id, name}),
            ]),
        );
        expect(await data(await api.get(apiPath(`/organizations/${org.id}`)))).toMatchObject({id: org.id, name});
    });

    test("Attach agent to organization", async ({api}) => {
        agent = await data(await api.post(apiPath("/agents"), {data: {name: "API Attached Agent A"}}), 201);
        const route = apiPath(`/organizations/${org.id}/agents`);
        expect(await data(await api.post(route, {data: {agentId: agent.id}}), 201)).toMatchObject({organizationId: org.id, agentId: agent.id});
        await error(await api.post(route, {data: {agentId: agent.id}}), 422);
        await error(await api.post(route, {data: {agentId: "invalid"}}), 422);
    });

    test("List organization agents", async ({api}) => {
        expect(await data(await api.get(apiPath(`/organizations/${org.id}/agents`)))).toEqual(
            expect.arrayContaining([expect.objectContaining({id: agent.id})]),
        );
    });

    test("Detach agent from organization", async ({api}) => {
        const route = apiPath(`/organizations/${org.id}/agents`);
        expect(await data(await api.delete(`${route}/${agent.id}`))).toEqual({organizationId: org.id, agentId: agent.id});
        expect(await data(await api.get(route))).toEqual([]);
        expect((await api.delete(apiPath(`/agents/${agent.id}`))).status()).toBe(204);
    });

    test("Delete organization", async ({api}) => {
        expect(await data(await api.delete(apiPath(`/organizations/${org.id}`)))).toEqual({id: org.id});
        await error(await api.get(apiPath(`/organizations/${org.id}`)), 404);
    });

    test("Reject invalid organization input and unknown resources", async ({api}) => {
        await error(await api.post(apiPath("/organizations"), {data: {name: ""}}), 422);
        await error(await api.get(apiPath(`/organizations/${missingId}`)), 404);
        await error(await api.delete(apiPath(`/organizations/${missingId}`)), 404);
        for (const child of ["agents", "projects"]) await error(await api.get(apiPath(`/organizations/${missingId}/${child}`)), 404);
    });
});
