import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  theme?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  onChange, 
  language = 'javascript',
  theme = 'vs-dark' 
}) => {
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Configure editor settings if needed
    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 14,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 16, bottom: 16 },
    });
  };

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#1e1e1e] shadow-lg">
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
};
