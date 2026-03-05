// Audio utilities for Gemini Live bidirectional audio streaming
// Adapted from project-genesis: handles PCM encoding/decoding between browser AudioContext and Gemini Live API

import type { Blob as GenAIBlob } from "@google/genai";

/**
 * Convert base64 (or base64url) string to Uint8Array
 * Handles both standard base64 and base64url encoding (- and _ chars)
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  let standardBase64 = base64.replace(/[\s\n\r]/g, '');
  standardBase64 = standardBase64.replace(/-/g, '+').replace(/_/g, '/');
  const pad = standardBase64.length % 4;
  if (pad) {
    standardBase64 += '='.repeat(4 - pad);
  }
  const binaryString = atob(standardBase64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert ArrayBuffer to base64 string
 * Used to encode audio data to send to Gemini Live
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Float32 audio samples to PCM16 Blob for Gemini Live
 * Input: Float32Array from ScriptProcessor (values -1.0 to 1.0)
 * Output: GenAI Blob with base64-encoded PCM16 at 16kHz
 */
export function createPcmBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return {
    data: arrayBufferToBase64(int16.buffer),
    mimeType: "audio/pcm;rate=16000",
  };
}

/**
 * Decode PCM16 audio data received from Gemini Live into an AudioBuffer
 * Gemini Live sends audio at 24kHz mono PCM16
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
