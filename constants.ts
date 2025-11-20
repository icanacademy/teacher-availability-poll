import { PollStatus } from './types';
import type { ReactNode } from 'react';

interface PollOption {
  status: PollStatus;
  label: string;
  description: string;
  style: string;
  selectedStyle: string;
}

export const POLL_OPTIONS: PollOption[] = [
  {
    status: PollStatus.AVAILABLE,
    label: 'Able to Come In',
    description: 'I will be present at the academy on time.',
    style: 'bg-green-600 hover:bg-green-700',
    selectedStyle: 'bg-green-700 ring-4 ring-green-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900',
  },
  {
    status: PollStatus.LATE,
    label: 'Coming In, but Late',
    description: 'I will be present, but I expect to be late.',
    style: 'bg-yellow-500 hover:bg-yellow-600',
    selectedStyle: 'bg-yellow-600 ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900',
  },
  {
    status: PollStatus.ONLINE_ONLY,
    label: 'Online Only',
    description: 'I am unable to come in but can conduct classes online.',
    style: 'bg-blue-600 hover:bg-blue-700',
    selectedStyle: 'bg-blue-700 ring-4 ring-blue-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900',
  },
  {
    status: PollStatus.UNAVAILABLE,
    label: 'Completely Unavailable',
    description: 'I cannot come in or conduct online classes.',
    style: 'bg-slate-500 hover:bg-slate-600',
    selectedStyle: 'bg-slate-600 ring-4 ring-slate-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900',
  },
  {
    status: PollStatus.EMERGENCY,
    label: 'Emergency',
    description: 'I am in an emergency and cannot answer the phone.',
    style: 'bg-red-600 hover:bg-red-700',
    selectedStyle: 'bg-red-700 ring-4 ring-red-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-900',
  },
];

export const REASON_OPTIONS = [
    // Available - No issues
    'Can have class',

    // Leave & Appointments
    'Official Leave',
    'Sick Leave',
    'Medical Appointment',
    'Family Emergency',
    'Personal Matter',

    // Weather-related
    'Flooding',
    'Extreme Rain',
    'Typhoon/Storm',
    'Extreme Wind',

    // Infrastructure Issues
    'Power Outage',
    'Internet Outage',
    'No Internet Connection',
    'Earthquake-related Issues',

    // Transportation
    'Transportation Issues',
    'Traffic/Road Closure',
    'Vehicle Breakdown',
    'No Available Transport',
    'Flight/Travel Delay',

    // Health
    'Feeling Unwell',
    'COVID-19 Related',
    'Self-Quarantine',

    // Home/Family
    'Childcare Issues',
    'Elder Care',
    'Home Emergency',
    'House Repair/Maintenance',

    // Work-related
    'Training/Seminar',
    'School Event',
    'Meeting Conflict',

    // Other
    'Other',
];