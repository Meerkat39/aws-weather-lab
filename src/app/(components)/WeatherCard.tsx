"use client";

import { addFavorite, isFavorited, removeFavorite } from "@/lib/favoritesLocal";
import { WeatherData } from "@/lib/types";
import Image from "next/image";
import { useEffect, useState } from "react";

type Props = { data: WeatherData };

export default function WeatherCard({ data }: Props) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  // Favorites are stored per-browser in localStorage; no userId required.

  useEffect(() => {
    // initialize favorited state from localStorage
    try {
      const f = isFavorited(data.cityName);
      setFavorited(f);
    } catch {
      // noop
    }
  }, [data.cityName]);

  const time = new Date(data.timestamp * 1000);
  const iconUrl = data.icon
    ? `https://openweathermap.org/img/wn/${data.icon}@2x.png`
    : undefined;

  async function toggleFavorite() {
    setLoading(true);
    try {
      if (!favorited) {
        addFavorite(data.cityName, {
          tempC: data.tempC,
          description: data.description,
          icon: data.icon,
        });
        setFavorited(true);
      } else {
        removeFavorite(data.cityName);
        setFavorited(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="w-full max-w-xl rounded-lg border border-zinc-300 bg-white p-4">
      <div className="flex items-center gap-4">
        {iconUrl && (
          <div className="h-16 w-16 shrink-0">
            <Image
              src={iconUrl}
              alt={data.description}
              width={64}
              height={64}
            />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                {data.cityName}
              </h2>
              <p className="text-sm text-zinc-700">{data.description}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-teal-700">
                {Math.round(data.tempC)}°C
              </div>
              <div className="text-xs text-zinc-500">
                {time.toLocaleTimeString("ja-JP")}
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-zinc-700">
            <div className="flex gap-6">
              <div>
                湿度: <span className="font-medium">{data.humidity}%</span>
              </div>
              <div>
                風速:{" "}
                <span className="font-medium">{data.windSpeedMps} m/s</span>
              </div>
            </div>
            <div>
              <button
                onClick={toggleFavorite}
                disabled={loading}
                className={`rounded px-3 py-1 text-sm ${
                  favorited
                    ? "bg-teal-600 text-white"
                    : "bg-zinc-100 text-zinc-800"
                }`}
              >
                {favorited ? "お気に入り済み" : "お気に入り"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
