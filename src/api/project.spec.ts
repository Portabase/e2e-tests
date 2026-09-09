import {test, expect, data, error} from "./fixtures";

const missingId = "438e5292-1e7a-49d8-a3c0-3f4c24aceeb0";
const apiPath = (path: string) => `/api/v1${path}`;

test.describe.serial(() => {
    test("Project API creates and lists organization projects, reads and archives a project", async ({api}) => {
        const organizations = await data<any[]>(await api.get(apiPath("/organizations")));
        const defaultOrganization = organizations.find(organization => organization.name === "Default Organization");
        expect(defaultOrganization).toBeTruthy();
        expect(await data<any[]>(await api.get(apiPath(`/organizations/${defaultOrganization.id}/projects`)))).toEqual(
            expect.arrayContaining([expect.objectContaining({name: "Project A"})]),
        );
        const org = await data(await api.post(apiPath("/organizations"), {data: {name: "API Project Organization A"}}), 201);
        let project: {id: string} | undefined;
        try {
            const route = apiPath(`/organizations/${org.id}/projects`);
            const name = "API Project A";
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
});
