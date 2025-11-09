import { fetchWeatherByCity, OpenWeatherError } from "@/lib/openWeather";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const city = url.searchParams.get("city");

  if (!city) {
    return NextResponse.json(
      { error: "city query param is required" },
      { status: 400 }
    );
  }

  try {
    const data = await fetchWeatherByCity(city);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    if (err instanceof OpenWeatherError) {
      // Map known upstream error codes to HTTP status where possible
      const status = err.status ?? (err.code === "NO_API_KEY" ? 500 : 502);
      return NextResponse.json(
        { error: err.message, code: err.code ?? null },
        { status }
      );
    }
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
