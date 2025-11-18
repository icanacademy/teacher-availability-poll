import type { Teacher } from '../types';

export const fetchTeachersFromNotion = async (): Promise<Teacher[]> => {
    try {
        // Use environment variable for production, fallback to localhost for development
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const backendUrl = `${API_BASE_URL}/api/teachers`;

        const response = await fetch(backendUrl);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Backend API error:', response.status, errorData);
            throw new Error(`Failed to fetch teachers: ${response.status}`);
        }

        const teachers: Teacher[] = await response.json();

        console.log(`✅ Successfully loaded ${teachers.length} active teachers from Notion`);
        return teachers;
    } catch (error) {
        console.error('Error fetching teachers:', error);
        throw new Error('Failed to load teacher list. Make sure the backend server is running.');
    }
};
