import { GoogleGenAI, Type } from "@google/genai";
import type { WeatherData, PollSubmission, Teacher, WeatherLocationData } from '../types';

const getAI = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log('🔑 Checking API key availability:', apiKey ? 'API key found' : 'API key MISSING');
    if (!apiKey) {
        console.error('❌ VITE_GEMINI_API_KEY not found in import.meta.env');
        console.log('Available env vars:', Object.keys(import.meta.env));
        throw new Error("VITE_GEMINI_API_KEY environment variable not set");
    }
    console.log('✅ Creating GoogleGenAI instance');
    return new GoogleGenAI({ apiKey });
};

// Helper function to get location name from coordinates using reverse geocoding
const getLocationName = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
    const data = await response.json();
    return data.display_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  } catch (error) {
    console.error('Error getting location name:', error);
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }
};

// Helper function to get recent earthquakes from USGS
const getRecentEarthquake = async (lat: number, lon: number) => {
  try {
    // Get earthquakes in the last 7 days within 500km radius
    const response = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&latitude=${lat}&longitude=${lon}&maxradiuskm=500&orderby=time&limit=1`
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const quake = data.features[0];
      const magnitude = quake.properties.mag;
      const location = quake.properties.place;
      const time = new Date(quake.properties.time);
      const now = new Date();
      const hoursAgo = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));

      // Calculate distance from location
      const quakeLat = quake.geometry.coordinates[1];
      const quakeLon = quake.geometry.coordinates[0];
      const R = 6371; // Earth's radius in km
      const dLat = (quakeLat - lat) * Math.PI / 180;
      const dLon = (quakeLon - lon) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat * Math.PI / 180) * Math.cos(quakeLat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      return {
        intensity: `Magnitude ${magnitude.toFixed(1)}`,
        time_ago: hoursAgo < 1 ? 'Less than 1 hour ago' : `${hoursAgo} hours ago`,
        location: location,
        distance: `Approx. ${Math.round(distance)} km away`
      };
    }
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
  }

  return {
    intensity: "No significant activity",
    time_ago: "N/A",
    location: "N/A",
    distance: "N/A"
  };
};

// Weather condition code mapping for Open-Meteo
const getWeatherCondition = (code: number): string => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  return 'Thunderstorms';
};

const fetchWeatherForecast = async (lat: number, lon: number): Promise<WeatherData> => {
  console.log('🌤️ Fetching weather from Open-Meteo API...');

  try {
    // Pasig City coordinates
    const pasigLat = 14.5764;
    const pasigLon = 121.0851;

    // Fetch weather for both locations in parallel
    const [userWeatherResponse, officeWeatherResponse, userLocationName, officeLocationName, userEarthquake, officeEarthquake] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,weather_code&timezone=Asia/Manila&forecast_days=1`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pasigLat}&longitude=${pasigLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,uv_index&hourly=temperature_2m,weather_code&timezone=Asia/Manila&forecast_days=1`),
      getLocationName(lat, lon),
      getLocationName(pasigLat, pasigLon),
      getRecentEarthquake(lat, lon),
      getRecentEarthquake(pasigLat, pasigLon)
    ]);

    const userWeather = await userWeatherResponse.json();
    const officeWeather = await officeWeatherResponse.json();

    console.log('✅ Weather data received from Open-Meteo');

    // Helper to format UV index
    const getUVDescription = (uv: number): string => {
      if (uv < 3) return `${uv.toFixed(1)} (Low)`;
      if (uv < 6) return `${uv.toFixed(1)} (Moderate)`;
      if (uv < 8) return `${uv.toFixed(1)} (High)`;
      if (uv < 11) return `${uv.toFixed(1)} (Very High)`;
      return `${uv.toFixed(1)} (Extreme)`;
    };

    // Helper to get rainfall alert based on precipitation
    const getRainfallAlert = (precip: number): string => {
      if (precip === 0) return 'No alert';
      if (precip < 7.5) return 'Light rain';
      if (precip < 15) return 'Moderate rain';
      if (precip < 30) return 'Heavy rain - Yellow Warning';
      if (precip < 50) return 'Intense rain - Orange Warning';
      return 'Torrential rain - Red Warning';
    };

    // Helper to get wind signal
    const getWindSignal = (windSpeed: number): string => {
      if (windSpeed < 39) return 'No signal';
      if (windSpeed < 62) return 'Signal No. 1';
      if (windSpeed < 88) return 'Signal No. 2';
      if (windSpeed < 118) return 'Signal No. 3';
      if (windSpeed < 185) return 'Signal No. 4';
      return 'Signal No. 5';
    };

    // Get current hour index
    const now = new Date();
    const currentHour = now.getHours();

    // Build hourly forecast (next 4 hours)
    const buildHourlyForecast = (hourlyData: any) => {
      const forecasts = [];
      for (let i = 0; i < 4; i++) {
        const hourIndex = currentHour + i + 1;
        if (hourIndex < 24) {
          const hour = hourIndex % 12 || 12;
          const period = hourIndex >= 12 ? 'PM' : 'AM';
          forecasts.push({
            time: `${hour} ${period}`,
            temperature: `${Math.round(hourlyData.temperature_2m[hourIndex])}°C`,
            condition: getWeatherCondition(hourlyData.weather_code[hourIndex])
          });
        }
      }
      return forecasts;
    };

    const weatherData: WeatherData = {
      user_location: {
        location_name: userLocationName,
        temperature: `${Math.round(userWeather.current.temperature_2m)}°C`,
        feels_like: `${Math.round(userWeather.current.apparent_temperature)}°C`,
        humidity: `${userWeather.current.relative_humidity_2m}%`,
        uv_index: getUVDescription(userWeather.current.uv_index),
        wind_signal: getWindSignal(userWeather.current.wind_speed_10m),
        rainfall_alert: getRainfallAlert(userWeather.current.precipitation),
        hourly_forecast: buildHourlyForecast(userWeather.hourly),
        earthquake: userEarthquake
      },
      pasig_city: {
        location_name: "Strata 100 Building, Ortigas Center, Pasig City",
        temperature: `${Math.round(officeWeather.current.temperature_2m)}°C`,
        feels_like: `${Math.round(officeWeather.current.apparent_temperature)}°C`,
        humidity: `${officeWeather.current.relative_humidity_2m}%`,
        uv_index: getUVDescription(officeWeather.current.uv_index),
        wind_signal: getWindSignal(officeWeather.current.wind_speed_10m),
        rainfall_alert: getRainfallAlert(officeWeather.current.precipitation),
        hourly_forecast: buildHourlyForecast(officeWeather.hourly),
        earthquake: officeEarthquake
      }
    };

    console.log('✅ Weather data processed successfully');
    return weatherData;
  } catch (error) {
    console.error("❌ Error fetching weather forecast from Open-Meteo:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw new Error(`Failed to fetch weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const analyzeImage = async (base64Image: string, mimeType: string): Promise<string> => {
    const ai = getAI();
    const imagePart = {
        inlineData: {
            mimeType,
            data: base64Image,
        },
    };
    const textPart = {
        text: "Analyze this image from a teacher reporting their work availability. Describe the scene, identify potential hazards (like flooding, damage, etc.), and assess the general situation in one or two sentences."
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing image with Gemini API:", error);
        throw new Error("Failed to analyze image.");
    }
};

const analyzeVideo = async (base64Video: string, mimeType: string): Promise<string> => {
    const ai = getAI();
    const videoPart = {
        inlineData: {
            mimeType,
            data: base64Video,
        },
    };
    const textPart = {
        text: "This video was uploaded by a teacher reporting their work availability. Analyze the key frames to describe the scene, identify potential hazards (like flooding, damage, strong winds, etc.), and assess the general situation in one or two sentences."
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using Pro for video understanding
            contents: { parts: [videoPart, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error analyzing video with Gemini API:", error);
        throw new Error("Failed to analyze video.");
    }
};


const summarizeSubmissions = async (submissions: PollSubmission[], teachers: Teacher[]): Promise<string> => {
    const ai = getAI();
    const teacherMap = new Map(teachers.map(t => [t.id, t.name]));
    const relevantData = submissions.map(s => ({
        teacherName: teacherMap.get(s.teacherId) || 'Unknown',
        status: s.status,
        reason: s.reason || 'No reason provided',
        location: s.weatherData.user_location.location_name,
        timestamp: s.timestamp.toLocaleTimeString(),
    }));

    const prompt = `
        You are an operations manager for an academy. Here's some important context about our operations: The office prioritizes holding classes whenever possible. Our classes are mostly one-on-one. If a teacher is absent and a substitute cannot be found, we have the option to group students with another available teacher.

        Analyze the following JSON data of teacher availability statuses for the day.
        
        Data:
        ${JSON.stringify(relevantData, null, 2)}

        Provide a concise, action-oriented summary formatted in Markdown. The summary must include:
        1.  **Overall Outlook**: A one-sentence overview of the day's situation.
        2.  **Urgent Attention**: A bulleted list of all teachers in 'EMERGENCY' or 'UNAVAILABLE' status, including their name and reason. If none, state "No teachers require urgent attention."
        3.  **Potential Issues**: Identify any geographical patterns or clusters of similar reasons (e.g., 'Several teachers in Quezon City report flooding').
        4.  **Operational Plan**: A brief, numbered list of 2-3 key recommendations for the day's operations, considering our context. For example, suggest which classes might need to be grouped, which teachers to contact about substituting, and how many online vs. in-person classes to prepare for.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using Pro for better reasoning and summarization
            contents: prompt,
        });
        return response.text;
    } catch(error) {
        console.error("Error summarizing submissions with Gemini API:", error);
        throw new Error("Failed to generate summary.");
    }
};

const analyzeSituationWithMaps = async (lat: number, lng: number, reason: string): Promise<string> => {
    const ai = getAI();
    const prompt = `A teacher is at latitude ${lat}, longitude ${lng} and has reported an issue: '${reason}'. Using your available tools, find relevant, real-time information that could help them. Look for nearby emergency shelters, hospitals, major road closures, and any official advisories for that specific area. Present this as a concise list of helpful information, including names, addresses, and links if available. Format the output as clean Markdown.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{googleMaps: {}}],
            },
        });
         console.log(response.candidates?.[0]?.groundingMetadata?.groundingChunks);
        return response.text;
    } catch(error) {
        console.error("Error analyzing situation with Gemini API and Maps:", error);
        throw new Error("Failed to generate situational analysis.");
    }
};

const getCommuteAnalysis = async (userWeather: WeatherLocationData, officeWeather: WeatherLocationData): Promise<string> => {
    const ai = getAI();
    const prompt = `
        You are a helpful commute advisor. Here is the environmental data for a teacher's location and their office:

        **Teacher's Location Data:**
        - Location: ${userWeather.location_name}
        - Wind: ${userWeather.wind_signal}
        - Rainfall: ${userWeather.rainfall_alert}
        - Earthquake: ${userWeather.earthquake.intensity} (${userWeather.earthquake.time_ago}) at ${userWeather.earthquake.location}

        **Office Location Data (Pasig City):**
        - Wind: ${officeWeather.wind_signal}
        - Rainfall: ${officeWeather.rainfall_alert}
        - Earthquake: ${officeWeather.earthquake.intensity} (${officeWeather.earthquake.time_ago}) at ${officeWeather.earthquake.location}

        Based on this information, provide a concise (2-3 sentences) AI-powered commute advisory for the teacher. Highlight potential issues like flooding from heavy rain or transportation difficulties. Start with a clear recommendation, e.g., "Expect major delays," "Travel with caution," or "Commute appears clear."
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating commute analysis with Gemini API:", error);
        throw new Error("Failed to generate commute analysis.");
    }
}


interface LessonPlanRequest {
    grades: string[];
    numStudents: number;
    shiftDuration: string;
    isOnline: boolean;
    teacherName: string;
}

interface GeneratedLessonPlan {
    title: string;
    objective: string;
    materials: string[];
    firstBlock: {
        warmUp: {
            duration: string;
            activity: string;
        };
        mainActivity: {
            duration: string;
            activity: string;
            steps: string[];
        };
    };
    secondBlock: {
        practiceActivity: {
            duration: string;
            activity: string;
        };
        coolDown: {
            duration: string;
            activity: string;
        };
    };
    adaptations: string[];
    emergencyNotes: string;
}

const generateEmergencyLessonPlan = async (request: LessonPlanRequest): Promise<GeneratedLessonPlan> => {
    const ai = getAI();

    const gradeDescription = request.grades.length === 1
        ? `Grade ${request.grades[0]}`
        : `mixed grades: ${request.grades.join(', ')}`;

    const deliveryMode = request.isOnline ? 'ONLINE (virtual classroom)' : 'IN-PERSON';

    // Determine age group and language level based on grades
    const getAgeAndLevel = (grades: string[]): { ageGroup: string; languageLevel: string; interests: string } => {
        const numericGrades = grades.map(g => parseInt(g) || 0).filter(g => g > 0);
        const hasAdults = grades.some(g => g.toLowerCase() === 'adult' || g.toLowerCase() === 'university');

        if (hasAdults || numericGrades.length === 0) {
            return {
                ageGroup: 'Adults (18+)',
                languageLevel: 'Intermediate to Advanced',
                interests: 'career, travel, current events, practical life skills'
            };
        }

        const avgGrade = numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length;

        if (avgGrade <= 3) {
            return {
                ageGroup: 'Young children (6-9 years old)',
                languageLevel: 'Beginner - focus on basic vocabulary, simple sentences, and phonics',
                interests: 'animals, colors, family, toys, games, songs, stories'
            };
        } else if (avgGrade <= 6) {
            return {
                ageGroup: 'Children (10-12 years old)',
                languageLevel: 'Elementary - focus on building vocabulary, basic grammar, reading short texts',
                interests: 'sports, hobbies, friends, school life, cartoons, simple stories'
            };
        } else if (avgGrade <= 9) {
            return {
                ageGroup: 'Teenagers (13-15 years old)',
                languageLevel: 'Pre-Intermediate - focus on conversation, grammar structures, reading comprehension',
                interests: 'social media, music, movies, technology, games, peer relationships'
            };
        } else {
            return {
                ageGroup: 'Older teenagers (16-18 years old)',
                languageLevel: 'Intermediate - focus on fluency, complex grammar, academic writing',
                interests: 'future careers, university, social issues, entertainment, independence'
            };
        }
    };

    const { ageGroup, languageLevel, interests } = getAgeAndLevel(request.grades);

    const prompt = `
        You are an experienced ESL/English language teacher creating an EMERGENCY lesson plan for ${request.teacherName}'s class.

        **Class Details:**
        - Grade Levels: ${gradeDescription}
        - Age Group: ${ageGroup}
        - Language Level: ${languageLevel}
        - Number of Students: ${request.numStudents}
        - Duration: 2 hours (${request.shiftDuration})
        - Delivery Mode: ${deliveryMode}

        **CLASS FLOW STRUCTURE (VERY IMPORTANT):**
        The 2-hour class follows this exact flow:
        1. FIRST BLOCK (50 minutes total):
           - Warm Up: 10 minutes
           - Main Activity: 40 minutes
        2. BREAK: 10 minutes (students rest)
        3. SECOND BLOCK (50 minutes total):
           - Practice Activity: 40 minutes
           - Cool Down: 10 minutes
        4. END OF CLASS

        **CRITICAL - Age-Appropriate Content:**
        - Topics and vocabulary MUST be appropriate for ${ageGroup}
        - Use themes related to: ${interests}
        - Language complexity should match ${languageLevel}
        - For young children: use lots of visuals, songs, TPR (Total Physical Response), games
        - For teenagers: use relatable topics, group discussions, technology-friendly activities
        - For adults: use practical real-world scenarios, professional contexts

        **Important Context:**
        - This is an EMERGENCY class - the teacher may not have prepared materials
        - Focus on engaging, practical activities that require MINIMAL preparation
        - Materials should be commonly available (paper, pens, whiteboard, internet if online)
        - Activities should work for the specific grade levels and mixed-age groups if applicable
        - For online classes, suggest activities that work well in virtual settings

        Create a complete, actionable lesson plan. Return ONLY valid JSON matching this structure:
        {
            "title": "Short engaging title for the lesson",
            "objective": "Clear learning objective in one sentence",
            "materials": ["List of 3-5 simple materials needed"],
            "firstBlock": {
                "warmUp": {
                    "duration": "10 minutes",
                    "activity": "Engaging warm-up activity description"
                },
                "mainActivity": {
                    "duration": "40 minutes",
                    "activity": "Main activity name",
                    "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
                }
            },
            "secondBlock": {
                "practiceActivity": {
                    "duration": "40 minutes",
                    "activity": "Practice/reinforcement activity description"
                },
                "coolDown": {
                    "duration": "10 minutes",
                    "activity": "Wrap-up activity and review"
                }
            },
            "adaptations": ["How to adapt for younger students", "How to adapt for older students"],
            "emergencyNotes": "Quick tips for the teacher if things don't go as planned"
        }

        Make the activities fun, educational, and appropriate for ESL learners. Focus on speaking, listening, reading, or writing skills.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text.trim();
        const lessonPlan = JSON.parse(text) as GeneratedLessonPlan;
        return lessonPlan;
    } catch (error) {
        console.error("Error generating lesson plan with Gemini API:", error);
        throw new Error("Failed to generate lesson plan.");
    }
};

export { fetchWeatherForecast, analyzeImage, analyzeVideo, summarizeSubmissions, analyzeSituationWithMaps, getCommuteAnalysis, generateEmergencyLessonPlan };
export type { LessonPlanRequest, GeneratedLessonPlan };