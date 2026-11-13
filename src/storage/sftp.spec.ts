import {test} from "@playwright/test";
import {connectLocalStorage, localStorage} from "../helpers/local-storage";
import {LOCAL_STORAGE_PATH} from "../helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

test.describe.serial(() => {
    test("Connect valid SFTPGo storage", async ({page}) => {
        await connectLocalStorage(page, "SFTP", localStorage.sftpgo.name, async () => {
            await page.getByLabel("Host *", {exact: true}).fill(localStorage.sftpgo.host);
            await page.getByLabel("Port", {exact: true}).fill(localStorage.sftpgo.port);
            await page.getByLabel("Username *", {exact: true}).fill(localStorage.sftpgo.username);
            await page.getByLabel("Password", {exact: true}).fill(localStorage.sftpgo.password);
            await page.getByLabel("Remote path", {exact: true}).fill(localStorage.sftpgo.remotePath);
        });
    });

    test("Connect invalid SFTPGo storage", async ({page}) => {
        await connectLocalStorage(page, "SFTP", "SFTPGo Invalid", async () => {
            await page.getByLabel("Host *", {exact: true}).fill(localStorage.sftpgo.host);
            await page.getByLabel("Port", {exact: true}).fill(localStorage.sftpgo.port);
            await page.getByLabel("Username *", {exact: true}).fill(localStorage.sftpgo.username);
            await page.getByLabel("Password", {exact: true}).fill("wrong-sftpgo-password");
        }, false);
    });
});
