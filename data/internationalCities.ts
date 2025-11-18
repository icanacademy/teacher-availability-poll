export interface InternationalCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export const INTERNATIONAL_CITIES: InternationalCity[] = [
  // Asia
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Taipei', country: 'Taiwan', lat: 25.0330, lng: 121.5654 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lng: 101.6869 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.0285, lng: 105.8542 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297 },

  // North America
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194 },
  { name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },

  // Europe
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },

  // Oceania
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633 },

  // Middle East
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
];

// Helper function to find city by partial name match
export const findInternationalCity = (query: string): InternationalCity | null => {
  if (!query) return null;

  const normalizedQuery = query.toLowerCase().trim();

  // Exact match (city name or "city, country" format)
  const exactMatch = INTERNATIONAL_CITIES.find(city =>
    city.name.toLowerCase() === normalizedQuery ||
    `${city.name.toLowerCase()}, ${city.country.toLowerCase()}` === normalizedQuery
  );

  if (exactMatch) return exactMatch;

  // Partial match (starts with query)
  const partialMatch = INTERNATIONAL_CITIES.find(city =>
    city.name.toLowerCase().startsWith(normalizedQuery)
  );

  if (partialMatch) return partialMatch;

  // Contains match
  const containsMatch = INTERNATIONAL_CITIES.find(city =>
    city.name.toLowerCase().includes(normalizedQuery) ||
    city.country.toLowerCase().includes(normalizedQuery)
  );

  return containsMatch || null;
};
