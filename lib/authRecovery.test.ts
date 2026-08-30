import { describe, expect, it, vi } from "vitest";
import {
  AUTH_RECOVERY_PATH,
  authRecoveryRedirectUrl,
  completeAuthSessionFromUrl,
  isRecoveryAuthUrl,
} from "./authRecovery";

function mockSupabase(auth: {
  exchangeCodeForSession?: ReturnType<typeof vi.fn>;
  verifyOtp?: ReturnType<typeof vi.fn>;
  getSession?: ReturnType<typeof vi.fn>;
}) {
  return {
    auth: {
      exchangeCodeForSession:
        auth.exchangeCodeForSession ??
        vi.fn().mockResolvedValue({ data: {}, error: null }),
      verifyOtp:
        auth.verifyOtp ?? vi.fn().mockResolvedValue({ data: {}, error: null }),
      getSession:
        auth.getSession ??
        vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  } as never;
}

describe("isRecoveryAuthUrl", () => {
  it("detects type=recovery in query and hash", () => {
    expect(isRecoveryAuthUrl("?type=recovery", "")).toBe(true);
    expect(isRecoveryAuthUrl("", "#type=recovery&access_token=x")).toBe(true);
    expect(isRecoveryAuthUrl("?code=abc", "#access_token=x")).toBe(false);
  });
});

describe("authRecoveryRedirectUrl", () => {
  it("appends the update-password path to origin", () => {
    expect(authRecoveryRedirectUrl("https://www.finkoin.com")).toBe(
      `https://www.finkoin.com${AUTH_RECOVERY_PATH}`,
    );
    expect(AUTH_RECOVERY_PATH).toBe("/auth/update-password");
  });
});

describe("completeAuthSessionFromUrl", () => {
  it("exchanges PKCE code and returns ok when session exists", async () => {
    const exchangeCodeForSession = vi
      .fn()
      .mockResolvedValue({ data: {}, error: null });
    const getSession = vi
      .fn()
      .mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    const supabase = mockSupabase({ exchangeCodeForSession, getSession });

    const result = await completeAuthSessionFromUrl(supabase, {
      search: "?code=pkce-code",
      hash: "",
    });

    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(result).toEqual({ ok: true });
  });

  it("returns exchange error without verifying otp", async () => {
    const exchangeCodeForSession = vi
      .fn()
      .mockResolvedValue({ data: {}, error: { message: "bad code" } });
    const verifyOtp = vi.fn();
    const supabase = mockSupabase({ exchangeCodeForSession, verifyOtp });

    const result = await completeAuthSessionFromUrl(supabase, {
      search: "?code=bad",
      hash: "",
    });

    expect(result).toEqual({ ok: false, error: "bad code" });
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("verifies recovery token_hash", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
    const getSession = vi
      .fn()
      .mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    const supabase = mockSupabase({ verifyOtp, getSession });

    const result = await completeAuthSessionFromUrl(supabase, {
      search: "?token_hash=th&type=recovery",
      hash: "",
    });

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "th",
      type: "recovery",
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns verifyOtp error", async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ data: {}, error: { message: "expired" } });
    const supabase = mockSupabase({ verifyOtp });

    const result = await completeAuthSessionFromUrl(supabase, {
      search: "?token_hash=th&type=recovery",
      hash: "",
    });

    expect(result).toEqual({ ok: false, error: "expired" });
  });

  it("returns ok false when no session and no hash tokens", async () => {
    const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    const supabase = mockSupabase({ getSession });

    const result = await completeAuthSessionFromUrl(supabase, {
      search: "",
      hash: "",
    });

    expect(result).toEqual({ ok: false });
  });

  it("polls briefly when hash has access_token then succeeds", async () => {
    const getSession = vi
      .fn()
      .mockResolvedValueOnce({ data: { session: null } })
      .mockResolvedValueOnce({ data: { session: { user: { id: "u1" } } } });
    const supabase = mockSupabase({ getSession });

    const result = await completeAuthSessionFromUrl(supabase, {
      search: "",
      hash: "#access_token=tok&type=recovery",
    });

    expect(result).toEqual({ ok: true });
    expect(getSession.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
