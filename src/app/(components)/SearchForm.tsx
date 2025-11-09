"use client";

import { WeatherData } from "@/lib/types";
import { FormEvent, useState } from "react";

type Props = {
  onResult: (data: WeatherData) => void;
};

export default function SearchForm({ onResult }: Props) {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const q = city.trim();
    if (!q) {
      setError("都市名を入力してください");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "取得に失敗しました");
        return;
      }
      onResult(json.data);
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex w-full items-center gap-2">
        <label htmlFor="city" className="sr-only">
          都市名
        </label>
        <input
          id="city"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 text-base placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="都市名を入力（例: Tokyo）"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="都市名"
        />
        <button
          type="submit"
          className="inline-flex items-center rounded border border-transparent bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "検索中…" : "検索"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
