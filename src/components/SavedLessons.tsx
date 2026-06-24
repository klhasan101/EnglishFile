'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Trash2,
  Clock,
  ChevronRight,
  Loader2,
  X,
  Archive,
  CheckCircle,
} from 'lucide-react';
import { getAllLessons, deleteLesson, type SavedLesson } from '@/utils/db';

interface SavedLessonsProps {
  t: any;
  onClose: () => void;
  onLoadLesson: (lesson: SavedLesson) => void;
}

export default function SavedLessons({ t, onClose, onLoadLesson }: SavedLessonsProps) {
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      const data = await getAllLessons();
      setLessons(data);
    } catch (e) {
      console.error('Failed to load saved lessons:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteLesson(id);
      setLessons(prev => prev.filter(l => l.id !== id));
    } catch (e) {
      console.error('Failed to delete lesson:', e);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Archive className="w-5 h-5" />
            <span>{t.savedTitle}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Archive className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.savedEmpty}</p>
            </div>
          ) : (
            lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-slate-50 dark:bg-slate-850/30 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
              >
                {/* Lesson Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {lesson.levelCode}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(lesson.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate font-sans" dir="ltr">
                      {lesson.lessonTitle}
                    </h4>
                  </div>
                </div>

                {/* Score badges */}
                <div className="flex flex-wrap gap-1.5">
                  {lesson.vocabScore !== null && (
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t.savedVocab}: {lesson.vocabScore}/{lesson.vocabTotal}
                    </span>
                  )}
                  {lesson.grammarScore !== null && (
                    <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {t.savedGrammar}: {lesson.grammarScore}/{lesson.grammarTotal}
                    </span>
                  )}
                  {lesson.writingSubmitted && (
                    <span className="text-[10px] bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">
                      ✓ {t.savedWritingDone}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      onLoadLesson(lesson);
                      onClose();
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{t.savedOpen}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => lesson.id && handleDelete(lesson.id)}
                    disabled={deletingId === lesson.id}
                    className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 border border-red-100 dark:border-red-900/30"
                  >
                    {deletingId === lesson.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
