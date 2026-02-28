import StyleEventEditor from "@/components/style-event-editor";
import { Sparkles } from "lucide-react";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[#0f0f0f] text-zinc-300">
      {/* Brand bar */}
      <nav className="w-full max-w-screen-lg flex items-center justify-between px-8 pt-6 pb-2">
        <div className="flex items-center gap-2.5 opacity-40 hover:opacity-80 transition-opacity">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-xs font-bold tracking-[0.35em] uppercase text-zinc-400">
            StyleEvent
          </span>
          <span className="text-[10px] text-zinc-600 tracking-wide">
            风格写作
          </span>
        </div>
        <a
          href="/prototype"
          className="text-[10px] text-zinc-600 hover:text-zinc-400 tracking-wider uppercase transition-colors"
        >
          Prototype
        </a>
      </nav>

      {/* Main editor */}
      <main className="flex-1 w-full flex flex-col items-center pt-4 pb-24">
        <StyleEventEditor />
      </main>
    </div>
  );
}
