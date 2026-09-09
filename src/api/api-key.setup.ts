import {test} from "@playwright/test";
import {createApiKey} from "./fixtures";

test.describe.serial(() => {
    test("Create shared API key", async ({browser}) => {
        await createApiKey(browser);
    });
});
