type FavoriteMeta = {
  tempC?: number;
  description?: string;
  icon?: string | null;
  timestamp?: number;
};

type FavoriteItem = {
  cityName: string;
  meta?: FavoriteMeta;
};

// Single-key, per-browser favorites store. We intentionally drop per-user keys
// because favorites are stored per-browser/localStorage in this prototype.
const STORAGE_KEY = "weatherlab_favorites";

function read(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FavoriteItem[];
  } catch {
    return [];
  }
}

function write(items: FavoriteItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // noop
  }
}

export function getFavorites() {
  return read();
}

export function isFavorited(cityName: string) {
  const items = read();
  return items.some((i) => i.cityName === cityName);
}

export function addFavorite(cityName: string, meta?: FavoriteMeta) {
  const items = read();
  const exists = items.some((i) => i.cityName === cityName);
  if (exists) return;
  items.unshift({ cityName, meta: { ...meta, timestamp: Date.now() } });
  // keep reasonable limit
  write(items.slice(0, 50));
}

export function removeFavorite(cityName: string) {
  const items = read().filter((i) => i.cityName !== cityName);
  write(items);
}

export function clearFavorites() {
  write([]);
}
