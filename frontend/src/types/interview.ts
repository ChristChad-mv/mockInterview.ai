// Type definitions for AI interviewer actions and overlays
// Adapted from project-genesis canvas types for a code editor context

/** A single action the AI can perform on the code editor */
export interface InterviewAction {
  action:
    | "add_code_comment"
    | "highlight_code_region"
    | "suggest_approach"
    | "rate_progress";
  params: any;
}

/** An inline code comment overlay */
export interface CodeComment {
  id: string;
  line: number;
  text: string;
  severity: "info" | "warning" | "error" | "success";
}

/** A highlighted region of code */
export interface CodeHighlight {
  id: string;
  startLine: number;
  endLine: number;
  color: "blue" | "yellow" | "red" | "green";
  label?: string;
}

/** A strategic approach suggestion */
export interface ApproachSuggestion {
  id: string;
  title: string;
  hint: string;
  complexity?: string;
}

/** A real-time progress rating */
export interface ProgressRating {
  id: string;
  category: "approach" | "code_quality" | "communication" | "edge_cases" | "overall";
  score: number; // 1-5
  feedback: string;
}

/** All AI overlay items that can appear in the UI */
export type AIOverlayItem =
  | { type: "comment"; data: CodeComment }
  | { type: "highlight"; data: CodeHighlight }
  | { type: "suggestion"; data: ApproachSuggestion }
  | { type: "rating"; data: ProgressRating };
