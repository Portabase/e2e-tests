import {test} from "@playwright/test";
import {importLatestBackup} from "./helpers/import";
import {LOCAL_STORAGE_PATH} from "./helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});
test.describe.configure({mode: "serial", retries: 0});

const sources = [
    {project: "PostgreSQL", database: "PostgreSQL 18"},
    {project: "MySQL/MariaDB", database: "MySQL 8.4"},
    {project: "MySQL/MariaDB", database: "MariaDB 11.4"},
    {project: "MongoDB", database: "MongoDB 8.0 Auth"},
    {project: "Redis/Valkey", database: "Redis 8"},
    {project: "Redis/Valkey", database: "Valkey 8"},
    {project: "MSSQL/SQLite", database: "MSSQL 2022"},
    {project: "MSSQL/SQLite", database: "SQLite 3.46"},
    {project: "Firebird", database: "Firebird 5.0"},
] as const;

test.describe.serial("Manually import the latest backup from every source", () => {
    for (const source of sources) {
        test(`Import ${source.database}`, async ({page}) => {
            await importLatestBackup(page, source);
        });
    }
});
