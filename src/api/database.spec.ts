import {test, expect, data, error, uniqueName} from "./fixtures";
import {apiPath, missingId} from "./endpoints";

test("Database API assigns projects, updates schedules, backs up and restores a managed database", async ({api}) => {
    test.setTimeout(8 * 60_000);
    const org = await data(await api.post(apiPath("/organizations"), {data: {name: uniqueName("database org")}}), 201);
    let project: any;
    let database: any;
    let attachedAgentId: string | undefined;
    let originalProjectId: string | null = null;
    let originalBackupPolicy: string | null = null;
    try {
        project = await data(await api.post(apiPath(`/organizations/${org.id}/projects`), {data: {name: uniqueName("database project")}}), 201);
        const databases = await data<any[]>(await api.get(apiPath("/databases")));
        database = databases.find(item => item.dbms === "postgresql" && item.lastContact && item.agentId);
        expect(database, "project dependency exposes an online PostgreSQL database").toBeTruthy();
        attachedAgentId = database.agentId;
        originalProjectId = database.projectId ?? null;
        originalBackupPolicy = database.backupPolicy ?? null;
        await data(await api.post(apiPath(`/organizations/${org.id}/agents`), {data: {agentId: attachedAgentId}}), 201);
        const route = apiPath(`/databases/${database.id}`);
        await error(await api.patch(route, {data: {projectId: "invalid"}}), 422);
        expect(await data(await api.patch(route, {data: {projectId: project.id}}))).toMatchObject({projectId: project.id});
        expect(await data(await api.patch(route, {data: {projectId: null}}))).toMatchObject({projectId: null});
        await data(await api.patch(route, {data: {projectId: project.id}}));
        expect(await data(await api.get(route))).toMatchObject({id: database.id, name: database.name});
        await error(await api.put(`${route}/backup-policy`, {data: {schedule: "invalid"}}), 422);
        expect(await data(await api.put(`${route}/backup-policy`, {data: {schedule: "0 0 1 1 *"}}))).toMatchObject({backupPolicy: "0 0 1 1 *"});
        expect(await data(await api.put(`${route}/backup-policy`, {data: {schedule: ""}}))).toMatchObject({backupPolicy: null});
        expect(await data(await api.get(`${route}/backup`))).toEqual(expect.any(Array));
        await error(await api.get(`${route}/backup/${missingId}`), 404);
        await error(await api.post(`${route}/restore`, {data: {backupId: "invalid", backupStorageId: "invalid"}}), 422);
        await error(await api.post(`${route}/restore`, {data: {backupId: missingId, backupStorageId: missingId}}), 404);
        const backup = await data(await api.post(`${route}/backup`), 201);
        expect(backup).toMatchObject({databaseId: database.id, status: "waiting"});
        let completed: any;
        await expect(async () => {
            completed = await data(await api.get(`${route}/backup/${backup.id}`));
            expect(completed.status).toBe("success");
            expect(completed.storages).toEqual(expect.arrayContaining([expect.objectContaining({status: "success"})]));
        }).toPass({timeout: 180_000, intervals: [2_000, 4_000]});
        expect(await data(await api.get(`${route}/backup`))).toEqual(expect.arrayContaining([expect.objectContaining({id: backup.id, status: "success"})]));
        expect(await data(await api.get(`${route}/status`))).toMatchObject({latestBackup: {id: backup.id, status: "success"}});
        const storage = completed.storages.find((item: any) => item.status === "success");
        const restore = await data(await api.post(`${route}/restore`, {data: {backupId: backup.id, backupStorageId: storage.id}}), 201);
        expect(restore).toMatchObject({databaseId: database.id, status: "waiting"});
        await expect(async () => {
            expect(await data(await api.get(`${route}/status`))).toMatchObject({latestRestoration: {id: restore.id, status: "success"}});
        }).toPass({timeout: 180_000, intervals: [2_000, 4_000]});
    } finally {
        if (database) {
            const route = apiPath(`/databases/${database.id}`);
            await data(await api.put(`${route}/backup-policy`, {data: {schedule: originalBackupPolicy ?? ""}}));
            await data(await api.patch(route, {data: {projectId: originalProjectId}}));
        }
        if (attachedAgentId) await data(await api.delete(apiPath(`/organizations/${org.id}/agents/${attachedAgentId}`)));
        if (project) await data(await api.delete(apiPath(`/projects/${project.id}`)));
        expect(await data(await api.delete(apiPath(`/organizations/${org.id}`)))).toEqual({id: org.id});
    }
});

test("Database API rejects unknown resources", async ({api}) => {
    for (const suffix of ["", "/status", "/backup", `/backup/${missingId}`]) {
        await error(await api.get(apiPath(`/databases/${missingId}${suffix}`)), 404);
    }
    await error(await api.post(apiPath(`/databases/${missingId}/backup`)), 404);
});
