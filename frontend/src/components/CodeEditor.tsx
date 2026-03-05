import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { AIOverlay } from './AIOverlay';
import type { AIOverlayItem } from '../types/interview';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  overlayItems?: AIOverlayItem[];
  onDismissOverlay?: (id: string) => void;
}

export interface CodeEditorHandle {
  /** Capture the editor area as a base64 data URL for vision */
  captureSnapshot: () => string | null;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ code, onChange, language = 'javascript', theme = 'vs-dark', overlayItems = [], onDismissOverlay }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
      editor.updateOptions({
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
      });
    };

    // Expose capture method to parent via ref (genesis pattern: direct canvas capture)
    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const el = containerRef.current;
        if (!el) return null;
        // Use html2canvas-style capture — for now, we send a text representation
        // The real vision comes from sending the code as text + any visible screenshot
        // We'll use a hidden canvas approach for actual pixel capture
        try {
          const canvas = document.createElement('canvas');
          const rect = el.getBoundingClientRect();
          canvas.width = rect.width;
          canvas.height = rect.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          // Dark background
          ctx.fillStyle = '#1e1e1e';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          // Render code as text on canvas (simple but effective for vision)
          ctx.fillStyle = '#d4d4d4';
          ctx.font = '13px "JetBrains Mono", monospace';
          const lines = code.split('\n');
          const lineHeight = 19;
          const paddingTop = 16;
          const paddingLeft = 60; // line numbers area
          lines.forEach((line, i) => {
            // Line numbers
            ctx.fillStyle = '#858585';
            ctx.fillText(`${i + 1}`, 16, paddingTop + (i + 1) * lineHeight);
            // Code text
            ctx.fillStyle = '#d4d4d4';
            ctx.fillText(line, paddingLeft, paddingTop + (i + 1) * lineHeight);
          });
          return canvas.toDataURL('image/png');
        } catch {
          return null;
        }
      },
    }), [code]);

    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e] shadow-lg">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={onChange}
          theme={theme}
          onMount={handleEditorDidMount}
          options={{
            fontFamily: '"JetBrains Mono", monospace',
            fontLigatures: true,
          }}
        />
        {/* AI Overlay layer — genesis pattern: overlays rendered on top of the editor */}
        {overlayItems.length > 0 && (
          <AIOverlay items={overlayItems} onDismiss={onDismissOverlay || (() => {})} />
        )}
      </div>
    );
  }
);
