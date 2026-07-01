// Genera un enlace de recuperación SIN enviar email (no toca el rate limit).
// Uso: node --env-file=.env.local scripts/gen-recovery-link.mjs <email> [siteUrl]
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const site =
  process.argv[3] ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://cine-match-red.vercel.app";

if (!email) {
  console.error("Falta el email. Uso: node ... gen-recovery-link.mjs <email> [siteUrl]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.auth.admin.generateLink({
  type: "recovery",
  email,
});

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

const tokenHash = data.properties?.hashed_token;
console.log("\nemail:        ", email);
console.log("token_hash:   ", tokenHash);
console.log("\n=== URL para probar el flujo token_hash (pegala en el navegador) ===");
console.log(
  `${site}/auth/confirm?token_hash=${tokenHash}&type=recovery&next=/auth/update-password`
);
console.log("\n(action_link original de Supabase, por referencia):");
console.log(data.properties?.action_link);
