import {expect, Locator} from "@playwright/test";

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
