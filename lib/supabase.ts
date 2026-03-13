import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // PKCE flow: magic-link redirects with ?code= instead of #access_token=.
    // The callback exchanges the code server-side — avoids gotrue-js 120s stale check.
    // detectSessionInUrl stays false; we handle the exchange manually in app/auth/callback.tsx.
    flowType: Platform.OS === "web" ? "pkce" : "implicit",
    detectSessionInUrl: false,
  },
});
