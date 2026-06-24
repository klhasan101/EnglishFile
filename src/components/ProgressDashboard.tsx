'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BookOpen,
  CheckCircle,
  PenTool,
  Flame,
  Trophy,
  BarChart3,
  Loader2,
  X,
} from 'lucide-react';
import { getGlobalStats, getAllLessons, getAllProgress, type GlobalStats, type SavedLesson } from '@/utils/db';

interface ProgressDashboardProps {
  t: any;
  onClose: () => void;
}

export default function ProgressDashboard({ t, onClose }: ProgressDashboardProps) {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, l] = await Promise.all([getGlobalStats(), getAllLessons()]);
      setStats(s);
      setLessons(l);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">{t.statsLoading}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const vocabPercent = stats.totalVocabTotal > 0
    ? Math.round((stats.totalVocabCorrect / stats.totalVocabTotal) * 100)
    : 0;
  const grammarPercent = stats.totalGrammarTotal > 0
    ? Math.round((stats.totalGrammarCorrect / stats.totalGrammarTotal) * 100)
    : 0;
  const overallPercent = (stats.totalVocabTotal + stats.totalGrammarTotal) > 0
    ? Math.round(((stats.totalVocabCorrect + stats.totalGrammarCorrect) / (stats.totalVocabTotal + stats.totalGrammarTotal)) * 100)
    : 0;

  const levelEntries = Object.entries(stats.levelBreakdown);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-5 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <span>{t.statsTitle}</span>
          </h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">

          {/* Streak & Top Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<Flame className="w-5 h-5 text-orange-500" />}
              label={t.statsStreak}
              value={`${stats.currentStreak}`}
              subtext={`${t.statsLongest}: ${stats.longestStreak}`}
              bgClass="bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30"
            />
            <StatCard
              icon={<BookOpen className="w-5 h-5 text-indigo-500" />}
              label={t.statsLessonsGenerated}
              value={`${stats.totalLessonsGenerated}`}
              subtext={`${t.statsTotalLessons}`}
              bgClass="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30"
            />
            <StatCard
              icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
              label={t.statsOverallScore}
              value={`${overallPercent}%`}
              subtext={t.statsAverage}
              bgClass="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30"
            />
            <StatCard
              icon={<PenTool className="w-5 h-5 text-purple-500" />}
              label={t.statsWritingSubmitted}
              value={`${stats.totalWritingSubmissions}`}
              subtext={t.statsEssays}
              bgClass="bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30"
            />
          </div>

          {/* Skill Breakdown Bars */}
          <div className="bg-slate-50 dark:bg-slate-850/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              {t.statsSkillBreakdown}
            </h4>

            {/* Vocabulary Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold">{t.statsVocab}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.totalVocabCorrect}/{stats.totalVocabTotal} ({vocabPercent}%)
                </span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${vocabPercent}%` }}
                />
              </div>
            </div>

            {/* Grammar Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold">{t.statsGrammar}</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {stats.totalGrammarCorrect}/{stats.totalGrammarTotal} ({grammarPercent}%)
                </span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${grammarPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Level Breakdown */}
          {levelEntries.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-850/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                {t.statsLevelBreakdown}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {levelEntries.map(([level, data]) => (
                  <div
                    key={level}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center"
                  >
                    <div className="text-xs font-black text-indigo-700 dark:text-indigo-400">{level}</div>
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{data.lessons}</div>
                    <div className="text-[10px] text-slate-400">{t.statsLessonsLabel}</div>
                    {data.avgScore > 0 && (
                      <div className="text-[10px] font-bold text-emerald-600 mt-0.5">{data.avgScore}% {t.statsAvg}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {lessons.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-850/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {t.statsRecentActivity}
              </h4>
              <div className="space-y-2">
                {lessons.slice(0, 5).map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" dir="ltr">
                        {lesson.lessonTitle}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {lesson.levelCode} • {new Date(lesson.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      {lesson.vocabScore !== null && (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                          V: {lesson.vocabScore}/{lesson.vocabTotal}
                        </span>
                      )}
                      {lesson.grammarScore !== null && (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
                          G: {lesson.grammarScore}/{lesson.grammarTotal}
                        </span>
                      )}
                      {lesson.writingSubmitted && (
                        <span className="text-[10px] bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">
                          ✓ {t.statsWritten}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {stats.totalLessonsGenerated === 0 && (
            <div className="text-center py-8 space-y-3">
              <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.statsEmpty}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Small reusable stat card
function StatCard({
  icon,
  label,
  value,
  subtext,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  bgClass: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 text-center space-y-1 ${bgClass}`}>
      <div className="flex justify-center">{icon}</div>
      <div className="text-xl font-black text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="text-[9px] text-slate-400">{subtext}</div>
    </div>
  );
}
