import { describe, expect, it } from "vitest";
import { isOpenSplitInvite, OPEN_SPLIT_INVITE_EMAIL } from "./splitInvite";

describe("splitInvite helpers", () => {
  it("recognizes open invite marker", () => {
    expect(isOpenSplitInvite(OPEN_SPLIT_INVITE_EMAIL)).toBe(true);
    expect(isOpenSplitInvite(OPEN_SPLIT_INVITE_EMAIL.toUpperCase())).toBe(true);
    expect(isOpenSplitInvite(`  ${OPEN_SPLIT_INVITE_EMAIL}  `)).toBe(true);
  });

  it("rejects normal emails and empty values", () => {
    expect(isOpenSplitInvite("friend@example.com")).toBe(false);
    expect(isOpenSplitInvite("")).toBe(false);
    expect(isOpenSplitInvite(null)).toBe(false);
    expect(isOpenSplitInvite(undefined)).toBe(false);
    expect(isOpenSplitInvite("__open__")).toBe(false);
  });
});
