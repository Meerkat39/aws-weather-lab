import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow next/image to load icons from OpenWeatherMap
  images: {
    domains: ["openweathermap.org"],
  },
};

export default nextConfig;
