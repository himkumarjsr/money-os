import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  subscriptionTier: string;
  fkBalance: number;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  hasInitialized: boolean;
  initAuth: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

let authListenerStarted = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      isLoading: true,
      hasInitialized: false,

      initAuth: async () => {
        set({ isLoading: true });
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            await get().refreshUser();
          } else {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              hasInitialized: true,
            });
          }

          if (!authListenerStarted) {
            authListenerStarted = true;
            supabase.auth.onAuthStateChange(async (_event, session) => {
              if (session?.user) {
                await get().refreshUser();
              } else {
                set({ user: null, isLoggedIn: false });
              }
            });
          }
        } catch (err) {
          console.warn("initAuth:", err);
          set({ isLoading: false, hasInitialized: true });
        }
      },

      refreshUser: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          set({
            user: null,
            isLoggedIn: false,
            isLoading: false,
            hasInitialized: true,
          });
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("name, subscription_tier, fk_balance")
          .eq("id", user.id)
          .maybeSingle();

        set({
          user: {
            id: user.id,
            name:
              profile?.name ||
              (user.user_metadata?.name as string | undefined) ||
              user.email?.split("@")[0] ||
              null,
            email: user.email || null,
            subscriptionTier: profile?.subscription_tier || "free",
            fkBalance: profile?.fk_balance || 0,
          },
          isLoggedIn: true,
          isLoading: false,
          hasInitialized: true,
        });
      },

      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error: error.message };
        await get().refreshUser();
        return {};
      },

      signUp: async (name, email, password) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) return { error: error.message };
        return {};
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, isLoggedIn: false });
      },
    }),
    {
      name: "finkoin-auth-mobile",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);
