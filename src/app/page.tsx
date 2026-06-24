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
  AlertCircle 
} from 'lucide-react';
import { translations, Language } from '@/utils/translations';

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
  
  // Selection & UI states
  const [selectedLevel, setSelectedLevel] = useState<typeof LEVELS[0] | null>(null);
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar' | 'pron' | 'dialogue' | 'challenge'>('vocab');
  const [loading, setLoading] = useState(false);
  const [lessonData, setLessonData] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  
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
  const [writingFeedbackVisible, setWritingFeedbackVisible] = useState(false);

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
  }, []);

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
        // System
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

    // Listen for system theme changes if set to system
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme, mounted]);

  const saveSettings = (newLang: Language, newTheme: 'light' | 'dark' | 'system', newAccent: 'UK' | 'US', newKey: string) => {
    setLang(newLang);
    setTheme(newTheme);
    setAccent(newAccent);
    setApiKey(newKey);

    localStorage.setItem('ef_lang', newLang);
    localStorage.setItem('ef_theme', newTheme);
    localStorage.setItem('ef_accent', newAccent);
    localStorage.setItem('ef_apiKey', newKey);

    setShowSettings(false);
  };

  const t = translations[lang];

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

      // Write WAV header
      const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      writeString(wavView, 0, 'RIFF');
      wavView.setUint32(4, 36 + rawLength, true);
      writeString(wavView, 8, 'WAVE');
      writeString(wavView, 12, 'fmt ');
      wavView.setUint32(16, 16, true);
      wavView.setUint16(20, 1, true); // PCM format
      wavView.setUint16(22, 1, true); // Mono channel
      wavView.setUint32(24, sampleRate, true);
      wavView.setUint32(28, sampleRate * 2, true);
      wavView.setUint16(32, 2, true);
      wavView.setUint16(34, 16, true);
      writeString(wavView, 36, 'data');
      wavView.setUint32(40, rawLength, true);

      for (let i = 0; i < rawLength; i++) {
        wavView.setUint8(44 + i, view[i]);
      }

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
      console.error('Failed to parse and play audio base64 data:', e);
    }
  };

  // Speak sentence using backend Gemini TTS API
  const speakText = async (text: string) => {
    if (!text.trim()) return;
    setTtsLoading(true);
    setTtsText(text);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ sentence: text, accent }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'TTS generation failed');
      }

      const data = await response.json();
      const sampleRate = parseInt(data.mimeType?.match(/rate=(\d+)/)?.[1] || "24000", 10);
      playPCMBase64(data.base64Audio, sampleRate);
    } catch (err: any) {
      console.error(err);
      alert(t.ttsAlertError);
    } finally {
      setTtsLoading(false);
    }
  };

  // Trigger lesson generation from Gemini API
  const generateLesson = async () => {
    if (!selectedLevel) return;
    setLoading(true);
    setLessonData(null);
    setVocabMatches({});
    setVocabFeedback(null);
    setQuizAnswers({});
    setQuizFeedback(null);
    setWritingAnswers({});
    setWritingFeedbackVisible(false);

    try {
      const response = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
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
          id: idx,
          text: item.definition
        }));
        // Shuffle matching options
        setShuffledDefs([...defs].sort(() => Math.random() - 0.5));
      }
      
      setActiveTab('vocab');
    } catch (err: any) {
      console.error(err);
      alert(err.message || t.alertGenError);
    } finally {
      setLoading(false);
    }
  };

  // Match Vocabulary Verification
  const checkVocabMatching = () => {
    if (!lessonData) return;
    const items = lessonData.vocabulary.matchingChallenge;
    let correctCount = 0;

    for (let i = 0; i < items.length; i++) {
      if (vocabMatches[i] === i) {
        correctCount++;
      }
    }

    if (correctCount === items.length) {
      setVocabFeedback({
        text: `${t.matchingPerfect} (${correctCount}/${items.length})`,
        isError: false,
      });
    } else {
      setVocabFeedback({
        text: `${t.matchingFailed} (${correctCount}/${items.length})`,
        isError: true,
      });
    }
  };

  // Grammar Quiz Verification
  const checkGrammarQuiz = () => {
    if (!lessonData) return;
    const questions = lessonData.grammar.quickQuiz;
    let correctCount = 0;

    for (let i = 0; i < questions.length; i++) {
      if (quizAnswers[i] === questions[i].correctIndex) {
        correctCount++;
      }
    }

    if (correctCount === questions.length) {
      setQuizFeedback({
        text: `${t.quizPerfect} (${correctCount}/${questions.length})`,
        isError: false,
      });
    } else {
      setQuizFeedback({
        text: `${t.quizFailed} (${correctCount}/${questions.length}). ${t.quizFailedHelper}`,
        isError: true,
      });
    }
  };

  // Practical English full dialogue play
  const playFullDialogue = () => {
    if (!lessonData?.practicalEnglish?.dialogue) return;
    const dialogueText = lessonData.practicalEnglish.dialogue
      .map((d: any) => `${d.speaker}: ${d.speech}`)
      .join(' ');
    speakText(dialogueText);
  };

  // Submit essay/writing answers
  const submitWritingAnswers = () => {
    if (!lessonData) return;
    const questions = lessonData.writingChallenge.questions;
    let valid = true;

    for (let i = 0; i < questions.length; i++) {
      const val = writingAnswers[i] || '';
      if (val.trim().length < 5) {
        valid = false;
        break;
      }
    }

    if (!valid) {
      alert(t.challengeErrorMsg);
      return;
    }

    setWritingFeedbackVisible(true);
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

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 text-white shadow-lg sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 space-x-reverse">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs tracking-wider uppercase shadow-md select-none">
              ENGLISH FILE
            </span>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold tracking-tight">{t.title}</h1>
              <p className="text-[10px] text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] sm:text-xs bg-slate-850 text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{t.engineStatus}</span>
            </span>
            
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white p-2 rounded-xl border border-slate-700 hover:border-slate-650 transition-all flex items-center gap-1.5 shadow-sm text-xs font-semibold cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">{t.settingsBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-6xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar - Level Selection */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800/80 space-y-4 transition-colors duration-300">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850 pb-3">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t.sidebarTitle}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t.sidebarDesc}
            </p>

            {/* Level Select Buttons */}
            <div className="space-y-2">
              {LEVELS.map((lvl) => {
                const isActive = selectedLevel?.code === lvl.code;
                return (
                  <button 
                    key={lvl.code}
                    onClick={() => setSelectedLevel(lvl)} 
                    className={`w-full text-right p-3 rounded-xl border text-xs font-semibold flex justify-between items-center transition-all cursor-pointer ${
                      isActive 
                        ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-850 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/10 font-bold" 
                        : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{lvl.label} ({lvl.code})</span>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-sans font-semibold">
                      {t[lvl.subKey as keyof typeof t]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-850 mt-4">
              <button 
                disabled={!selectedLevel || loading} 
                onClick={generateLesson} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:shadow-indigo-500/10 hover:shadow-lg"
              >
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
            <p className="text-[11px] text-slate-350 leading-relaxed">
              {t.ttsDesc}
            </p>
            <textarea 
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={2} 
              className="w-full p-2.5 text-xs bg-slate-800 border border-slate-700 text-slate-100 rounded-xl focus:outline-none focus:border-amber-400 font-sans resize-none" 
              dir="ltr" 
              placeholder={t.ttsPlaceholder}
            />
            
            <button 
              disabled={ttsLoading}
              onClick={() => speakText(ttsText)} 
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-600 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex justify-center items-center gap-2"
            >
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

        {/* Right Side: Content Area / Loading / Empty State */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Empty State / Welcome */}
          {!lessonData && !loading && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-6 shadow-sm transition-colors duration-300">
              <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
                <BookOpen className="w-10 h-10" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t.welcomeTitle}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t.welcomeDesc}
                </p>
              </div>
              <div className="flex justify-center gap-6 text-xs font-semibold text-slate-650 dark:text-slate-350 pt-2">
                <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> {t.welcomeFeature1}</div>
                <div className="flex items-center gap-1.5"><Volume2 className="w-4 h-4 text-sky-500" /> {t.welcomeFeature2}</div>
                <div className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-500" /> {t.welcomeFeature3}</div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-6 shadow-sm transition-colors duration-300">
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-slate-800"></div>
                <div className="absolute inset-0 rounded-full border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent animate-spin"></div>
              </div>
              <div className="max-w-md mx-auto space-y-3">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t.loadingTitle}</h2>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed animate-pulse">
                  {t.loadingDesc}
                </p>
              </div>
              {/* Shimmer skeletons */}
              <div className="space-y-3 max-w-lg mx-auto pt-6">
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full animate-shimmer w-3/4 mx-auto"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full animate-shimmer w-1/2 mx-auto"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full animate-shimmer w-5/6 mx-auto"></div>
              </div>
            </div>
          )}

          {/* Interactive Lesson Container (Loaded) */}
          {lessonData && !loading && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Lesson Banner */}
              <div className="bg-gradient-to-l from-slate-900 to-indigo-950 text-white p-6 md:p-8 rounded-2xl shadow-md relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-2">
                    <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded text-[9px] tracking-widest uppercase">
                      English File {lessonData.levelCode}
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold font-playfair text-amber-400 leading-tight">
                      {lessonData.lessonTitle}
                    </h2>
                    <p className="text-slate-350 text-[11px] max-w-xl leading-relaxed">
                      {t.lessonBannerDesc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex overflow-x-auto bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 scrollbar-none gap-1 transition-colors duration-300">
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
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content: VOCABULARY */}
              {activeTab === 'vocab' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-300">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span>{t.vocabTitle}</span>
                    </h3>
                    <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                      {lessonData.vocabulary.theme}
                    </span>
                  </div>

                  {/* Dynamic Words list */}
                  <div className="space-y-4">
                    {lessonData.vocabulary.words.map((w: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="p-4 bg-slate-50 dark:bg-slate-850/40 rounded-2xl hover:bg-slate-100/80 dark:hover:bg-slate-850 transition-colors border-r-4 border-emerald-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="space-y-1 text-right w-full">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-plus-jakarta text-sm">{w.word}</span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-sans" dir="ltr">{w.phonetics}</span>
                            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {w.arabicTranslation}
                            </span>
                          </div>
                          <p className="text-xs text-slate-550 dark:text-slate-400 text-left font-sans mt-1 leading-relaxed" dir="ltr">{w.definition}</p>
                          <p className="text-xs italic text-indigo-600 dark:text-indigo-400 text-left font-sans" dir="ltr">"{w.exampleSentence}"</p>
                        </div>
                        <button 
                          onClick={() => speakText(`${w.word}. ${w.exampleSentence}`)} 
                          className="text-[11px] bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shrink-0 text-slate-650 dark:text-slate-350 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t.listeningBtn}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Matching Game */}
                  <div className="p-5 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-300 tracking-wider">
                        {t.matchingTitle}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-605 dark:text-slate-400 leading-relaxed">
                      {t.matchingDesc}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left: Term keys */}
                      <div className="space-y-2">
                        {lessonData.vocabulary.matchingChallenge.map((item: any, idx: number) => (
                          <div 
                            key={idx} 
                            className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 text-left font-plus-jakarta" 
                            dir="ltr"
                          >
                            {idx + 1}. {item.term}
                          </div>
                        ))}
                      </div>

                      {/* Right: Definition Dropdowns */}
                      <div className="space-y-2">
                        {lessonData.vocabulary.matchingChallenge.map((item: any, idx: number) => (
                          <div key={idx} className="relative">
                            <select 
                              value={vocabMatches[idx] !== undefined ? vocabMatches[idx] : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVocabMatches(prev => ({
                                  ...prev,
                                  [idx]: val === '' ? -1 : parseInt(val, 10)
                                }));
                              }}
                              className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 focus:ring-1 focus:ring-indigo-500 font-sans cursor-pointer appearance-none" 
                              dir="ltr"
                            >
                              <option value="">{t.matchingSelectDefault.replace('...', `#${idx + 1}`)}</option>
                              {shuffledDefs.map((def) => (
                                <option key={def.id} value={def.id}>{def.text}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                      <button 
                        onClick={checkVocabMatching} 
                        className="w-full sm:w-auto bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        {t.matchingCheck}
                      </button>
                      {vocabFeedback && (
                        <div className={`text-xs font-bold flex items-center gap-1.5 ${vocabFeedback.isError ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {vocabFeedback.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          <span>{vocabFeedback.text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: GRAMMAR */}
              {activeTab === 'grammar' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-300">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span>{t.grammarTitle}</span>
                    </h3>
                  </div>

                  <div className="p-4.5 bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{lessonData.grammar.title}</h4>
                    <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-sans" dir="ltr">
                      {lessonData.grammar.conceptExplanation}
                    </p>
                  </div>

                  {/* Grammatical Rules Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lessonData.grammar.rules.map((rule: any, idx: number) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-850/20 p-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-left" dir="ltr">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-2.5 border-b border-slate-200 dark:border-slate-805 pb-1.5 font-sans">
                          {rule.rule}
                        </h4>
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-350 font-mono">
                          {rule.example}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Grammar Quiz */}
                  <div className="p-5 bg-amber-50/30 dark:bg-amber-950/10 rounded-2xl border border-amber-100 dark:border-amber-900/40 space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
                        {t.grammarQuizTitle}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                      {t.grammarQuizDesc}
                    </p>
                    
                    <div className="space-y-4">
                      {lessonData.grammar.quickQuiz.map((quiz: any, quizIdx: number) => (
                        <div key={quizIdx} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-right space-y-3">
                          <p className="font-bold text-slate-700 dark:text-slate-300 text-xs text-left font-sans" dir="ltr">
                            {quizIdx + 1}. {quiz.question}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-4 pt-1" dir="ltr">
                            {quiz.options.map((opt: string, optIdx: number) => (
                              <label key={optIdx} className="flex items-center space-x-2 space-x-reverse cursor-pointer font-sans text-xs text-slate-650 dark:text-slate-355 select-none">
                                <input 
                                  type="radio" 
                                  name={`grammar-quiz-${quizIdx}`} 
                                  value={optIdx} 
                                  checked={quizAnswers[quizIdx] === optIdx}
                                  onChange={() => {
                                    setQuizAnswers(prev => ({
                                      ...prev,
                                      [quizIdx]: optIdx
                                    }));
                                  }}
                                  className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 border-slate-300 cursor-pointer" 
                                />
                                <span className="pl-1.5">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
                      <button 
                        onClick={checkGrammarQuiz} 
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        {t.grammarQuizCheck}
                      </button>
                      {quizFeedback && (
                        <div className={`text-xs font-bold flex items-center gap-1.5 ${quizFeedback.isError ? 'text-rose-500' : 'text-emerald-600'}`}>
                          {quizFeedback.isError ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          <span>{quizFeedback.text}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: PRONUNCIATION */}
              {activeTab === 'pron' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-300">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Volume2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                      <span>{t.pronTitle}</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lessonData.pronunciation.soundsToCompare.map((soundDesc: string, idx: number) => (
                      <div key={idx} className="p-5 bg-sky-50/30 dark:bg-sky-950/10 rounded-2xl border border-sky-100 dark:border-sky-900/30 space-y-3 text-center">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sound & Accent Contrast</div>
                        <p className="text-xs text-slate-650 dark:text-slate-350 font-sans leading-relaxed font-semibold" dir="ltr">{soundDesc}</p>
                        <button 
                          onClick={() => speakText(soundDesc)} 
                          className="mt-2 text-xs bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 px-4 py-2 rounded-full mx-auto flex items-center gap-1.5 hover:bg-sky-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>{t.pronListenBtn}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-850/30 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{t.pronGuideTitle}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t.pronGuideDesc}
                    </p>
                    
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {lessonData.pronunciation.wordsWithAudio.map((word: string, idx: number) => (
                        <button 
                          key={idx}
                          onClick={() => speakText(word)} 
                          className="bg-white dark:bg-slate-900 hover:border-indigo-400 dark:hover:border-indigo-700 border border-slate-200 dark:border-slate-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm text-slate-750 dark:text-slate-350 font-bold font-plus-jakarta cursor-pointer"
                          dir="ltr"
                        >
                          <span>{word}</span>
                          <Play className="w-3 h-3 text-slate-400 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: PRACTICAL ENGLISH */}
              {activeTab === 'dialogue' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-300">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      <span>{t.practicalTitle}</span>
                    </h3>
                    <button 
                      onClick={playFullDialogue} 
                      className="bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{t.practicalPlayFull}</span>
                    </button>
                  </div>

                  {/* Scenario card */}
                  <div className="p-4 bg-teal-50/30 dark:bg-teal-950/10 rounded-2xl border border-teal-100/80 dark:border-teal-900/30">
                    <h4 className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-widest">{t.practicalScenarioTitle}</h4>
                    <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed mt-1 font-sans" dir="ltr">
                      {lessonData.practicalEnglish.scenario}
                    </p>
                  </div>

                  {/* Dynamic Dialogue Visualizer */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-850/10 shadow-sm">
                    <div className="bg-slate-900 text-white px-4 py-3 text-xs font-bold uppercase tracking-wider">
                      {t.practicalDialogueHeader}
                    </div>
                    <div className="p-4.5 space-y-4">
                      {lessonData.practicalEnglish.dialogue.map((turn: any, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2 space-x-reverse text-left font-sans" dir="ltr">
                          <span className="font-black text-indigo-700 dark:text-indigo-400 w-16 shrink-0 text-right pr-2 select-none">
                            {turn.speaker}:
                          </span>
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs max-w-lg text-slate-800 dark:text-slate-300 text-xs leading-relaxed">
                            {turn.speech}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Conversational Expressions */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{t.practicalExpressionsHeader}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {lessonData.practicalEnglish.expressions.map((exp: any, idx: number) => (
                        <div key={idx} className="p-3.5 bg-teal-50/20 dark:bg-teal-950/5 rounded-xl border border-teal-100/50 dark:border-teal-900/20 text-left font-sans" dir="ltr">
                          <strong className="text-slate-900 dark:text-slate-200 text-xs font-bold">{exp.expression}</strong>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{exp.use}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: WRITING CHALLENGE */}
              {activeTab === 'challenge' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors duration-300">
                  <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <PenTool className="w-5 h-5 text-purple-650 dark:text-purple-400" />
                      <span>{t.challengeTitle}</span>
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-405 leading-relaxed">
                    {t.challengeDesc}
                  </p>

                  <div className="space-y-4">
                    {lessonData.writingChallenge.questions.map((q: string, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <label className="block font-semibold text-slate-700 dark:text-slate-350 text-xs text-left font-sans" dir="ltr">
                          {idx + 1}. {q}
                        </label>
                        <textarea 
                          value={writingAnswers[idx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWritingAnswers(prev => ({
                              ...prev,
                              [idx]: val,
                            }));
                          }}
                          rows={3} 
                          className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-xs font-sans resize-none" 
                          dir="ltr" 
                          placeholder="Write your complete response here..."
                        />
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={submitWritingAnswers}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <span>{t.challengeSubmit}</span>
                  </button>

                  {writingFeedbackVisible && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-2xl space-y-2 animate-fadeIn">
                      <h4 className="font-bold text-sm">{t.challengeFeedbackTitle}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {t.challengeFeedbackDesc}
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </section>

      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 text-center py-8 border-t border-slate-900 mt-12 transition-colors duration-300">
        <p className="text-xs">{t.footerText1}</p>
        <p className="text-[10px] text-slate-500 mt-1.5">{t.footerText2}</p>
      </footer>

      {/* Settings Modal (LightBox style overlay) */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-250 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl transition-colors duration-300">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Settings className="w-5 h-5" />
                <span>{t.settingsTitle}</span>
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <SettingsForm 
              initialLang={lang}
              initialTheme={theme}
              initialAccent={accent}
              initialApiKey={apiKey}
              t={t}
              onSave={saveSettings}
              onClose={() => setShowSettings(false)}
            />

          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Settings form logic to isolate render state
function SettingsForm({
  initialLang,
  initialTheme,
  initialAccent,
  initialApiKey,
  t,
  onSave,
  onClose,
}: {
  initialLang: Language;
  initialTheme: 'light' | 'dark' | 'system';
  initialAccent: 'UK' | 'US';
  initialApiKey: string;
  t: any;
  onSave: (lang: Language, theme: 'light' | 'dark' | 'system', accent: 'UK' | 'US', key: string) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(initialTheme);
  const [accent, setAccent] = useState<'UK' | 'US'>(initialAccent);
  const [apiKey, setApiKey] = useState<string>(initialApiKey);

  return (
    <div className="p-6 space-y-5">
      {/* Language setting */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>{t.settingsLang}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            onClick={() => setLang('AR')}
            className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
              lang === 'AR'
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350'
            }`}
          >
            العربية (AR)
          </button>
          <button 
            type="button"
            onClick={() => setLang('EN')}
            className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
              lang === 'EN'
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350'
            }`}
          >
            English (EN)
          </button>
        </div>
      </div>

      {/* Theme setting */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-sky-500" />
          <span>{t.settingsTheme}</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'light', label: t.settingsThemeLight, icon: Sun },
            { id: 'dark', label: t.settingsThemeDark, icon: Moon },
            { id: 'system', label: t.settingsThemeSystem, icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button 
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id as any)}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent setting */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-emerald-500" />
          <span>{t.settingsAccent}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button 
            type="button"
            onClick={() => setAccent('UK')}
            className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
              accent === 'UK'
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350'
            }`}
          >
            {t.settingsThemeLight === 'مضيء' ? 'بريطاني (UK)' : 'British (UK)'}
          </button>
          <button 
            type="button"
            onClick={() => setAccent('US')}
            className={`py-2 rounded-xl text-xs font-semibold cursor-pointer border ${
              accent === 'US'
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-850 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350'
            }`}
          >
            {t.settingsThemeLight === 'مضيء' ? 'أمريكي (US)' : 'American (US)'}
          </button>
        </div>
      </div>

      {/* API Key setting */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>{t.settingsApiKey}</span>
        </label>
        <input 
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full p-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-xs font-sans"
          placeholder="AIzaSy..."
        />
        <p className="text-[10px] text-slate-400 leading-normal">
          {t.settingsApiKeyHelp}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
        <button 
          type="button"
          onClick={() => onSave(lang, theme, accent, apiKey)}
          className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
        >
          {t.settingsSave}
        </button>
        <button 
          type="button"
          onClick={onClose}
          className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center border border-slate-200/40 dark:border-slate-700/60"
        >
          {t.settingsClose}
        </button>
      </div>
    </div>
  );
}
