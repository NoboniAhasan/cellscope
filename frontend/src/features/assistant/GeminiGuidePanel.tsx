import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import { AnalysisRun } from '../../types';

export type GuideErrorMode = 'none' | 'timeout' | 'quota' | 'generic';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  language: 'en' | 'bn';
  isError?: boolean;
}

interface GeminiGuidePanelProps {
  run: AnalysisRun | null;
}

const SUGGESTED_EN = [
  'Why were some objects not detected?',
  'What does this warning mean?',
  'What does circularity mean?',
];

const SUGGESTED_BN = [
  'কিছু অবজেক্ট কেন শনাক্ত হয়নি?',
  'এই সতর্কবার্তাটির অর্থ কী?',
  'বৃত্তাকারতা বা Circularity কী?',
];

export function GeminiGuidePanel({ run }: GeminiGuidePanelProps) {
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [errorMode, setErrorMode] = useState<GuideErrorMode>('none');
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const explainMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!run) throw new Error('No run selected');
      return api.explain({ analysisId: run.id, question, language, errorMode });
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.answer, language: data.language },
      ]);
    },
    onError: (err: Error) => {
      let msg =
        language === 'en'
          ? `❌ ${err.message}`
          : `❌ ত্রুটি: ${err.message}`;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: msg, language, isError: true },
      ]);
    },
  });

  const send = (question: string) => {
    const q = question.trim();
    if (!q || !run) return;
    setMessages((prev) => [...prev, { role: 'user', text: q, language }]);
    setInput('');
    explainMutation.mutate(q);
  };

  const isBangla = language === 'bn';
  const suggestedQuestions = isBangla ? SUGGESTED_BN : SUGGESTED_EN;

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50 overflow-hidden">
      {/* Header / Toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-controls="gemini-guide-body"
      >
        <span className="flex items-center gap-2">
          <span>✨</span>
          <span>Gemini Guide (মক / Mock)</span>
        </span>
        <span className="text-lg">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div id="gemini-guide-body" className="flex flex-col gap-3 p-4">
          {/* Disclaimer */}
          <div
            role="note"
            className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-xs text-yellow-800"
          >
            ⚠️{' '}
            <strong>AI explanations may be wrong and are not scientific or medical advice.</strong>
            {isBangla && (
              <span className="font-bangla block mt-1">
                AI ব্যাখ্যা ভুল হতে পারে এবং এটি বৈজ্ঞানিক বা চিকিৎসা পরামর্শ নয়।
              </span>
            )}
          </div>

          {/* Language Toggle */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-500 font-medium">Language:</span>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                language === 'en'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
              }`}
              aria-pressed={language === 'en'}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('bn')}
              className={`px-3 py-1 text-xs rounded-full border font-medium font-bangla transition-colors ${
                language === 'bn'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
              }`}
              aria-pressed={language === 'bn'}
            >
              বাংলা
            </button>
          </div>

          {/* Dev Error Simulation (dev toggle) */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-xs text-slate-500 font-medium shrink-0">🛠 Dev:</span>
            <select
              value={errorMode}
              onChange={(e) => setErrorMode(e.target.value as GuideErrorMode)}
              className="text-xs bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              aria-label="Simulate error mode"
            >
              <option value="none">Normal</option>
              <option value="timeout">Timeout (408)</option>
              <option value="quota">Quota Exceeded (429)</option>
              <option value="generic">Generic Error (500)</option>
            </select>
          </div>

          {/* No run state */}
          {!run && (
            <p className="text-sm text-slate-500 italic text-center py-4">
              Run an analysis first to use the Gemini Guide.
            </p>
          )}

          {run && (
            <>
              {/* Suggested questions */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 font-medium">
                  {isBangla ? 'সাজেস্টেড প্রশ্ন:' : 'Suggested questions:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => send(q)}
                      disabled={explainMutation.isPending}
                      className={`text-xs border border-indigo-300 bg-white text-indigo-700 rounded-full px-3 py-1 hover:bg-indigo-50 transition-colors disabled:opacity-50 ${
                        isBangla ? 'font-bangla' : ''
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation history */}
              {messages.length > 0 && (
                <div
                  className="flex flex-col gap-2 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg p-3"
                  aria-live="polite"
                  aria-label="Conversation history"
                >
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : msg.isError
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-800'
                        } ${msg.language === 'bn' ? 'font-bangla' : ''}`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {explainMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-xl px-3 py-2 text-xs text-slate-500 italic animate-pulse">
                        {isBangla ? 'উত্তর তৈরি হচ্ছে…' : 'Thinking…'}
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}

              {/* Text input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isBangla ? 'আপনার প্রশ্ন লিখুন…' : 'Ask a question about this analysis…'
                  }
                  disabled={explainMutation.isPending}
                  className={`flex-1 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 ${
                    isBangla ? 'font-bangla' : ''
                  }`}
                  aria-label="Ask a question"
                />
                <button
                  type="submit"
                  disabled={explainMutation.isPending || !input.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                  aria-label="Send question"
                >
                  {isBangla ? 'পাঠান' : 'Send'}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
