/**
 * IndexedDB Utility Layer for English File PWA
 * Stores: lessons, progress records, and global stats
 */

const DB_NAME = 'EnglishFileDB';
const DB_VERSION = 1;

// --- Types ---

export interface SavedLesson {
  id?: number;
  levelCode: string;
  levelLabel: string;
  lessonTitle: string;
  data: any; // Full Gemini lesson JSON
  createdAt: string; // ISO date
  vocabScore: number | null;
  vocabTotal: number | null;
  grammarScore: number | null;
  grammarTotal: number | null;
  writingSubmitted: boolean;
  writingFeedback: string | null;
}

export interface ProgressRecord {
  id?: number;
  lessonId: number;
  levelCode: string;
  type: 'vocab' | 'grammar' | 'writing';
  score: number;
  total: number;
  createdAt: string;
}

export interface GlobalStats {
  totalLessonsGenerated: number;
  totalLessonsCompleted: number;
  totalVocabCorrect: number;
  totalVocabTotal: number;
  totalGrammarCorrect: number;
  totalGrammarTotal: number;
  totalWritingSubmissions: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  levelBreakdown: Record<string, { lessons: number; avgScore: number }>;
}

// --- DB Open ---

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Lessons store
      if (!db.objectStoreNames.contains('lessons')) {
        const lessonsStore = db.createObjectStore('lessons', { keyPath: 'id', autoIncrement: true });
        lessonsStore.createIndex('levelCode', 'levelCode', { unique: false });
        lessonsStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Progress records store
      if (!db.objectStoreNames.contains('progress')) {
        const progressStore = db.createObjectStore('progress', { keyPath: 'id', autoIncrement: true });
        progressStore.createIndex('lessonId', 'lessonId', { unique: false });
        progressStore.createIndex('type', 'type', { unique: false });
        progressStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Global stats store (single record with key 'global')
      if (!db.objectStoreNames.contains('stats')) {
        db.createObjectStore('stats', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Lessons CRUD ---

export async function saveLesson(lesson: Omit<SavedLesson, 'id'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readwrite');
    const store = tx.objectStore('lessons');
    const request = store.add(lesson);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function updateLesson(lesson: SavedLesson): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readwrite');
    const store = tx.objectStore('lessons');
    const request = store.put(lesson);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLesson(id: number): Promise<SavedLesson | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readonly');
    const store = tx.objectStore('lessons');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllLessons(): Promise<SavedLesson[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readonly');
    const store = tx.objectStore('lessons');
    const request = store.getAll();
    request.onsuccess = () => {
      // Sort by createdAt descending (newest first)
      const results = (request.result as SavedLesson[]).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLesson(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('lessons', 'readwrite');
    const store = tx.objectStore('lessons');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- Progress Records ---

export async function addProgressRecord(record: Omit<ProgressRecord, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('progress', 'readwrite');
    const store = tx.objectStore('progress');
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProgress(): Promise<ProgressRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('progress', 'readonly');
    const store = tx.objectStore('progress');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as ProgressRecord[]);
    request.onerror = () => reject(request.error);
  });
}

// --- Global Stats ---

const DEFAULT_STATS: GlobalStats = {
  totalLessonsGenerated: 0,
  totalLessonsCompleted: 0,
  totalVocabCorrect: 0,
  totalVocabTotal: 0,
  totalGrammarCorrect: 0,
  totalGrammarTotal: 0,
  totalWritingSubmissions: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: '',
  levelBreakdown: {},
};

export async function getGlobalStats(): Promise<GlobalStats> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('stats', 'readonly');
    const store = tx.objectStore('stats');
    const request = store.get('global');
    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result.data as GlobalStats);
      } else {
        resolve({ ...DEFAULT_STATS });
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateGlobalStats(stats: GlobalStats): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('stats', 'readwrite');
    const store = tx.objectStore('stats');
    const request = store.put({ key: 'global', data: stats });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// --- High-Level Helper Functions ---

/**
 * Records a new lesson generation event and updates global stats + streak.
 */
export async function recordLessonGenerated(levelCode: string): Promise<void> {
  const stats = await getGlobalStats();
  stats.totalLessonsGenerated++;

  // Update streak logic
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  if (stats.lastActiveDate) {
    const lastDate = new Date(stats.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      stats.currentStreak++;
    } else if (diffDays > 1) {
      // Streak broken
      stats.currentStreak = 1;
    }
    // diffDays === 0 means same day, keep current streak
  } else {
    stats.currentStreak = 1;
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }
  stats.lastActiveDate = today;

  // Level breakdown
  if (!stats.levelBreakdown[levelCode]) {
    stats.levelBreakdown[levelCode] = { lessons: 0, avgScore: 0 };
  }
  stats.levelBreakdown[levelCode].lessons++;

  await updateGlobalStats(stats);
}

/**
 * Records a quiz/vocab score and updates the corresponding saved lesson + global stats.
 */
export async function recordScore(
  lessonId: number,
  levelCode: string,
  type: 'vocab' | 'grammar',
  score: number,
  total: number
): Promise<void> {
  // Add progress record
  await addProgressRecord({
    lessonId,
    levelCode,
    type,
    score,
    total,
    createdAt: new Date().toISOString(),
  });

  // Update global stats
  const stats = await getGlobalStats();
  if (type === 'vocab') {
    stats.totalVocabCorrect += score;
    stats.totalVocabTotal += total;
  } else {
    stats.totalGrammarCorrect += score;
    stats.totalGrammarTotal += total;
  }

  // Update level average score
  const allProgress = await getAllProgress();
  const levelProgress = allProgress.filter(p => p.levelCode === levelCode);
  if (levelProgress.length > 0) {
    const totalScore = levelProgress.reduce((sum, p) => sum + p.score, 0);
    const totalMax = levelProgress.reduce((sum, p) => sum + p.total, 0);
    stats.levelBreakdown[levelCode] = {
      ...stats.levelBreakdown[levelCode],
      avgScore: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
    };
  }

  await updateGlobalStats(stats);

  // Update saved lesson with score
  const lesson = await getLesson(lessonId);
  if (lesson) {
    if (type === 'vocab') {
      lesson.vocabScore = score;
      lesson.vocabTotal = total;
    } else {
      lesson.grammarScore = score;
      lesson.grammarTotal = total;
    }
    await updateLesson(lesson);
  }
}

/**
 * Records a writing submission with AI feedback and updates stats.
 */
export async function recordWritingSubmission(
  lessonId: number,
  feedback: string
): Promise<void> {
  const stats = await getGlobalStats();
  stats.totalWritingSubmissions++;
  await updateGlobalStats(stats);

  const lesson = await getLesson(lessonId);
  if (lesson) {
    lesson.writingSubmitted = true;
    lesson.writingFeedback = feedback;
    await updateLesson(lesson);
  }
}
