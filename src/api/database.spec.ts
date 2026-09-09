import {test, expect, data, error, uniqueName} from "./fixtures";
import {apiPath, missingId} from "./endpoints";
import {execFileSync} from "node:child_process";
import {mkdtempSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {randomUUID} from "node:crypto";

test("Database API assigns projects, updates schedules, backs up and restores actual data", async ({api}) => {
    test.setTimeout(12 * 60_000);
    const directory = mkdtempSync(path.join(tmpdir(), "portabase-api-"));
    const config = path.join(directory, "databases.json");
    const generatedId = randomUUID();
    writeFileSync(config, JSON.stringify({databases: [{
        name: "API PostgreSQL", type: "postgresql", host: "api-postgres", port: 5432,
        database: "api_e2e", username: "backup", password: "backup", generated_id: generatedId,
    }]}));
    const org = await data(await api.post(apiPath("/organizations"), {data: {name: uniqueName("database org")}}), 201);
    let agent: any;
    let project: any;
    let edgeKey = "";
    const compose = (...args: string[]) => execFileSync("docker", ["compose", "-f", "docker/api/docker-compose.yml", ...args], {
        cwd: path.resolve(__dirname, "../.."),
        env: {...process.env, EDGE_KEY: edgeKey, API_AGENT_CONFIG: config},
        encoding: "utf8", timeout: 240_000, stdio: ["ignore", "pipe", "pipe"],
    });
    try {
        project = await data(await api.post(apiPath(`/organizations/${org.id}/projects`), {data: {name: uniqueName("database project")}}), 201);
        agent = await data(await api.post(apiPath("/agents"), {data: {name: uniqueName("database agent"), organizationId: org.id}}), 201);
        edgeKey = await data<string>(await api.get(apiPath(`/agents/${agent.id}/key`)));
        compose("up", "-d");
        let database: any;
        await expect(async () => {
            const databases = await data<any[]>(await api.get(apiPath("/databases")));
            database = databases.find(db => db.agentDatabaseId === generatedId);
            expect(database?.lastContact).toBeTruthy();
        }).toPass({timeout: 90_000, intervals: [2_000]});
        const route = apiPath(`/databases/${database.id}`);
        await error(await api.get(route), 403);
        await error(await api.patch(route, {data: {projectId: "invalid"}}), 422);
        expect(await data(await api.patch(route, {data: {projectId: project.id}}))).toMatchObject({projectId: project.id});
        expect(await data(await api.patch(route, {data: {projectId: null}}))).toMatchObject({projectId: null});
        await data(await api.patch(route, {data: {projectId: project.id}}));
        expect(await data(await api.get(route))).toMatchObject({id: database.id, agentDatabaseId: generatedId, name: "API PostgreSQL"});
        await error(await api.put(`${route}/backup-policy`, {data: {schedule: "invalid"}}), 422);
        expect(await data(await api.put(`${route}/backup-policy`, {data: {schedule: "0 0 1 1 *"}}))).toMatchObject({backupPolicy: "0 0 1 1 *"});
        expect(await data(await api.put(`${route}/backup-policy`, {data: {schedule: ""}}))).toMatchObject({backupPolicy: null});
        expect(await data(await api.get(`${route}/backup`))).toEqual([]);
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
        const sql = (query: string) => compose("exec", "-T", "api-postgres", "psql", "-U", "backup", "-d", "api_e2e", "-Atc", query).trim();
        expect(sql("SELECT value FROM e2e_restore_probe WHERE id = 1")).toBe("original");
        sql("UPDATE e2e_restore_probe SET value = 'changed' WHERE id = 1");
        expect(sql("SELECT value FROM e2e_restore_probe WHERE id = 1")).toBe("changed");
        const storage = completed.storages.find((item: any) => item.status === "success");
        const restore = await data(await api.post(`${route}/restore`, {data: {backupId: backup.id, backupStorageId: storage.id}}), 201);
        expect(restore).toMatchObject({databaseId: database.id, status: "waiting"});
        await expect(async () => {
            expect(await data(await api.get(`${route}/status`))).toMatchObject({latestRestoration: {id: restore.id, status: "success"}});
        }).toPass({timeout: 180_000, intervals: [2_000, 4_000]});
        expect(sql("SELECT value FROM e2e_restore_probe WHERE id = 1")).toBe("original");
    } finally {
        try {
            compose("down", "--volumes");
        } finally {
            if (agent) expect((await api.delete(apiPath(`/agents/${agent.id}`))).status()).toBe(204);
            if (project) await data(await api.delete(apiPath(`/projects/${project.id}`)));
            expect(await data(await api.delete(apiPath(`/organizations/${org.id}`)))).toEqual({id: org.id});
            rmSync(directory, {recursive: true, force: true});
        }
    }
});

test("Database API rejects unknown resources", async ({api}) => {
    for (const suffix of ["", "/status", "/backup", `/backup/${missingId}`]) {
        await error(await api.get(apiPath(`/databases/${missingId}${suffix}`)), 404);
    }
    await error(await api.post(apiPath(`/databases/${missingId}/backup`)), 404);
});
