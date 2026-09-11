import {test} from "@playwright/test";
import * as fs from "fs";
import {API_KEY_PATH, LOCAL_STORAGE_PATH} from "./helpers/session";

test.describe(() => {
    test.beforeAll(async () => {
        if (fs.existsSync(LOCAL_STORAGE_PATH)) fs.unlinkSync(LOCAL_STORAGE_PATH);
        if (fs.existsSync(API_KEY_PATH)) fs.unlinkSync(API_KEY_PATH);
        fs.writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify({}));
    });

    test("Prepare shared storage state", async () => {
    });
});
