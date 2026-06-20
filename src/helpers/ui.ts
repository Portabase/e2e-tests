import {expect, Locator, Page} from "@playwright/test";

/**
 * Click a Radix overlay trigger and wait until the overlay content is actually visible.
 *
 * The dashboard is a hydrated Next.js app: on a freshly navigated `/dashboard/**` page a
 * click can land after the trigger is actionable but before React wires its onClick, so
 * the dialog / dropdown / menu silently never opens and the next locator times out (the
 * "random Test timeout of 30000ms exceeded" failures). Retry the trigger until the
 * expected content shows. Skip the click when it is already open to avoid toggling a
 * just-opened overlay shut.
 *
 * @param trigger the element that opens the overlay
 * @param content an element rendered only once the overlay is open (dialog, menuitem, …)
 */
export async function openOverlay(trigger: Locator, content: Locator, timeout = 15000) {
    await expect(async () => {
        if (!(await content.isVisible())) await trigger.click();
        await expect(content).toBeVisible({timeout: 2000});
    }).toPass({timeout});
}

/**
 * Click a navigation trigger (card / link) and wait until the URL matches `urlPattern`.
 *
 * Same hydration hazard as {@link openOverlay}, but for client-side navigation: clicking a
 * Next `<Link>` while the list is still hydrating or re-rendering drops the navigation, so
 * the URL never changes and the test stalls (e.g. "Launch agent" staying on the list URL).
 * Retry the trigger until the URL matches. Skip the click once already navigated so a
 * trigger that no longer exists on the destination page is not clicked again.
 */
export async function navigateVia(page: Page, trigger: Locator, urlPattern: RegExp, timeout = 15000) {
    await expect(async () => {
        if (!urlPattern.test(new URL(page.url()).pathname)) await trigger.click();
        await expect(page).toHaveURL(urlPattern, {timeout: 3000});
    }).toPass({timeout});
}
