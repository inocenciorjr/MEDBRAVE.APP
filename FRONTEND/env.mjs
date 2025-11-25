// @ts-check
/**
 * This file is included in `/next.config.ts` which ensures the app isn't built with invalid env vars.
 */

const envSchema = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STORAGE_BUCKET: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
};

// Validate env vars
for (const [key, value] of Object.entries(envSchema)) {
  if (!value) {
    throw new Error(`❌ Missing environment variable: ${key}`);
  }
}

console.log('✅ Environment variables validated:', Object.keys(envSchema));

export default envSchema;
