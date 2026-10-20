/** Canonical path of the item catalogue (browse + search + filters).
 *
 * The catalogue lives at its own route rather than on "/" so that the browse
 * state is expressed by real URL params alone — no sentinel param is needed to
 * distinguish "browsing" from the mobile start page, and every catalogue URL is
 * shareable and reproducible on any device.
 */
export const BROWSE_PATH = '/browse';

/** Account hub: the mobile entry point to the user-owned areas of the app. */
export const ACCOUNT_PATH = '/account';

/** The viewer's favorite items, reachable from the profile menu. */
export const FAVORITES_PATH = '/favorites';

const ITEM_PATH_PATTERN =
  /^\/item\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/quick-rent)?\/?$/i;

/** In-app path of a scanned bubble item QR code (quick-rent sheet or plain
 *  item link), or null when the code isn't one. The host is ignored so codes
 *  printed with another bubble URL (e.g. before a domain change) still work. */
export const itemPathFromScan = (raw: string): string | null => {
  try {
    const { pathname } = new URL(raw.trim());
    return ITEM_PATH_PATTERN.test(pathname) ? pathname.replace(/\/$/, '') : null;
  } catch {
    return null;
  }
};
