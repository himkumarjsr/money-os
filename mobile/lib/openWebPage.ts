import * as WebBrowser from "expo-web-browser";
import { Colors } from "@/constants/theme";

/** Open a finkoin.com page in an in-app browser sheet (Custom Tab / Safari VC). */
export function openWebPage(url: string): void {
  void WebBrowser.openBrowserAsync(url, {
    toolbarColor: Colors.card,
    controlsColor: Colors.primary,
    secondaryToolbarColor: Colors.card,
    showTitle: true,
    enableBarCollapsing: true,
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
