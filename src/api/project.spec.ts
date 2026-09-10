import {test, expect, data, error} from "./fixtures";

const missingId = "438e5292-1e7a-49d8-a3c0-3f4c24aceeb0";
const apiPath = (path: string) => `/api/v1${path}`;
let org: {id: string};
let project: {id: string};

test.describe.serial(() => {
    test("Create project", async ({api}) => {
        org = await data(await api.post(apiPath("/organizations"), {data: {name: "API Project Organization A"}}), 201);
        const route = apiPath(`/organizations/${org.id}/projects`);
        const name = "API Project A";
        await error(await api.post(route, {data: {name: ""}}), 422);
        project = await data(await api.post(route, {data: {name}}), 201);
        expect(project).toMatchObject({id: expect.any(String), name});
        await error(await api.post(route, {data: {name}}), 409);
    });

    test("List and get project", async ({api}) => {
        const organizations = await data<any[]>(await api.get(apiPath("/organizations")));
        const defaultOrganization = organizations.find(organization => organization.name === "Default Organization");
        expect(defaultOrganization).toBeTruthy();
        expect(await data<any[]>(await api.get(apiPath(`/organizations/${defaultOrganization.id}/projects`)))).toEqual(
            expect.arrayContaining([expect.objectContaining({name: "Project A"})]),
        );
        expect(await data(await api.get(apiPath(`/organizations/${org.id}/projects`)))).toEqual(
            expect.arrayContaining([expect.objectContaining({id: project.id, name: "API Project A"})]),
        );
        expect(await data(await api.get(apiPath(`/projects/${project.id}`)))).toMatchObject({
            id: project.id,
            organizationId: org.id,
            name: "API Project A",
        });
    });

    test("Delete project", async ({api}) => {
        await error(await api.delete(apiPath(`/organizations/${org.id}`)), 409);
        expect(await data(await api.delete(apiPath(`/projects/${project.id}`)))).toMatchObject({isArchived: true});
        expect(await data(await api.delete(apiPath(`/organizations/${org.id}`)))).toEqual({id: org.id});
    });

    test("Project API returns not found for unknown IDs", async ({api}) => {
        await error(await api.get(apiPath(`/projects/${missingId}`)), 404);
        await error(await api.delete(apiPath(`/projects/${missingId}`)), 404);
    });
});
