import {test} from "@playwright/test";
import {connectLocalStorage, localStorage} from "../helpers/local-storage";
import {LOCAL_STORAGE_PATH} from "../helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

test.describe.serial(() => {
    test("Connect valid SFTPGo WebDAV storage", async ({page}) => {
        // Own name: the SFTP spec already owns "sftpgo", and a duplicate makes the Firebird storage pick ambiguous.
        await connectLocalStorage(page, "WebDAV", `${localStorage.sftpgo.name}-webdav`, async () => {
            await page.getByLabel("WebDAV URL *", {exact: true}).fill(localStorage.sftpgo.webdavUrl);
            await page.getByLabel("Username", {exact: true}).fill(localStorage.sftpgo.username);
            await page.getByLabel("Password", {exact: true}).fill(localStorage.sftpgo.password);
            await page.getByLabel("Remote path", {exact: true}).fill(localStorage.sftpgo.remotePath);
        });
    });

    test("Reject invalid SFTPGo WebDAV credentials", async ({page}) => {
        await connectLocalStorage(page, "WebDAV", "SFTPGo WebDAV Invalid", async () => {
            await page.getByLabel("WebDAV URL *", {exact: true}).fill(localStorage.sftpgo.webdavUrl);
            await page.getByLabel("Username", {exact: true}).fill(localStorage.sftpgo.username);
            await page.getByLabel("Password", {exact: true}).fill("wrong-sftpgo-password");
        }, false);
    });
});
