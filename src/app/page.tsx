'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Layers, 
  Settings, 
  Volume2, 
  Loader2, 
  CheckCircle, 
  HelpCircle, 
  MessageSquare, 
  PenTool, 
  GraduationCap, 
  Play, 
  Sun, 
  Moon, 
  Laptop, 
  X, 
  Globe, 
  Check, 
  AlertCircle,
  BarChart3,
  Archive,
  Save,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Home,
} from 'lucide-react';
import { translations, Language } from '@/utils/translations';
import {
  saveLesson,
  recordLessonGenerated,
  recordScore,
  recordWritingSubmission,
  type SavedLesson,
} from '@/utils/db';
import ProgressDashboard from '@/components/ProgressDashboard';
import SavedLessonsModal from '@/components/SavedLessons';

// Predefined levels matching Oxford English File standard
const LEVELS = [
  { code: 'A1', label: 'Beginner', labelKey: 'levelA1', subKey: 'levelA1Label', topic: 'daily routine and family relations' },
  { code: 'A2', label: 'Elementary', labelKey: 'levelA2', subKey: 'levelA2Label', topic: 'travel experiences and past tense' },
  { code: 'B1', label: 'Pre-Intermediate', labelKey: 'levelB1', subKey: 'levelB1Label', topic: 'modern technology and present perfect' },
  { code: 'B1+', label: 'Intermediate', labelKey: 'levelB1Plus', subKey: 'levelB1PlusLabel', topic: 'job hunting, work life and modals of permission' },
  { code: 'B2.1', label: 'Intermediate Plus', labelKey: 'levelB21', subKey: 'levelB21Label', topic: 'eating habits and descriptive adjectives' },
  { code: 'B2.2', label: 'Upper-Intermediate', labelKey: 'levelB22', subKey: 'levelB22Label', topic: 'urban living, social media trends and gerunds vs infinitives' },
  { code: 'C1', label: 'Advanced', labelKey: 'levelC1', subKey: 'levelC1Label', topic: 'global trade, financial metaphors and grammatical inversion' },
];

export default function Dashboard() {
  // App settings state (persisted to localStorage)
  const [lang, setLang] = useState<Language>('AR');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [accent, setAccent] = useState<'UK' | 'US'>('UK');
  const [apiKey, setApiKey] = useState<string>('');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-2.5-flash');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [wizardStep, setWizardStep] = useState<number>(0);
  
  // Selection & UI states
  const [selectedLevel, setSelectedLevel] = useState<typeof LEVELS[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar' | 'pron' | 'dialogue' | 'challenge'>('vocab');
  const [loading, setLoading] = useState(false);
  const [lessonData, setLessonData] = useState<any>(null);
  const [currentLessonId, setCurrentLessonId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showSavedLessons, setShowSavedLessons] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // TTS & Audio states
  const [ttsText, setTtsText] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  // Interactive games states
  const [vocabMatches, setVocabMatches] = useState<Record<number, number>>({});
  const [vocabFeedback, setVocabFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [shuffledDefs, setShuffledDefs] = useState<Array<{ id: number; text: string }>>([]);
  
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizFeedback, setQuizFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  
  const [writingAnswers, setWritingAnswers] = useState<Record<number, string>>({});
  const [writingCorrecting, setWritingCorrecting] = useState(false);
  const [writingCorrectionData, setWritingCorrectionData] = useState<any>(null);

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Load configuration from local storage on mount
  useEffect(() => {
    setMounted(true);
    const savedLang = localStorage.getItem('ef_lang') as Language;
    if (savedLang) setLang(savedLang);

    const savedTheme = localStorage.getItem('ef_theme') as 'light' | 'dark' | 'system';
    if (savedTheme) setTheme(savedTheme);

    const savedAccent = localStorage.getItem('ef_accent') as 'UK' | 'US';
    if (savedAccent) setAccent(savedAccent);

    const savedKey = localStorage.getItem('ef_apiKey');
    if (savedKey) setApiKey(savedKey);

    const savedModel = localStorage.getItem('ef_geminiModel');
    if (savedModel) setGeminiModel(savedModel);
  }, []);

  // Monitor mobile viewports
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bidirectional sync between wizardStep and activeTab on mobile
  useEffect(() => {
    if (!isMobile) return;
    const steps: Array<typeof activeTab> = ['vocab', 'grammar', 'pron', 'dialogue', 'challenge'];
    const targetTab = steps[wizardStep];
    if (targetTab && activeTab !== targetTab) {
      setActiveTab(targetTab);
    }
  }, [wizardStep, isMobile]);

  useEffect(() => {
    const steps: Array<typeof activeTab> = ['vocab', 'grammar', 'pron', 'dialogue', 'challenge'];
    const idx = steps.indexOf(activeTab);
    if (idx !== -1 && wizardStep !== idx) {
      setWizardStep(idx);
    }
  }, [activeTab]);

  // Sync theme with DOM classes
  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    
    const applyTheme = (t: 'light' | 'dark' | 'system') => {
      root.classList.remove('light', 'dark');
      if (t === 'dark') {
        root.classList.add('dark');
      } else if (t === 'light') {
        root.classList.add('light');
      } else {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        if (media.matches) {
          root.classList.add('dark');
        } else {
          root.classList.add('light');
        }
      }
    };

    applyTheme(theme);
    localStorage.setItem('ef_theme', theme);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme, mounted]);

  const saveSettingsHandler = (newLang: Language, newTheme: 'light' | 'dark' | 'system', newAccent: 'UK' | 'US', newKey: string, newModel: string) => {
    setLang(newLang);
    setTheme(newTheme);
    setAccent(newAccent);
    setApiKey(newKey);
    setGeminiModel(newModel);

    localStorage.setItem('ef_lang', newLang);
    localStorage.setItem('ef_theme', newTheme);
    localStorage.setItem('ef_accent', newAccent);
    localStorage.setItem('ef_apiKey', newKey);
    localStorage.setItem('ef_geminiModel', newModel);

    setShowSettings(false);
  };

  const t = translations[lang];

  // Dynamically compute the banner gradient based on active lesson level
  const levelCode = lessonData?.levelCode || '';
  const bannerGradient = 
    levelCode === 'A1' ? 'from-emerald-600 to-teal-800 dark:from-emerald-950/40 dark:to-slate-950 border-emerald-500/20' :
    levelCode === 'A2' ? 'from-teal-600 to-cyan-800 dark:from-teal-950/40 dark:to-slate-950 border-teal-500/20' :
    levelCode === 'B1' ? 'from-indigo-600 to-blue-800 dark:from-indigo-950/40 dark:to-slate-950 border-indigo-500/20' :
    levelCode === 'B1+' ? 'from-violet-600 to-indigo-800 dark:from-violet-950/40 dark:to-slate-950 border-violet-500/20' :
    levelCode === 'B2.1' ? 'from-purple-600 to-fuchsia-800 dark:from-purple-950/40 dark:to-slate-950 border-purple-500/20' :
    levelCode === 'B2.2' ? 'from-fuchsia-600 to-rose-800 dark:from-fuchsia-950/40 dark:to-slate-950 border-fuchsia-500/20' :
    levelCode === 'C1' ? 'from-rose-600 to-orange-800 dark:from-rose-950/40 dark:to-slate-950 border-rose-500/20' :
    'from-slate-900 to-indigo-950 border-slate-800';

  // Helper: Play Base64 Audio via Web Audio PCM-to-WAV converter
  const playPCMBase64 = (base64Data: string, sampleRate: number) => {
    try {
      const rawBinary = atob(base64Data);
      const rawLength = rawBinary.length;
      const buffer = new ArrayBuffer(rawLength);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < rawLength; i++) {
        view[i] = rawBinary.charCodeAt(i);
      }

      const wavBuffer = new ArrayBuffer(44 + rawLength);
      const wavView = new DataView(wavBuffer);
      const writeString = (v: DataView, offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i));
      };
      writeString(wavView, 0, 'RIFF');
      wavView.setUint32(4, 36 + rawLength, true);
      writeString(wavView, 8, 'WAVE');
      writeString(wavView, 12, 'fmt ');
      wavView.setUint32(16, 16, true);
      wavView.setUint16(20, 1, true);
      wavView.setUint16(22, 1, true);
      wavView.setUint32(24, sampleRate, true);
      wavView.setUint32(28, sampleRate * 2, true);
      wavView.setUint16(32, 2, true);
      wavView.setUint16(34, 16, true);
      writeString(wavView, 36, 'data');
      wavView.setUint32(40, rawLength, true);
      for (let i = 0; i < rawLength; i++) wavView.setUint8(44 + i, view[i]);

      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        audioPlayerRef.current.play();
      } else {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (e) {
      console.error('Failed to play audio:', e);
    }
  };

  // Fallback: use browser's built-in Web Speech API
  const speakWithBrowser = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = accent === 'US' ? 'en-US' : 'en-GB';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      // Try to find a matching voice
      const voices = window.speechSynthesis.getVoices();
      const targetLang = accent === 'US' ? 'en-US' : 'en-GB';
      const matchedVoice = voices.find(v => v.lang === targetLang) || voices.find(v => v.lang.startsWith('en'));
      if (matchedVoice) utterance.voice = matchedVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Speak sentence using backend Gemini TTS API, with browser fallback on rate limit
  const speakText = async (text: string) => {
    if (!text.trim()) return;
    setTtsLoading(true);
    setTtsText(text);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ sentence: text, accent }),
      });

      if (!response.ok) {
        const err = await response.json();
        // On rate limit, fall back to browser speech synthesis silently
        if (response.status === 429 || err.rateLimited) {
          console.warn('Gemini TTS rate limited, falling back to browser speech synthesis');
          speakWithBrowser(text);
          return;
        }
        throw new Error(err.error || 'TTS generation failed');
      }

      const data = await response.json();
      const sampleRate = parseInt(data.mimeType?.match(/rate=(\d+)/)?.[1] || "24000", 10);
      playPCMBase64(data.base64Audio, sampleRate);
    } catch (err: any) {
      console.error(err);
      // Final fallback: try browser speech before showing an error
      try {
        speakWithBrowser(text);
      } catch {
        alert(t.ttsAlertError);
      }
    } finally {
      setTtsLoading(false);
    }
  };

  // Trigger lesson generation from Gemini API
  const generateLesson = async () => {
    if (!selectedLevel) return;
    setLoading(true);
    setLessonData(null);
    setCurrentLessonId(null);
    setWizardStep(0);
    resetInteractiveStates();

    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': apiKey,
          'x-gemini-model': geminiModel
        },
        body: JSON.stringify({
          levelCode: selectedLevel.code,
          levelLabel: selectedLevel.label,
          topicTheme: selectedLevel.topic,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Lesson generation failed');
      }
      const data = await response.json();
      setLessonData(data);
      
      // Setup matching game choices
      if (data.vocabulary?.matchingChallenge) {
        const defs = data.vocabulary.matchingChallenge.map((item: any, idx: number) => ({
          id: idx, text: item.definition
        }));
        setShuffledDefs([...defs].sort(() => Math.random() - 0.5));
      }
      
      setActiveTab('vocab');

      // Save lesson to IndexedDB
      try {
        const lessonId = await saveLesson({
          levelCode: selectedLevel.code,
          levelLabel: selectedLevel.label,
          lessonTitle: data.lessonTitle || 'Untitled Lesson',
          data,
          createdAt: new Date().toISOString(),
          vocabScore: null,
          vocabTotal: null,
          grammarScore: null,
          grammarTotal: null,
          writingSubmitted: false,
          writingFeedback: null,
        });
        setCurrentLessonId(lessonId);
        await recordLessonGenerated(selectedLevel.code);
        showToast(t.lessonSaved);
      } catch (dbErr) {
        console.error('Failed to save lesson to IndexedDB:', dbErr);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || t.alertGenError);
    } finally {
      setLoading(false);
    }
  };

  const resetInteractiveStates = () => {
    setVocabMatches({});
    setVocabFeedback(null);
    setQuizAnswers({});
    setQuizFeedback(null);
    setWritingAnswers({});
    setWritingCorrecting(false);
    setWritingCorrectionData(null);
  };

  // Load a saved lesson from IndexedDB
  const loadSavedLesson = (saved: SavedLesson) => {
    setLessonData(saved.data);
    setCurrentLessonId(saved.id || null);
    setWizardStep(0);
    
    // Find and select the matching level
    const matchingLevel = LEVELS.find(l => l.code === saved.levelCode);
    if (matchingLevel) setSelectedLevel(matchingLevel);
    
    resetInteractiveStates();

    // Setup matching game
    if (saved.data.vocabulary?.matchingChallenge) {
      const defs = saved.data.vocabulary.matchingChallenge.map((item: any, idx: number) => ({
        id: idx, text: item.definition
      }));
      setShuffledDefs([...defs].sort(() => Math.random() - 0.5));
    }
    setActiveTab('vocab');
  };

  // Match Vocabulary Verification + save score
  const checkVocabMatching = async () => {
    if (!lessonData) return;
    const items = lessonData.vocabulary.matchingChallenge;
    let correctCount = 0;
    for (let i = 0; i < items.length; i++) {
      if (vocabMatches[i] === i) correctCount++;
    }

    const isAllCorrect = correctCount === items.length;
    setVocabFeedback({
      text: `${isAllCorrect ? t.matchingPerfect : t.matchingFailed} (${correctCount}/${items.length})`,
      isError: !isAllCorrect,
    });

    // Record score to IndexedDB
    if (currentLessonId && selectedLevel) {
      try {
        await recordScore(currentLessonId, selectedLevel.code, 'vocab', correctCount, items.length);
      } catch (e) {
        console.error('Failed to save vocab score:', e);
      }
    }
  };

  // Grammar Quiz Verification + save score
  const checkGrammarQuiz = async () => {
    if (!lessonData) return;
    const questions = lessonData.grammar.quickQuiz;
    let correctCount = 0;
    for (let i = 0; i < questions.length; i++) {
      if (quizAnswers[i] === questions[i].correctIndex) correctCount++;
    }

    const isAllCorrect = correctCount === questions.length;
    setQuizFeedback({
      text: `${isAllCorrect ? t.quizPerfect : t.quizFailed} (${correctCount}/${questions.length}).${!isAllCorrect ? ' ' + t.quizFailedHelper : ''}`,
      isError: !isAllCorrect,
    });

    // Record score to IndexedDB
    if (currentLessonId && selectedLevel) {
      try {
        await recordScore(currentLessonId, selectedLevel.code, 'grammar', correctCount, questions.length);
      } catch (e) {
        console.error('Failed to save grammar score:', e);
      }
    }
  };

  // Play full dialogue
  const playFullDialogue = () => {
    if (!lessonData?.practicalEnglish?.dialogue) return;
    const dialogueText = lessonData.practicalEnglish.dialogue
      .map((d: any) => `${d.speaker}: ${d.speech}`)
      .join(' ');
    speakText(dialogueText);
  };

  // Submit writing answers for AI correction
  const submitWritingAnswers = async () => {
    if (!lessonData || !selectedLevel) return;
    const questions = lessonData.writingChallenge.questions;
    
    // Validate minimum text
    for (let i = 0; i < questions.length; i++) {
      const val = writingAnswers[i] || '';
      if (val.trim().length < 5) {
        alert(t.challengeErrorMsg);
        return;
      }
    }

    setWritingCorrecting(true);
    setWritingCorrectionData(null);

    try {
      const answersArray = questions.map((_: any, i: number) => writingAnswers[i] || '');
      
      const response = await fetch('/api/correct-writing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'x-api-key': apiKey,
          'x-gemini-model': geminiModel
        },
        body: JSON.stringify({
          questions,
          answers: answersArray,
          levelCode: selectedLevel.code,
          levelLabel: selectedLevel.label,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Writing correction failed');
      }

      const correctionResult = await response.json();
      setWritingCorrectionData(correctionResult);

      // Save to IndexedDB
      if (currentLessonId) {
        try {
          await recordWritingSubmission(
            currentLessonId,
            JSON.stringify(correctionResult)
          );
        } catch (e) {
          console.error('Failed to save writing submission:', e);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(t.writingCorrectionError);
    } finally {
      setWritingCorrecting(false);
    }
  };

  // Mobile Roadmap Render Helper
  const renderMobileRoadmap = () => {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        <div className="text-center space-y-2 py-4">
          <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-[10px] tracking-wider uppercase shadow-md select-none">
            {lang === 'AR' ? 'منهج ENGLISH FILE تفاعلي' : 'ENGLISH FILE INTERACTIVE'}
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {lang === 'AR' ? 'خارطة طريق التعلّم' : 'Learning Roadmap'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {lang === 'AR' ? 'اختر مستواك لبدء درس تفاعلي ذكي' : 'Choose a level to generate an instant smart lesson'}
          </p>
        </div>

        {/* Timeline Path */}
        <div className="relative pl-6 rtl:pr-6 border-l-2 rtl:border-r-2 border-slate-200 dark:border-slate-800 space-y-6 ml-4 rtl:mr-4">
          {LEVELS.map((lvl) => {
            const isActive = selectedLevel?.code === lvl.code;
            return (
              <div key={lvl.code} className="relative">
                {/* Node indicator */}
                <button 
                  onClick={() => setSelectedLevel(lvl)}
                  className={`absolute -left-[35px] rtl:-right-[35px] top-2 w-7 h-7 rounded-full border-4 flex items-center justify-center font-sans text-[10px] font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-200 dark:border-indigo-950 text-white scale-110 shadow-md ring-4 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-800'
                  }`}
                >
                  {lvl.code}
                </button>

                {/* Level Card */}
                <div 
                  onClick={() => setSelectedLevel(lvl)}
                  className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/40 dark:to-indigo-950/20 border-indigo-500 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50/30 dark:hover:bg-slate-850/30 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left rtl:text-right">
                      <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100">
                        {lvl.label}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {t[lvl.subKey as keyof typeof t]}
                      </span>
                    </div>
                    {isActive && (
                      <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
                    )}
                  </div>

                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fadeIn text-left rtl:text-right">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                        <strong>{lang === 'AR' ? 'التركيز:' : 'Focus:'}</strong> {lvl.topic}
                      </p>
                      <button 
                        disabled={loading}
                        onClick={(e) => {
                          e.stopPropagation();
                          generateLesson();
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>{t.generateBtn}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Audio Reader Box for Mobile */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <h3 className="font-bold text-xs">{t.ttsTitle}</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{t.ttsDesc}</p>
          <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={2} className="w-full p-2.5 text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:outline-none focus:border-amber-400 font-sans resize-none" dir="ltr" placeholder={t.ttsPlaceholder} />
          <button disabled={ttsLoading} onClick={() => speakText(ttsText)} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex justify-center items-center gap-2">
            {ttsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{t.ttsTrigger}</span>
          </button>
          {ttsLoading && (
            <div className="flex items-center justify-center gap-2 py-1.5 text-[10px] text-amber-400 bg-slate-800 rounded-lg">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>{t.ttsLoading}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Mobile Wizard Render Helper
  const renderMobileWizard = () => {
    if (!lessonData) return null;
    const progressPercent = (wizardStep + 1) * 20;
    const progressText = t.wizardStepProgress
      .replace('{current}', String(wizardStep + 1))
      .replace('{total}', '5');

    return (
      <div className="space-y-6 animate-fadeIn pb-28">
        {/* Wizard Header and Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm space-y-3 transition-colors duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full text-[9px] uppercase">
                {lessonData.levelCode}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-sans">
                {progressText}
              </span>
            </div>
            <button 
              onClick={() => setLessonData(null)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-all"
            >
              <Home className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t.wizardLevelMap}</span>
            </button>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 text-left" dir="ltr">
              {lessonData.lessonTitle}
            </h3>
            {/* Progress track */}
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300 ease-out rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lesson Banner inside Wizard (Small version) */}
        <div className={`bg-gradient-to-l ${bannerGradient} text-white p-4 rounded-2xl shadow-md relative overflow-hidden border border-slate-100/5`}>
          <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 space-y-1">
            <span className="bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full text-[8px] tracking-wider uppercase shadow-sm">
              Step {wizardStep + 1}
            </span>
            <p className="text-slate-100 text-[10px] leading-relaxed">
              {activeTab === 'vocab' && t.vocabTitle}
              {activeTab === 'grammar' && t.grammarTitle}
              {activeTab === 'pron' && t.pronTitle}
              {activeTab === 'dialogue' && t.practicalTitle}
              {activeTab === 'challenge' && t.challengeTitle}
            </p>
          </div>
        </div>

        {/* Content area */}
        <div className="space-y-6">
          {renderActiveTabContent()}
        </div>

        {/* Sticky Glassmorphic Bottom Navigation Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-4 pb-safe-bottom flex items-center justify-between shadow-[0_-8px_30px_rgb(0,0,0,0.06)] transition-colors duration-300">
          {/* Back button */}
          <button
            disabled={wizardStep === 0}
            onClick={() => setWizardStep(prev => Math.max(0, prev - 1))}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {lang === 'AR' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            <span>{t.wizardBack}</span>
          </button>

          {/* Next / Submit button */}
          {wizardStep < 4 ? (
            <button
              onClick={() => setWizardStep(prev => Math.min(4, prev + 1))}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-600/10"
            >
              <span>{t.wizardNext}</span>
              {lang === 'AR' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={submitWritingAnswers}
              disabled={writingCorrecting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-600/10"
            >
              {writingCorrecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{t.wizardFinish}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render Tab Contents Helper
  const renderActiveTabContent = () => {
    if (!lessonData) return null;
    return (
      <>
        {/* ===== TAB: VOCABULARY ===== */}
        {activeTab === 'vocab' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.vocabTitle}</span>
              </h3>
              <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">{lessonData.vocabulary.theme}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonData.vocabulary.words.map((w: any, idx: number) => (
                <div key={idx} className="p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-800 hover:shadow-sm hover:scale-[1.01] transition-all flex flex-col justify-between gap-4">
                  <div className="space-y-2 text-left" dir="ltr">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="font-sans font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-tight">{w.word}</span>
                        <p className="text-[10px] text-slate-400 font-sans">{w.phonetics}</p>
                      </div>
                      <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2.5 py-1 rounded-full font-tajawal rtl:text-right" dir={t.dir}>
                        {w.arabicTranslation}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed pt-1.5 border-t border-slate-200/30 dark:border-slate-850/30">{w.definition}</p>
                    <p className="text-xs italic text-indigo-600/90 dark:text-indigo-400/90 font-sans">&quot;{w.exampleSentence}&quot;</p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button onClick={() => speakText(`${w.word}. ${w.exampleSentence}`)} className="text-[10px] font-bold bg-white hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-900 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer transition-all shadow-sm">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-500" />{t.listeningBtn}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Matching Game */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-4 mt-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-300 tracking-wider">{t.matchingTitle}</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.matchingDesc}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {lessonData.vocabulary.matchingChallenge.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-300 text-left hover:scale-[1.01] transition-transform" dir="ltr">{idx + 1}. {item.term}</div>
                  ))}
                </div>
                <div className="space-y-2">
                  {lessonData.vocabulary.matchingChallenge.map((_: any, idx: number) => (
                    <select key={idx} value={vocabMatches[idx] !== undefined ? vocabMatches[idx] : ''} onChange={(e) => setVocabMatches(prev => ({ ...prev, [idx]: e.target.value === '' ? -1 : parseInt(e.target.value, 10) }))} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 focus:outline-none focus:border-indigo-500 font-sans cursor-pointer shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors" dir="ltr">
                      <option value="">{t.matchingSelectDefault.replace('...', `#${idx + 1}`)}</option>
                      {shuffledDefs.map((def) => (<option key={def.id} value={def.id}>{def.text}</option>))}
                    </select>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-850 mt-4">
                <button onClick={checkVocabMatching} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer">{t.matchingCheck}</button>
                {vocabFeedback && (
                  <div className={`text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl ${vocabFeedback.isError ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                    {vocabFeedback.isError ? <AlertCircle className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5" />}
                    <span>{vocabFeedback.text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: GRAMMAR ===== */}
        {activeTab === 'grammar' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{t.grammarTitle}</span>
              </h3>
            </div>
            <div className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/20 dark:from-slate-800/40 dark:to-slate-800/20 rounded-2xl border-l-4 border-amber-500 shadow-sm space-y-2 text-left" dir="ltr">
              <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm tracking-tight">{lessonData.grammar.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans" dir="ltr">{lessonData.grammar.conceptExplanation}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonData.grammar.rules.map((rule: any, idx: number) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 text-left shadow-sm flex flex-col justify-between" dir="ltr">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-800/80 pb-2 font-sans">{rule.rule}</h4>
                  </div>
                  <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-200/20 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 font-mono tracking-tight">{rule.example}</div>
                </div>
              ))}
            </div>
            {/* Grammar Quiz */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-4 mt-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">{t.grammarQuizTitle}</h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{t.grammarQuizDesc}</p>
              <div className="space-y-4">
                {lessonData.grammar.quickQuiz.map((quiz: any, quizIdx: number) => (
                  <div key={quizIdx} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/85 dark:border-slate-800/85 shadow-sm space-y-3">
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs text-left font-sans" dir="ltr">{quizIdx + 1}. {quiz.question}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5" dir="ltr">
                      {quiz.options.map((opt: string, optIdx: number) => {
                        const isSelected = quizAnswers[quizIdx] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => setQuizAnswers(prev => ({ ...prev, [quizIdx]: optIdx }))}
                            className={`p-3 rounded-xl border text-xs font-bold text-center transition-all duration-200 hover:scale-[1.01] hover:shadow-sm cursor-pointer select-none ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                : 'bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-900 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-850 mt-4">
                <button onClick={checkGrammarQuiz} className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer">{t.grammarQuizCheck}</button>
                {quizFeedback && (
                  <div className={`text-xs font-bold flex items-center gap-1.5 px-4 py-2 rounded-xl ${quizFeedback.isError ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}>
                    {quizFeedback.isError ? <AlertCircle className="w-4.5 h-4.5" /> : <Check className="w-4.5 h-4.5" />}
                    <span>{quizFeedback.text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: PRONUNCIATION ===== */}
        {activeTab === 'pron' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                <span>{t.pronTitle}</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessonData.pronunciation.soundsToCompare.map((soundDesc: string, idx: number) => (
                <div key={idx} className="p-5 bg-sky-50/30 dark:bg-sky-950/10 rounded-2xl border border-sky-100 dark:border-sky-900/30 space-y-3 text-center">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed font-semibold" dir="ltr">{soundDesc}</p>
                  <button onClick={() => speakText(soundDesc)} className="mt-2 text-xs bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 px-4 py-2 rounded-full mx-auto flex items-center gap-1.5 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm">
                    <Volume2 className="w-3.5 h-3.5 text-sky-600" />{t.pronListenBtn}
                  </button>
                </div>
              ))}
            </div>
            <div className="p-5 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{t.pronGuideTitle}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.pronGuideDesc}</p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {lessonData.pronunciation.wordsWithAudio.map((word: string, idx: number) => (
                  <button key={idx} onClick={() => speakText(word)} className="bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-700 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm text-slate-700 dark:text-slate-400 font-bold cursor-pointer" dir="ltr">
                    <span>{word}</span>
                    <Play className="w-3 h-3 text-slate-400 fill-current" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: PRACTICAL ENGLISH ===== */}
        {activeTab === 'dialogue' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>{t.practicalTitle}</span>
              </h3>
              <button onClick={playFullDialogue} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm">
                <Play className="w-3.5 h-3.5 fill-current" />{t.practicalPlayFull}
              </button>
            </div>
            <div className="p-4 bg-teal-50/30 dark:bg-teal-950/10 rounded-2xl border border-teal-100/80 dark:border-teal-900/30">
              <h4 className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-widest">{t.practicalScenarioTitle}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1 font-sans" dir="ltr">{lessonData.practicalEnglish.scenario}</p>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950/20 shadow-inner">
              <div className="bg-slate-900 text-white px-4 py-3.5 text-xs font-bold uppercase tracking-wider flex justify-between items-center border-b border-slate-850">
                <span>{t.practicalDialogueHeader}</span>
                <span className="text-[10px] text-slate-400 font-medium normal-case">Immersive Chat View</span>
              </div>
              <div className="p-4 md:p-6 space-y-4 max-h-[400px] overflow-y-auto bg-slate-100/30 dark:bg-slate-950/40 scrollbar-none">
                {(() => {
                  const dialogue = lessonData.practicalEnglish.dialogue;
                  const speakerNames = Array.from(new Set(dialogue.map((d: any) => d.speaker)));
                  const speakerLeft = speakerNames[0] || '';
                  return dialogue.map((turn: any, idx: number) => {
                    const isLeft = turn.speaker === speakerLeft;
                    return (
                      <div key={idx} className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'} w-full space-y-1 animate-fadeIn`}>
                        <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 px-1">{turn.speaker}</span>
                        <div className={`p-3.5 rounded-2xl max-w-[85%] md:max-w-md text-xs leading-relaxed shadow-sm border ${
                          isLeft 
                            ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200/60 dark:border-slate-800/80 rounded-tl-none bubble-in'
                            : 'bg-indigo-50/70 dark:bg-indigo-950/30 text-slate-800 dark:text-slate-200 border-indigo-100/50 dark:border-indigo-900/40 rounded-tr-none bubble-out'
                        }`}>
                          <p>{turn.speech}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{t.practicalExpressionsHeader}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {lessonData.practicalEnglish.expressions.map((exp: any, idx: number) => (
                  <div key={idx} className="p-3.5 bg-teal-55/20 dark:bg-teal-95/5 rounded-xl border border-teal-100/50 dark:border-teal-900/20 text-left font-sans" dir="ltr">
                    <strong className="text-slate-900 dark:text-slate-200 text-xs font-bold">{exp.expression}</strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{exp.use}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB: WRITING CHALLENGE ===== */}
        {activeTab === 'challenge' && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>{t.challengeTitle}</span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{t.challengeDesc}</p>

            <div className="space-y-4">
              {lessonData.writingChallenge.questions.map((q: string, idx: number) => (
                <div key={idx} className="space-y-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-400 text-xs text-left font-sans" dir="ltr">{idx + 1}. {q}</label>
                  <textarea value={writingAnswers[idx] || ''} onChange={(e) => setWritingAnswers(prev => ({ ...prev, [idx]: e.target.value }))} rows={3} className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-xs font-sans resize-none text-slate-800 dark:text-slate-200" dir="ltr" placeholder="Write your complete response here..." />
                </div>
              ))}
            </div>

            <button onClick={submitWritingAnswers} disabled={writingCorrecting} className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-50">
              {writingCorrecting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>{t.writingCorrecting}</span></>
              ) : (
                <><PenTool className="w-4 h-4" /><span>{t.challengeSubmit}</span></>
              )}
            </button>

            {/* AI Writing Correction Results */}
            {writingCorrectionData && (
              <div className="space-y-4 animate-fadeIn">
                {/* Overall Banner */}
                <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      {t.writingCorrectionTitle}
                    </h4>
                    <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-sm font-black">
                      {writingCorrectionData.overallScore}/{writingCorrectionData.maxScore}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{writingCorrectionData.overallComment}</p>
                </div>

                {/* Per-question corrections */}
                {writingCorrectionData.corrections?.map((correction: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t.tabChallenge.split('.')[0]}. {(correction.questionIndex ?? idx) + 1}
                      </span>
                      <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-xs font-black px-2.5 py-0.5 rounded-full">
                        {correction.score}/10
                      </span>
                    </div>

                    {correction.grammarFeedback && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">{t.writingGrammarFeedback}</div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">{correction.grammarFeedback}</p>
                      </div>
                    )}

                    {correction.vocabularyFeedback && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">{t.writingVocabFeedback}</div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">{correction.vocabularyFeedback}</p>
                      </div>
                    )}

                    {correction.correctedVersion && (
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">{t.writingCorrected}</div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed bg-emerald-50 dark:bg-emerald-950/10 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/30 font-sans italic" dir="ltr">{correction.correctedVersion}</p>
                      </div>
                    )}

                    {correction.tip && (
                      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed"><strong>{t.writingTip}:</strong> {correction.tip}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // Return spinner before mounting to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${t.fontClass}`} dir={t.dir}>
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-fadeIn">
          <Save className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white shadow-lg sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 space-x-reverse">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs tracking-wider uppercase shadow-md select-none">
              ENGLISH FILE
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex text-[10px] text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t.engineStatus}</span>
            </span>
            
            {/* Progress Button */}
            <button 
              onClick={() => setShowProgress(true)}
              className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 p-2 rounded-xl border border-indigo-700/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">{t.navProgress}</span>
            </button>

            {/* Saved Lessons Button */}
            <button 
              onClick={() => setShowSavedLessons(true)}
              className="bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 p-2 rounded-xl border border-amber-700/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">{t.navSaved}</span>
            </button>

            {/* Settings Button */}
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white p-2 rounded-xl border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t.settingsBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      {isMobile ? (
        <main className="flex-grow w-full max-w-md mx-auto px-4 py-6 space-y-6">
          {loading && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-6 shadow-sm">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin"></div>
              </div>
              <div className="max-w-md mx-auto space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t.loadingTitle}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed animate-pulse">{t.loadingDesc}</p>
              </div>
            </div>
          )}
          {!loading && !lessonData && renderMobileRoadmap()}
          {!loading && lessonData && renderMobileWizard()}
        </main>
      ) : (
        <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar - Level Selection */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 space-y-4 transition-colors duration-300">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>{t.sidebarTitle}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.sidebarDesc}</p>

              <div className="space-y-2">
                {LEVELS.map((lvl) => {
                  const isActive = selectedLevel?.code === lvl.code;
                  return (
                    <button key={lvl.code} onClick={() => setSelectedLevel(lvl)} className={`w-full text-right p-3 rounded-xl border text-xs font-semibold flex justify-between items-center transition-all duration-200 hover:scale-[1.01] hover:shadow-sm cursor-pointer ${isActive ? "bg-gradient-to-r from-indigo-50/70 to-indigo-100/30 dark:from-indigo-950/40 dark:to-indigo-950/20 border-indigo-500 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold ltr:border-l-4 rtl:border-r-4 shadow-sm" : "bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"}`}>
                      <span>{lvl.label} ({lvl.code})</span>
                      <span className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold">
                        {t[lvl.subKey as keyof typeof t]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button disabled={!selectedLevel || loading} onClick={generateLesson} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:shadow-lg">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>{t.generateBtn}</span>
                </button>
              </div>
            </div>

            {/* Global Audio Reader Box */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <h3 className="font-bold text-xs">{t.ttsTitle}</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{t.ttsDesc}</p>
              <textarea value={ttsText} onChange={(e) => setTtsText(e.target.value)} rows={2} className="w-full p-2.5 text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:outline-none focus:border-amber-400 font-sans resize-none" dir="ltr" placeholder={t.ttsPlaceholder} />
              <button disabled={ttsLoading} onClick={() => speakText(ttsText)} className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex justify-center items-center gap-2">
                {ttsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{t.ttsTrigger}</span>
              </button>
              {ttsLoading && (
                <div className="flex items-center justify-center gap-2 py-1.5 text-[10px] text-amber-400 bg-slate-800 rounded-lg">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{t.ttsLoading}</span>
                </div>
              )}
            </div>
          </aside>

          {/* Right Side: Content Area */}
          <section className="lg:col-span-3 space-y-6">
            
            {/* Empty State */}
            {!lessonData && !loading && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-6 shadow-sm transition-colors duration-300">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <BookOpen className="w-10 h-10" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.welcomeTitle}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.welcomeDesc}</p>
                </div>
                <div className="flex justify-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400 pt-2">
                  <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> {t.welcomeFeature1}</div>
                  <div className="flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-sky-500" /> {t.welcomeFeature2}</div>
                  <div className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> {t.welcomeFeature3}</div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-6 shadow-sm">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin"></div>
                </div>
                <div className="max-w-md mx-auto space-y-3">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t.loadingTitle}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed animate-pulse">{t.loadingDesc}</p>
                </div>
                <div className="space-y-3 max-w-lg mx-auto pt-6">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full animate-shimmer w-3/4 mx-auto"></div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full animate-shimmer w-1/2 mx-auto"></div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full animate-shimmer w-5/6 mx-auto"></div>
                </div>
              </div>
            )}

            {/* Lesson Content */}
            {lessonData && !loading && (
              <div className="space-y-6">
                {/* Banner */}
                <div className={`bg-gradient-to-l ${bannerGradient} text-white p-6 md:p-8 rounded-2xl shadow-md relative overflow-hidden border border-slate-100/5`}>
                  <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="relative z-10 space-y-2.5">
                    <span className="bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-full text-[9px] tracking-wider uppercase shadow-sm">
                      English File {lessonData.levelCode}
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold text-amber-400 leading-tight" dir="ltr">
                      {lessonData.lessonTitle}
                    </h2>
                    <p className="text-slate-200 dark:text-slate-400 text-[11px] max-w-xl leading-relaxed">{t.lessonBannerDesc}</p>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex overflow-x-auto bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 scrollbar-none gap-1 shadow-inner">
                  {[
                    { id: 'vocab', label: t.tabVocab, icon: BookOpen },
                    { id: 'grammar', label: t.tabGrammar, icon: Layers },
                    { id: 'pron', label: t.tabPron, icon: Volume2 },
                    { id: 'dialogue', label: t.tabDialogue, icon: MessageSquare },
                    { id: 'challenge', label: t.tabChallenge, icon: PenTool },
                  ].map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 shrink-0 cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${isActive ? 'text-indigo-600 dark:text-indigo-300 bg-white dark:bg-slate-800 shadow-sm border border-slate-200/20 dark:border-slate-700/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {renderActiveTabContent()}
              </div>
            )}
          </section>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-center py-8 border-t border-slate-900 mt-12">
        <p className="text-xs" dir={lang === 'AR' ? 'rtl' : 'ltr'}>
          {lang === 'AR' ? (
            <>
              صُنع بـ <span className="text-rose-500">❤</span> في <span className="text-amber-400 font-bold" dir="ltr">SANAI+</span>
            </>
          ) : (
            <>
              Made with <span className="text-rose-500">❤</span> in <span className="text-amber-400 font-bold" dir="ltr">SANAI+</span>
            </>
          )}
        </p>
      </footer>

      {/* ===== MODALS ===== */}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2"><Settings className="w-5 h-5" />{t.settingsTitle}</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <SettingsForm initialLang={lang} initialTheme={theme} initialAccent={accent} initialApiKey={apiKey} initialModel={geminiModel} t={t} onSave={saveSettingsHandler} onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}

      {/* Progress Dashboard Modal */}
      {showProgress && <ProgressDashboard t={t} onClose={() => setShowProgress(false)} />}

      {/* Saved Lessons Modal */}
      {showSavedLessons && <SavedLessonsModal t={t} onClose={() => setShowSavedLessons(false)} onLoadLesson={loadSavedLesson} />}
    </div>
  );
}

// ===== Settings Form Sub-Component =====
function SettingsForm({ initialLang, initialTheme, initialAccent, initialApiKey, initialModel, t, onSave, onClose }: {
  initialLang: Language; initialTheme: 'light' | 'dark' | 'system'; initialAccent: 'UK' | 'US'; initialApiKey: string; initialModel: string;
  t: any; onSave: (lang: Language, theme: 'light' | 'dark' | 'system', accent: 'UK' | 'US', key: string, model: string) => void; onClose: () => void;
}) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialTheme);
  const [accent, setAccent] = useState<'UK' | 'US'>(initialAccent);
  const [apiKey, setApiKey] = useState<string>(initialApiKey);
  const [model, setModel] = useState<string>(initialModel);

  return (
    <div className="p-6 space-y-5">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Globe className="w-4 h-4 text-indigo-500" />{t.settingsLang}</label>
        <div className="grid grid-cols-2 gap-2">
          {(['AR', 'EN'] as const).map(l => (
            <button key={l} type="button" onClick={() => setLang(l)} className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border ${lang === l ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400'}`}>
              {l === 'AR' ? 'العربية (AR)' : 'English (EN)'}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Layers className="w-4 h-4 text-sky-500" />{t.settingsTheme}</label>
        <div className="grid grid-cols-3 gap-2">
          {([{ id: 'light', label: t.settingsThemeLight, icon: Sun }, { id: 'dark', label: t.settingsThemeDark, icon: Moon }, { id: 'system', label: t.settingsThemeSystem, icon: Laptop }] as const).map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => setTheme(item.id as any)} className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border ${theme === item.id ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400'}`}>
                <Icon className="w-3.5 h-3.5" /><span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-emerald-500" />{t.settingsAccent}</label>
        <div className="grid grid-cols-2 gap-2">
          {(['UK', 'US'] as const).map(a => (
            <button key={a} type="button" onClick={() => setAccent(a)} className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border ${accent === a ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400'}`}>
              {a === 'UK' ? (lang === 'AR' ? 'بريطاني (UK)' : 'British (UK)') : (lang === 'AR' ? 'أمريكي (US)' : 'American (US)')}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-orange-500" />{t.settingsModel}</label>
        <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-xs font-semibold cursor-pointer">
          <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default)</option>
          <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
        </select>
        <p className="text-[10px] text-slate-400 leading-normal">{t.settingsModelHelp}</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" />{t.settingsApiKey}</label>
        <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-xs font-sans" placeholder="AIzaSy..." />
        <p className="text-[10px] text-slate-400 leading-normal">{t.settingsApiKeyHelp}</p>
      </div>
      <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <button type="button" onClick={() => onSave(lang, theme, accent, apiKey, model)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer">{t.settingsSave}</button>
        <button type="button" onClick={onClose} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer border border-slate-200/40 dark:border-slate-700/60">{t.settingsClose}</button>
      </div>
    </div>
  );
}
