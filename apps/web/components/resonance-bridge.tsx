"use client";

import { useEditor } from "novel";
import { useEffect, useRef } from "react";

interface ResonanceBridgeProps {
  onTrigger: (query: string) => void;
  onSelectionTrigger: (query: string) => void;
}

export default function ResonanceBridge({ onTrigger, onSelectionTrigger }: ResonanceBridgeProps) {
  const { editor } = useEditor();
  const prevSelectionText = useRef("");

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { from } = editor.state.selection;
      const currentNode = editor.state.doc.resolve(from).parent;
      const text = currentNode.textContent;
      if (text && text.trim().length > 1) {
        onTrigger(text);
      }
    };

    const handleSelectionUpdate = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty) {
        prevSelectionText.current = "";
        return;
      }
      const selected = editor.state.doc.textBetween(from, to, " ");
      if (selected && selected.trim().length > 1 && selected !== prevSelectionText.current) {
        prevSelectionText.current = selected;
        onSelectionTrigger(selected);
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, onTrigger, onSelectionTrigger]);

  return null;
}
