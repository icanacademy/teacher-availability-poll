import React, { useState, useEffect } from 'react';
import { Teacher, PollSubmission } from '../types';
import { generateEmergencyLessonPlan, type GeneratedLessonPlan } from '../services/geminiService';
import jsPDF from 'jspdf';

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

// Helper to normalize old flat lesson plan structure to new nested structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeLessonPlan = (plan: any): GeneratedLessonPlan | null => {
  if (!plan) return null;

  // Check if it's already in the new format
  if (plan.firstBlock && plan.secondBlock) {
    return plan as GeneratedLessonPlan;
  }

  // Convert old flat format to new nested format
  if (plan.warmUp && plan.mainActivity && plan.practiceActivity && plan.coolDown) {
    return {
      title: plan.title,
      objective: plan.objective,
      materials: plan.materials,
      firstBlock: {
        warmUp: plan.warmUp,
        mainActivity: plan.mainActivity,
      },
      secondBlock: {
        practiceActivity: plan.practiceActivity,
        coolDown: plan.coolDown,
      },
      adaptations: plan.adaptations,
      emergencyNotes: plan.emergencyNotes,
    };
  }

  return plan as GeneratedLessonPlan;
};

export const LessonPlanMaker: React.FC<LessonPlanMakerProps> = ({ submissions, teachers }) => {
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherSchedule[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [attendingStudents, setAttendingStudents] = useState<Set<string>>(new Set());
  const [lessonPlan, setLessonPlan] = useState<Map<string, ClassAssignment[]>>(new Map());
  const [selfStudyStudents, setSelfStudyStudents] = useState<Map<string, Student[]>>(new Map());
  const [activeTab, setActiveTab] = useState<string>('8-10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Lesson Plan state - key is "shiftId-classIndex"
  const [generatedPlans, setGeneratedPlans] = useState<Map<string, GeneratedLessonPlan>>(new Map());
  const [generatingPlan, setGeneratingPlan] = useState<Set<string>>(new Set());
  const [planErrors, setPlanErrors] = useState<Map<string, string>>(new Map());
  const [savedPlanKeys, setSavedPlanKeys] = useState<Map<string, string>>(new Map()); // maps planKey to "saved" status
  const [loadedFromNotion, setLoadedFromNotion] = useState<Set<string>>(new Set()); // tracks which plans were loaded from Notion

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

  // Check if time ranges overlap (teacher must be working DURING the shift)
  const timesOverlap = (start1: number, end1: number, start2: number, end2: number): boolean => {
    return start1 < end2 && start2 < end1;
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
    const newSelfStudy = new Map<string, Student[]>();

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

      if (availableStudents.length === 0) {
        // No students for this shift
        newPlan.set(shift.id, classes);
        newSelfStudy.set(shift.id, []);
        return;
      }

      if (availableTeachers.length === 0) {
        // Students available but no teachers - all go to self study
        console.log(`  📖 No teachers available - all ${availableStudents.length} students go to Self Study`);
        newPlan.set(shift.id, classes);
        newSelfStudy.set(shift.id, availableStudents);
        return;
      }

      // Calculate distribution with max 5 students per teacher
      const MAX_CLASS_SIZE = 5;
      const numTeachers = availableTeachers.length;
      const numStudents = availableStudents.length;
      const maxCapacity = numTeachers * MAX_CLASS_SIZE;

      // Helper function to get grade number for sorting
      const getGradeNum = (grade: string): number => {
        const g = grade?.toLowerCase().trim() || '';
        if (g === 'kindergarten' || g === 'kinder' || g === 'k' || g === 'pre-k' || g === 'prek') return 0;
        if (g === 'adult' || g === 'university' || g === '' || g === '0') return 99; // Adults go last
        return parseInt(g) || 99;
      };

      // EFFICIENCY-FIRST ALGORITHM
      // Priority 1: Never mix children with adults
      // Priority 2: Fill classes to capacity (5 students) = maximize teacher efficiency
      // Priority 3: Minimize grade spread within filled classes
      // Priority 4: Only split if grade spread > 5 grades

      // Step 1: Separate adults from children
      const children: Student[] = [];
      const adults: Student[] = [];

      availableStudents.forEach(student => {
        if (getGradeNum(student.grade) === 99) {
          adults.push(student);
        } else {
          children.push(student);
        }
      });

      // Step 2: Sort children by grade
      children.sort((a, b) => getGradeNum(a.grade) - getGradeNum(b.grade));

      console.log(`  📚 Children: ${children.length}, Adults: ${adults.length}`);
      if (children.length > 0) {
        const grades = children.map(s => s.grade);
        console.log(`  📊 Children grades: ${grades.join(', ')}`);
      }

      // Step 2.5: Find natural grade clusters (split where grade jumps by 3+)
      const MAX_GRADE_GAP = 2; // Maximum gap within a cluster
      const childClusters: Student[][] = [];

      if (children.length > 0) {
        let currentCluster: Student[] = [children[0]];

        for (let i = 1; i < children.length; i++) {
          const prevGrade = getGradeNum(children[i - 1].grade);
          const currGrade = getGradeNum(children[i].grade);
          const gap = currGrade - prevGrade;

          if (gap > MAX_GRADE_GAP) {
            // Big gap - start new cluster
            childClusters.push(currentCluster);
            currentCluster = [children[i]];
          } else {
            // Same cluster
            currentCluster.push(children[i]);
          }
        }
        // Don't forget the last cluster
        if (currentCluster.length > 0) {
          childClusters.push(currentCluster);
        }
      }

      console.log(`  📊 Found ${childClusters.length} natural grade clusters`);
      childClusters.forEach((cluster, i) => {
        const grades = [...new Set(cluster.map(s => s.grade))].sort((a, b) => getGradeNum(a) - getGradeNum(b));
        console.log(`    Cluster ${i + 1}: ${cluster.length} students, grades ${grades.join(', ')}`);
      });

      // Step 3: Allocate teachers to maximize student coverage (minimize self-study)

      // Calculate MINIMUM classes needed - respecting natural clusters
      let minClassesForChildren = 0;
      childClusters.forEach(cluster => {
        minClassesForChildren += Math.ceil(cluster.length / MAX_CLASS_SIZE);
      });
      const minClassesForAdults = adults.length > 0 ? Math.ceil(adults.length / MAX_CLASS_SIZE) : 0;
      const totalMinClasses = minClassesForChildren + minClassesForAdults;

      // Allocate teachers: use ALL available teachers to cover students
      let teachersForChildren = 0;
      let teachersForAdults = 0;

      if (numTeachers >= totalMinClasses) {
        // We have enough or extra teachers - distribute proportionally
        teachersForChildren = minClassesForChildren;
        teachersForAdults = minClassesForAdults;

        // Distribute extra teachers to reduce class sizes
        let extraTeachers = numTeachers - totalMinClasses;
        while (extraTeachers > 0) {
          // Give extra teacher to whichever group has more students per class
          const childrenPerClass = teachersForChildren > 0 ? children.length / teachersForChildren : 0;
          const adultsPerClass = teachersForAdults > 0 ? adults.length / teachersForAdults : 0;

          if (childrenPerClass >= adultsPerClass && children.length > 0) {
            teachersForChildren++;
          } else if (adults.length > 0) {
            teachersForAdults++;
          } else {
            break; // No more students to distribute
          }
          extraTeachers--;
        }
      } else {
        // Not enough teachers - prioritize covering all students
        // Distribute proportionally based on student counts
        const totalStudents = children.length + adults.length;
        if (totalStudents > 0) {
          teachersForChildren = Math.round((children.length / totalStudents) * numTeachers);
          teachersForAdults = numTeachers - teachersForChildren;

          // Ensure at least 1 teacher per group if they have students
          if (children.length > 0 && teachersForChildren === 0 && numTeachers > 0) {
            teachersForChildren = 1;
            teachersForAdults = numTeachers - 1;
          }
          if (adults.length > 0 && teachersForAdults === 0 && numTeachers > 1) {
            teachersForAdults = 1;
            teachersForChildren = numTeachers - 1;
          }
        }
      }

      console.log(`  📋 Teacher allocation: ${teachersForChildren} for children, ${teachersForAdults} for adults`);

      let teacherIdx = 0;

      // Step 4: Distribute children by clusters (respecting natural grade groups)
      if (childClusters.length > 0 && teachersForChildren > 0) {
        // Calculate how many teachers each cluster needs
        const clusterTeachers: number[] = childClusters.map(cluster =>
          Math.ceil(cluster.length / MAX_CLASS_SIZE)
        );

        // If we have extra teachers, distribute them to larger clusters
        let totalAllocated = clusterTeachers.reduce((a, b) => a + b, 0);
        let extraTeachers = teachersForChildren - totalAllocated;

        while (extraTeachers > 0) {
          // Give extra teacher to cluster with most students per teacher
          let maxRatio = 0;
          let maxIdx = 0;
          for (let i = 0; i < childClusters.length; i++) {
            const ratio = childClusters[i].length / clusterTeachers[i];
            if (ratio > maxRatio) {
              maxRatio = ratio;
              maxIdx = i;
            }
          }
          clusterTeachers[maxIdx]++;
          extraTeachers--;
        }

        // Create classes for each cluster
        childClusters.forEach((cluster, clusterIdx) => {
          const numTeachersForCluster = clusterTeachers[clusterIdx];
          const baseSize = Math.floor(cluster.length / numTeachersForCluster);
          const extras = cluster.length % numTeachersForCluster;

          let studentIdx = 0;
          for (let i = 0; i < numTeachersForCluster && teacherIdx < numTeachers; i++) {
            const classSize = baseSize + (i < extras ? 1 : 0);
            if (classSize === 0) continue;

            const classStudents = cluster.slice(studentIdx, studentIdx + classSize);
            studentIdx += classSize;

            const gradesInClass = [...new Set(classStudents.map(s => s.grade))].sort((a, b) =>
              getGradeNum(a) - getGradeNum(b)
            );

            classes.push({
              teacher: availableTeachers[teacherIdx].teacher,
              students: classStudents,
              shift: shift.label,
              gradesMixed: gradesInClass,
              teacherStatus: availableTeachers[teacherIdx].status,
            });

            teacherIdx++;
          }
        });

        console.log(`  ✅ Created ${teacherIdx} classes for ${children.length} children across ${childClusters.length} clusters`);
      }

      // Step 5: Distribute adults to their allocated teachers
      if (adults.length > 0 && teachersForAdults > 0) {
        const baseSize = Math.floor(adults.length / teachersForAdults);
        const extras = adults.length % teachersForAdults;

        let adultIdx = 0;
        for (let classNum = 0; classNum < teachersForAdults && teacherIdx < numTeachers; classNum++) {
          const classSize = baseSize + (classNum < extras ? 1 : 0);
          if (classSize === 0) continue;

          const classStudents = adults.slice(adultIdx, adultIdx + classSize);
          adultIdx += classSize;

          const gradesInClass = [...new Set(classStudents.map(s => s.grade))].sort();

          classes.push({
            teacher: availableTeachers[teacherIdx].teacher,
            students: classStudents,
            shift: shift.label,
            gradesMixed: gradesInClass,
            teacherStatus: availableTeachers[teacherIdx].status,
          });

          teacherIdx++;
        }

        console.log(`  ✅ Created ${teachersForAdults} classes for ${adults.length} adults`);
      }

      console.log(`  Classes created: ${classes.length}`);

      // Calculate assigned students
      const assignedStudents = new Set<string>();
      classes.forEach(cls => {
        cls.students.forEach(s => assignedStudents.add(s.id));
      });

      const remainingUnassigned = availableStudents.filter(s => !assignedStudents.has(s.id));

      console.log(`  📊 Summary:`);
      console.log(`    - Total students available: ${availableStudents.length}`);
      console.log(`    - Students assigned: ${assignedStudents.size}`);
      console.log(`    - Students WITHOUT teachers: ${remainingUnassigned.length}`);

      if (remainingUnassigned.length > 0) {
        console.log(`  ⚠️ Unassigned students (no teacher available):`);
        remainingUnassigned.forEach(s => {
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

      // Track self-study students (those without teachers)
      newSelfStudy.set(shift.id, remainingUnassigned);

      newPlan.set(shift.id, classes);
    });

    const totalClasses = Array.from(newPlan.values()).reduce((sum, classes) => sum + classes.length, 0);
    const totalSelfStudy = Array.from(newSelfStudy.values()).reduce((sum, students) => sum + students.length, 0);
    console.log(`\n✨ Lesson plan generated! Total classes: ${totalClasses}`);
    console.log(`📋 Plan size: ${newPlan.size} shifts`);
    console.log(`📖 Self-study students: ${totalSelfStudy}`);

    setLessonPlan(newPlan);
    setSelfStudyStudents(newSelfStudy);
  };

  // Generate AI lesson plan for a specific class
  const generateAILessonPlan = async (shiftId: string, classIndex: number, classItem: ClassAssignment) => {
    const planKey = `${shiftId}-${classIndex}`;

    // Set loading state
    setGeneratingPlan(prev => new Set(prev).add(planKey));
    setPlanErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(planKey);
      return newMap;
    });

    try {
      const isOnline = classItem.teacherStatus.toUpperCase().includes('ONLINE');

      const plan = await generateEmergencyLessonPlan({
        grades: classItem.gradesMixed,
        numStudents: classItem.students.length,
        shiftDuration: classItem.shift,
        isOnline,
        teacherName: classItem.teacher.name,
      });

      setGeneratedPlans(prev => {
        const newMap = new Map(prev);
        newMap.set(planKey, plan);
        return newMap;
      });

      // Remove from "loaded from Notion" since this is a new generation
      setLoadedFromNotion(prev => {
        const newSet = new Set(prev);
        newSet.delete(planKey);
        return newSet;
      });

      // Auto-save to Notion
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const today = new Date().toISOString().split('T')[0];

        const saveResponse = await fetch(`${apiUrl}/api/lesson-plans`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: today,
            shift: classItem.shift,
            teacherName: classItem.teacher.name,
            teacherId: classItem.teacher.id,
            students: classItem.students.map(s => ({ name: s.name, grade: s.grade })),
            lessonPlan: plan,
            isOnline
          })
        });

        if (saveResponse.ok) {
          const saveData = await saveResponse.json();
          setSavedPlanKeys(prev => {
            const newMap = new Map(prev);
            newMap.set(planKey, saveData.planKey);
            return newMap;
          });
          console.log('✅ Lesson plan saved to Notion:', saveData.planKey);
        } else {
          console.warn('⚠️ Failed to save lesson plan to Notion (will still work locally)');
        }
      } catch (saveErr) {
        console.warn('⚠️ Could not save to Notion:', saveErr);
        // Don't fail the whole operation - plan is still generated
      }
    } catch (err) {
      console.error('Error generating lesson plan:', err);
      setPlanErrors(prev => {
        const newMap = new Map(prev);
        newMap.set(planKey, err instanceof Error ? err.message : 'Failed to generate lesson plan');
        return newMap;
      });
    } finally {
      setGeneratingPlan(prev => {
        const newSet = new Set(prev);
        newSet.delete(planKey);
        return newSet;
      });
    }
  };

  // Load existing lesson plans from Notion for today
  const loadExistingPlans = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const today = new Date().toISOString().split('T')[0];

      const response = await fetch(`${apiUrl}/api/lesson-plans?date=${today}`);
      if (!response.ok) {
        console.warn('Could not load existing lesson plans');
        return;
      }

      const existingPlans = await response.json();
      console.log(`📖 Found ${existingPlans.length} existing lesson plans for today`);

      // Map plans to class assignments
      const classes = lessonPlan.get(activeTab) || [];
      classes.forEach((classItem, index) => {
        const matchingPlan = existingPlans.find(
          (p: { teacherId: string; shift: string }) => p.teacherId === classItem.teacher.id && p.shift === classItem.shift
        );

        if (matchingPlan && matchingPlan.lessonPlan) {
          const planKey = `${activeTab}-${index}`;
          setGeneratedPlans(prev => {
            const newMap = new Map(prev);
            newMap.set(planKey, matchingPlan.lessonPlan);
            return newMap;
          });
          setLoadedFromNotion(prev => new Set(prev).add(planKey));
          setSavedPlanKeys(prev => {
            const newMap = new Map(prev);
            newMap.set(planKey, matchingPlan.planKey);
            return newMap;
          });
          console.log(`✅ Loaded existing plan for ${classItem.teacher.name} - ${classItem.shift}`);
        }
      });
    } catch (err) {
      console.warn('Could not load existing lesson plans:', err);
    }
  };

  // Load existing plans when lesson plan is generated
  useEffect(() => {
    if (lessonPlan.size > 0) {
      loadExistingPlans();
    }
  }, [lessonPlan, activeTab]);

  // Download lesson plan as PDF
  const downloadLessonPlanPDF = (classItem: ClassAssignment, plan: GeneratedLessonPlan) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let yPos = 20;

    // Helper to strip Korean/non-Latin characters (jsPDF default font doesn't support them)
    const stripNonLatin = (text: string): string => {
      // Remove Korean characters in brackets [한글] and any other non-Latin chars
      return text
        .replace(/\s*\[[^\]]*[\u3131-\uD79D][^\]]*\]/g, '') // Remove [Korean text]
        .replace(/[\u3131-\uD79D]/g, '') // Remove any remaining Korean chars
        .trim();
    };

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 7): number => {
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + lines.length * lineHeight;
    };

    // Helper to check and add new page if needed
    const checkPageBreak = (requiredSpace: number): void => {
      if (yPos + requiredSpace > 280) {
        doc.addPage();
        yPos = 20;
      }
    };

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ICAN Academy', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(16);
    doc.text('Emergency Lesson Plan', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Date and Shift Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Date: ${today}`, margin, yPos);
    yPos += 6;
    doc.text(`Shift: ${classItem.shift}`, margin, yPos);
    yPos += 6;

    const deliveryMode = classItem.teacherStatus.toUpperCase().includes('ONLINE') ? 'Online' : 'In-Person';
    doc.text(`Delivery Mode: ${deliveryMode}`, margin, yPos);
    yPos += 10;

    // Teacher Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Teacher:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(stripNonLatin(classItem.teacher.name), margin + 25, yPos);
    yPos += 10;

    // Students List
    doc.setFont('helvetica', 'bold');
    doc.text(`Students (${classItem.students.length}):`, margin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    classItem.students.forEach((student, i) => {
      checkPageBreak(6);
      doc.text(`${i + 1}. ${stripNonLatin(student.name)} (Grade ${student.grade})`, margin + 5, yPos);
      yPos += 5;
    });
    yPos += 5;

    // Lesson Plan Title
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    yPos = addWrappedText(plan.title, margin, yPos, contentWidth);
    yPos += 3;

    // Objective
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Objective:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    yPos = addWrappedText(plan.objective, margin, yPos, contentWidth, 5);
    yPos += 5;

    // Materials
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.text('Materials Needed:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    plan.materials.forEach(material => {
      checkPageBreak(5);
      yPos = addWrappedText(`• ${material}`, margin + 3, yPos, contentWidth - 3, 5);
    });
    yPos += 5;

    // Activities - First Block (50 min)
    const firstBlockActivities = [
      { name: 'WARM UP', duration: plan.firstBlock.warmUp.duration, content: plan.firstBlock.warmUp.activity },
      { name: 'MAIN ACTIVITY', duration: plan.firstBlock.mainActivity.duration, content: plan.firstBlock.mainActivity.activity, steps: plan.firstBlock.mainActivity.steps },
    ];

    // First Block Header
    checkPageBreak(15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34); // Forest green
    doc.text('FIRST BLOCK (50 minutes)', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    firstBlockActivities.forEach(activity => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.text(`${activity.name} (${activity.duration})`, margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      yPos = addWrappedText(activity.content, margin, yPos, contentWidth, 5);
      if (activity.steps) {
        activity.steps.forEach(step => {
          checkPageBreak(5);
          yPos = addWrappedText(`• ${step}`, margin + 3, yPos, contentWidth - 3, 5);
        });
      }
      yPos += 5;
    });

    // Break indicator
    checkPageBreak(15);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(128, 128, 128);
    doc.text('--- 10 MINUTE BREAK ---', pageWidth / 2, yPos, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos += 10;

    // Second Block Header
    checkPageBreak(15);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(70, 130, 180); // Steel blue
    doc.text('SECOND BLOCK (50 minutes)', margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 8;

    // Activities - Second Block (50 min)
    const secondBlockActivities = [
      { name: 'PRACTICE', duration: plan.secondBlock.practiceActivity.duration, content: plan.secondBlock.practiceActivity.activity },
      { name: 'COOL DOWN', duration: plan.secondBlock.coolDown.duration, content: plan.secondBlock.coolDown.activity },
    ];

    secondBlockActivities.forEach(activity => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.text(`${activity.name} (${activity.duration})`, margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      yPos = addWrappedText(activity.content, margin, yPos, contentWidth, 5);
      yPos += 5;
    });

    // Adaptations
    if (plan.adaptations.length > 0) {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Adaptations:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      plan.adaptations.forEach(adaptation => {
        checkPageBreak(6);
        yPos = addWrappedText(`• ${adaptation}`, margin + 3, yPos, contentWidth - 3, 5);
      });
      yPos += 5;
    }

    // Emergency Notes
    checkPageBreak(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Emergency Notes:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    yPos = addWrappedText(plan.emergencyNotes, margin, yPos, contentWidth, 5);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Generated by NOAH's Ark - Page ${i} of ${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      );
    }

    // Save the PDF
    const fileName = `LessonPlan_${classItem.teacher.name.replace(/\s+/g, '_')}_${classItem.shift.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
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
              const selfStudy = selfStudyStudents.get(activeTab) || [];
              const shift = TIME_SHIFTS.find(s => s.id === activeTab)!;

              if (classes.length === 0 && selfStudy.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    No classes scheduled for {shift.label}
                  </div>
                );
              }

              return (
                <>
                  {classes.map((classItem, index) => {
                    const planKey = `${activeTab}-${index}`;
                    const generatedPlan = normalizeLessonPlan(generatedPlans.get(planKey));
                    const isGenerating = generatingPlan.has(planKey);
                    const planError = planErrors.get(planKey);

                    return (
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

                      {/* AI Lesson Plan Section */}
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        {!generatedPlan && !isGenerating && (
                          <button
                            onClick={() => generateAILessonPlan(activeTab, index, classItem)}
                            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            <span>✨</span>
                            Generate AI Lesson Plan
                          </button>
                        )}

                        {isGenerating && (
                          <div className="flex items-center justify-center gap-2 py-3 text-purple-600 dark:text-purple-400">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                            <span className="text-sm font-medium">Generating lesson plan...</span>
                          </div>
                        )}

                        {planError && (
                          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                            {planError}
                            <button
                              onClick={() => generateAILessonPlan(activeTab, index, classItem)}
                              className="ml-2 underline hover:no-underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {generatedPlan && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                  <span>✨</span>
                                  AI-Generated Lesson Plan
                                </h5>
                                {loadedFromNotion.has(planKey) && (
                                  <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded">
                                    📂 Loaded from saved
                                  </span>
                                )}
                                {savedPlanKeys.has(planKey) && !loadedFromNotion.has(planKey) && (
                                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded">
                                    ✅ Saved
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => downloadLessonPlanPDF(classItem, generatedPlan)}
                                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md flex items-center gap-1"
                                >
                                  <span>📄</span>
                                  Download PDF
                                </button>
                                <button
                                  onClick={() => generateAILessonPlan(activeTab, index, classItem)}
                                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                  Regenerate
                                </button>
                              </div>
                            </div>

                            {/* Lesson Plan Title & Objective */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                              <h6 className="font-semibold text-purple-900 dark:text-purple-100">
                                {generatedPlan.title}
                              </h6>
                              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                <strong>Objective:</strong> {generatedPlan.objective}
                              </p>
                            </div>

                            {/* Materials */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                              <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                📦 Materials Needed
                              </h6>
                              <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                {generatedPlan.materials.map((material, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-slate-400">•</span>
                                    {material}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Activities Timeline */}
                            <div className="space-y-3">
                              {/* First Block Header */}
                              <div className="text-center">
                                <span className="inline-block bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-semibold px-3 py-1 rounded-full">
                                  FIRST BLOCK (50 minutes)
                                </span>
                              </div>

                              {/* Warm Up */}
                              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <h6 className="text-sm font-semibold text-green-700 dark:text-green-300">
                                    🌅 Warm Up
                                  </h6>
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    {generatedPlan.firstBlock.warmUp.duration}
                                  </span>
                                </div>
                                <p className="text-sm text-green-800 dark:text-green-200">
                                  {generatedPlan.firstBlock.warmUp.activity}
                                </p>
                              </div>

                              {/* Main Activity */}
                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <h6 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    📚 Main Activity: {generatedPlan.firstBlock.mainActivity.activity}
                                  </h6>
                                  <span className="text-xs text-blue-600 dark:text-blue-400">
                                    {generatedPlan.firstBlock.mainActivity.duration}
                                  </span>
                                </div>
                                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 ml-4 list-decimal">
                                  {generatedPlan.firstBlock.mainActivity.steps.map((step, i) => (
                                    <li key={i}>{step}</li>
                                  ))}
                                </ol>
                              </div>

                              {/* Break Indicator */}
                              <div className="text-center py-2">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="h-px bg-slate-300 dark:bg-slate-600 flex-1"></div>
                                  <span className="text-sm text-slate-500 dark:text-slate-400 font-medium px-2">
                                    ☕ 10 MINUTE BREAK
                                  </span>
                                  <div className="h-px bg-slate-300 dark:bg-slate-600 flex-1"></div>
                                </div>
                              </div>

                              {/* Second Block Header */}
                              <div className="text-center">
                                <span className="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1 rounded-full">
                                  SECOND BLOCK (50 minutes)
                                </span>
                              </div>

                              {/* Practice Activity */}
                              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <h6 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                                    ✏️ Practice
                                  </h6>
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                    {generatedPlan.secondBlock.practiceActivity.duration}
                                  </span>
                                </div>
                                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                  {generatedPlan.secondBlock.practiceActivity.activity}
                                </p>
                              </div>

                              {/* Cool Down */}
                              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <h6 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                    🌙 Cool Down
                                  </h6>
                                  <span className="text-xs text-indigo-600 dark:text-indigo-400">
                                    {generatedPlan.secondBlock.coolDown.duration}
                                  </span>
                                </div>
                                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                                  {generatedPlan.secondBlock.coolDown.activity}
                                </p>
                              </div>
                            </div>

                            {/* Adaptations */}
                            {generatedPlan.adaptations.length > 0 && (
                              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
                                <h6 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                  🔄 Adaptations
                                </h6>
                                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                  {generatedPlan.adaptations.map((adaptation, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-slate-400">•</span>
                                      {adaptation}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Emergency Notes */}
                            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                              <h6 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">
                                ⚠️ Emergency Notes
                              </h6>
                              <p className="text-sm text-red-800 dark:text-red-200">
                                {generatedPlan.emergencyNotes}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                  })}

                  {/* Self Study Section - Students without teachers */}
                  {selfStudy.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-md font-semibold text-amber-900 dark:text-amber-200">
                            📖 Self Study
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            No teacher available - students to study independently
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Grades: {[...new Set(selfStudy.map(s => s.grade))].sort().join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                            {selfStudy.length} students
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {selfStudy.map(student => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between px-3 py-2 bg-amber-100/50 dark:bg-amber-900/30 rounded text-sm"
                          >
                            <span className="text-amber-900 dark:text-amber-100">{student.name}</span>
                            <span className="text-amber-700 dark:text-amber-300">Grade {student.grade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
