import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// process.env inherited from the shell can contain empty-string values that shadow
// .env.local. Read .env.local directly and apply any values that are blank in process.env.
function loadEnvLocalOverrides() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocalOverrides();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (uploaded images)
      {
        protocol: "https",
        hostname: "rheatguvylgedgrdvjeo.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Any external HTTPS image (og:image from URL-extracted recipes)
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
