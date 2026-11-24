import {test} from "@playwright/test";
import {connectLocalStorage, localStorage} from "../helpers/local-storage";
import {LOCAL_STORAGE_PATH} from "../helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

async function fillSamba(page: Parameters<typeof connectLocalStorage>[0], password = localStorage.samba.password) {
    await page.getByLabel("Host *", {exact: true}).fill(localStorage.samba.host);
    await page.getByLabel("Port", {exact: true}).fill(localStorage.samba.port);
    await page.getByLabel(/^Share/, {exact: false}).fill(localStorage.samba.share);
    await page.getByLabel(/^Username/, {exact: false}).fill(localStorage.samba.username);
    await page.getByLabel(/^Password/, {exact: false}).fill(password);
    await page.getByLabel("Remote path", {exact: true}).fill(localStorage.samba.remotePath);
}

test.describe.serial(() => {
    test("Connect valid Samba storage", async ({page}) => {
        await connectLocalStorage(page, "SMB", localStorage.samba.name, async () => {
            await fillSamba(page);
        });
    });

    test("Reject invalid Samba credentials", async ({page}) => {
        await connectLocalStorage(page, "SMB", "Samba Invalid", async () => {
            await fillSamba(page, "wrong-samba-password");
        }, false);
    });
});
