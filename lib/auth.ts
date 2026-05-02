"use client";

import { supabase } from "@/lib/supabase";
import { useAuthStore, type User } from "@/store/authStore";

function randomReferralCode(seed: string) {
  const base = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "FINK";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
    },
  });
  return { data, error };
}

export async function sendOTP(phone: string) {
  const formatted = `+91${phone.replace(/\D/g, "")}`;
  const { data, error } = await supabase.auth.signInWithOtp({ phone: formatted });
  return { data, error };
}

export async function verifyOTP(phone: string, token: string) {
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

/** Ends Supabase session, clears persisted auth + sensitive local caches. */
export async function signOut() {
  await useAuthStore.getState().logout();
  return { error: null as string | null };
}

export async function signUpWithEmail(email: string, password: string, name: string) {
  return useAuthStore.getState().signUpWithEmail(email, password, name).then((r) => ({
    data: null as null,
    error: r.error ? { message: r.error } : null,
  }));
}

export async function signInWithEmail(email: string, password: string) {
  const res = await useAuthStore.getState().signInWithEmail(email, password);
  return {
    data: res.error ? null : ({} as unknown),
    error: res.error ? { message: res.error } : null,
  };
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function onAuthChange(callback: (user: unknown) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}
