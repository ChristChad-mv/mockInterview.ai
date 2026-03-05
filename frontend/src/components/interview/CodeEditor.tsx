import { useRef, useImperativeHandle, forwardRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  theme?: string;
}

export interface CodeEditorHandle {
  /** Capture the editor area as a base64 JPEG for vision */
  captureSnapshot: () => string | null;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ code, onChange, language = 'javascript', theme = 'vs-dark' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const handleEditorDidMount: OnMount = (editor) => {
      editor.updateOptions({
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16, bottom: 16 },
      });
    };

    // Expose capture method to parent via ref — renders code onto canvas for vision
    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const el = containerRef.current;
        if (!el) return null;
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
          // Render code as text on canvas
          ctx.fillStyle = '#d4d4d4';
          ctx.font = '13px "JetBrains Mono", monospace';
          const lines = code.split('\n');
          const lineHeight = 19;
          const paddingTop = 16;
          const paddingLeft = 60;
          lines.forEach((line, i) => {
            ctx.fillStyle = '#858585';
            ctx.fillText(`${i + 1}`, 16, paddingTop + (i + 1) * lineHeight);
            ctx.fillStyle = '#d4d4d4';
            ctx.fillText(line, paddingLeft, paddingTop + (i + 1) * lineHeight);
          });
          // Return as JPEG (smaller payload for the WS)
          return canvas.toDataURL('image/jpeg', 0.8);
        } catch {
          return null;
        }
      },
    }), [code]);

    return (
      <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#1e1e1e]">
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
      </div>
    );
  }
);
