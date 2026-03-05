"""Quick test: download the already-uploaded interview video from GCS
and send it to Gemini 3.1 Flash Lite for feedback analysis."""

import json
import os
import sys

from google.cloud import storage
from google import genai

# ── Config ──
API_KEY = os.environ.get("GEMINI_API_KEY") or open(
    os.path.join(os.path.dirname(__file__), "..", ".env")
).read().split("GEMINI_API_KEY=")[1].strip().split("\n")[0]

BUCKET = "genesis-488603-interview-recordings"
BLOB = "recordings/5563b66a-9a6f-4a33-9661-b94cc68a3e13.webm"
MODEL = "gemini-3.1-flash-lite-preview"

PROMPT = """You are an expert technical interview evaluator. You just watched a complete recording of a mock interview.

Analyze the ENTIRE video carefully, including:
- What the candidate said (explanations, reasoning, questions asked)
- How they communicated (clarity, confidence, pace, verbal fillers, pauses)
- Their technical approach (problem-solving process, code quality, design decisions)
- Their interaction with the AI interviewer (how they responded to hints and follow-ups)
- Visual cues: how they wrote code, drew diagrams, their editing patterns

IMPORTANT: Base your scores ONLY on what you actually observe in the video. Be honest, specific, and constructive.

Interview Mode: coding
Problem: Two Sum
Duration: 3 min

Respond with ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "overallScore": <number 1-10>,
  "categories": [
    {"name": "<category name>", "score": <number 1-10>, "comment": "<1-2 sentence specific feedback referencing what you saw>"}
  ],
  "strengths": ["<specific strength from the video>", "<specific strength>", "<specific strength>"],
  "improvements": ["<specific improvement with example from video>", "<specific improvement>", "<specific improvement>"],
  "nextSteps": ["<actionable step 1>", "<actionable step 2>", "<actionable step 3>", "<actionable step 4>"]
}

For CODING interviews, use categories: Problem Understanding, Approach & Algorithm, Code Quality, Communication, Testing & Edge Cases.
"""


def main():
    # 1. Download video from GCS
    print(f"⬇️  Downloading video from gs://{BUCKET}/{BLOB} ...")
    gcs_client = storage.Client()
    blob = gcs_client.bucket(BUCKET).blob(BLOB)
    video_bytes = blob.download_as_bytes()
    print(f"✅ Downloaded {len(video_bytes) / 1024 / 1024:.1f} MB\n")

    # 2. Send to Gemini
    print(f"🧠 Sending to {MODEL} ...")
    client = genai.Client(api_key=API_KEY)

    video_part = genai.types.Part.from_bytes(data=video_bytes, mime_type="video/webm")

    response = client.models.generate_content(
        model=MODEL,
        contents=[
            genai.types.Content(
                parts=[video_part, genai.types.Part.from_text(text=PROMPT)]
            )
        ],
        config=genai.types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.3,
        ),
    )

    # 3. Pretty-print the result
    print("✅ Response received!\n")
    print("=" * 60)
    feedback = json.loads(response.text)
    print(json.dumps(feedback, indent=2))
    print("=" * 60)

    # 4. Summary
    print(f"\n🎯 Overall Score: {feedback['overallScore']}/10")
    for cat in feedback.get("categories", []):
        print(f"   {cat['name']}: {cat['score']}/10 — {cat['comment']}")
    print(f"\n💪 Strengths:")
    for s in feedback.get("strengths", []):
        print(f"   • {s}")
    print(f"\n📈 Improvements:")
    for i in feedback.get("improvements", []):
        print(f"   • {i}")
    print(f"\n🗺️  Next Steps:")
    for n in feedback.get("nextSteps", []):
        print(f"   • {n}")


if __name__ == "__main__":
    main()
