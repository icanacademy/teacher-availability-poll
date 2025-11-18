import React from 'react';
import type { WeatherData, WeatherLocationData, HourlyForecast } from '../types';
import { WindIcon, RainIcon, EarthquakeIcon, ClockIcon, TemperatureIcon, SunIcon, DropletIcon, CloudIcon, MapPinIcon, DistanceIcon } from './icons';

interface WeatherBannerProps {
  weatherData: WeatherData | null;
  loading: boolean;
  error: string | null;
}

const getWeatherIcon = (condition: string, className: string) => {
    const lowerCaseCondition = condition.toLowerCase();
    if (lowerCaseCondition.includes('rain') || lowerCaseCondition.includes('shower')) {
        return <RainIcon className={className} />;
    }
    if (lowerCaseCondition.includes('cloud')) {
        return <CloudIcon className={className} />;
    }
    if (lowerCaseCondition.includes('sun') || lowerCaseCondition.includes('clear')) {
        return <SunIcon className={className} />;
    }
    return <CloudIcon className={className} />; // Default icon
};

const WeatherDetail: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="flex items-center gap-2 text-sm">
        {icon}
        <div>
            <span className="font-semibold text-white/80">{label}:</span>
            <span className="ml-1">{value}</span>
        </div>
    </div>
);

const HourlyForecastItem: React.FC<{ forecast: HourlyForecast }> = ({ forecast }) => {
    const match = forecast.temperature.match(/(-?\d+)(.*)/);
    return (
        <div className="flex flex-col items-center flex-shrink-0 w-20 text-center p-2 bg-white/10 rounded-lg">
            <p className="text-xs font-semibold">{forecast.time}</p>
            {getWeatherIcon(forecast.condition, 'w-6 h-6 my-1 text-white/90')}
            {match ? (
                 <p className="font-bold">
                     <span className="text-sm">{match[1]}</span>
                     <span className="text-xs align-top opacity-80">{match[2]}</span>
                 </p>
            ) : (
                <p className="text-sm font-bold">{forecast.temperature}</p>
            )}
        </div>
    );
};

const WeatherCard: React.FC<{ title: string; data: WeatherLocationData }> = ({ title, data }) => (
    <div className="flex-1 min-w-0 p-4 bg-white/10 dark:bg-black/20 rounded-lg backdrop-blur-sm border border-white/20">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm font-medium text-slate-200 mb-4 line-clamp-2 break-words">{data.location_name}</p>

        <div className="flex items-start justify-between mb-4">
            {(() => {
                const match = data.temperature.match(/(-?\d+)(.*)/);
                if (match) {
                    return (
                        <div className="flex items-start font-bold">
                            <span className="text-5xl">{match[1]}</span>
                            <span className="text-3xl mt-1 text-white/80">{match[2]}</span>
                        </div>
                    );
                }
                return <div className="text-5xl font-bold">{data.temperature}</div>;
            })()}
            <div className="text-right text-xs space-y-1">
                <p>Feels like: {data.feels_like}</p>
                <p>Humidity: {data.humidity}</p>
                <p>UV Index: {data.uv_index}</p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
           <WeatherDetail icon={<WindIcon className="w-4 h-4 text-cyan-300" />} label="Wind" value={data.wind_signal} />
           <WeatherDetail icon={<RainIcon className="w-4 h-4 text-blue-300" />} label="Rainfall" value={data.rainfall_alert} />
        </div>
        
        <div>
             <h4 className="text-sm font-semibold mb-2">Hourly Forecast</h4>
             <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                 {data.hourly_forecast.map((h, index) => <HourlyForecastItem key={index} forecast={h} />)}
             </div>
        </div>
    </div>
);

const EarthquakeCard: React.FC<{ title: string; data: WeatherLocationData }> = ({ title, data }) => (
    <div className="flex-1 min-w-0 p-4 bg-amber-600/20 dark:bg-amber-900/30 rounded-lg backdrop-blur-sm border border-amber-500/30 flex flex-col">
        <h3 className="text-lg font-semibold mb-3 text-amber-100">{title}</h3>
        <p className="text-sm font-medium text-slate-200 mb-3 line-clamp-2 break-words">{data.location_name}</p>
        <div className="space-y-2 text-sm flex-grow">
            <div className="flex items-start gap-2">
                <EarthquakeIcon className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                <p className="break-words"><span className="font-semibold">Intensity:</span> {data.earthquake.intensity}</p>
            </div>
            <div className="flex items-start gap-2">
                <ClockIcon className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                <p className="break-words"><span className="font-semibold">Time:</span> {data.earthquake.time_ago}</p>
            </div>
             <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                <p className="break-words"><span className="font-semibold">Location:</span> {data.earthquake.location}</p>
            </div>
             <div className="flex items-start gap-2">
                <DistanceIcon className="w-4 h-4 text-amber-300 mt-0.5 flex-shrink-0" />
                <p className="break-words"><span className="font-semibold">Distance:</span> {data.earthquake.distance}</p>
            </div>
        </div>
    </div>
);


const WeatherBanner: React.FC<WeatherBannerProps> = ({ weatherData, loading, error }) => {
  const showFooter = !loading;
  return (
    <div className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 dark:from-sky-800 dark:to-indigo-900 text-white p-4 md:p-6 rounded-xl shadow-lg mb-6">
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <p className="text-lg font-semibold">Fetching your local weather & geological forecast...</p>
          <p className="text-sm text-white/70 mt-2">This may take a few seconds</p>
        </div>
      )}
      {error && weatherData && (
        <div className="mb-4 p-3 bg-amber-500/20 border border-amber-400/50 rounded-md">
          <p className="text-sm text-amber-100">{error}</p>
        </div>
      )}
      {error && !weatherData && (
        <div className="text-center py-8">
          <p className="text-lg font-semibold text-red-300 bg-red-900/50 p-4 rounded-md mb-2">⚠️ Weather data unavailable</p>
          <p className="text-sm text-white/70">{error}</p>
        </div>
      )}
      {!loading && !error && !weatherData && (
        <div className="text-center py-12">
          <p className="text-lg font-semibold">No weather data available</p>
          <p className="text-sm text-white/70 mt-2">Please select your location to load weather information</p>
        </div>
      )}
      {weatherData && (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl md:text-2xl font-bold mb-4">Weather Advisory</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <WeatherCard title="Your Location" data={weatherData.user_location} />
                    <WeatherCard title="Office Location" data={weatherData.pasig_city} />
                </div>
            </div>
             <div>
                <h2 className="text-xl md:text-2xl font-bold mb-4">Geological Advisory</h2>
                <div className="flex flex-col md:flex-row gap-4">
                    <EarthquakeCard title="Your Location" data={weatherData.user_location} />
                    <EarthquakeCard title="Office Location" data={weatherData.pasig_city} />
                </div>
            </div>
        </div>
      )}
       {showFooter && <p className="text-xs text-center mt-6 pt-4 text-white/70 border-t border-white/20">Weather & geological data is AI-generated and for advisory purposes only.</p>}
    </div>
  );
};

export default WeatherBanner;