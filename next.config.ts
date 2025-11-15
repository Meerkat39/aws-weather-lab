import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow next/image to load icons from OpenWeatherMap
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "openweathermap.org",
        pathname: "/img/**",
      },
    ],
  },
};

export default nextConfig;
