/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_LEMONSQUEEZY_STORE_ID: string
  readonly VITE_LEMONSQUEEZY_VARIANT_ID: string
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_AI_MODEL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_TAGLINE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
