import React, { useState, useEffect } from 'react';
import { Teacher, PollSubmission } from '../types';

interface TeacherSchedule {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

interface Student {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  grade: string;
  status: string;
}

interface ClassAssignment {
  teacher: TeacherSchedule;
  students: Student[];
  shift: string;
  gradesMixed: string[];
  teacherStatus: string; // Teacher's availability status (Available, Late, Online Only)
}

interface LessonPlanMakerProps {
  submissions: PollSubmission[];
  teachers: Teacher[];
}

const TIME_SHIFTS = [
  { id: '8-10', label: '8:00 AM - 10:00 AM', start: 8, end: 10 },
  { id: '10-12', label: '10:00 AM - 12:00 PM', start: 10, end: 12 },
  { id: '1-3', label: '1:00 PM - 3:00 PM', start: 13, end: 15 },
  { id: '3-5', label: '3:00 PM - 5:00 PM', start: 15, end: 17 },
  { id: '5-7', label: '5:00 PM - 7:00 PM', start: 17, end: 19 },
  { id: '7-9', label: '7:00 PM - 9:00 PM', start: 19, end: 21 },
];

export const LessonPlanMaker: React.FC<LessonPlanMakerProps> = ({ submissions, teachers }) => {
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherSchedule[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendingStudents, setAttendingStudents] = useState<Set<string>>(new Set());
  const [lessonPlan, setLessonPlan] = useState<Map<string, ClassAssignment[]>>(new Map());
  const [activeTab, setActiveTab] = useState<string>('8-10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch teacher schedules and students from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        // Fetch teachers with schedules
        const teachersRes = await fetch(`${apiUrl}/api/teachers-schedules`);
        if (!teachersRes.ok) throw new Error('Failed to fetch teacher schedules');
        const teachersData = await teachersRes.json();
        setTeacherSchedules(teachersData);

        // Fetch students
        const studentsRes = await fetch(`${apiUrl}/api/students`);
        if (!studentsRes.ok) throw new Error('Failed to fetch students');
        const studentsData = await studentsRes.json();

        // Filter to only Active students
        const activeStudents = studentsData.filter((s: Student) => s.status === 'Active');
        setAllStudents(activeStudents);

        // Initialize all students as attending by default
        const allStudentIds = new Set(activeStudents.map((s: Student) => s.id));
        setAttendingStudents(allStudentIds);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Toggle student attendance
  const toggleStudentAttendance = (studentId: string) => {
    setAttendingStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Parse time string (e.g., "8:00 AM" or "8am") to 24-hour number
  const parseTime = (timeStr: string): number | null => {
    if (!timeStr) return null;

    const cleaned = timeStr.toLowerCase().trim();
    const match = cleaned.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);

    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2] || '0');
    const meridiem = match[3];

    if (meridiem === 'pm' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'am' && hours === 12) {
      hours = 0;
    }

    return hours + minutes / 60;
  };

  // Check if time ranges overlap (inclusive of boundary matches)
  const timesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    return start1 < end2 && start2 <= end1;
  };

  // Get available teachers for a shift with their status
  const getAvailableTeachers = (shift: typeof TIME_SHIFTS[0]): Array<{teacher: TeacherSchedule, status: string}> => {
    // Get today's latest submissions (deduplicated)
    const latestSubmissions = new Map<string, PollSubmission>();
    const today = new Date().toISOString().split('T')[0];

    console.log(`\n🔍 Debug for shift ${shift.label}:`);
    console.log(`📅 Today's date: ${today}`);
    console.log(`📊 Total submissions: ${submissions.length}`);

    const todaySubmissions = submissions
      .filter(sub => {
        // Handle both string and Date timestamp formats
        const timestampStr = typeof sub.timestamp === 'string'
          ? sub.timestamp
          : new Date(sub.timestamp).toISOString();
        const matches = timestampStr.startsWith(today);
        if (!matches) {
          console.log(`  ❌ Submission from ${sub.teacherName} (${sub.teacherId}) - timestamp ${timestampStr} doesn't match today`);
        }
        return matches;
      });

    console.log(`✅ Submissions matching today: ${todaySubmissions.length}`);

    todaySubmissions.forEach(sub => {
      const existing = latestSubmissions.get(sub.teacherId);
      if (!existing || sub.timestamp > existing.timestamp) {
        latestSubmissions.set(sub.teacherId, sub);
        console.log(`  ✓ ${sub.teacherName} (${sub.teacherId}) - Status: ${sub.status}`);
      }
    });

    console.log(`\n🎯 Filtering ${teacherSchedules.length} teachers for shift ${shift.label}:`);

    const availableTeachersWithStatus: Array<{teacher: TeacherSchedule, status: string}> = [];

    teacherSchedules.forEach(teacher => {
      // Check if teacher submitted today and is Available, Late, or Online Only
      const submission = latestSubmissions.get(teacher.id);
      if (!submission) {
        console.log(`  ❌ ${teacher.name} (${teacher.id}) - No submission today`);
        return;
      }

      // Check status - handle both formats (e.g., "Available" and "AVAILABLE")
      const normalizedStatus = submission.status.toUpperCase().replace(/\s+/g, '_');
      const allowedStatuses = ['AVAILABLE', 'LATE', 'ONLINE_ONLY'];

      if (!allowedStatuses.includes(normalizedStatus)) {
        console.log(`  ❌ ${teacher.name} - Has submission but status is "${submission.status}" (normalized: "${normalizedStatus}")`);
        return;
      }

      // Check if teacher's schedule overlaps with this shift
      const teacherStart = parseTime(teacher.startTime);
      const teacherEnd = parseTime(teacher.endTime);

      console.log(`  🔍 ${teacher.name} - Schedule: "${teacher.startTime}" to "${teacher.endTime}"`);
      console.log(`     Parsed: ${teacherStart} to ${teacherEnd} (shift: ${shift.start} to ${shift.end})`);

      if (teacherStart === null || teacherEnd === null) {
        console.log(`     ❌ Failed to parse time`);
        return;
      }

      const overlaps = timesOverlap(teacherStart, teacherEnd, shift.start, shift.end);
      console.log(`     ${overlaps ? '✅' : '❌'} Time overlap: ${overlaps} - Status: ${submission.status}`);

      if (overlaps) {
        availableTeachersWithStatus.push({ teacher, status: submission.status });
      }
    });

    return availableTeachersWithStatus;
  };

  // Get available students for a shift
  const getAvailableStudents = (shift: typeof TIME_SHIFTS[0]): Student[] => {
    return allStudents.filter(student => {
      // Check if student is marked as attending
      if (!attendingStudents.has(student.id)) return false;

      // Check if student's schedule overlaps with this shift
      const studentStart = parseTime(student.startTime);
      const studentEnd = parseTime(student.endTime);

      if (studentStart === null || studentEnd === null) return false;

      return timesOverlap(studentStart, studentEnd, shift.start, shift.end);
    });
  };

  // Group students by grade level
  const groupStudentsByGrade = (students: Student[]): Map<string, Student[]> => {
    const gradeMap = new Map<string, Student[]>();
    students.forEach(student => {
      const grade = student.grade || 'Unknown';
      if (!gradeMap.has(grade)) {
        gradeMap.set(grade, []);
      }
      gradeMap.get(grade)!.push(student);
    });
    return gradeMap;
  };

  // Check if grades can be mixed (within 3 levels)
  const canMixGrades = (grades: string[]): boolean => {
    const gradeNumbers = grades
      .map(g => parseInt(g.match(/\d+/)?.[0] || '0'))
      .filter(n => n > 0)
      .sort((a, b) => a - b);

    if (gradeNumbers.length === 0) return true;

    const range = gradeNumbers[gradeNumbers.length - 1] - gradeNumbers[0];
    return range <= 2; // 3 levels = 2 difference (e.g., Grade 1, 2, 3)
  };

  // Generate lesson plan for all shifts
  const generateLessonPlan = () => {
    console.log('🎯 Starting lesson plan generation...');
    console.log('📊 Total teachers:', teacherSchedules.length);
    console.log('👥 Total students:', allStudents.length);
    console.log('✅ Attending students:', attendingStudents.size);
    console.log('📝 Total submissions:', submissions.length);

    // Log attending students
    const attendingStudentsList = allStudents.filter(s => attendingStudents.has(s.id));
    console.log('\n👨‍🎓 Attending students list:');
    attendingStudentsList.forEach(s => {
      console.log(`  - ${s.name} (Grade ${s.grade}): ${s.startTime} to ${s.endTime}`);
    });

    const newPlan = new Map<string, ClassAssignment[]>();

    TIME_SHIFTS.forEach(shift => {
      const availableTeachers = getAvailableTeachers(shift);
      const availableStudents = getAvailableStudents(shift);
      const classes: ClassAssignment[] = [];

      console.log(`\n⏰ Shift ${shift.label}:`);
      console.log(`  Teachers available: ${availableTeachers.length}`);
      console.log(`  Students available: ${availableStudents.length}`);

      if (availableStudents.length > 0) {
        console.log(`  Students for this shift:`);
        availableStudents.forEach(s => {
          console.log(`    - ${s.name} (Grade ${s.grade})`);
        });
      }

      if (availableTeachers.length === 0 || availableStudents.length === 0) {
        newPlan.set(shift.id, classes);
        return;
      }

      // Group students by grade
      const gradeGroups = groupStudentsByGrade(availableStudents);
      const sortedGrades = Array.from(gradeGroups.keys()).sort();

      // Try to assign students to teachers
      let teacherIndex = 0;
      const unassignedStudents: Student[] = [];

      // First pass: Assign same-grade groups
      sortedGrades.forEach(grade => {
        const students = gradeGroups.get(grade)!;

        while (students.length > 0) {
          if (teacherIndex >= availableTeachers.length) {
            unassignedStudents.push(...students);
            break;
          }

          const classSize = Math.min(5, students.length);
          const classStudents = students.splice(0, classSize);

          classes.push({
            teacher: availableTeachers[teacherIndex].teacher,
            students: classStudents,
            shift: shift.label,
            gradesMixed: [grade],
            teacherStatus: availableTeachers[teacherIndex].status,
          });

          teacherIndex++;
        }
      });

      // Second pass: Try to assign remaining students by mixing grades (up to 3 levels)
      while (unassignedStudents.length > 0 && teacherIndex < availableTeachers.length) {
        const classStudents: Student[] = [];
        const gradesInClass: string[] = [];

        for (let i = unassignedStudents.length - 1; i >= 0 && classStudents.length < 5; i--) {
          const student = unassignedStudents[i];
          const testGrades = [...gradesInClass, student.grade];

          if (canMixGrades(testGrades)) {
            classStudents.push(student);
            if (!gradesInClass.includes(student.grade)) {
              gradesInClass.push(student.grade);
            }
            unassignedStudents.splice(i, 1);
          }
        }

        if (classStudents.length > 0) {
          classes.push({
            teacher: availableTeachers[teacherIndex].teacher,
            students: classStudents,
            shift: shift.label,
            gradesMixed: gradesInClass.sort(),
            teacherStatus: availableTeachers[teacherIndex].status,
          });
          teacherIndex++;
        } else {
          break; // Can't assign any more students
        }
      }

      console.log(`  Classes created: ${classes.length}`);

      // Calculate assigned students
      const assignedStudents = new Set<string>();
      classes.forEach(cls => {
        cls.students.forEach(s => assignedStudents.add(s.id));
      });

      const unassignedStudents = availableStudents.filter(s => !assignedStudents.has(s.id));

      console.log(`  📊 Summary:`);
      console.log(`    - Total students available: ${availableStudents.length}`);
      console.log(`    - Students assigned: ${assignedStudents.size}`);
      console.log(`    - Students WITHOUT teachers: ${unassignedStudents.length}`);

      if (unassignedStudents.length > 0) {
        console.log(`  ⚠️ Unassigned students (no teacher available):`);
        unassignedStudents.forEach(s => {
          console.log(`    - ${s.name} (Grade ${s.grade})`);
        });
      }

      if (classes.length > 0) {
        console.log(`  ✅ Class assignments:`);
        classes.forEach((cls, idx) => {
          const statusEmoji = cls.teacherStatus.toUpperCase().includes('ONLINE') ? '💻' : '🏫';
          console.log(`    Class ${idx + 1} - Teacher: ${cls.teacher.name} ${statusEmoji} [${cls.teacherStatus}]`);
          console.log(`      Students (${cls.students.length}):`);
          cls.students.forEach(s => console.log(`        - ${s.name}`));
        });
      }

      newPlan.set(shift.id, classes);
    });

    const totalClasses = Array.from(newPlan.values()).reduce((sum, classes) => sum + classes.length, 0);
    console.log(`\n✨ Lesson plan generated! Total classes: ${totalClasses}`);
    console.log(`📋 Plan size: ${newPlan.size} shifts`);

    setLessonPlan(newPlan);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600 dark:text-slate-400">Loading lesson plan maker...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow-md p-8 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 space-y-6">
      <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          📚 Lesson Plan Maker
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Generate class assignments for today's shifts based on teacher availability and student schedules
        </p>
      </div>

      {/* Step 1: Mark Student Attendance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Step 1: Mark Student Attendance
          </h3>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {attendingStudents.size} of {allStudents.length} students attending
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
          {allStudents.map(student => (
            <label
              key={student.id}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                attendingStudents.has(student.id)
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={attendingStudents.has(student.id)}
                onChange={() => toggleStudentAttendance(student.id)}
                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {student.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Grade {student.grade} • {student.startTime} - {student.endTime}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Step 2: Generate Lesson Plan */}
      <div className="flex items-center justify-center pt-4">
        <button
          onClick={generateLessonPlan}
          disabled={attendingStudents.size === 0}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Generate Lesson Plan
        </button>
      </div>

      {/* Lesson Plan Display */}
      {lessonPlan.size > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Generated Lesson Plan
          </h3>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2">
            {TIME_SHIFTS.map(shift => {
              const classes = lessonPlan.get(shift.id) || [];
              const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

              return (
                <button
                  key={shift.id}
                  onClick={() => setActiveTab(shift.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === shift.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <div className="text-sm">{shift.label}</div>
                  <div className="text-xs opacity-80">
                    {classes.length} classes • {totalStudents} students
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Tab Content */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 space-y-4">
            {(() => {
              const classes = lessonPlan.get(activeTab) || [];
              const shift = TIME_SHIFTS.find(s => s.id === activeTab)!;

              if (classes.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No classes scheduled for {shift.label}
                  </div>
                );
              }

              return classes.map((classItem, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-md font-semibold text-slate-900 dark:text-white">
                        Class {index + 1}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        Teacher: <span className="font-medium">{classItem.teacher.name}</span>
                        {classItem.teacherStatus.toUpperCase().includes('ONLINE') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            💻 Online Only
                          </span>
                        )}
                        {classItem.teacherStatus.toUpperCase().includes('LATE') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            ⏰ Late
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">
                        Grades: {classItem.gradesMixed.join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {classItem.students.length} students
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {classItem.students.map(student => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded text-sm"
                      >
                        <span className="text-slate-900 dark:text-white">{student.name}</span>
                        <span className="text-slate-600 dark:text-slate-400">Grade {student.grade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
