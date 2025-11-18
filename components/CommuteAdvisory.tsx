import React from 'react';
import { SparklesIcon } from './icons';

interface CommuteAdvisoryProps {
    summary: string | null;
    loading: boolean;
}

const CommuteAdvisory: React.FC<CommuteAdvisoryProps> = ({ summary, loading }) => {
    if (loading) {
        return (
            <div className="w-full bg-sky-100 dark:bg-sky-900/50 p-4 rounded-xl mb-6 animate-pulse">
                <div className="h-4 bg-sky-200 dark:bg-sky-800 rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-sky-200 dark:bg-sky-800 rounded w-full mb-2"></div>
                <div className="h-3 bg-sky-200 dark:bg-sky-800 rounded w-4/5"></div>
            </div>
        );
    }

    if (!summary) {
        return null; // Don't render anything if there's no summary and it's not loading
    }

    return (
        <div className="w-full bg-sky-100 dark:bg-sky-900/50 p-4 rounded-xl mb-6 border border-sky-200 dark:border-sky-800">
            <div className="flex items-center gap-3 mb-2">
                <SparklesIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <h3 className="text-lg font-bold text-sky-800 dark:text-sky-200">AI Commute Advisory</h3>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300">
                {summary}
            </p>
        </div>
    );
};

export default CommuteAdvisory;
