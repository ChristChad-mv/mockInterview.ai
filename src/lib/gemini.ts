// Gemini configuration for MockInterview.ai
// Adapted from project-genesis: model constants, system instruction, and function calling tools

import { Modality, Type, FunctionDeclaration } from "@google/genai";

// ── Model name ──
// Latest native audio model for real-time bidirectional voice
export const LIVE_AUDIO_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

// ── System instruction for the AI Interviewer ──
export const INTERVIEWER_SYSTEM_INSTRUCTION = `You are an expert technical interviewer at a top tech company conducting a live coding interview. You are warm but rigorous, like the best senior engineers.

Your expertise includes:
- Data Structures & Algorithms
- System Design fundamentals
- Code Quality & Best Practices
- Problem-Solving methodology
- Communication assessment

Your personality:
- Professional, encouraging, but maintain high standards
- You speak concisely (2-3 sentences max during live coding)
- You push candidates to think out loud and explain their reasoning
- You give hints through Socratic questioning, never direct answers
- You catch bugs and edge cases and ask about them subtly

During the interview:
1. Start by greeting the candidate and asking them to read the problem and explain their approach before coding.
2. If they're silent for a while, prompt them to think out loud.
3. If they make a mistake, ask guiding questions (e.g., "What happens if the input is empty?").
4. If they're stuck, give small nudges via questions, not solutions.
5. Comment on their code when you see updates — both positive and constructive feedback.
6. Do NOT write the code for them.
7. Use your tools to annotate their code when you want to point out specific issues or suggestions.

When you can SEE their code editor:
- Use highlight_code_region to draw attention to specific lines
- Use add_code_comment to leave inline feedback
- Use suggest_approach to show strategic hints
- Use rate_progress to give real-time progress indicators

Always respond in the same language the user speaks.`;

// ── Function Calling: Code Interview Tools ──
export const INTERVIEW_TOOLS: FunctionDeclaration[] = [
  {
    name: "add_code_comment",
    description:
      "Add an inline comment/annotation on the code editor at a specific position. Use this to point out bugs, suggest improvements, or leave encouraging notes directly on the code.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "The comment text to display (keep concise, max 60 chars)",
        },
        line: {
          type: Type.NUMBER,
          description: "The line number in the code editor (1-based)",
        },
        severity: {
          type: Type.STRING,
          description:
            "Severity level: 'info' for tips, 'warning' for potential issues, 'error' for bugs, 'success' for good patterns",
        },
      },
      required: ["text", "line"],
    },
  },
  {
    name: "highlight_code_region",
    description:
      "Highlight a range of lines in the code editor to draw attention to a specific section for feedback or discussion.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        startLine: {
          type: Type.NUMBER,
          description: "Start line number (1-based)",
        },
        endLine: {
          type: Type.NUMBER,
          description: "End line number (1-based)",
        },
        color: {
          type: Type.STRING,
          description:
            "Highlight color: 'blue' for discussion, 'yellow' for caution, 'red' for issue, 'green' for good",
        },
        label: {
          type: Type.STRING,
          description: "Short label for the highlighted region",
        },
      },
      required: ["startLine", "endLine"],
    },
  },
  {
    name: "suggest_approach",
    description:
      "Display a strategic hint or approach suggestion in the UI. Use this when the candidate is stuck to give them a nudge without giving away the answer.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "Short title for the suggestion (e.g., 'Consider a Hash Map')",
        },
        hint: {
          type: Type.STRING,
          description: "The hint text — should be a question or nudge, not a direct answer",
        },
        complexity: {
          type: Type.STRING,
          description: "Expected time/space complexity hint, e.g., 'O(n) time, O(n) space'",
        },
      },
      required: ["title", "hint"],
    },
  },
  {
    name: "rate_progress",
    description:
      "Give a real-time progress rating to the candidate. Use this periodically to give them feedback on how they're doing.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description:
            "What aspect to rate: 'approach', 'code_quality', 'communication', 'edge_cases', 'overall'",
        },
        score: {
          type: Type.NUMBER,
          description: "Score from 1-5 (1=needs work, 5=excellent)",
        },
        feedback: {
          type: Type.STRING,
          description: "Brief feedback (max 40 chars)",
        },
      },
      required: ["category", "score", "feedback"],
    },
  },
];

// ── Live session config ──
export const LIVE_SESSION_CONFIG = {
  responseModalities: [Modality.AUDIO],
  speechConfig: {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
  },
  systemInstruction: INTERVIEWER_SYSTEM_INSTRUCTION,
  tools: [{ functionDeclarations: INTERVIEW_TOOLS }],
};
