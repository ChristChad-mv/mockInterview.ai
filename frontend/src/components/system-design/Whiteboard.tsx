/**
 * Whiteboard component for system design interviews.
 * Uses tldraw as the canvas engine with custom theming.
 */

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';

export interface WhiteboardHandle {
  /** Capture a screenshot of the canvas as a base64 data URL */
  captureSnapshot: () => string | null;
  /** Get the tldraw editor instance */
  getEditor: () => Editor | null;
}

interface WhiteboardProps {
  className?: string;
}

const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(
  ({ className }, ref) => {
    const editorRef = useRef<Editor | null>(null);

    const handleMount = useCallback((editor: Editor) => {
      editorRef.current = editor;

      // Set dark mode
      editor.user.updateUserPreferences({ colorScheme: 'dark' });

      // Zoom to fit
      editor.zoomToFit();
    }, []);

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => {
        const editor = editorRef.current;
        if (!editor) return null;

        // Use the tldraw canvas element to capture a snapshot
        const container = editor.getContainer();
        const canvas = container?.querySelector('canvas');
        if (canvas) {
          try {
            return canvas.toDataURL('image/jpeg', 0.6);
          } catch {
            return null;
          }
        }
        return null;
      },
      getEditor: () => editorRef.current,
    }));

    return (
      <div className={`w-full h-full ${className ?? ''}`} style={{ position: 'relative' }}>
        <Tldraw
          onMount={handleMount}
          inferDarkMode
        />
      </div>
    );
  }
);

Whiteboard.displayName = 'Whiteboard';
export default Whiteboard;
