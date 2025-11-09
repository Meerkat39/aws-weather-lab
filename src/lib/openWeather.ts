import { OpenWeatherRaw, WeatherData } from "./types";

const API_BASE = "https://api.openweathermap.org/data/2.5";
const DEFAULT_TIMEOUT_MS = 8_000;

class OpenWeatherError extends Error {
  code?: string;
  status?: number;
  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = "OpenWeatherError";
    this.code = code;
    this.status = status;
  }
}

function mapToWeatherData(raw: OpenWeatherRaw): WeatherData {
  const data = raw as unknown as Record<string, unknown>;
  const coord = (data["coord"] as Record<string, unknown> | undefined) ?? {};
  const main = (data["main"] as Record<string, unknown> | undefined) ?? {};
  const weatherArr = data["weather"] as unknown as
    | Array<Record<string, unknown>>
    | undefined;
  const wind = (data["wind"] as Record<string, unknown> | undefined) ?? {};

  return {
    cityName: String(data["name"] ?? ""),
    coord: { lat: Number(coord.lat ?? 0), lon: Number(coord.lon ?? 0) },
    tempC: Number(main.temp ?? 0),
    description: String(weatherArr?.[0]?.description ?? ""),
    icon: String(weatherArr?.[0]?.icon ?? ""),
    humidity: Number(main.humidity ?? 0),
    windSpeedMps: Number(wind.speed ?? 0),
    timestamp: Number(data["dt"] ?? Date.now() / 1000),
  };
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeout = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchWeatherByCity(city: string): Promise<WeatherData> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key)
    throw new OpenWeatherError(
      "OpenWeather API key is missing (OPENWEATHER_API_KEY)",
      "NO_API_KEY"
    );
  if (!city || typeof city !== "string" || city.trim().length === 0)
    throw new OpenWeatherError("city is required", "INVALID_INPUT", 400);

  const url = `${API_BASE}/weather?q=${encodeURIComponent(
    city
  )}&appid=${encodeURIComponent(key)}&units=metric&lang=ja`;

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (e: unknown) {
    // fetch() aborts will surface as an Error with name 'AbortError'
    if (
      typeof e === "object" &&
      e !== null &&
      "name" in e &&
      (e as { name?: unknown }).name === "AbortError"
    )
      throw new OpenWeatherError("request timed out", "TIMEOUT");
    throw new OpenWeatherError("network error", "NETWORK_ERROR");
  }

  if (!res.ok) {
    const status = res.status;
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      /* noop */
    }
    // Map common statuses
    if (status === 401)
      throw new OpenWeatherError(
        "unauthorized - check API key",
        "UNAUTHORIZED",
        401
      );
    if (status === 404)
      throw new OpenWeatherError("city not found", "NOT_FOUND", 404);
    throw new OpenWeatherError(
      `upstream error: ${status} ${bodyText}`,
      "UPSTREAM_ERROR",
      status
    );
  }

  const json = await res.json();
  try {
    return mapToWeatherData(json);
  } catch {
    throw new OpenWeatherError(
      "failed to parse upstream response",
      "PARSE_ERROR"
    );
  }
}

export { OpenWeatherError };
