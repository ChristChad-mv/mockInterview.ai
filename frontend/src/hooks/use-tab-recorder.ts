/**
 * useTabRecorder — Records the current browser tab (video + audio)
 * using getDisplayMedia + MediaRecorder.
 *
 * On Chrome, `preferCurrentTab: true` auto-selects the current tab
 * without showing the picker dialog.
 *
 * Returns a WebM Blob when stopped, ready for upload to the backend.
 */

import { useRef, useCallback, useState } from 'react';

export interface UseTabRecorderResult {
  /** Start recording the current tab */
  startRecording: () => Promise<boolean>;
  /** Stop recording and return the video blob */
  stopRecording: () => Promise<Blob | null>;
  /** Whether recording is currently active */
  isRecording: boolean;
}

export function useTabRecorder(): UseTabRecorderResult {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Request current tab capture with audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // @ts-expect-error — preferCurrentTab is a Chrome-specific constraint
          preferCurrentTab: true,
          frameRate: { ideal: 5, max: 10 }, // Low FPS — we care about content, not smoothness
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true, // Capture tab audio (AI voice)
      });

      // Also capture mic audio for the user's voice
      let combinedStream: MediaStream;
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });

        // Combine tab video + tab audio + mic audio
        const audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();

        // Add tab audio tracks
        displayStream.getAudioTracks().forEach((track) => {
          const source = audioCtx.createMediaStreamSource(
            new MediaStream([track]),
          );
          source.connect(dest);
        });

        // Add mic audio
        micStream.getAudioTracks().forEach((track) => {
          const source = audioCtx.createMediaStreamSource(
            new MediaStream([track]),
          );
          source.connect(dest);
        });

        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } catch {
        // If mic fails, just use tab stream
        console.warn('Could not capture mic audio, using tab audio only');
        combinedStream = displayStream;
      }

      streamRef.current = combinedStream;
      chunksRef.current = [];

      // Use VP8+Opus in WebM — widely supported, good compression
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 500_000, // 500kbps — sufficient for screen content
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.start(5000); // Collect chunks every 5s
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Auto-stop if user stops sharing via browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
      };

      return true;
    } catch (err) {
      console.error('Failed to start tab recording:', err);
      setIsRecording(false);
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      return null;
    }

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'video/webm',
        });
        chunksRef.current = [];

        // Stop all tracks to release the screen share indicator
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);

        resolve(blob);
      };

      recorder.stop();
    });
  }, []);

  return { startRecording, stopRecording, isRecording };
}
