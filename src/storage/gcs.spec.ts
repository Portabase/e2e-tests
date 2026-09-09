import {test} from "@playwright/test";
import {LOCAL_STORAGE_PATH} from "../helpers/session";
import {bucket, connectLocalStorage, localStorage, testPrivateKey} from "../helpers/local-storage";

test.use({storageState: LOCAL_STORAGE_PATH});

for (const valid of [true, false]) {
    test(`Connect ${valid ? "valid" : "invalid"} fake GCS storage`, async ({page}) => {
        await connectLocalStorage(page, "Google Cloud Storage", valid ? localStorage.gcs.name : "Fake GCS Invalid", async () => {
            await page.getByLabel(/Project ID/).fill("portabase-e2e");
            await page.getByLabel(/Bucket name/).fill(valid ? bucket : "missing-bucket");
            await page.getByLabel(/Client email/).fill("e2e@portabase-e2e.iam.gserviceaccount.com");
            await page.getByLabel(/Private key/).fill(testPrivateKey());
            await page.getByLabel(/Endpoint URL/).fill(localStorage.gcs.endpoint);
        }, valid);
    });
}
