# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
MockInterview.ai — Company Cultures Data
A centralized registry of major tech company cultures and leadership principles.
Used by the AI agent to tailor behavioral interview questions and feedback.
"""

COMPANY_CULTURES = [
    {
        "name": "Google",
        "aliases": ["google", "goog", "alphabet"],
        "culture_summary": "Deep focus on 'Googlyness' and 'Leadership Without Authority'.",
        "values": [
            "Googlyness: Ethical behavior, collaboration, being comfortable with ambiguity, and being actively 'helpful'.",
            "General Cognitive Ability (GCA): How you learn and process information more than what you already know.",
            "Role Related Knowledge (RRK): Your technical chops, but also how you approach problems.",
            "Leadership: Not just seniority, but stepping up when needed and stepping back when not."
        ],
        "interview_focus": "They love open-ended questions. Don't jump to a solution; ask clarifying questions. They value 'scale' and 'simplicity'."
    },
    {
        "name": "Amazon",
        "aliases": ["amazon", "aws", "amzn", "blue origin"],
        "culture_summary": "Obsessed with the 16 Leadership Principles (LPs). Every behavioral question MAPS to an LP.",
        "values": [
            "Customer Obsession: Starting with the customer and working backwards.",
            "Ownership: Thinking long term, never saying 'that's not my job'.",
            "Invent and Simplify: Expecting innovation and finding ways to simplify.",
            "Are Right, A Lot: Strong judgment and good instincts.",
            "Hire and Develop the Best: Raising the bar with every hire.",
            "Insist on the Highest Standards: Continuously raising the bar for quality.",
            "Think Big: Creating and communicating a bold direction.",
            "Bias for Action: Speed matters in business. Many decisions are reversible.",
            "Frugality: Accomplishing more with less.",
            "Earn Trust: Listening attentively, speaking candidly, and treating others respectfully.",
            "Dive Deep: Staying connected to the details, auditing frequently.",
            "Have Backbone; Disagree and Commit: Challenging decisions respectfully when they disagree.",
            "Deliver Results: Focusing on the key inputs and delivering them in a timely fashion.",
            "Strive to be Earth's Best Employer: Leading with empathy and fun.",
            "Success and Scale Bring Broad Responsibility: Being humble and thoughtful about impact."
        ],
        "interview_focus": "Use the STAR method rigidly. Provide data-driven results. They love hearing about failures if you learned a lesson that aligns with an LP."
    },
    {
        "name": "Meta",
        "aliases": ["meta", "facebook", "fb", "instagram", "whatsapp"],
        "culture_summary": "Focused on 'Impact' and 'Moving Fast'.",
        "values": [
            "Move Fast: Building and learning faster than anyone else.",
            "Focus on Long-Term Impact: Prioritizing work that has the most significant positive effect.",
            "Build Social Value: Creating services that help people feel closer to each other.",
            "Be Open: Creating a culture where everyone has access to the most information.",
            "Be Bold: Building great things and not being afraid of risks."
        ],
        "interview_focus": "They want to hear about how you scaled a system or shifted a team's direction quickly. They value 'conflict resolution' and 'peer feedback'."
    },
    {
        "name": "Microsoft",
        "aliases": ["microsoft", "msft", "azure", "windows"],
        "culture_summary": "Centered around 'Growth Mindset' and 'Empowerment'.",
        "values": [
            "Growth Mindset: Being curious, learning from others, and viewing failures as opportunities.",
            "Customer Obsessed: Listening and learning from customers to build what they need.",
            "Diversity and Inclusion: Creating an environment where everyone can do their best work.",
            "One Microsoft: Working across boundaries to achieve more together.",
            "Making a Difference: Having an impact on the world."
        ],
        "interview_focus": "They value social intelligence and collaboration. Show how you helped a team grow, not just how you were the lone hero."
    },
    {
        "name": "Netflix",
        "aliases": ["netflix", "nflx"],
        "culture_summary": "Extreme focus on 'Freedom and Responsibility' and 'Radical Candor'.",
        "values": [
            "The Keeper Test: Managers ask themselves: 'If this person wanted to leave, would I fight to keep them?'",
            "Radical Candor: Giving and receiving feedback is a continuous, honest process.",
            "High Performance: They prefer 'A-teams' over tenure. No 'brilliant jerks'.",
            "Context, Not Control: Leaders set the strategy/context; individuals make the decisions."
        ],
        "interview_focus": "Be very direct. Show that you can handle tough feedback and that you care about the company's success more than your ego."
    },
    {
        "name": "Stripe",
        "aliases": ["stripe"],
        "culture_summary": "Values 'Clear Thinking', 'Great Writing', and 'Intensity'.",
        "values": [
            "Think From First Principles: Don't just do things 'the way they are done'.",
            "Be Meticulous: Quality and precision in code and communication matter deeply.",
            "Efficiency: Moving with speed and high intensity.",
            "Developer First: Empathy for the people building on their platform."
        ],
        "interview_focus": "They often have a writing component. In interviews, be extremely structured and precise in your language."
    },
    {
        "name": "Apple",
        "aliases": ["apple", "aapl"],
        "culture_summary": "Values 'Perfectionism', 'Secrecy', and 'Design Excellence'.",
        "values": [
            "Simplicity: Removing the unnecessary so that the necessary may speak.",
            "Collaboration: Apple is run like a startup; teams collaborate intensely while maintaining strict silos.",
            "Direct Responsibility Individual (DRI): Every task has a single person responsible for it."
        ],
        "interview_focus": "Focus on the 'UX' of your code or project. Show a deep obsession with detail and 'fine-tuning'."
    }
]
