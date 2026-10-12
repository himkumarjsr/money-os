import { createContext } from "react";

/**
 * True below GlobalChrome, which already renders the one AppHeader. Screens
 * that still render their own `<AppHeader />` get nothing, so it never doubles.
 */
export const ChromeContext = createContext(false);
