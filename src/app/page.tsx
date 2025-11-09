"use client";

import { getFavorites } from "@/lib/favoritesLocal";
import { WeatherData } from "@/lib/types";
import { useEffect, useState } from "react";
import SearchForm from "./(components)/SearchForm";
import WeatherCard from "./(components)/WeatherCard";

export default function Home() {
  const [history, setHistory] = useState<WeatherData[]>([]);

  // Load favorites on client after mount to avoid SSR/client markup mismatch
  useEffect(() => {
    try {
      const favs = getFavorites();
      if (!favs || favs.length === 0) return;
      const mapped: WeatherData[] = favs.map((f) => ({
        cityName: f.cityName,
        coord: { lat: 0, lon: 0 },
        tempC: f.meta?.tempC ?? 0,
        description: f.meta?.description ?? "",
        icon: f.meta?.icon ?? "",
        humidity: 0,
        windSpeedMps: 0,
        timestamp: f.meta?.timestamp
          ? Math.floor(f.meta.timestamp / 1000)
          : Math.floor(Date.now() / 1000),
      }));
      // schedule state update asynchronously to avoid sync setState-in-effect warning
      setTimeout(() => setHistory(mapped), 0);
      // Fetch latest data for each favorite and replace placeholders when ready
      (async () => {
        try {
          const promises = favs.map((f) =>
            fetch(`/api/weather?city=${encodeURIComponent(f.cityName)}`).then((r) => {
              if (!r.ok) throw new Error("fetch_failed");
              return r.json();
            })
          );

          const responses = await Promise.allSettled(promises);
          const updated: WeatherData[] = responses.map((res, idx) => {
            if (res.status === "fulfilled") {
              const body = res.value as unknown as { data?: WeatherData };
              if (body && body.data) return body.data as WeatherData;
            }
            // fallback to placeholder if fetch failed
            return mapped[idx];
          });

          // apply updated data
          setHistory(updated);
        } catch {
          // ignore network errors and keep placeholders
        }
      })();
    } catch {
      // ignore
    }
  }, []);

  function handleResult(d: WeatherData) {
    // prepend new result, keep up to 10 entries
    setHistory((h) => [d, ...h].slice(0, 10));
  }

  function clearHistory() {
    setHistory([]);
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Weather Lab</h1>
        </div>
      </header>

      <main className="flex flex-col items-center py-10">
        <div className="w-full max-w-3xl px-4">
          <div className="mb-6">
            {/* Search box at top of main */}
            <SearchForm onResult={handleResult} />
          </div>
          <div>
            <div className="w-full">
              {history.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-zinc-600">
                      検索結果 ({history.length})
                    </div>
                    <button
                      onClick={clearHistory}
                      className="text-sm text-zinc-500 hover:text-zinc-700"
                    >
                      履歴を消す
                    </button>
                  </div>
                  {history.map((w, i) => (
                    <div
                      key={`${w.cityName}-${w.timestamp}`}
                      className="relative"
                    >
                      <button
                        onClick={() =>
                          setHistory((h) => h.filter((_, idx) => idx !== i))
                        }
                        aria-label={`削除 ${w.cityName}`}
                        className="absolute right-0 top-0 text-xs text-zinc-500 hover:text-zinc-700"
                      >
                        削除
                      </button>
                      <WeatherCard data={w} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-zinc-300 p-8 text-center">
                  <p className="text-base text-zinc-600">
                    検索して、ここに天気の結果が表示されます。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
