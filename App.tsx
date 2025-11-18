import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import WeatherBanner from './components/WeatherBanner';
import StatusSummary from './components/StatusSummary';
import StatusMap from './components/StatusMap';
import PinModal from './components/PinModal';
import AdminDashboard from './components/AdminDashboard';
import CommuteAdvisory from './components/CommuteAdvisory';
import { fetchWeatherForecast, getCommuteAnalysis } from './services/geminiService';
import { fetchTeachersFromNotion } from './services/notionService';
import { POLL_OPTIONS, REASON_OPTIONS } from './constants';
import { PollStatus } from './types';
import type { WeatherData, PollCounts, Location, Teacher, PollSubmission } from './types';
import { PHILIPPINE_CITIES } from './data/philippineCities';
import { CameraIcon, MessageSquareIcon, VideoIcon, XIcon } from './components/icons';

// --- LOCATION UTILITIES ---
// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Find the nearest Philippine city from GPS coordinates
const findNearestCity = (lat: number, lng: number): string => {
  let nearestCity = PHILIPPINE_CITIES[0];
  let minDistance = calculateDistance(lat, lng, nearestCity.lat, nearestCity.lng);

  for (const city of PHILIPPINE_CITIES) {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }

  return nearestCity.name;
};

// --- START: FAKE DATA GENERATION FOR TESTING ---

const generateFakeWeatherData = (locationName: string): WeatherData => {
  const currentHour = new Date().getHours();
  const nextHours = Array.from({ length: 4 }, (_, i) => {
    const hour = (currentHour + i + 1) % 24;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour} ${period}`;
  });

  return {
    pasig_city: {
      location_name: "Strata 100 Building, Ortigas Center, Pasig City",
      temperature: "28°C",
      feels_like: "32°C",
      humidity: "80%",
      uv_index: "7 (High)",
      wind_signal: "No signal",
      rainfall_alert: "Light showers possible",
      hourly_forecast: [
        { time: nextHours[0], temperature: "29°C", condition: "Partly Cloudy" },
        { time: nextHours[1], temperature: "29°C", condition: "Showers" },
        { time: nextHours[2], temperature: "28°C", condition: "Cloudy" },
        { time: nextHours[3], temperature: "28°C", condition: "Cloudy" },
      ],
      earthquake: {
        intensity: "No significant activity",
        time_ago: "N/A",
        location: "N/A",
        distance: "N/A",
      },
    },
    user_location: {
      location_name: locationName,
      temperature: "29°C",
      feels_like: "33°C",
      humidity: "78%",
      uv_index: "8 (Very High)",
      wind_signal: "No signal",
      rainfall_alert: "Isolated thunderstorms",
      hourly_forecast: [
        { time: nextHours[0], temperature: "30°C", condition: "Sunny" },
        { time: nextHours[1], temperature: "30°C", condition: "Partly Cloudy" },
        { time: nextHours[2], temperature: "29°C", condition: "Thunderstorms" },
        { time: nextHours[3], temperature: "29°C", condition: "Showers" },
      ],
      earthquake: {
        intensity: "Magnitude 2.1",
        time_ago: "5 hours ago",
        location: "10km E of Antipolo, Rizal",
        distance: "Approx. 15 km away",
      },
    },
  };
};

const fakeWeatherData: WeatherData = generateFakeWeatherData("Quezon City, Metro Manila");

const getRandomCoords = (centerLat: number, centerLng: number, radiusKm: number) => {
    const y0 = centerLat;
    const x0 = centerLng;
    const rd = radiusKm / 111.32;

    const u = Math.random();
    const v = Math.random();

    const w = rd * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    return {
        lat: y + y0,
        lng: x + x0,
    };
};

const generateFakeSubmissions = (teachers: Teacher[], weatherData: WeatherData): PollSubmission[] => {
    const statuses = Object.values(PollStatus);
    const fakeSubmissions: PollSubmission[] = [];
    const submissionCount = Math.min(15, teachers.length);

    for (let i = 0; i < submissionCount; i++) {
        const teacher = teachers[i];
        const status = statuses[i % statuses.length]; // Cycle through statuses for a good mix
        const randomCoords = getRandomCoords(14.5898, 121.0594, 20);
        const hasReason = Math.random() > 0.5;

        fakeSubmissions.push({
            id: `sub_fake_${teacher.id}`,
            teacherId: teacher.id,
            status: status,
            timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60),
            weatherData: weatherData,
            coords: randomCoords,
            reason: hasReason ? REASON_OPTIONS[i % REASON_OPTIONS.length] : undefined,
            // teacherPhoto is omitted from mock data to avoid external dependencies
        });
    }

    return fakeSubmissions;
};

// --- END: FAKE DATA GENERATION FOR TESTING ---

// API helpers for submissions
const fetchSubmissionsFromBackend = async (): Promise<PollSubmission[]> => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const backendUrl = `${API_BASE_URL}/api/submissions`;

    const response = await fetch(backendUrl);

    if (!response.ok) {
      console.error('Backend API error:', response.status);
      return [];
    }

    const data = await response.json();

    // Convert to PollSubmission format
    return data.map((sub: any) => {
      // Handle backwards compatibility: old submissions have coordinates in "location" field
      let coords = { lat: 14.5995, lng: 120.9842 }; // Default
      let locationName = 'Unknown Location';

      if (sub.coordinates) {
        // New format: coordinates in separate field
        coords = parseCoords(sub.coordinates);
        locationName = sub.location || 'Unknown Location';
      } else if (sub.location && isCoordinateString(sub.location)) {
        // Old format: coordinates in location field
        coords = parseCoords(sub.location);
        locationName = 'Location not specified';
      } else if (sub.location) {
        // Location is a proper name
        locationName = sub.location;
      }

      return {
        id: sub.id,
        teacherId: sub.teacherId,
        status: sub.status,
        timestamp: new Date(sub.timestamp),
        coords: coords,
        locationName: locationName,
        reason: sub.reason,
        weatherData: fakeWeatherData, // Use fake weather data for now
      };
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
};

const parseCoords = (location: string): { lat: number, lng: number } => {
  try {
    const [lat, lng] = location.split(',').map(s => parseFloat(s.trim()));
    return { lat, lng };
  } catch {
    return { lat: 14.5995, lng: 120.9842 }; // Default Manila coordinates
  }
};

// Helper to detect if a string is coordinates (e.g., "14.5995, 120.9842")
const isCoordinateString = (str: string): boolean => {
  if (!str) return false;
  const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/;
  return coordPattern.test(str.trim());
};

const uploadFile = async (base64Data: string, type: 'photo' | 'video'): Promise<string | null> => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const backendUrl = `${API_BASE_URL}/api/upload`;

    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();

    // Create form data
    const formData = new FormData();
    const extension = type === 'photo' ? 'jpg' : 'mp4';
    formData.append('file', blob, `${type}.${extension}`);

    // Upload to backend
    const uploadResponse = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      console.error('Failed to upload file:', uploadResponse.status);
      return null;
    }

    const data = await uploadResponse.json();
    console.log(`✅ ${type} uploaded:`, data.url);
    return data.url;
  } catch (error) {
    console.error(`Error uploading ${type}:`, error);
    return null;
  }
};

const saveSubmissionToBackend = async (
  submission: PollSubmission,
  teacherName: string,
  photoData: string | null,
  videoData: { data: string, mimeType: string } | null
): Promise<boolean> => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // Upload photo and video if they exist
    let photoUrl: string | null = null;
    let videoUrl: string | null = null;

    if (photoData) {
      photoUrl = await uploadFile(photoData, 'photo');
    }

    if (videoData) {
      // Convert video data to base64 data URL
      const videoDataUrl = `data:${videoData.mimeType};base64,${videoData.data}`;
      videoUrl = await uploadFile(videoDataUrl, 'video');
    }

    // Submit to Notion
    const backendUrl = `${API_BASE_URL}/api/submissions`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teacherId: submission.teacherId,
        teacherName: teacherName,
        status: submission.status,
        coords: submission.coords,
        locationName: submission.locationName,
        reason: submission.reason,
        timestamp: submission.timestamp,
        photoUrl: photoUrl,
        videoUrl: videoUrl,
      }),
    });

    if (!response.ok) {
      console.error('Failed to save submission:', response.status);
      return false;
    }

    console.log('✅ Submission saved to Notion');
    return true;
  } catch (error) {
    console.error('Error saving submission:', error);
    return false;
  }
};

const App: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapVisible, setIsMapVisible] = useState<boolean>(false);

  // Admin and data management state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isTeachersLoading, setIsTeachersLoading] = useState<boolean>(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<PollSubmission[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<PollStatus | null>(null);
  const [lastSubmissionStatus, setLastSubmissionStatus] = useState<PollStatus | null>(null);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationMethod, setLocationMethod] = useState<'gps' | 'manual-ph' | 'manual-intl' | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [internationalLocation, setInternationalLocation] = useState<string>('');

  // New optional fields state
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [teacherPhoto, setTeacherPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [teacherVideo, setTeacherVideo] = useState<{data: string, mimeType: string} | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // New AI commute summary state
  const [commuteSummary, setCommuteSummary] = useState<string | null>(null);
  const [isCommuteSummaryLoading, setIsCommuteSummaryLoading] = useState<boolean>(false);

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              setTeacherPhoto(base64String); // Keep the data URL for easy display
              setPhotoPreview(base64String);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.size < 10 * 1024 * 1024) { // 10MB limit
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = (reader.result as string).split(',')[1];
              setTeacherVideo({ data: base64String, mimeType: file.type });
              setVideoPreview(URL.createObjectURL(file));
          };
          reader.readAsDataURL(file);
      } else if (file) {
          setError("Video file is too large. Please upload a file smaller than 10MB.");
          if (videoInputRef.current) videoInputRef.current.value = "";
      }
  };

  const clearOptionalFields = () => {
    setReason('');
    setCustomReason('');
    setTeacherPhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
        photoInputRef.current.value = "";
    }
    setTeacherVideo(null);
    setVideoPreview(null);
    if (videoInputRef.current) {
        videoInputRef.current.value = "";
    }
  };

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser. Please select your location manually below.");
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserCoords(coords);

        // Auto-fill the dropdown with the nearest city
        const nearestCityName = findNearestCity(coords.lat, coords.lng);
        setSelectedCity(nearestCityName);
        setLocationMethod('manual-ph'); // Changed to manual-ph since we're using the dropdown

        // Fetch weather for the user's actual location
        getWeatherData(coords.lat, coords.lng);

        setIsGettingLocation(false);
        setLocationError(null);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Could not get your GPS location. Please select your location manually below.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please allow location access or select your city manually below.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please select your city manually below.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again or select your city manually below.";
            break;
        }

        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds timeout
        maximumAge: 0
      }
    );
  };

  const handleManualLocationPH = (cityName: string) => {
    const city = PHILIPPINE_CITIES.find(c => c.name === cityName);
    if (city) {
      setUserCoords({ lat: city.lat, lng: city.lng });
      setSelectedCity(cityName);
      setLocationMethod('manual-ph');
      setLocationError(null);

      // Fetch weather for the selected city
      getWeatherData(city.lat, city.lng);
    }
  };

  const handleManualLocationIntl = (location: string) => {
    if (location.trim()) {
      // For international locations, use a default coordinate (Manila)
      // In a real app, you'd geocode this location
      const defaultCoords = { lat: 14.5995, lng: 120.9842 };
      setUserCoords(defaultCoords);
      setInternationalLocation(location);
      setLocationMethod('manual-intl');
      setLocationError(null);

      // Fetch weather with default coordinates (Manila)
      // Note: This will show Manila weather for international locations
      getWeatherData(defaultCoords.lat, defaultCoords.lng);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTeacherId) {
        setError("Please select your name before submitting your status.");
        return;
    }
    if (!selectedStatus) {
        setError("Please select your status before submitting.");
        return;
    }
    if (!userCoords) {
        setError("Please set your location (use GPS or select from dropdown) before submitting your status.");
        return;
    }
    if (!reason) {
        setError("Please select a reason before submitting your status.");
        return;
    }
    if (reason === 'Other' && !customReason.trim()) {
        setError("Please specify your custom reason.");
        return;
    }
    setError(null);

    // Use fake weather data if actual weather fetch failed (e.g., API quota exceeded)
    const submissionWeatherData = weatherData || fakeWeatherData;

    // Use custom reason if "Other" is selected, otherwise use the selected reason
    const finalReason = reason === 'Other' ? customReason.trim() : reason;

    // Get teacher name from teachers list
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    const teacherName = teacher?.name || 'Unknown';

    // Determine the location name to display
    const locationName = selectedCity || internationalLocation || 'Unknown Location';

    const newSubmission: PollSubmission = {
        id: `sub_${Date.now()}`,
        teacherId: selectedTeacherId,
        status: selectedStatus,
        timestamp: new Date(),
        weatherData: submissionWeatherData,
        coords: userCoords,
        reason: finalReason,
        locationName: locationName,
        teacherPhoto: teacherPhoto || undefined,
        teacherVideo: teacherVideo || undefined,
    };

    // Save to backend (Notion)
    const saved = await saveSubmissionToBackend(newSubmission, teacherName, teacherPhoto, teacherVideo);

    if (saved) {
      // Update local state only if backend save succeeded
      setSubmissions(prev => [
          ...prev.filter(sub => sub.teacherId !== selectedTeacherId),
          newSubmission,
      ]);

      setLastSubmissionStatus(selectedStatus);
      setSelectedStatus(null); // Clear selected status after submission
      clearOptionalFields();
    } else {
      setError("Failed to save your submission. Please try again.");
    }
  };
  
  const pollCounts: PollCounts = useMemo(() => {
     const counts: PollCounts = {
        [PollStatus.AVAILABLE]: 0,
        [PollStatus.LATE]: 0,
        [PollStatus.ONLINE_ONLY]: 0,
        [PollStatus.UNAVAILABLE]: 0,
        [PollStatus.EMERGENCY]: 0,
    };
    
    const latestSubmissions = new Map<string, PollSubmission>();
    submissions.forEach(sub => {
        latestSubmissions.set(sub.teacherId, sub);
    });

    latestSubmissions.forEach(sub => {
        counts[sub.status]++;
    });

    return counts;
  }, [submissions]);

  const teacherLocations: Location[] = useMemo(() => {
     const latestSubmissions = new Map<string, PollSubmission>();
     submissions.forEach(sub => {
         latestSubmissions.set(sub.teacherId, sub);
     });

     const locations: Location[] = [];
     latestSubmissions.forEach((sub, teacherId) => {
         const teacher = teachers.find(t => t.id === teacherId);
         if (teacher) {
             locations.push({
                 id: teacher.id,
                 teacherName: teacher.name,
                 status: sub.status,
                 position: { lat: sub.coords.lat, lng: sub.coords.lng }
             });
         }
     });
     return locations;
  }, [submissions, teachers]);


  const getWeatherData = useCallback(async (lat: number, lon: number) => {
    setIsWeatherLoading(true);
    setError(null);
    setWeatherData(null); // Clear previous weather data
    setUserCoords({lat, lng: lon});

    console.log(`🌤️ Fetching weather for coordinates: ${lat}, ${lon}`);

    try {
      const data = await fetchWeatherForecast(lat, lon);
      console.log('✅ Weather data received:', data);
      setWeatherData(data);

       // Fetch commute analysis after weather data is available
      setIsCommuteSummaryLoading(true);
      try {
        const summary = await getCommuteAnalysis(data.user_location, data.pasig_city);
        setCommuteSummary(summary);
      } catch (commuteErr) {
        console.error("Could not fetch commute analysis:", commuteErr);
        // Not setting a user-facing error for this, as it's an enhancement
      } finally {
        setIsCommuteSummaryLoading(false);
      }
    } catch (err) {
      console.error('❌ Weather fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Weather temporarily unavailable: ${errorMessage}`);
      console.log('📦 Using fallback weather data');

      // Generate location-aware fake weather data as fallback
      const locationName = selectedCity || internationalLocation || 'Your Location';
      const fallbackData = generateFakeWeatherData(locationName);
      setWeatherData(fallbackData);
    } finally {
      setIsWeatherLoading(false);
    }
  }, [selectedCity, internationalLocation]);

  // Don't automatically request location or fetch weather on page load
  // Teachers will use the "Get Current Location" button or select from dropdown
  // Weather will load only after location is selected

  // Fetch teachers from Notion on mount
  useEffect(() => {
    const loadTeachers = async () => {
      setIsTeachersLoading(true);
      setTeachersError(null);
      try {
        const fetchedTeachers = await fetchTeachersFromNotion();
        setTeachers(fetchedTeachers);
      } catch (err) {
        console.error('Error loading teachers:', err);
        setTeachersError('Could not load teacher list. Please refresh the page.');
      } finally {
        setIsTeachersLoading(false);
      }
    };
    loadTeachers();
  }, []);

  // Load submissions from backend on mount
  useEffect(() => {
    const loadSubmissions = async () => {
      const loadedSubmissions = await fetchSubmissionsFromBackend();
      setSubmissions(loadedSubmissions);
    };
    loadSubmissions();
  }, []);

  const handlePinSubmit = (pin: string) => {
      if (pin === '14411441') {
          setIsAdmin(true);
          setIsPinModalOpen(false);
      } else {
          return "Invalid PIN. Please try again.";
      }
      return null;
  };

  const selectedTeacherSubmissionStatus = useMemo(() => {
    if (!selectedTeacherId) return null;
    const latestSubmission = submissions
        .filter(s => s.teacherId === selectedTeacherId)
        .sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    return latestSubmission ? latestSubmission.status : null;
  }, [selectedTeacherId, submissions]);


  // If admin mode is active, show admin dashboard as full page
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col p-4 sm:p-6 lg:p-8">
        <header className="w-full max-w-7xl mx-auto mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img
              src="/dricanlogo2.png"
              alt="ICAN Logo"
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-amber-500 dark:text-amber-400">NOAH's Ark - Admin</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">Administration Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setIsAdmin(false)}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md text-sm font-semibold transition-colors"
          >
            Exit Admin
          </button>
        </header>
        <main className="w-full max-w-7xl mx-auto">
          <AdminDashboard submissions={submissions} teachers={teachers} setSubmissions={setSubmissions} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      {isPinModalOpen && <PinModal onSubmit={handlePinSubmit} onClose={() => setIsPinModalOpen(false)} />}
      <main className="w-full max-w-4xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between gap-4 md:gap-6 mb-4">
            <img
              src="/dricanlogo2.png"
              alt="ICAN Logo"
              className="h-16 md:h-20 w-auto flex-shrink-0"
            />
            <div className="text-right">
              <h1 className="text-2xl md:text-4xl font-bold text-amber-500 dark:text-amber-400">
                NOAH's Ark
              </h1>
              <p className="text-xs md:text-sm text-amber-600 dark:text-amber-500 mt-1">
                <span className="font-semibold">N</span>otification <span className="font-semibold">O</span>f <span className="font-semibold">A</span>vailability & <span className="font-semibold">H</span>azards
              </p>
            </div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">Please select your status for today based on the conditions.</p>
        </header>

        <div className="w-full bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-md mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">Submit Your Status</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Your response will be visible to the administration.</p>

            <div className="mb-6">
              <label htmlFor="teacher-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Your Name:</label>
              {teachersError && (
                <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm">
                  {teachersError}
                </div>
              )}
              <select
                id="teacher-select"
                value={selectedTeacherId}
                onChange={(e) => {
                    setSelectedTeacherId(e.target.value);
                    setSelectedStatus(null);
                    setLastSubmissionStatus(null);
                    clearOptionalFields();
                }}
                disabled={isTeachersLoading || !!teachersError}
                className="block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                  <option value="" disabled>
                    {isTeachersLoading ? '-- Loading teachers... --' : '-- Please select your name --'}
                  </option>
                  {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
              </select>
            </div>

            {/* Current Location Selection */}
            {selectedTeacherId && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Current Location: <span className="text-red-600 dark:text-red-400">*</span>
                </label>

                <div className="space-y-4">
                  {/* GPS Location Option */}
                  {/* GPS Auto-detect Button */}
                  <div>
                    <button
                      onClick={handleGetLocation}
                      disabled={isGettingLocation}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGettingLocation ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          Getting GPS location...
                        </>
                      ) : (
                        <>
                          📍 Auto-detect my location (GPS)
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                      GPS will auto-fill the dropdown below
                    </p>
                  </div>

                  {/* Philippines City Dropdown - Always visible */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      📍 Philippine Location:
                    </label>
                    <select
                      value={selectedCity}
                      onChange={(e) => handleManualLocationPH(e.target.value)}
                      className="block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-sm"
                    >
                      <option value="">-- Select your city/province --</option>
                      <optgroup label="Greater Manila Area">
                        {PHILIPPINE_CITIES.filter(city => !city.isProvince).map(city => (
                          <option key={city.name} value={city.name}>
                            {city.name}, {city.region}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Other Philippine Provinces">
                        {PHILIPPINE_CITIES.filter(city => city.isProvince).map(city => (
                          <option key={city.name} value={city.name}>
                            {city.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600"></div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">OR</span>
                    <div className="flex-1 h-px bg-slate-300 dark:bg-slate-600"></div>
                  </div>

                  {/* Manual Location - International */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                      🌏 International Location:
                    </label>
                    <input
                      type="text"
                      value={internationalLocation}
                      onChange={(e) => setInternationalLocation(e.target.value)}
                      onBlur={(e) => handleManualLocationIntl(e.target.value)}
                      placeholder="e.g., Singapore, Tokyo, New York"
                      className="block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 text-sm placeholder-slate-400"
                    />
                  </div>

                  {/* Location Status Display */}
                  {userCoords && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                      <p className="text-sm text-green-800 dark:text-green-200 font-semibold mb-1">
                        ✓ Location Set:
                      </p>
                      {selectedCity && (
                        <p className="text-xs text-green-700 dark:text-green-300">
                          📍 {selectedCity}
                        </p>
                      )}
                      {internationalLocation && !selectedCity && (
                        <p className="text-xs text-green-700 dark:text-green-300">
                          🌏 {internationalLocation}
                        </p>
                      )}
                      <a
                        href={`https://www.google.com/maps?q=${userCoords.lat},${userCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 dark:text-green-300 hover:underline mt-1 inline-block"
                      >
                        View on Google Maps →
                      </a>
                      {isWeatherLoading && (
                        <p className="text-xs text-green-700 dark:text-green-300 mt-2 flex items-center gap-2">
                          <span className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-green-700"></span>
                          Loading weather data...
                        </p>
                      )}
                    </div>
                  )}

                  {/* Error Display */}
                  {locationError && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-200 text-sm">
                      <p className="font-semibold mb-1">ℹ️ GPS Unavailable</p>
                      <p className="text-xs">{locationError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label htmlFor="reason-select" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        <MessageSquareIcon className="w-4 h-4" />
                        Reason:
                    </label>
                    <select
                        id="reason-select"
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (e.target.value !== 'Other') {
                            setCustomReason(''); // Clear custom reason if not "Other"
                          }
                        }}
                        disabled={!selectedTeacherId}
                        className="block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50"
                    >
                        <option value="">-- Select a reason --</option>
                        {REASON_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>

                    {/* Show text input when "Other" is selected */}
                    {reason === 'Other' && (
                      <input
                        type="text"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Please specify your reason..."
                        disabled={!selectedTeacherId}
                        className="mt-2 block w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 focus:outline-none focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50 placeholder-slate-400"
                      />
                    )}
                </div>
                <div>
                    <label htmlFor="photo-upload" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                         <CameraIcon className="w-4 h-4" />
                        Upload Photo (Optional):
                    </label>
                    <input
                        id="photo-upload"
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={!selectedTeacherId}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:file:bg-sky-900/50 dark:file:text-sky-300 dark:hover:file:bg-sky-900 disabled:opacity-50"
                    />
                </div>
            </div>
             <div className="mb-6">
                <label htmlFor="video-upload" className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    <VideoIcon className="w-4 h-4" />
                    Upload Short Video (Optional, &lt;10MB):
                </label>
                <input
                    id="video-upload"
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={!selectedTeacherId}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 dark:file:bg-sky-900/50 dark:file:text-sky-300 dark:hover:file:bg-sky-900 disabled:opacity-50"
                />
            </div>
            
            {(photoPreview || videoPreview) && (
                 <div className="mb-6 flex flex-wrap gap-4">
                     {photoPreview && (
                         <div>
                             <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Photo Preview:</p>
                             <div className="relative w-32 h-32">
                                <img src={photoPreview} alt="Teacher photo preview" className="w-32 h-32 rounded-lg object-cover" />
                                <button
                                    onClick={() => {
                                        setPhotoPreview(null);
                                        setTeacherPhoto(null);
                                        if(photoInputRef.current) photoInputRef.current.value = "";
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shadow-lg hover:bg-red-600 transition-colors"
                                    aria-label="Remove photo"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                             </div>
                         </div>
                    )}
                    {videoPreview && (
                         <div>
                             <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Video Preview:</p>
                             <div className="relative w-48">
                                <video src={videoPreview} controls className="w-full rounded-lg" />
                                <button
                                    onClick={() => {
                                        setVideoPreview(null);
                                        setTeacherVideo(null);
                                        if(videoInputRef.current) videoInputRef.current.value = "";
                                    }}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm shadow-lg hover:bg-red-600 transition-colors"
                                    aria-label="Remove video"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                             </div>
                         </div>
                    )}
                 </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {POLL_OPTIONS.map((option) => (
                    <button
                        key={option.status}
                        onClick={() => {
                            setSelectedStatus(option.status);
                            setError(null); // Clear error when status is selected
                        }}
                        disabled={!selectedTeacherId}
                        className={`p-4 rounded-lg text-white font-bold text-left transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                        ${selectedStatus === option.status ? option.selectedStyle : option.style}
                        ${option.status === PollStatus.EMERGENCY ? 'md:col-span-2' : ''}`}
                    >
                        <span className="text-lg">{option.label}</span>
                        <p className="font-normal text-sm text-white/80 mt-1">{option.description}</p>
                    </button>
                ))}
            </div>

            {/* Submit Button */}
            {selectedStatus && (
                <div className="mt-6">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedTeacherId || !selectedStatus || !userCoords || !reason || (reason === 'Other' && !customReason.trim())}
                        className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-400 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        Submit Status
                    </button>
                    {(!selectedTeacherId || !selectedStatus || !userCoords || !reason || (reason === 'Other' && !customReason.trim())) && (
                        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 text-center">
                            Please complete all required fields: Name, Location, Reason, and Status
                        </p>
                    )}
                </div>
            )}
             {lastSubmissionStatus && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg text-center">
                    <p className="font-semibold text-green-800 dark:text-green-200">Thank you! Your status has been updated.</p>
                </div>
            )}
        </div>
        
        <CommuteAdvisory summary={commuteSummary} loading={isCommuteSummaryLoading} />
        
        <StatusSummary 
          counts={pollCounts} 
          isMapVisible={isMapVisible}
          onToggleMap={() => setIsMapVisible(prev => !prev)} 
        />

        <WeatherBanner weatherData={weatherData} loading={isWeatherLoading} error={error} />

        {isMapVisible && <StatusMap locations={teacherLocations} />}

      </main>

      <footer className="w-full max-w-4xl mx-auto text-center mt-8 py-4">
        <button
          onClick={() => setIsPinModalOpen(true)}
          className="text-sm text-sky-600 dark:text-sky-400 hover:underline mb-4"
        >
            Admin Access
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">&copy; {new Date().getFullYear()} Academy Operations. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;