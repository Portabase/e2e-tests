import {test, expect, data, error} from "./fixtures";

const missingId = "438e5292-1e7a-49d8-a3c0-3f4c24aceeb0";
const apiPath = (path: string) => `/api/v1${path}`;
let org: any;
let project: any;
let database: any;
let attachedAgentId: string;
let originalProjectId: string | null;
let originalBackupPolicy: string | null;
let databasePath: string;
let backup: any;
let completed: any;
let restore: any;

test.describe.serial(() => {
    test("Prepare database API resources", async ({api}) => {
        org = await data(await api.post(apiPath("/organizations"), {data: {name: "API Database Organization A"}}), 201);
        project = await data(await api.post(apiPath(`/organizations/${org.id}/projects`), {data: {name: "API Database Project A"}}), 201);
        const databases = await data<any[]>(await api.get(apiPath("/databases")));
        database = databases.find(item => item.name === "PostgreSQL 18" && item.lastContact && item.agentId);
        expect(database, "project dependency exposes an online PostgreSQL database").toBeTruthy();
        attachedAgentId = database.agentId;
        originalProjectId = database.projectId ?? null;
        originalBackupPolicy = database.backupPolicy ?? null;
        databasePath = apiPath(`/databases/${database.id}`);
        await data(await api.post(apiPath(`/organizations/${org.id}/agents`), {data: {agentId: attachedAgentId}}), 201);
    });

    test("List and get database", async ({api}) => {
        expect(await data<any[]>(await api.get(apiPath("/databases")))).toEqual(
            expect.arrayContaining([expect.objectContaining({id: database.id, name: database.name})]),
        );
        expect(await data(await api.get(databasePath))).toMatchObject({id: database.id, name: database.name});
    });

    test("Assign database project", async ({api}) => {
        await error(await api.patch(databasePath, {data: {projectId: "invalid"}}), 422);
        expect(await data(await api.patch(databasePath, {data: {projectId: project.id}}))).toMatchObject({projectId: project.id});
        expect(await data(await api.patch(databasePath, {data: {projectId: null}}))).toMatchObject({projectId: null});
        await data(await api.patch(databasePath, {data: {projectId: project.id}}));
    });

    test("Update database backup policy", async ({api}) => {
        await error(await api.put(`${databasePath}/backup-policy`, {data: {schedule: "invalid"}}), 422);
        expect(await data(await api.put(`${databasePath}/backup-policy`, {data: {schedule: "0 0 1 1 *"}}))).toMatchObject({backupPolicy: "0 0 1 1 *"});
        expect(await data(await api.put(`${databasePath}/backup-policy`, {data: {schedule: ""}}))).toMatchObject({backupPolicy: null});
    });

    test("List backups and reject invalid restores", async ({api}) => {
        expect(await data(await api.get(`${databasePath}/backup`))).toEqual(expect.any(Array));
        await error(await api.get(`${databasePath}/backup/${missingId}`), 404);
        await error(await api.post(`${databasePath}/restore`, {data: {backupId: "invalid", backupStorageId: "invalid"}}), 422);
        await error(await api.post(`${databasePath}/restore`, {data: {backupId: missingId, backupStorageId: missingId}}), 404);
    });

    test("Create database backup", async ({api}) => {
        backup = await data(await api.post(`${databasePath}/backup`), 201);
        expect(backup).toMatchObject({databaseId: database.id, status: "waiting"});
    });

    test("Retrieve database backup and status", async ({api}) => {
        test.setTimeout(4 * 60_000);
        await expect(async () => {
            completed = await data(await api.get(`${databasePath}/backup/${backup.id}`));
            expect(completed.status).toBe("success");
            expect(completed.storages).toEqual(expect.arrayContaining([expect.objectContaining({status: "success"})]));
        }).toPass({timeout: 180_000, intervals: [2_000, 4_000]});
        expect(await data(await api.get(`${databasePath}/backup`))).toEqual(expect.arrayContaining([expect.objectContaining({id: backup.id, status: "success"})]));
        expect(await data(await api.get(`${databasePath}/status`))).toMatchObject({latestBackup: {id: backup.id, status: "success"}});
    });

    test("Restore database backup", async ({api}) => {
        const storage = completed.storages.find((item: any) => item.status === "success");
        restore = await data(await api.post(`${databasePath}/restore`, {data: {backupId: backup.id, backupStorageId: storage.id}}), 201);
        expect(restore).toMatchObject({databaseId: database.id, status: "waiting"});
    });

    test("Retrieve database restoration status", async ({api}) => {
        test.setTimeout(4 * 60_000);
        await expect(async () => {
            expect(await data(await api.get(`${databasePath}/status`))).toMatchObject({latestRestoration: {id: restore.id, status: "success"}});
        }).toPass({timeout: 180_000, intervals: [2_000, 4_000]});
    });

    test("Delete database API resources", async ({api}) => {
        await data(await api.put(`${databasePath}/backup-policy`, {data: {schedule: originalBackupPolicy ?? ""}}));
        await data(await api.patch(databasePath, {data: {projectId: originalProjectId}}));
        await data(await api.delete(apiPath(`/organizations/${org.id}/agents/${attachedAgentId}`)));
        await data(await api.delete(apiPath(`/projects/${project.id}`)));
        expect(await data(await api.delete(apiPath(`/organizations/${org.id}`)))).toEqual({id: org.id});
    });

    test("Database API rejects unknown resources", async ({api}) => {
        for (const suffix of ["", "/status", "/backup", `/backup/${missingId}`]) {
            await error(await api.get(apiPath(`/databases/${missingId}${suffix}`)), 404);
        }
        await error(await api.post(apiPath(`/databases/${missingId}/backup`)), 404);
    });
});
