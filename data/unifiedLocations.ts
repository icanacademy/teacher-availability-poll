export interface LocationOption {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: 'NCR' | 'GMA' | 'Provinces' | 'International';
}

export const UNIFIED_LOCATIONS: LocationOption[] = [
  // ===== NCR (National Capital Region / Metro Manila) =====
  { id: 'caloocan', name: 'Caloocan City', displayName: 'Caloocan City', lat: 14.6488, lng: 120.9830, category: 'NCR' },
  { id: 'las-pinas', name: 'Las Piñas City', displayName: 'Las Piñas City', lat: 14.4453, lng: 120.9830, category: 'NCR' },
  { id: 'makati', name: 'Makati City', displayName: 'Makati City', lat: 14.5547, lng: 121.0244, category: 'NCR' },
  { id: 'malabon', name: 'Malabon City', displayName: 'Malabon City', lat: 14.6631, lng: 120.9578, category: 'NCR' },
  { id: 'mandaluyong', name: 'Mandaluyong City', displayName: 'Mandaluyong City', lat: 14.5794, lng: 121.0359, category: 'NCR' },
  { id: 'manila', name: 'Manila', displayName: 'Manila', lat: 14.5995, lng: 120.9842, category: 'NCR' },
  { id: 'marikina', name: 'Marikina City', displayName: 'Marikina City', lat: 14.6507, lng: 121.1029, category: 'NCR' },
  { id: 'muntinlupa', name: 'Muntinlupa City', displayName: 'Muntinlupa City', lat: 14.4083, lng: 121.0390, category: 'NCR' },
  { id: 'navotas', name: 'Navotas City', displayName: 'Navotas City', lat: 14.6683, lng: 120.9417, category: 'NCR' },
  { id: 'paranaque', name: 'Parañaque City', displayName: 'Parañaque City', lat: 14.4793, lng: 121.0198, category: 'NCR' },
  { id: 'pasay', name: 'Pasay City', displayName: 'Pasay City', lat: 14.5378, lng: 121.0014, category: 'NCR' },
  { id: 'pasig', name: 'Pasig City', displayName: 'Pasig City', lat: 14.5764, lng: 121.0851, category: 'NCR' },
  { id: 'quezon', name: 'Quezon City', displayName: 'Quezon City', lat: 14.6760, lng: 121.0437, category: 'NCR' },
  { id: 'san-juan', name: 'San Juan City', displayName: 'San Juan City', lat: 14.5995, lng: 121.0346, category: 'NCR' },
  { id: 'taguig', name: 'Taguig City', displayName: 'Taguig City', lat: 14.5176, lng: 121.0509, category: 'NCR' },
  { id: 'valenzuela', name: 'Valenzuela City', displayName: 'Valenzuela City', lat: 14.6937, lng: 120.9830, category: 'NCR' },
  { id: 'pateros', name: 'Pateros', displayName: 'Pateros', lat: 14.5433, lng: 121.0657, category: 'NCR' },

  // ===== GMA (Greater Manila Area) =====
  // Rizal
  { id: 'antipolo', name: 'Antipolo', displayName: 'Antipolo, Rizal', lat: 14.5863, lng: 121.1758, category: 'GMA' },
  { id: 'cainta', name: 'Cainta', displayName: 'Cainta, Rizal', lat: 14.5771, lng: 121.1222, category: 'GMA' },
  { id: 'taytay', name: 'Taytay', displayName: 'Taytay, Rizal', lat: 14.5618, lng: 121.1324, category: 'GMA' },
  { id: 'san-mateo', name: 'San Mateo', displayName: 'San Mateo, Rizal', lat: 14.6971, lng: 121.1224, category: 'GMA' },
  { id: 'rodriguez', name: 'Rodriguez (Montalban)', displayName: 'Rodriguez, Rizal', lat: 14.7601, lng: 121.1218, category: 'GMA' },

  // Cavite
  { id: 'bacoor', name: 'Bacoor', displayName: 'Bacoor, Cavite', lat: 14.4588, lng: 120.9506, category: 'GMA' },
  { id: 'imus', name: 'Imus', displayName: 'Imus, Cavite', lat: 14.4297, lng: 120.9367, category: 'GMA' },
  { id: 'dasmarinas', name: 'Dasmariñas', displayName: 'Dasmariñas, Cavite', lat: 14.3294, lng: 120.9367, category: 'GMA' },
  { id: 'cavite-city', name: 'Cavite City', displayName: 'Cavite City, Cavite', lat: 14.4791, lng: 120.8964, category: 'GMA' },

  // Laguna
  { id: 'binan', name: 'Biñan', displayName: 'Biñan, Laguna', lat: 14.3369, lng: 121.0806, category: 'GMA' },
  { id: 'sta-rosa', name: 'Santa Rosa', displayName: 'Santa Rosa, Laguna', lat: 14.3123, lng: 121.1114, category: 'GMA' },
  { id: 'calamba', name: 'Calamba', displayName: 'Calamba, Laguna', lat: 14.2115, lng: 121.1654, category: 'GMA' },
  { id: 'san-pedro', name: 'San Pedro', displayName: 'San Pedro, Laguna', lat: 14.3583, lng: 121.0166, category: 'GMA' },

  // Bulacan
  { id: 'meycauayan', name: 'Meycauayan', displayName: 'Meycauayan, Bulacan', lat: 14.7339, lng: 120.9619, category: 'GMA' },
  { id: 'malolos', name: 'Malolos', displayName: 'Malolos, Bulacan', lat: 14.8433, lng: 120.8114, category: 'GMA' },
  { id: 'san-jose-del-monte', name: 'San Jose del Monte', displayName: 'San Jose del Monte, Bulacan', lat: 14.8136, lng: 121.0452, category: 'GMA' },

  // ===== Other Philippine Provinces =====
  // Luzon
  { id: 'baguio', name: 'Baguio', displayName: 'Baguio City, Benguet', lat: 16.4023, lng: 120.5960, category: 'Provinces' },
  { id: 'angeles', name: 'Angeles', displayName: 'Angeles City, Pampanga', lat: 15.1450, lng: 120.5887, category: 'Provinces' },
  { id: 'san-fernando-pampanga', name: 'San Fernando', displayName: 'San Fernando, Pampanga', lat: 15.0285, lng: 120.6897, category: 'Provinces' },
  { id: 'clark', name: 'Clark Freeport Zone', displayName: 'Clark, Pampanga', lat: 15.1859, lng: 120.5603, category: 'Provinces' },
  { id: 'tarlac', name: 'Tarlac City', displayName: 'Tarlac City, Tarlac', lat: 15.4754, lng: 120.5964, category: 'Provinces' },
  { id: 'dagupan', name: 'Dagupan', displayName: 'Dagupan City, Pangasinan', lat: 16.0433, lng: 120.3334, category: 'Provinces' },
  { id: 'laoag', name: 'Laoag', displayName: 'Laoag City, Ilocos Norte', lat: 18.1987, lng: 120.5937, category: 'Provinces' },
  { id: 'vigan', name: 'Vigan', displayName: 'Vigan City, Ilocos Sur', lat: 17.5747, lng: 120.3869, category: 'Provinces' },
  { id: 'batangas', name: 'Batangas City', displayName: 'Batangas City, Batangas', lat: 13.7565, lng: 121.0583, category: 'Provinces' },
  { id: 'lipa', name: 'Lipa', displayName: 'Lipa City, Batangas', lat: 13.9407, lng: 121.1623, category: 'Provinces' },
  { id: 'lucena', name: 'Lucena', displayName: 'Lucena City, Quezon', lat: 13.9372, lng: 121.6176, category: 'Provinces' },
  { id: 'naga', name: 'Naga', displayName: 'Naga City, Camarines Sur', lat: 13.6192, lng: 123.1814, category: 'Provinces' },
  { id: 'legazpi', name: 'Legazpi', displayName: 'Legazpi City, Albay', lat: 13.1391, lng: 123.7436, category: 'Provinces' },

  // Visayas
  { id: 'cebu', name: 'Cebu City', displayName: 'Cebu City, Cebu', lat: 10.3157, lng: 123.8854, category: 'Provinces' },
  { id: 'mandaue', name: 'Mandaue', displayName: 'Mandaue City, Cebu', lat: 10.3237, lng: 123.9224, category: 'Provinces' },
  { id: 'lapu-lapu', name: 'Lapu-Lapu', displayName: 'Lapu-Lapu City, Cebu', lat: 10.3103, lng: 123.9494, category: 'Provinces' },
  { id: 'iloilo', name: 'Iloilo City', displayName: 'Iloilo City, Iloilo', lat: 10.7202, lng: 122.5621, category: 'Provinces' },
  { id: 'bacolod', name: 'Bacolod', displayName: 'Bacolod City, Negros Occidental', lat: 10.6770, lng: 122.9506, category: 'Provinces' },
  { id: 'dumaguete', name: 'Dumaguete', displayName: 'Dumaguete City, Negros Oriental', lat: 9.3068, lng: 123.3054, category: 'Provinces' },
  { id: 'tacloban', name: 'Tacloban', displayName: 'Tacloban City, Leyte', lat: 11.2444, lng: 125.0039, category: 'Provinces' },
  { id: 'ormoc', name: 'Ormoc', displayName: 'Ormoc City, Leyte', lat: 11.0059, lng: 124.6075, category: 'Provinces' },

  // Mindanao
  { id: 'davao', name: 'Davao City', displayName: 'Davao City, Davao del Sur', lat: 7.0731, lng: 125.6128, category: 'Provinces' },
  { id: 'cagayan-de-oro', name: 'Cagayan de Oro', displayName: 'Cagayan de Oro, Misamis Oriental', lat: 8.4542, lng: 124.6319, category: 'Provinces' },
  { id: 'general-santos', name: 'General Santos', displayName: 'General Santos City, South Cotabato', lat: 6.1164, lng: 125.1716, category: 'Provinces' },
  { id: 'zamboanga', name: 'Zamboanga City', displayName: 'Zamboanga City, Zamboanga del Sur', lat: 6.9214, lng: 122.0790, category: 'Provinces' },
  { id: 'butuan', name: 'Butuan', displayName: 'Butuan City, Agusan del Norte', lat: 8.9475, lng: 125.5406, category: 'Provinces' },
  { id: 'iligan', name: 'Iligan', displayName: 'Iligan City, Lanao del Norte', lat: 8.2280, lng: 124.2452, category: 'Provinces' },

  // ===== International Cities =====
  // Asia
  { id: 'tokyo', name: 'Tokyo', displayName: 'Tokyo, Japan', lat: 35.6762, lng: 139.6503, category: 'International' },
  { id: 'seoul', name: 'Seoul', displayName: 'Seoul, South Korea', lat: 37.5665, lng: 126.9780, category: 'International' },
  { id: 'singapore', name: 'Singapore', displayName: 'Singapore', lat: 1.3521, lng: 103.8198, category: 'International' },
  { id: 'bangkok', name: 'Bangkok', displayName: 'Bangkok, Thailand', lat: 13.7563, lng: 100.5018, category: 'International' },
  { id: 'hong-kong', name: 'Hong Kong', displayName: 'Hong Kong', lat: 22.3193, lng: 114.1694, category: 'International' },
  { id: 'taipei', name: 'Taipei', displayName: 'Taipei, Taiwan', lat: 25.0330, lng: 121.5654, category: 'International' },
  { id: 'shanghai', name: 'Shanghai', displayName: 'Shanghai, China', lat: 31.2304, lng: 121.4737, category: 'International' },
  { id: 'beijing', name: 'Beijing', displayName: 'Beijing, China', lat: 39.9042, lng: 116.4074, category: 'International' },
  { id: 'dubai', name: 'Dubai', displayName: 'Dubai, UAE', lat: 25.2048, lng: 55.2708, category: 'International' },
  { id: 'kuala-lumpur', name: 'Kuala Lumpur', displayName: 'Kuala Lumpur, Malaysia', lat: 3.1390, lng: 101.6869, category: 'International' },
  { id: 'jakarta', name: 'Jakarta', displayName: 'Jakarta, Indonesia', lat: -6.2088, lng: 106.8456, category: 'International' },
  { id: 'hanoi', name: 'Hanoi', displayName: 'Hanoi, Vietnam', lat: 21.0285, lng: 105.8542, category: 'International' },
  { id: 'ho-chi-minh', name: 'Ho Chi Minh City', displayName: 'Ho Chi Minh City, Vietnam', lat: 10.8231, lng: 106.6297, category: 'International' },

  // North America
  { id: 'new-york', name: 'New York', displayName: 'New York, USA', lat: 40.7128, lng: -74.0060, category: 'International' },
  { id: 'los-angeles', name: 'Los Angeles', displayName: 'Los Angeles, USA', lat: 34.0522, lng: -118.2437, category: 'International' },
  { id: 'san-francisco', name: 'San Francisco', displayName: 'San Francisco, USA', lat: 37.7749, lng: -122.4194, category: 'International' },
  { id: 'chicago', name: 'Chicago', displayName: 'Chicago, USA', lat: 41.8781, lng: -87.6298, category: 'International' },
  { id: 'toronto', name: 'Toronto', displayName: 'Toronto, Canada', lat: 43.6532, lng: -79.3832, category: 'International' },
  { id: 'vancouver', name: 'Vancouver', displayName: 'Vancouver, Canada', lat: 49.2827, lng: -123.1207, category: 'International' },

  // Europe
  { id: 'london', name: 'London', displayName: 'London, UK', lat: 51.5074, lng: -0.1278, category: 'International' },
  { id: 'paris', name: 'Paris', displayName: 'Paris, France', lat: 48.8566, lng: 2.3522, category: 'International' },
  { id: 'berlin', name: 'Berlin', displayName: 'Berlin, Germany', lat: 52.5200, lng: 13.4050, category: 'International' },
  { id: 'rome', name: 'Rome', displayName: 'Rome, Italy', lat: 41.9028, lng: 12.4964, category: 'International' },
  { id: 'madrid', name: 'Madrid', displayName: 'Madrid, Spain', lat: 40.4168, lng: -3.7038, category: 'International' },
  { id: 'amsterdam', name: 'Amsterdam', displayName: 'Amsterdam, Netherlands', lat: 52.3676, lng: 4.9041, category: 'International' },

  // Oceania
  { id: 'sydney', name: 'Sydney', displayName: 'Sydney, Australia', lat: -33.8688, lng: 151.2093, category: 'International' },
  { id: 'melbourne', name: 'Melbourne', displayName: 'Melbourne, Australia', lat: -37.8136, lng: 144.9631, category: 'International' },
  { id: 'auckland', name: 'Auckland', displayName: 'Auckland, New Zealand', lat: -36.8485, lng: 174.7633, category: 'International' },
];

// Helper to find location by ID
export const findLocationById = (id: string): LocationOption | null => {
  return UNIFIED_LOCATIONS.find(loc => loc.id === id) || null;
};

// Helper to find nearest location from GPS coordinates
export const findNearestLocation = (lat: number, lng: number): LocationOption | null => {
  if (UNIFIED_LOCATIONS.length === 0) return null;

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  let nearestLocation = UNIFIED_LOCATIONS[0];
  let minDistance = calculateDistance(lat, lng, nearestLocation.lat, nearestLocation.lng);

  for (const location of UNIFIED_LOCATIONS) {
    const distance = calculateDistance(lat, lng, location.lat, location.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestLocation = location;
    }
  }

  return nearestLocation;
};

// Helper to group locations by category
export const groupLocationsByCategory = () => {
  const grouped = {
    NCR: UNIFIED_LOCATIONS.filter(loc => loc.category === 'NCR'),
    GMA: UNIFIED_LOCATIONS.filter(loc => loc.category === 'GMA'),
    Provinces: UNIFIED_LOCATIONS.filter(loc => loc.category === 'Provinces'),
    International: UNIFIED_LOCATIONS.filter(loc => loc.category === 'International'),
  };
  return grouped;
};
