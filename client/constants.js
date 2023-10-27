/**
 * @file Contains constants for the client module.
 *
 * @module client_constants
 */

export const GLOBAL_MANAGER_NAME = "__$$PostDocClient$$NavigationManager";

export const PAGE_MIME_TYPE = "text/html";

/**
 * Navigation events.
 *
 * @enum {string}
 * @readonly
 */
export const NavigationEventName = {
  /**
   * That event type describes listeners that
   * are executed after the navigation completes
   * and the page's DOM is fully built.
   *
   * Listeners of that type are invoked in the context
   * of the new page.
   */
  AfterTransition: "__$$after-transition",
  /**
   * That event type describes listeners that
   * are executed before the navigation starts.
   *
   * Listeners of that type are invoked in the context
   * of the old page.
   */
  BeforeTransition: "__$$before-transition",
};
