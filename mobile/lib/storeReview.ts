/**
 * Play Store / App Store rating prompts via the OS in-app review sheet.
 * Both stores forbid asking "do you like the app?" first, so the automatic
 * prompt is tied to usage (opening the full report again), never to a feedback rating.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as StoreReview from "expo-store-review";
import { Linking } from "react-native";

const VIEWS_KEY = "finkoin_review_report_views";
const ASKED_AT_KEY = "finkoin_review_asked_at";
const MIN_REPORT_VIEWS = 2;
const ASK_EVERY_MS = 120 * 24 * 60 * 60 * 1000;

/** Call when the full report is shown; asks at most once per 120 days. */
export async function maybeAskForReview(): Promise<void> {
  try {
    const views = Number((await AsyncStorage.getItem(VIEWS_KEY)) ?? 0) + 1;
    await AsyncStorage.setItem(VIEWS_KEY, String(views));
    if (views < MIN_REPORT_VIEWS) return;

    const askedAt = Number((await AsyncStorage.getItem(ASKED_AT_KEY)) ?? 0);
    if (askedAt && Date.now() - askedAt < ASK_EVERY_MS) return;
    if (!(await StoreReview.hasAction())) return;

    await AsyncStorage.setItem(ASKED_AT_KEY, String(Date.now()));
    await StoreReview.requestReview();
  } catch {
    /* never block the screen on a review prompt */
  }
}

/** "Rate Finkoin" button: open the store listing, else the in-app sheet. */
export async function openStoreRating(): Promise<void> {
  try {
    const url = StoreReview.storeUrl();
    if (url) {
      await Linking.openURL(url);
      return;
    }
    if (await StoreReview.hasAction()) await StoreReview.requestReview();
  } catch {
    /* ignore */
  }
}
