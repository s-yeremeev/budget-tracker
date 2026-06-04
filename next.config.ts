import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Кілька lockfile-ів у батьківських теках — фіксуємо корінь проєкту.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
