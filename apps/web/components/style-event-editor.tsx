"use client";

import { defaultEditorContent } from "@/lib/content";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { defaultExtensions } from "./tailwind/extensions";
import { ColorSelector } from "./tailwind/selectors/color-selector";
import { LinkSelector } from "./tailwind/selectors/link-selector";
import { MathSelector } from "./tailwind/selectors/math-selector";
import { NodeSelector } from "./tailwind/selectors/node-selector";
import { Separator } from "./tailwind/ui/separator";

import GenerativeMenuSwitch from "./tailwind/generative/generative-menu-switch";
import { uploadFn } from "./tailwind/image-upload";
import { TextButtons } from "./tailwind/selectors/text-buttons";
import { slashCommand, suggestionItems } from "./tailwind/slash-command";

import InspirationPanel from "./inspiration-panel";
import ResonanceBridge from "./resonance-bridge";
import { useResonanceTrigger } from "@/hooks/use-resonance-trigger";

const hljs = require("highlight.js");

const extensions = [...defaultExtensions, slashCommand];

export default function StyleEventEditor() {
  const [initialContent, setInitialContent] = useState<null | JSONContent>(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [charsCount, setCharsCount] = useState<number>();

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const { items, loading, trigger, triggerImmediate } = useResonanceTrigger();

  const highlightCodeblocks = (content: string) => {
    const doc = new DOMParser().parseFromString(content, "text/html");
    doc.querySelectorAll("pre code").forEach((el) => {
      // @ts-ignore
      hljs.highlightElement(el);
    });
    return new XMLSerializer().serializeToString(doc);
  };

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.words());
    window.localStorage.setItem("html-content", highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem("novel-content", JSON.stringify(json));
    window.localStorage.setItem("markdown", editor.storage.markdown.getMarkdown());
    setSaveStatus("Saved");
  }, 500);

  useEffect(() => {
    const content = window.localStorage.getItem("novel-content");
    if (content) setInitialContent(JSON.parse(content));
    else setInitialContent(defaultEditorContent);
  }, []);

  if (!initialContent) return null;

  return (
    <EditorRoot>
      <div className="relative w-full max-w-screen-lg mx-auto">
        {/* Inspiration panel — above editor */}
        <InspirationPanel items={items} loading={loading} />

        {/* Editor area */}
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="relative min-h-[500px] w-full max-w-screen-lg bg-transparent sm:mb-[calc(10vh)]"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
          }}
          slotAfter={<ImageResizer />}
        >
          {/* Bridge: reads editor state inside EditorRoot and calls trigger */}
          <ResonanceBridge onTrigger={trigger} onSelectionTrigger={triggerImmediate} />

          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-muted-foreground">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command(val)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-accent aria-selected:bg-accent"
                  key={item.title}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </div>

      {/* Status bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-50 select-none">
        <div className="flex items-center gap-3 text-zinc-600 text-[10px] tracking-[0.3em] uppercase">
          <span>{saveStatus}</span>
          {charsCount !== undefined && <span>{charsCount} words</span>}
        </div>
        {loading && (
          <span className="text-violet-400/80 text-[10px] font-bold tracking-[0.4em] uppercase animate-pulse">
            Resonating
          </span>
        )}
        {!loading && items.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-violet-400 scale-[2]" />
            <span className="text-violet-400 text-[8px] font-bold tracking-[0.5em] uppercase">
              StyleEvent Active
            </span>
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex items-center gap-2 opacity-30">
            <div className="w-0.5 h-0.5 rounded-full bg-zinc-500" />
            <span className="text-[8px] font-bold tracking-[0.5em] uppercase">Focus</span>
          </div>
        )}
      </div>
    </EditorRoot>
  );
}
