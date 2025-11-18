import React, { useEffect, useRef } from 'react';
import { PollStatus, Location } from '../types';

declare var L: any; // Use Leaflet from global scope

interface StatusMapProps {
    locations: Location[];
}

const statusMapColors: Record<PollStatus, string> = {
    [PollStatus.AVAILABLE]: 'bg-green-500',
    [PollStatus.LATE]: 'bg-yellow-500',
    [PollStatus.ONLINE_ONLY]: 'bg-blue-500',
    [PollStatus.UNAVAILABLE]: 'bg-slate-500',
    [PollStatus.EMERGENCY]: 'bg-red-500',
};

const statusLabels: Record<PollStatus, string> = {
    [PollStatus.AVAILABLE]: 'Available',
    [PollStatus.LATE]: 'Late',
    [PollStatus.ONLINE_ONLY]: 'Online Only',
    [PollStatus.UNAVAILABLE]: 'Unavailable',
    [PollStatus.EMERGENCY]: 'Emergency',
};

const OfficeIcon = L.divIcon({
    html: `<div class="w-6 h-6 bg-slate-800 dark:bg-white rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white dark:text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6"/><path d="M15 5.108a9 9 0 0 1 4.5 8.324"/><path d="M2 16V10a10 10 0 0 1 8-9.95"/><path d="M12 2v20"/><path d="M12 12h-2a4 4 0 0 0-4 4v3"/><path d="M18 12h2a4 4 0 0 1 4 4v3"/></svg>
           </div>`,
    className: '', // Tailwind classes are in the HTML, so no extra class needed here.
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const StatusMap: React.FC<StatusMapProps> = ({ locations }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const OFFICE_LOCATION: [number, number] = [14.5898, 121.0594]; // Strata 100 Building

    useEffect(() => {
        if (!mapContainerRef.current || typeof L === 'undefined') return;

        // Initialize map only once
        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current).setView([14.6, 121.05], 11); // Center on Metro Manila
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            mapInstanceRef.current = map;

             // Add office marker
            L.marker(OFFICE_LOCATION, { icon: OfficeIcon, zIndexOffset: 1000 })
                .addTo(map)
                .bindPopup('<b>Office Location</b><br>Strata 100 Building');
        }

        // Cleanup previous teacher markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Add new teacher markers
        locations.forEach(loc => {
            const colorClass = statusMapColors[loc.status];
            const icon = L.divIcon({
                html: `<div class="w-3 h-3 ${colorClass} rounded-full ring-2 ring-white/75"></div>`,
                className: '',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            const marker = L.marker([loc.position.lat, loc.position.lng], { icon })
                .addTo(mapInstanceRef.current)
                .bindPopup(`<b>${loc.teacherName}</b><br>${statusLabels[loc.status]}`);
            
            markersRef.current.push(marker);
        });
        
        // Cleanup function on component unmount
        return () => {
             if (mapInstanceRef.current) {
                // This check prevents an error if the component is unmounted before the map is created.
                // In a strict dev environment, this could be called multiple times.
                // A full cleanup would be `mapInstanceRef.current.remove()` but that can cause issues with hot-reloading.
                // Clearing markers is sufficient for this app's lifecycle.
                 markersRef.current.forEach(marker => marker.remove());
            }
        };
    }, [locations]);

    return (
        <div className="w-full bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-md mb-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Approximate Teacher Locations (Live Map)</h3>
            <div 
                ref={mapContainerRef} 
                className="h-80 md:h-96 w-full rounded-lg z-0"
                aria-label="Map showing teacher locations"
            ></div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-xs">
                {Object.entries(statusLabels).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusMapColors[status as PollStatus]}`} />
                        <span className="text-slate-600 dark:text-slate-400">{label}</span>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-slate-800 dark:bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-800" />
                    </div>
                    <span className="text-slate-600 dark:text-slate-400">Office</span>
                </div>
            </div>
        </div>
    );
};

export default StatusMap;
