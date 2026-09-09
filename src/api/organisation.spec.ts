import {test, expect, data, error, uniqueName} from "./fixtures";
import {apiPath, missingId} from "./endpoints";

test.describe.serial(() => {
    test("Organization API creates, lists, reads, attaches and detaches an agent, and deletes", async ({api}) => {
        const name = uniqueName("organization");
        const org = await data(await api.post(apiPath("/organizations"), {data: {name}}), 201);
        let agent: {id: string} | undefined;
        try {
            expect(org).toMatchObject({id: expect.any(String), name});
            expect(await data(await api.get(apiPath("/organizations")))).toEqual(expect.arrayContaining([expect.objectContaining({id: org.id})]));
            expect(await data(await api.get(apiPath(`/organizations/${org.id}`)))).toMatchObject({id: org.id, name});
            await error(await api.post(apiPath("/organizations"), {data: {name}}), 409);
            agent = await data(await api.post(apiPath("/agents"), {data: {name: uniqueName("attached agent")}}), 201);
            const route = apiPath(`/organizations/${org.id}/agents`);
            expect(await data(await api.post(route, {data: {agentId: agent!.id}}), 201)).toMatchObject({organizationId: org.id, agentId: agent!.id});
            await error(await api.post(route, {data: {agentId: agent!.id}}), 422);
            expect(await data(await api.get(route))).toEqual(expect.arrayContaining([expect.objectContaining({id: agent!.id})]));
            expect(await data(await api.delete(`${route}/${agent!.id}`))).toEqual({organizationId: org.id, agentId: agent!.id});
            expect(await data(await api.get(route))).toEqual([]);
            await error(await api.post(route, {data: {agentId: "invalid"}}), 422);
        } finally {
            if (agent) expect((await api.delete(apiPath(`/agents/${agent.id}`))).status()).toBe(204);
            expect(await data(await api.delete(apiPath(`/organizations/${org.id}`)))).toEqual({id: org.id});
        }
        await error(await api.get(apiPath(`/organizations/${org.id}`)), 404);
    });

    test("Organization API rejects invalid input and unknown resources", async ({api}) => {
        await error(await api.post(apiPath("/organizations"), {data: {name: ""}}), 422);
        await error(await api.get(apiPath(`/organizations/${missingId}`)), 404);
        await error(await api.delete(apiPath(`/organizations/${missingId}`)), 404);
        for (const child of ["agents", "projects"]) await error(await api.get(apiPath(`/organizations/${missingId}/${child}`)), 404);
    });
});
