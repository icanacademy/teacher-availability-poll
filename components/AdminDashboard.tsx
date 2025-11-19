import React, { useState } from 'react';
import type { PollSubmission, Teacher } from '../types';
import { PollStatus } from '../types';
import { EyeIcon, ExternalLinkIcon, SparklesIcon } from './icons';
import WeatherBanner from './WeatherBanner';
import { analyzeImage, analyzeVideo, summarizeSubmissions } from '../services/geminiService';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LessonPlanMaker } from './LessonPlanMaker';


interface AdminDashboardProps {
  submissions: PollSubmission[];
  teachers: Teacher[];
  setSubmissions: React.Dispatch<React.SetStateAction<PollSubmission[]>>;
}

const statusTextColors: Record<PollStatus, string> = {
    [PollStatus.AVAILABLE]: 'text-green-600 dark:text-green-400',
    [PollStatus.LATE]: 'text-yellow-600 dark:text-yellow-400',
    [PollStatus.ONLINE_ONLY]: 'text-blue-600 dark:text-blue-400',
    [PollStatus.UNAVAILABLE]: 'text-slate-600 dark:text-slate-400',
    [PollStatus.EMERGENCY]: 'text-red-600 dark:text-red-400',
};

const statusLabels: Record<PollStatus, string> = {
    [PollStatus.AVAILABLE]: 'Available',
    [PollStatus.LATE]: 'Late',
    [PollStatus.ONLINE_ONLY]: 'Online Only',
    [PollStatus.UNAVAILABLE]: 'Unavailable',
    [PollStatus.EMERGENCY]: 'Emergency',
};

const SubmissionDetailsModal: React.FC<{
    submission: PollSubmission;
    teacherName: string;
    onClose: () => void;
    onUpdateSubmission: (updatedSubmission: PollSubmission) => void;
}> = ({ submission, teacherName, onClose, onUpdateSubmission }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const handleAnalyzeMedia = async () => {
        setIsAnalyzing(true);
        setAnalysisError(null);
        try {
            let analysisResult = '';
            if (submission.teacherPhoto) {
                const base64Data = submission.teacherPhoto.split(',')[1];
                const mimeType = submission.teacherPhoto.match(/data:(.*);/)?.[1] || 'image/jpeg';
                analysisResult = await analyzeImage(base64Data, mimeType);
            } else if (submission.teacherVideo) {
                analysisResult = await analyzeVideo(submission.teacherVideo.data, submission.teacherVideo.mimeType);
            }
            
            const updatedSubmission = { ...submission, mediaAnalysis: analysisResult };
            onUpdateSubmission(updatedSubmission);

        } catch (error) {
            console.error(error);
            setAnalysisError('Failed to analyze media. Please try again.');
        } finally {
            setIsAnalyzing(false);
        }
    };


    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-slate-50 dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
                    <h3 className="text-lg font-bold">Submission Details</h3>
                    <button 
                        onClick={onClose} 
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-2xl"
                        aria-label="Close details modal"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-4 sm:p-6 space-y-6">
                    {/* General Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-white dark:bg-slate-800 p-4 rounded-lg">
                        <div>
                            <p className="font-semibold text-slate-500 dark:text-slate-400">Teacher</p>
                            <p className="text-slate-900 dark:text-slate-100 font-medium">{teacherName}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-500 dark:text-slate-400">Status</p>
                            <p className={`font-medium ${statusTextColors[submission.status]}`}>{statusLabels[submission.status]}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-slate-500 dark:text-slate-400">Timestamp</p>
                            <p className="text-slate-900 dark:text-slate-100">
                              {submission.timestamp.toLocaleString('en-US', {
                                timeZone: 'Asia/Manila',
                                dateStyle: 'medium',
                                timeStyle: 'medium'
                              })} PHT
                            </p>
                        </div>
                    </div>

                     {/* Teacher Provided Info */}
                    {(submission.reason || submission.teacherPhoto || submission.teacherVideo) && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                            <h4 className="font-bold mb-3 text-slate-800 dark:text-slate-200">Teacher-Provided Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {submission.reason && (
                                     <div>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Reason</p>
                                        <p className="text-slate-900 dark:text-slate-100">{submission.reason}</p>
                                    </div>
                                )}
                                {submission.teacherPhoto && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Uploaded Photo</p>
                                        <a href={submission.teacherPhoto} target="_blank" rel="noopener noreferrer">
                                            <img src={submission.teacherPhoto} alt={`Photo from ${teacherName}`} className="max-w-xs max-h-48 rounded-lg object-cover border border-slate-200 dark:border-slate-700" />
                                        </a>
                                    </div>
                                )}
                                {submission.teacherVideo && (
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">Uploaded Video</p>
                                        <video
                                            src={
                                                // Handle both Cloudinary URLs (new) and base64 data (old)
                                                submission.teacherVideo.data
                                                    ? `data:${submission.teacherVideo.mimeType};base64,${submission.teacherVideo.data}`
                                                    : submission.teacherVideo.mimeType // Cloudinary URL stored in mimeType field
                                            }
                                            controls
                                            className="max-w-xs max-h-48 rounded-lg border border-slate-200 dark:border-slate-700"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                     {/* AI Media Analysis */}
                     {(submission.teacherPhoto || submission.teacherVideo) && (
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                            <div className="flex items-center justify-between gap-4 mb-2">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">AI Media Analysis</h4>
                                {!submission.mediaAnalysis && (
                                    <button 
                                        onClick={handleAnalyzeMedia}
                                        disabled={isAnalyzing}
                                        className="flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        <SparklesIcon className="w-4 h-4" />
                                        {isAnalyzing ? 'Analyzing...' : 'Analyze Media'}
                                    </button>
                                )}
                            </div>
                            {submission.mediaAnalysis ? (
                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{submission.mediaAnalysis}</p>
                            ) : (
                                <p className="text-xs text-slate-500 dark:text-slate-400">Click "Analyze Media" to generate an AI summary of the photo/video.</p>
                            )}
                            {analysisError && <p className="text-red-500 text-sm mt-2">{analysisError}</p>}
                        </div>
                    )}

                     {/* Location */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                        <h4 className="font-bold mb-2 text-slate-800 dark:text-slate-200">Location</h4>
                        <a 
                          href={`https://www.google.com/maps?q=${submission.coords.lat},${submission.coords.lng}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:underline"
                        >
                            View on Google Maps <ExternalLinkIcon className="w-4 h-4" />
                        </a>
                    </div>
                    
                     {/* Weather Snapshot */}
                     <div>
                        <h4 className="font-bold mb-3 text-slate-800 dark:text-slate-200">Captured Environmental Data</h4>
                        <WeatherBanner weatherData={submission.weatherData} loading={false} error={null} />
                    </div>
                </div>
            </div>
        </div>
    );
};

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ submissions, teachers, setSubmissions }) => {
  const [selectedSubmission, setSelectedSubmission] = useState<PollSubmission | null>(null);
  const [overallSummary, setOverallSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'all'>('today');
  const [customDate, setCustomDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'latest' | 'all' | 'not-submitted'>('latest');

  const teacherMap = new Map(teachers.map(t => [t.id, t.name]));

  // Filter submissions by date
  const getFilteredSubmissions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (customDate) {
      const selected = new Date(customDate);
      const selectedDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
      const nextDay = new Date(selectedDay);
      nextDay.setDate(nextDay.getDate() + 1);
      return submissions.filter(s => {
        const subDate = new Date(s.timestamp);
        return subDate >= selectedDay && subDate < nextDay;
      });
    }

    switch (dateFilter) {
      case 'today':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return submissions.filter(s => {
          const subDate = new Date(s.timestamp);
          return subDate >= today && subDate < tomorrow;
        });

      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return submissions.filter(s => {
          const subDate = new Date(s.timestamp);
          return subDate >= yesterday && subDate < today;
        });

      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return submissions.filter(s => new Date(s.timestamp) >= weekAgo);

      case 'all':
      default:
        return submissions;
    }
  };

  const filteredSubmissions = getFilteredSubmissions();

  // Get latest submission per teacher from filtered submissions
  const getLatestSubmissionsPerTeacher = (subs: PollSubmission[]): PollSubmission[] => {
    const latestMap = new Map<string, PollSubmission>();
    subs.forEach(sub => {
      const existing = latestMap.get(sub.teacherId);
      if (!existing || sub.timestamp > existing.timestamp) {
        latestMap.set(sub.teacherId, sub);
      }
    });
    return Array.from(latestMap.values());
  };

  const latestSubmissions = getLatestSubmissionsPerTeacher(filteredSubmissions);

  // Get teachers who haven't submitted
  const submittedTeacherIds = new Set(latestSubmissions.map(sub => sub.teacherId));
  const notSubmittedTeachers = teachers.filter(t => !submittedTeacherIds.has(t.id));

  // Determine what to show based on view mode
  const displaySubmissions = viewMode === 'all'
    ? filteredSubmissions
    : viewMode === 'latest'
    ? latestSubmissions
    : []; // For 'not-submitted', we'll show teachers differently

  const deduplicatedSubmissions = displaySubmissions;

  // Academy location (Pasig City)
  const academyLat = 14.5764;
  const academyLng = 121.0851;

  const sortedSubmissions = [...deduplicatedSubmissions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Calculate analytics based on deduplicated submissions (latest per teacher)
  const analytics = {
    total: deduplicatedSubmissions.length,
    available: deduplicatedSubmissions.filter(s => s.status === PollStatus.AVAILABLE).length,
    late: deduplicatedSubmissions.filter(s => s.status === PollStatus.LATE).length,
    online: deduplicatedSubmissions.filter(s => s.status === PollStatus.ONLINE_ONLY).length,
    unavailable: deduplicatedSubmissions.filter(s => s.status === PollStatus.UNAVAILABLE).length,
    emergency: deduplicatedSubmissions.filter(s => s.status === PollStatus.EMERGENCY).length,
  };

  // Count how many teachers have multiple submissions
  const teacherSubmissionCounts = new Map<string, number>();
  filteredSubmissions.forEach(sub => {
    teacherSubmissionCounts.set(sub.teacherId, (teacherSubmissionCounts.get(sub.teacherId) || 0) + 1);
  });
  const teachersWithMultipleSubmissions = Array.from(teacherSubmissionCounts.values()).filter(count => count > 1).length;
  
  const handleGetSummary = async () => {
    setIsSummaryLoading(true);
    setSummaryError(null);
    try {
        const summary = await summarizeSubmissions(submissions, teachers);
        setOverallSummary(summary);
    } catch (error) {
        setSummaryError('Failed to generate summary. Please try again.');
    } finally {
        setIsSummaryLoading(false);
    }
  };

  const handleUpdateSubmission = (updatedSubmission: PollSubmission) => {
    setSubmissions(prev => prev.map(s => s.id === updatedSubmission.id ? updatedSubmission : s));
    setSelectedSubmission(updatedSubmission); 
  };


  const handleClearAllData = async () => {
    if (window.confirm('⚠️ WARNING: This will PERMANENTLY DELETE all submissions from the Notion database. This action CANNOT be undone. Are you absolutely sure?')) {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE_URL}/api/submissions`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Failed to delete submissions: ${errorData.error}`);
          return;
        }

        const result = await response.json();
        console.log(`Successfully deleted ${result.deletedCount} submissions`);

        // Clear local state
        setSubmissions([]);
        localStorage.removeItem('teacher_poll_submissions');
        setOverallSummary(null);

        alert(`Successfully deleted ${result.deletedCount} submissions from Notion database.`);
      } catch (error) {
        console.error('Error deleting submissions:', error);
        alert('Failed to delete submissions. Please try again.');
      }
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-md my-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Admin Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <button
              onClick={handleGetSummary}
              disabled={isSummaryLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-900 disabled:opacity-50"
          >
              <SparklesIcon className="w-4 h-4" />
              {isSummaryLoading ? 'Generating...' : 'Get AI Summary'}
          </button>
          <button
              onClick={handleClearAllData}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
          >
              Clear All Data
          </button>
        </div>
      </div>

      {/* Date Filter Section */}
      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Filter by Date</h3>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => { setDateFilter('today'); setCustomDate(''); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                dateFilter === 'today' && !customDate
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => { setDateFilter('yesterday'); setCustomDate(''); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                dateFilter === 'yesterday' && !customDate
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => { setDateFilter('week'); setCustomDate(''); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                dateFilter === 'week' && !customDate
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => { setDateFilter('all'); setCustomDate(''); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                dateFilter === 'all' && !customDate
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
              }`}
            >
              All Time
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 dark:text-slate-400">or pick a date:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Toggle for showing all submissions vs latest per teacher vs not submitted */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">View:</span>
              <button
                onClick={() => setViewMode('latest')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'latest'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
                }`}
              >
                Latest Only
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'all'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
                }`}
              >
                Full History
              </button>
              <button
                onClick={() => setViewMode('not-submitted')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  viewMode === 'not-submitted'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
                }`}
              >
                Not Submitted Yet
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {viewMode === 'all' ? (
              <>
                Showing all {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
                {teachersWithMultipleSubmissions > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {' '}({teachersWithMultipleSubmissions} teacher{teachersWithMultipleSubmissions !== 1 ? 's' : ''} with multiple submissions)
                  </span>
                )}
              </>
            ) : viewMode === 'latest' ? (
              <>
                Showing latest submission for {deduplicatedSubmissions.length} teacher{deduplicatedSubmissions.length !== 1 ? 's' : ''}
                {filteredSubmissions.length !== deduplicatedSubmissions.length && (
                  <span className="text-slate-400 dark:text-slate-500">
                    {' '}(hiding {filteredSubmissions.length - deduplicatedSubmissions.length} older submission{filteredSubmissions.length - deduplicatedSubmissions.length !== 1 ? 's' : ''})
                  </span>
                )}
              </>
            ) : (
              <>
                Showing {notSubmittedTeachers.length} teacher{notSubmittedTeachers.length !== 1 ? 's' : ''} who haven't submitted yet
              </>
            )}
            {customDate && ` for ${new Date(customDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
            {dateFilter === 'today' && !customDate && ' from today'}
            {dateFilter === 'yesterday' && !customDate && ' from yesterday'}
            {dateFilter === 'week' && !customDate && ' from the last 7 days'}
            {dateFilter === 'all' && !customDate && ' (all time)'}
          </p>
        </div>
      </div>

      {/* Analytics Cards - Only show for Latest and Full History views */}
      {viewMode !== 'not-submitted' && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-200 mt-1">{analytics.total}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {((analytics.total / teachers.length) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
          <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Available</p>
          <p className="text-3xl font-bold text-green-800 dark:text-green-300 mt-1">{analytics.available}</p>
          <p className="text-xs text-green-700 dark:text-green-400 mt-1">
            {((analytics.available / teachers.length) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase">Late</p>
          <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-300 mt-1">{analytics.late}</p>
          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
            {((analytics.late / teachers.length) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">Online</p>
          <p className="text-3xl font-bold text-blue-800 dark:text-blue-300 mt-1">{analytics.online}</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            {((analytics.online / teachers.length) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-600/30 dark:to-slate-700/30 p-4 rounded-lg border border-slate-300 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">Unavailable</p>
          <p className="text-3xl font-bold text-slate-700 dark:text-slate-300 mt-1">{analytics.unavailable}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {((analytics.unavailable / teachers.length) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 p-4 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase">Emergency</p>
          <p className="text-3xl font-bold text-red-800 dark:text-red-300 mt-1">{analytics.emergency}</p>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">
            {((analytics.emergency / teachers.length) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
      )}

      {/* Charts Section - Only show for Latest and Full History views */}
      {viewMode !== 'not-submitted' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Response Rate Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Response Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Responded', value: filteredSubmissions.length, color: '#10b981' },
                  { name: 'No Response', value: teachers.length - filteredSubmissions.length, color: '#94a3b8' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#94a3b8" />
              </Pie>
              <Tooltip formatter={(value: number) => `${value} teachers`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-4 text-sm text-slate-600 dark:text-slate-400">
            <p><strong>{filteredSubmissions.length}</strong> out of <strong>{teachers.length}</strong> teachers have responded</p>
            <p className="text-xs mt-1">({((filteredSubmissions.length / teachers.length) * 100).toFixed(1)}% response rate)</p>
          </div>
        </div>

        {/* Status Breakdown Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'Available', count: analytics.available, percentage: ((analytics.available / teachers.length) * 100).toFixed(1), fill: '#10b981' },
                { name: 'Late', count: analytics.late, percentage: ((analytics.late / teachers.length) * 100).toFixed(1), fill: '#f59e0b' },
                { name: 'Online', count: analytics.online, percentage: ((analytics.online / teachers.length) * 100).toFixed(1), fill: '#3b82f6' },
                { name: 'Unavailable', count: analytics.unavailable, percentage: ((analytics.unavailable / teachers.length) * 100).toFixed(1), fill: '#6b7280' },
                { name: 'Emergency', count: analytics.emergency, percentage: ((analytics.emergency / teachers.length) * 100).toFixed(1), fill: '#ef4444' },
                { name: 'No Response', count: teachers.length - filteredSubmissions.length, percentage: (((teachers.length - filteredSubmissions.length) / teachers.length) * 100).toFixed(1), fill: '#94a3b8' }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} teachers (${props.payload.percentage}%)`,
                  'Count'
                ]}
              />
              <Bar dataKey="count" fill="#8884d8">
                {[
                  { name: 'Available', fill: '#10b981' },
                  { name: 'Late', fill: '#f59e0b' },
                  { name: 'Online', fill: '#3b82f6' },
                  { name: 'Unavailable', fill: '#6b7280' },
                  { name: 'Emergency', fill: '#ef4444' },
                  { name: 'No Response', fill: '#94a3b8' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="text-center mt-4 text-xs text-slate-600 dark:text-slate-400">
            Percentages are based on total teacher count ({teachers.length} teachers)
          </div>
        </div>
      </div>
      )}

        {summaryError && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md mb-4 text-sm">{summaryError}</p>}
        {overallSummary && (
             <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg mb-6 prose prose-sm dark:prose-invert max-w-none">
                 <div dangerouslySetInnerHTML={{ __html: overallSummary.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            </div>
        )}

      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Submissions Data</h3>

       <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Teacher
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Time Submitted
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Location
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Distance from Academy
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {viewMode === 'not-submitted' ? (
              notSubmittedTeachers.length > 0 ? notSubmittedTeachers.map((teacher) => (
                <tr key={teacher.id} className="bg-slate-50 dark:bg-slate-900/50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                    {teacher.name}
                  </td>
                  <td colSpan={5} className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      No submission yet
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    All teachers have submitted! 🎉
                  </td>
                </tr>
              )
            ) : sortedSubmissions.length > 0 ? sortedSubmissions.map((sub) => {
              const distance = calculateDistance(academyLat, academyLng, sub.coords.lat, sub.coords.lng);
              return (
              <tr key={sub.id}>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                  <div className="flex items-center gap-2">
                    <span>{teacherMap.get(sub.teacherId) || 'Unknown Teacher'}</span>
                    {viewMode === 'all' && (teacherSubmissionCounts.get(sub.teacherId) || 0) > 1 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        {teacherSubmissionCounts.get(sub.teacherId)}× submitted
                      </span>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${statusTextColors[sub.status]}`}>
                  {statusLabels[sub.status]}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  {sub.timestamp.toLocaleString('en-US', {
                    timeZone: 'Asia/Manila',
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })} PHT
                </td>
                <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                  <a
                    href={`https://www.google.com/maps?q=${sub.coords.lat},${sub.coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 dark:text-sky-400 hover:underline truncate block"
                    title={`${sub.locationName || 'Unknown Location'} - View on Google Maps`}
                  >
                    {sub.locationName || 'Unknown Location'}
                  </a>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                  <span className={distance < 10 ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                    {distance.toFixed(1)} km
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setSelectedSubmission(sub)}
                    className="flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300"
                    aria-label={`View submission details for ${teacherMap.get(sub.teacherId)}`}
                  >
                    <EyeIcon className="w-4 h-4" />
                    Details
                  </button>
                </td>
              </tr>
            )}) : (
                <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">No submissions yet.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedSubmission && (
          <SubmissionDetailsModal
              submission={selectedSubmission}
              teacherName={teacherMap.get(selectedSubmission.teacherId) || 'Unknown Teacher'}
              onClose={() => setSelectedSubmission(null)}
              onUpdateSubmission={handleUpdateSubmission}
          />
      )}

      {/* Lesson Plan Maker - Add at the bottom */}
      <div className="mt-8">
        <LessonPlanMaker submissions={displaySubmissions} teachers={teachers} />
      </div>
    </div>
  );
};

export default AdminDashboard;