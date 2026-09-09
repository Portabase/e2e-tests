import {test, expect, data, error, uniqueName} from "./fixtures";
import {apiPath, missingId} from "./endpoints";

test("Project API creates and lists organization projects, reads and archives a project", async ({api}) => {
    const org = await data(await api.post(apiPath("/organizations"), {data: {name: uniqueName("project organization")}}), 201);
    let project: {id: string} | undefined;
    try {
        const route = apiPath(`/organizations/${org.id}/projects`);
        const name = uniqueName("project");
        await error(await api.post(route, {data: {name: ""}}), 422);
        project = await data(await api.post(route, {data: {name}}), 201);
        expect(await data(await api.get(route))).toEqual(expect.arrayContaining([expect.objectContaining({id: project!.id, name})]));
        expect(await data(await api.get(apiPath(`/projects/${project!.id}`)))).toMatchObject({id: project!.id, organizationId: org.id, name});
        await error(await api.post(route, {data: {name}}), 409);
        await error(await api.delete(apiPath(`/organizations/${org.id}`)), 409);
    } finally {
        if (project) expect(await data(await api.delete(apiPath(`/projects/${project.id}`)))).toMatchObject({isArchived: true});
        expect(await data(await api.delete(apiPath(`/organizations/${org.id}`)))).toEqual({id: org.id});
    }
});

test("Project API returns not found for unknown IDs", async ({api}) => {
    await error(await api.get(apiPath(`/projects/${missingId}`)), 404);
    await error(await api.delete(apiPath(`/projects/${missingId}`)), 404);
});
