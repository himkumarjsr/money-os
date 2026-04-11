"use client";

import { supabase } from "@/lib/supabaseClient";
import { useAuthStore, type User } from "@/store/authStore";
import { useEffect } from "react";

function randomReferralCode(seed: string) {
  const base = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "FINK";
  return `${base}${Math.floor(1000 + Math.random() * 9000)}`;
}

function patchFromSessionUser(su: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
}): Pick<User, "id" | "email" | "phone" | "photoURL" | "name"> {
  const meta = su.user_metadata ?? {};
  const fullName = typeof meta.full_name === "string" ? meta.full_name : undefined;
  const metaName = typeof meta.name === "string" ? meta.name : undefined;
  const avatar = typeof meta.avatar_url === "string" ? meta.avatar_url : undefined;
  return {
    id: su.id,
    email: su.email ?? null,
    phone: su.phone ?? null,
    photoURL: avatar ?? null,
    name: fullName ?? metaName ?? su.email?.split("@")[0] ?? null,
  };
}

/**
 * Keeps Zustand auth in sync with Supabase Auth (session in localStorage).
 * Required for RLS: `user_id` in DB must equal `auth.uid()` from the JWT.
 */
export function AuthSessionSync() {
  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const applySession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();
      const su = session?.user;
      if (!su) return;

      const prev = useAuthStore.getState().user;
      const patch = patchFromSessionUser(su);

      if (prev && prev.id === su.id) {
        useAuthStore.getState().setUser({
          ...prev,
          email: patch.email ?? prev.email,
          phone: patch.phone ?? prev.phone,
          photoURL: patch.photoURL ?? prev.photoURL,
          name: prev.name || patch.name,
        });
        return;
      }

      const next: User = {
        id: patch.id,
        name: patch.name,
        phone: patch.phone,
        email: patch.email,
        photoURL: patch.photoURL,
        panVerified: false,
        panLast4: null,
        aadhaarVerified: false,
        subscriptionTier: "free",
        subscriptionExpiry: null,
        createdAt: new Date().toISOString(),
        referralCode: randomReferralCode(patch.name ?? su.id),
        referredBy: null,
      };

      if (prev && prev.id !== su.id) {
        next.name = prev.name || patch.name;
        next.phone = prev.phone || patch.phone;
        next.subscriptionTier = prev.subscriptionTier;
        next.referralCode = prev.referralCode;
      }

      useAuthStore.getState().setUser(next);
    };

    void applySession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        useAuthStore.getState().logout();
        return;
      }
      if (session?.user) {
        await applySession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
