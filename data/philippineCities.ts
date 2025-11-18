// Location selection: Greater Manila cities + Philippine provinces
export interface CityLocation {
  name: string;
  region: string;
  lat: number;
  lng: number;
  isProvince?: boolean;
}

export const PHILIPPINE_CITIES: CityLocation[] = [
  // ========== GREATER MANILA AREA ==========
  // Metro Manila (NCR)
  { name: "Caloocan", region: "Metro Manila", lat: 14.6488, lng: 120.9830 },
  { name: "Las Piñas", region: "Metro Manila", lat: 14.4453, lng: 120.9820 },
  { name: "Makati", region: "Metro Manila", lat: 14.5547, lng: 121.0244 },
  { name: "Malabon", region: "Metro Manila", lat: 14.6628, lng: 120.9569 },
  { name: "Mandaluyong", region: "Metro Manila", lat: 14.5794, lng: 121.0359 },
  { name: "Manila", region: "Metro Manila", lat: 14.5995, lng: 120.9842 },
  { name: "Marikina", region: "Metro Manila", lat: 14.6507, lng: 121.1029 },
  { name: "Muntinlupa", region: "Metro Manila", lat: 14.4083, lng: 121.0399 },
  { name: "Navotas", region: "Metro Manila", lat: 14.6686, lng: 120.9402 },
  { name: "Parañaque", region: "Metro Manila", lat: 14.4793, lng: 121.0198 },
  { name: "Pasay", region: "Metro Manila", lat: 14.5378, lng: 120.9896 },
  { name: "Pasig", region: "Metro Manila", lat: 14.5764, lng: 121.0851 },
  { name: "Quezon City", region: "Metro Manila", lat: 14.6760, lng: 121.0437 },
  { name: "San Juan", region: "Metro Manila", lat: 14.6019, lng: 121.0355 },
  { name: "Taguig", region: "Metro Manila", lat: 14.5176, lng: 121.0509 },
  { name: "Valenzuela", region: "Metro Manila", lat: 14.7000, lng: 120.9830 },
  { name: "Pateros", region: "Metro Manila", lat: 14.5438, lng: 121.0658 },

  // Greater Manila - Rizal
  { name: "Antipolo", region: "Rizal", lat: 14.5862, lng: 121.1755 },
  { name: "Cainta", region: "Rizal", lat: 14.5777, lng: 121.1221 },
  { name: "Taytay", region: "Rizal", lat: 14.5574, lng: 121.1324 },
  { name: "Binangonan", region: "Rizal", lat: 14.4647, lng: 121.1927 },
  { name: "Rodriguez (Montalban)", region: "Rizal", lat: 14.7167, lng: 121.1167 },
  { name: "San Mateo", region: "Rizal", lat: 14.6969, lng: 121.1222 },
  { name: "Angono", region: "Rizal", lat: 14.5264, lng: 121.1531 },

  // Greater Manila - Cavite
  { name: "Bacoor", region: "Cavite", lat: 14.4588, lng: 120.9512 },
  { name: "Dasmariñas", region: "Cavite", lat: 14.3294, lng: 120.9367 },
  { name: "Imus", region: "Cavite", lat: 14.4297, lng: 120.9367 },
  { name: "Cavite City", region: "Cavite", lat: 14.4791, lng: 120.8964 },
  { name: "General Trias", region: "Cavite", lat: 14.3862, lng: 120.8808 },
  { name: "Kawit", region: "Cavite", lat: 14.4462, lng: 120.9024 },
  { name: "Rosario", region: "Cavite", lat: 14.4175, lng: 120.8551 },
  { name: "Silang", region: "Cavite", lat: 14.2310, lng: 120.9749 },
  { name: "Tagaytay", region: "Cavite", lat: 14.1125, lng: 120.9603 },

  // Greater Manila - Laguna
  { name: "Biñan", region: "Laguna", lat: 14.3369, lng: 121.0806 },
  { name: "Calamba", region: "Laguna", lat: 14.2117, lng: 121.1653 },
  { name: "San Pedro", region: "Laguna", lat: 14.3585, lng: 121.0168 },
  { name: "Santa Rosa", region: "Laguna", lat: 14.3123, lng: 121.1114 },
  { name: "Cabuyao", region: "Laguna", lat: 14.2781, lng: 121.1244 },
  { name: "Los Baños", region: "Laguna", lat: 14.1696, lng: 121.2416 },

  // Greater Manila - Bulacan
  { name: "Malolos", region: "Bulacan", lat: 14.8433, lng: 120.8114 },
  { name: "Meycauayan", region: "Bulacan", lat: 14.7350, lng: 120.9566 },
  { name: "San Jose del Monte", region: "Bulacan", lat: 14.8139, lng: 121.0453 },
  { name: "Marilao", region: "Bulacan", lat: 14.7581, lng: 120.9486 },
  { name: "Bocaue", region: "Bulacan", lat: 14.7989, lng: 120.9259 },

  // ========== REST OF PHILIPPINES (BY PROVINCE) ==========

  // Luzon
  { name: "Abra", region: "Cordillera (CAR)", lat: 17.5969, lng: 120.8328, isProvince: true },
  { name: "Albay", region: "Bicol (Region V)", lat: 13.1391, lng: 123.7437, isProvince: true },
  { name: "Apayao", region: "Cordillera (CAR)", lat: 18.0119, lng: 121.1710, isProvince: true },
  { name: "Aurora", region: "Central Luzon (Region III)", lat: 15.7494, lng: 121.6367, isProvince: true },
  { name: "Bataan", region: "Central Luzon (Region III)", lat: 14.6417, lng: 120.4818, isProvince: true },
  { name: "Batanes", region: "Cagayan Valley (Region II)", lat: 20.4486, lng: 121.9700, isProvince: true },
  { name: "Batangas", region: "CALABARZON (Region IV-A)", lat: 13.7565, lng: 121.0583, isProvince: true },
  { name: "Benguet", region: "Cordillera (CAR)", lat: 16.4023, lng: 120.5960, isProvince: true },
  { name: "Cagayan", region: "Cagayan Valley (Region II)", lat: 17.6132, lng: 121.7270, isProvince: true },
  { name: "Camarines Norte", region: "Bicol (Region V)", lat: 14.1354, lng: 122.7553, isProvince: true },
  { name: "Camarines Sur", region: "Bicol (Region V)", lat: 13.5221, lng: 123.3475, isProvince: true },
  { name: "Catanduanes", region: "Bicol (Region V)", lat: 13.7063, lng: 124.2451, isProvince: true },
  { name: "Ifugao", region: "Cordillera (CAR)", lat: 16.8332, lng: 121.1710, isProvince: true },
  { name: "Ilocos Norte", region: "Ilocos (Region I)", lat: 18.1987, lng: 120.5937, isProvince: true },
  { name: "Ilocos Sur", region: "Ilocos (Region I)", lat: 17.2224, lng: 120.5739, isProvince: true },
  { name: "Isabela", region: "Cagayan Valley (Region II)", lat: 16.9754, lng: 121.8076, isProvince: true },
  { name: "Kalinga", region: "Cordillera (CAR)", lat: 17.4083, lng: 121.4478, isProvince: true },
  { name: "La Union", region: "Ilocos (Region I)", lat: 16.6159, lng: 120.3169, isProvince: true },
  { name: "Marinduque", region: "MIMAROPA (Region IV-B)", lat: 13.4770, lng: 121.9030, isProvince: true },
  { name: "Masbate", region: "Bicol (Region V)", lat: 12.3688, lng: 123.6178, isProvince: true },
  { name: "Mountain Province", region: "Cordillera (CAR)", lat: 17.0785, lng: 121.0797, isProvince: true },
  { name: "Nueva Ecija", region: "Central Luzon (Region III)", lat: 15.5784, lng: 121.1113, isProvince: true },
  { name: "Nueva Vizcaya", region: "Cagayan Valley (Region II)", lat: 16.3300, lng: 121.1710, isProvince: true },
  { name: "Occidental Mindoro", region: "MIMAROPA (Region IV-B)", lat: 13.1014, lng: 120.7652, isProvince: true },
  { name: "Oriental Mindoro", region: "MIMAROPA (Region IV-B)", lat: 13.0000, lng: 121.4500, isProvince: true },
  { name: "Palawan", region: "MIMAROPA (Region IV-B)", lat: 9.8349, lng: 118.7384, isProvince: true },
  { name: "Pampanga", region: "Central Luzon (Region III)", lat: 15.0794, lng: 120.6200, isProvince: true },
  { name: "Pangasinan", region: "Ilocos (Region I)", lat: 15.8949, lng: 120.2863, isProvince: true },
  { name: "Quezon", region: "CALABARZON (Region IV-A)", lat: 13.9372, lng: 121.6176, isProvince: true },
  { name: "Quirino", region: "Cagayan Valley (Region II)", lat: 16.2728, lng: 121.5368, isProvince: true },
  { name: "Romblon", region: "MIMAROPA (Region IV-B)", lat: 12.5778, lng: 122.2690, isProvince: true },
  { name: "Sorsogon", region: "Bicol (Region V)", lat: 12.9742, lng: 124.0078, isProvince: true },
  { name: "Tarlac", region: "Central Luzon (Region III)", lat: 15.4754, lng: 120.5963, isProvince: true },
  { name: "Zambales", region: "Central Luzon (Region III)", lat: 15.5083, lng: 119.9692, isProvince: true },

  // Visayas
  { name: "Aklan", region: "Western Visayas (Region VI)", lat: 11.9804, lng: 122.0080, isProvince: true },
  { name: "Antique", region: "Western Visayas (Region VI)", lat: 11.5740, lng: 121.9437, isProvince: true },
  { name: "Bohol", region: "Central Visayas (Region VII)", lat: 9.8500, lng: 124.1435, isProvince: true },
  { name: "Biliran", region: "Eastern Visayas (Region VIII)", lat: 11.5833, lng: 124.4667, isProvince: true },
  { name: "Capiz", region: "Western Visayas (Region VI)", lat: 11.3889, lng: 122.7277, isProvince: true },
  { name: "Cebu", region: "Central Visayas (Region VII)", lat: 10.3157, lng: 123.8854, isProvince: true },
  { name: "Eastern Samar", region: "Eastern Visayas (Region VIII)", lat: 11.5011, lng: 125.5227, isProvince: true },
  { name: "Guimaras", region: "Western Visayas (Region VI)", lat: 10.5928, lng: 122.6308, isProvince: true },
  { name: "Iloilo", region: "Western Visayas (Region VI)", lat: 10.7202, lng: 122.5621, isProvince: true },
  { name: "Leyte", region: "Eastern Visayas (Region VIII)", lat: 11.2443, lng: 125.0039, isProvince: true },
  { name: "Negros Occidental", region: "Western Visayas (Region VI)", lat: 10.6770, lng: 122.9500, isProvince: true },
  { name: "Negros Oriental", region: "Central Visayas (Region VII)", lat: 9.3068, lng: 123.3054, isProvince: true },
  { name: "Northern Samar", region: "Eastern Visayas (Region VIII)", lat: 12.3614, lng: 124.7745, isProvince: true },
  { name: "Samar (Western Samar)", region: "Eastern Visayas (Region VIII)", lat: 12.0664, lng: 124.6042, isProvince: true },
  { name: "Siquijor", region: "Central Visayas (Region VII)", lat: 9.1999, lng: 123.5953, isProvince: true },
  { name: "Southern Leyte", region: "Eastern Visayas (Region VIII)", lat: 10.3347, lng: 125.1728, isProvince: true },

  // Mindanao
  { name: "Agusan del Norte", region: "Caraga (Region XIII)", lat: 8.9475, lng: 125.5406, isProvince: true },
  { name: "Agusan del Sur", region: "Caraga (Region XIII)", lat: 8.5567, lng: 125.9644, isProvince: true },
  { name: "Basilan", region: "BARMM", lat: 6.4297, lng: 121.9869, isProvince: true },
  { name: "Bukidnon", region: "Northern Mindanao (Region X)", lat: 8.0530, lng: 124.8742, isProvince: true },
  { name: "Camiguin", region: "Northern Mindanao (Region X)", lat: 9.1734, lng: 124.7299, isProvince: true },
  { name: "Compostela Valley (Davao de Oro)", region: "Davao (Region XI)", lat: 7.4500, lng: 126.0833, isProvince: true },
  { name: "Cotabato (North Cotabato)", region: "SOCCSKSARGEN (Region XII)", lat: 7.2061, lng: 124.4567, isProvince: true },
  { name: "Davao del Norte", region: "Davao (Region XI)", lat: 7.5617, lng: 125.6533, isProvince: true },
  { name: "Davao del Sur", region: "Davao (Region XI)", lat: 6.7668, lng: 125.3284, isProvince: true },
  { name: "Davao Occidental", region: "Davao (Region XI)", lat: 6.0833, lng: 125.6000, isProvince: true },
  { name: "Davao Oriental", region: "Davao (Region XI)", lat: 7.3197, lng: 126.5419, isProvince: true },
  { name: "Dinagat Islands", region: "Caraga (Region XIII)", lat: 10.1280, lng: 125.5953, isProvince: true },
  { name: "Lanao del Norte", region: "Northern Mindanao (Region X)", lat: 7.8768, lng: 123.8849, isProvince: true },
  { name: "Lanao del Sur", region: "BARMM", lat: 7.8237, lng: 124.4239, isProvince: true },
  { name: "Maguindanao", region: "BARMM", lat: 6.9436, lng: 124.4108, isProvince: true },
  { name: "Misamis Occidental", region: "Northern Mindanao (Region X)", lat: 8.3417, lng: 123.7308, isProvince: true },
  { name: "Misamis Oriental", region: "Northern Mindanao (Region X)", lat: 8.4542, lng: 124.6319, isProvince: true },
  { name: "Sarangani", region: "SOCCSKSARGEN (Region XII)", lat: 5.9269, lng: 124.9953, isProvince: true },
  { name: "South Cotabato", region: "SOCCSKSARGEN (Region XII)", lat: 6.3378, lng: 124.7706, isProvince: true },
  { name: "Sultan Kudarat", region: "SOCCSKSARGEN (Region XII)", lat: 6.5086, lng: 124.2486, isProvince: true },
  { name: "Sulu", region: "BARMM", lat: 6.0511, lng: 121.0180, isProvince: true },
  { name: "Surigao del Norte", region: "Caraga (Region XIII)", lat: 9.7849, lng: 125.4919, isProvince: true },
  { name: "Surigao del Sur", region: "Caraga (Region XIII)", lat: 8.5333, lng: 126.1167, isProvince: true },
  { name: "Tawi-Tawi", region: "BARMM", lat: 5.1384, lng: 119.9514, isProvince: true },
  { name: "Zamboanga del Norte", region: "Zamboanga Peninsula (Region IX)", lat: 8.5500, lng: 123.2667, isProvince: true },
  { name: "Zamboanga del Sur", region: "Zamboanga Peninsula (Region IX)", lat: 7.8381, lng: 123.2967, isProvince: true },
  { name: "Zamboanga Sibugay", region: "Zamboanga Peninsula (Region IX)", lat: 7.8273, lng: 122.5678, isProvince: true },
];

// No need to sort - already organized: Greater Manila first, then provinces alphabetically
