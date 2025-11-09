export type WeatherData = {
  cityName: string;
  coord: {
    lat: number;
    lon: number;
  };
  tempC: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeedMps: number;
  timestamp: number;
};

export type OpenWeatherRaw = unknown; // kept loose to allow partial mapping from upstream
