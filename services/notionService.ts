import type { Teacher } from '../types';

export const fetchTeachersFromNotion = async (): Promise<Teacher[]> => {
    try {
        // Use the current host but port 3001 for backend
        // This way it works both on localhost and network IP
        const hostname = window.location.hostname;
        const backendUrl = `http://${hostname}:3001/api/teachers`;

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
