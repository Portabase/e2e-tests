import {test} from "@playwright/test";
import {connectLocalStorage, localStorage} from "../helpers/local-storage";
import {LOCAL_STORAGE_PATH} from "../helpers/session";

test.use({storageState: LOCAL_STORAGE_PATH});

async function fillFtp(page: Parameters<typeof connectLocalStorage>[0], port: string, security: string) {
    await page.getByLabel("Host *", {exact: true}).fill(localStorage.ftp.host);
    await page.getByLabel("Port", {exact: true}).fill(port);
    await page.getByLabel("Username *", {exact: true}).fill(localStorage.ftp.username);
    await page.getByLabel("Password *", {exact: true}).fill(localStorage.ftp.password);
    await page.getByLabel("Remote path", {exact: true}).fill(localStorage.ftp.remotePath);
    await page.getByLabel("Security", {exact: true}).click();
    await page.getByRole("option", {name: security, exact: true}).click();
}

test.describe.serial(() => {
    test("Connect valid FTP storage", async ({page}) => {
        await connectLocalStorage(page, "FTP / FTPS", "ftp-test", async () => {
            await fillFtp(page, "2121", "FTP (unencrypted)");
        });
    });

    test("Connect valid explicit FTPS storage", async ({page}) => {
        await connectLocalStorage(page, "FTP / FTPS", "ftps-explicit", async () => {
            await fillFtp(page, "2121", "Explicit FTPS");
        });
    });

    test("Connect valid implicit FTPS storage", async ({page}) => {
        await connectLocalStorage(page, "FTP / FTPS", "ftps-implicit", async () => {
            await fillFtp(page, "2990", "Implicit FTPS");
        });
    });
});
