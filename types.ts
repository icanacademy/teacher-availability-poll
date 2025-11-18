// FIX: Removed self-import of `WeatherData` which was causing a name conflict with the interface declared in this file.

export enum PollStatus {
  AVAILABLE = 'AVAILABLE',
  LATE = 'LATE',
  ONLINE_ONLY = 'ONLINE_ONLY',
  UNAVAILABLE = 'UNAVAILABLE',
  EMERGENCY = 'EMERGENCY',
}

export type PollCounts = {
  [key in PollStatus]: number;
};

export interface EarthquakeData {
  intensity: string;
  time_ago: string;
  location: string;
  distance: string;
}

export interface HourlyForecast {
  time: string;
  temperature: string;
  condition: string;
}

export interface WeatherLocationData {
  location_name: string;
  temperature: string;
  feels_like: string;
  humidity: string;
  uv_index: string;
  wind_signal: string;
  rainfall_alert: string;
  hourly_forecast: HourlyForecast[];
  earthquake: EarthquakeData;
}

export interface WeatherData {
  pasig_city: WeatherLocationData;
  user_location: WeatherLocationData;
}

export interface Teacher {
    id: string;
    name: string;
}

export interface PollSubmission {
    id: string; // unique submission id
    teacherId: string;
    status: PollStatus;
    timestamp: Date;
    weatherData: WeatherData;
    coords: {
        lat: number;
        lng: number;
    };
    locationName?: string; // human-readable location name
    reason?: string;
    teacherPhoto?: string; // base64 encoded image
    teacherVideo?: { data: string; mimeType: string; }; // base64 encoded video
    mediaAnalysis?: string;
}

export interface Location {
  id: string; // teacherId
  teacherName: string;
  status: PollStatus;
  position: {
    lat: number;
    lng: number;
  };
}