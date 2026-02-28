"use client";

import React, { useState, useRef } from "react";
import { Sparkles, Wind } from "lucide-react";

const GLOBAL_STYLES = `
  @keyframes float-slow {
    0%, 100% { transform: translateY(0px) scale(1); }
    50% { transform: translateY(-8px) scale(1.02); }
  }
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
    to { opacity: 1; transform: translateY(0); filter: blur(0); }
  }
  .text-glow {
    text-shadow: 0 0 15px rgba(99, 102, 241, 0.1);
  }
  textarea::placeholder { font-style: italic; opacity: 0.2; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
`;

function mockResonance(input: string): string[] {
  const cards: string[] = [];
  const normalizedInput = input.toLowerCase();

  if (
    normalizedInput.includes("累") ||
    normalizedInput.includes("走") ||
    normalizedInput.includes("汗")
  ) {
    cards.push("戍卒每日步行五十里，计筹枯燥");
    cards.push("某种生理性的沉重");
  }
  if (
    normalizedInput.includes("夕阳") ||
    normalizedInput.includes("晚霞") ||
    normalizedInput.includes("红")
  ) {
    cards.push("瑞利散射的物理显影");
    cards.push("生锈的余晖与铁轨并置");
    cards.push("长波段的红橙光扩散");
  }
  if (
    normalizedInput.includes("琴") ||
    normalizedInput.includes("乐") ||
    normalizedInput.includes("手")
  ) {
    cards.push("榔头击弦前的瞬间脱开");
    cards.push("机械反馈产生的断裂感");
  }

  if (cards.length === 0 && input.trim().length > 5) {
    cards.push("尝试寻找更精准的名词");
    cards.push("意识流转换的契机");
  }

  return [...new Set(cards)];
}

export default function StyleEventPrototype() {
  const [text, setText] = useState("");
  const [resonanceCards, setResonanceCards] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setIsTyping(true);
    setShowOverlay(false);
    setIsRetrieving(false);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      const newCards = mockResonance(val);
      if (newCards.length > 0) {
        setIsRetrieving(true);
        setTimeout(() => {
          setIsRetrieving(false);
          setResonanceCards(newCards);
          setShowOverlay(true);
        }, 500);
      }
    }, 900);
  };

  return (
    <div className="flex h-screen w-full bg-[#fafafa] text-slate-800 font-sans overflow-hidden select-none relative">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      <nav className="absolute top-0 left-0 w-full h-20 flex items-center justify-between px-12 z-[60] pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto opacity-30 hover:opacity-100 transition-opacity">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold tracking-[0.4em] uppercase">
            StyleEvent
          </span>
          <span className="text-[10px] text-slate-400 tracking-wide">
            风格写作
          </span>
        </div>
      </nav>

      <div
        className={`absolute inset-0 transition-opacity duration-[2000ms] -z-10 ${showOverlay ? "opacity-100" : "opacity-0"}`}
      >
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-indigo-50/30 rounded-full blur-[100px]" />
      </div>

      <main className="flex-1 flex flex-col items-center relative overflow-y-auto no-scrollbar pt-24 pb-64">
        <div
          className={`w-full max-w-4xl px-8 z-40 transition-all duration-1000 flex flex-wrap justify-center items-center gap-x-10 gap-y-6 min-h-[140px] mb-8 ${showOverlay ? "opacity-100" : "opacity-0 pointer-events-none translate-y-2"}`}
        >
          {resonanceCards.map((phrase, idx) => (
            <div
              key={idx}
              className="relative py-1.5 px-3 animate-[fade-in-up_1s_ease-out_forwards]"
              style={
                showOverlay
                  ? {
                      animationDelay: idx * 150 + "ms",
                      animation:
                        "float-slow " + (6 + idx) + "s ease-in-out infinite",
                    }
                  : undefined
              }
            >
              <div className="absolute inset-0 bg-white/30 blur-lg rounded-full -z-10" />
              <span className="text-base md:text-lg font-serif text-slate-500/80 tracking-wide text-glow transition-all hover:text-indigo-500 cursor-default">
                {phrase}
              </span>
            </div>
          ))}
        </div>

        <div className="w-full max-w-2xl px-8 transition-all duration-700">
          <textarea
            autoFocus
            value={text}
            onChange={handleTextChange}
            placeholder="写下此刻的直觉..."
            className="w-full min-h-[60vh] bg-transparent border-none focus:ring-0 text-2xl leading-[2.2] text-slate-800 placeholder-slate-200 resize-none font-serif tracking-tight focus:outline-none"
          />
        </div>

        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-10 z-[70]">
          {isRetrieving && (
            <div className="flex items-center gap-2 text-indigo-300 animate-pulse">
              <Wind
                className="w-4 h-4 animate-spin"
                style={{ animationDuration: "5s" }}
              />
              <span className="text-[9px] font-black uppercase tracking-[0.4em]">
                Resonating
              </span>
            </div>
          )}
          {!isRetrieving &&
            resonanceCards.length > 0 &&
            !isTyping && (
              <button
                type="button"
                onClick={() => setShowOverlay(!showOverlay)}
                className="group flex flex-col items-center gap-2 transition-all"
              >
                <div
                  className={`w-1 h-1 rounded-full transition-all duration-700 ${showOverlay ? "bg-indigo-400 scale-[2.5]" : "bg-slate-200"}`}
                />
                <span
                  className={`text-[8px] font-black uppercase tracking-[0.5em] transition-opacity duration-700 ${showOverlay ? "opacity-100 text-indigo-400" : "opacity-0"}`}
                >
                  StyleEvent Active
                </span>
              </button>
            )}
          {!isRetrieving && (resonanceCards.length === 0 || isTyping) && (
            <div className="flex items-center gap-2 opacity-10">
              <div
                className={`w-0.5 h-0.5 rounded-full ${isTyping ? "bg-indigo-400 animate-ping" : "bg-slate-400"}`}
              />
              <span className="text-[8px] font-black uppercase tracking-[0.5em]">
                Focus
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
