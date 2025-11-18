import React from 'react';
import type { PollCounts } from '../types';
import { PollStatus } from '../types';
import { UsersIcon, MapIcon } from './icons';

interface StatusSummaryProps {
    counts: PollCounts;
    onToggleMap: () => void;
    isMapVisible: boolean;
}

const statusLabels: Record<PollStatus, string> = {
    [PollStatus.AVAILABLE]: 'Available',
    [PollStatus.LATE]: 'Late',
    [PollStatus.ONLINE_ONLY]: 'Online Only',
    [PollStatus.UNAVAILABLE]: 'Unavailable',
    [PollStatus.EMERGENCY]: 'Emergency',
};

const statusColors: Record<PollStatus, string> = {
    [PollStatus.AVAILABLE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [PollStatus.LATE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [PollStatus.ONLINE_ONLY]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    [PollStatus.UNAVAILABLE]: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    [PollStatus.EMERGENCY]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

const StatusSummary: React.FC<StatusSummaryProps> = ({ counts, onToggleMap, isMapVisible }) => {
    // FIX: Explicitly type the parameters of the reduce function to prevent type inference issues where `sum` and `count` might be treated as `unknown`.
    const total = Object.values(counts).reduce((sum: number, count: number) => sum + count, 0);

    return (
        <div className="w-full bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-md mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <UsersIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Live Status Summary</h2>
                    <span className="hidden sm:inline text-sm font-semibold text-slate-500 dark:text-slate-400">({total} total responses)</span>
                </div>
                <button
                    onClick={onToggleMap}
                    className="flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition-colors px-3 py-2 rounded-md bg-sky-100/50 dark:bg-sky-900/50 hover:bg-sky-100 dark:hover:bg-sky-900"
                >
                    <MapIcon className="w-4 h-4" />
                    <span>{isMapVisible ? 'Hide Map' : 'View on Map'}</span>
                </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
                {(Object.keys(counts) as Array<keyof typeof counts>).map((status) => (
                    <div key={status} className={`p-3 rounded-lg ${statusColors[status]}`}>
                        <div className="text-2xl font-bold">{counts[status]}</div>
                        <div className="text-xs font-semibold uppercase tracking-wider">{statusLabels[status]}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusSummary;