/**
 * MockInterview.ai — use-live-api.ts
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { MultimodalLiveClient } from "../utils/multimodal-live-client";
import { AudioStreamer } from "../utils/audio-streamer";
import { audioContext } from "../utils/utils";
import VolMeterWorket from "../utils/worklets/vol-meter";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  connected: boolean;
  connect: (voice?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export type UseLiveAPIProps = {
  url?: string;
  userId?: string;
  onRunIdChange?: Dispatch<SetStateAction<string>>;
};

export function useLiveAPI({
  url,
  userId,
}: UseLiveAPIProps): UseLiveAPIResults {
  const client = useMemo(
    () => new MultimodalLiveClient({ url, userId }),
    [url, userId],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
            setVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          });
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    };

    const onSetupComplete = () => {
      setConnected(true);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client
      .on("close", onClose)
      .on("setupcomplete", onSetupComplete)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("close", onClose)
        .off("setupcomplete", onSetupComplete)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio);
    };
  }, [client]);

  const connect = useCallback(async (voice?: string) => {
    client.disconnect();
    await client.connect(undefined, voice);
    // Wait for setupcomplete before resolving — so callers know the session is ready
    await new Promise<void>((resolve) => {
      const onReady = () => {
        client.off("setupcomplete", onReady);
        resolve();
      };
      client.on("setupcomplete", onReady);
    });
  }, [client]);

  const disconnect = useCallback(async () => {
    // Stop audio playback FIRST so the agent voice cuts immediately
    audioStreamerRef.current?.stop();
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    connected,
    connect,
    disconnect,
    volume,
  };
}
