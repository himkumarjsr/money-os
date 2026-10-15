import { useState } from "react";

/**
 * A card's own eye toggle that also follows the tracker's master
 * "Show all / Hide all" switch. The card's choice wins until the master
 * switch flips again, so "Hide amounts" still hides while "Show all" is on.
 */
export function usePrivacyToggle(
  forceVisible: boolean,
): [visible: boolean, toggle: () => void] {
  const [override, setOverride] = useState<boolean | null>(null);
  const [seenForce, setSeenForce] = useState(forceVisible);
  if (seenForce !== forceVisible) {
    // Master switch flipped: drop the card's own choice.
    setSeenForce(forceVisible);
    setOverride(null);
  }
  const visible =
    seenForce !== forceVisible ? forceVisible : (override ?? forceVisible);
  const toggle = () => setOverride(!visible);
  return [visible, toggle];
}
