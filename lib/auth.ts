"use client";

import { supabase } from "@/lib/supabaseClient";
import { useAuthStore, type User } from "@/store/authStore";

function randomReferralCode(seed: string) {
  const base = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "FINK";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function signInWithGoogle() {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured") };
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return { data, error };
}

export async function sendOTP(phone: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured") };
  }
  const formatted = `+91${phone.replace(/\D/g, "")}`;
  const { data, error } = await supabase.auth.signInWithOtp({ phone: formatted });
  return { data, error };
}

export async function verifyOTP(phone: string, token: string) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured") };
  }
  const formatted = `+91${phone.replace(/\D/g, "")}`;
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formatted,
    token,
    type: "sms",
  });
  return { data, error };
}

export function bootstrapAuthUser(params: {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  photoURL?: string | null;
}) {
  const user: User = {
    id: params.id,
    name: params.name ?? null,
    phone: params.phone ?? null,
    email: params.email ?? null,
    photoURL: params.photoURL ?? null,
    panVerified: false,
    panLast4: null,
    aadhaarVerified: false,
    subscriptionTier: "free",
    subscriptionExpiry: null,
    createdAt: new Date().toISOString(),
    referralCode: randomReferralCode(params.name ?? params.id),
    referredBy: null,
  };
  useAuthStore.getState().setUser(user);
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  useAuthStore.getState().logout();
}

