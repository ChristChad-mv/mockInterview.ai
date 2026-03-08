export interface BehavioralQuestion {
  id: string;
  title: string;
  category: 'Leadership' | 'Teamwork' | 'Conflict' | 'Problem-Solving' | 'Adaptability' | 'Communication';
  company: string; // Common at which companies
  description: string;
  followUps: string[];
  starMethod: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
}

export const behavioralQuestions: BehavioralQuestion[] = [
  {
    id: 'full-behavioral-mock',
    title: 'Full Behavioral Mock Interview',
    category: 'Communication',
    company: 'All Top Tech',
    description: `A comprehensive session covering multiple behavioral areas: leadership, conflict, teamwork, and problem-solving. The AI will select questions for you.`,
    followUps: [],
    starMethod: {
      situation: 'Varies by question',
      task: 'Varies by question',
      action: 'Varies by question',
      result: 'Varies by question',
    },
  },
  {
    id: 'tell-me-about-yourself',
    title: 'Tell Me About Yourself',
    category: 'Communication',
    company: 'Universal',
    description: `Walk me through your background. What brought you to engineering, and what are you most excited about working on next?`,
    followUps: [
      'What was the most challenging project you worked on?',
      'Why are you interested in this role specifically?',
      'Where do you see yourself in 5 years?',
    ],
    starMethod: {
      situation: 'Your professional background and current role',
      task: 'Explain your journey and what drives you',
      action: 'Highlight key achievements and growth areas',
      result: 'Connect your experience to the role you\'re interviewing for',
    },
  },
  {
    id: 'difficult-teammate',
    title: 'Working with a Difficult Teammate',
    category: 'Conflict',
    company: 'Amazon, Google, Meta',
    description: `Tell me about a time you had to work with someone who was difficult to work with. How did you handle the situation?`,
    followUps: [
      'What would you have done differently?',
      'How did this experience change your approach to teamwork?',
      'What if the person was your manager instead of a peer?',
    ],
    starMethod: {
      situation: 'Describe the team dynamic and who the person was',
      task: 'What was at stake? What needed to get done?',
      action: 'Specific steps you took to address the conflict',
      result: 'What was the outcome for the project and the relationship?',
    },
  },
  {
    id: 'leadership-without-authority',
    title: 'Leading Without Authority',
    category: 'Leadership',
    company: 'Google, Microsoft, Stripe',
    description: `Describe a situation where you had to lead a project or initiative without having formal authority over the team members involved.`,
    followUps: [
      'How did you get buy-in from the team?',
      'What resistance did you face?',
      'Would you do anything differently with more experience?',
    ],
    starMethod: {
      situation: 'The project context and why you stepped up',
      task: 'What was the goal and why was leadership needed?',
      action: 'How you influenced, motivated, and coordinated the team',
      result: 'Project outcome and what you learned about leadership',
    },
  },
  {
    id: 'failed-project',
    title: 'A Project That Failed',
    category: 'Problem-Solving',
    company: 'Amazon, Meta, Apple',
    description: `Tell me about a time when a project you were working on failed or didn't meet expectations. What happened and what did you learn?`,
    followUps: [
      'At what point did you realize things were going wrong?',
      'What signals did you miss early on?',
      'How has this failure influenced your approach to new projects?',
    ],
    starMethod: {
      situation: 'The project, its goals, and the team',
      task: 'Your specific role and responsibilities',
      action: 'What went wrong and what you tried to fix it',
      result: 'The outcome and — most importantly — what you learned',
    },
  },
  {
    id: 'tight-deadline',
    title: 'Delivering Under a Tight Deadline',
    category: 'Adaptability',
    company: 'Amazon, Netflix, Uber',
    description: `Describe a situation where you had an extremely tight deadline. How did you prioritize and ensure delivery?`,
    followUps: [
      'What did you choose NOT to do?',
      'How did you communicate trade-offs to stakeholders?',
      'Did you have to cut any corners? How did you handle tech debt?',
    ],
    starMethod: {
      situation: 'The deadline pressure and business context',
      task: 'What needed to be delivered and by when',
      action: 'How you prioritized, delegated, and executed',
      result: 'Did you deliver? What was the quality? What happened after?',
    },
  },
  {
    id: 'disagree-with-manager',
    title: 'Disagreeing with Your Manager',
    category: 'Communication',
    company: 'Amazon, Google, Apple',
    description: `Tell me about a time you disagreed with your manager's decision. How did you handle it?`,
    followUps: [
      'What was the final outcome?',
      'Would you push back differently knowing what you know now?',
      'How do you generally approach disagreements with authority?',
    ],
    starMethod: {
      situation: 'The context and what your manager decided',
      task: 'Why you disagreed and what was at stake',
      action: 'How you raised your concerns professionally',
      result: 'The resolution and its impact on your relationship',
    },
  },
  {
    id: 'cross-team-collaboration',
    title: 'Cross-Team Collaboration',
    category: 'Teamwork',
    company: 'Google, Microsoft, Spotify',
    description: `Tell me about a time you had to collaborate with a different team (or department) to achieve a goal. What challenges did you face?`,
    followUps: [
      'How did you align on priorities when each team had different goals?',
      'What communication tools or processes did you establish?',
      'What would you do differently next time?',
    ],
    starMethod: {
      situation: 'The cross-team project and the teams involved',
      task: 'The shared goal and your specific role',
      action: 'How you bridged communication gaps and aligned priorities',
      result: 'The project outcome and any process improvements',
    },
  },
  {
    id: 'ambiguous-problem',
    title: 'Solving an Ambiguous Problem',
    category: 'Problem-Solving',
    company: 'Google, Meta, Stripe',
    description: `Describe a time when you were given a problem with very little direction or clarity. How did you approach it?`,
    followUps: [
      'How did you break down the ambiguity?',
      'Who did you involve in scoping the problem?',
      'How did you know when you had enough information to start?',
    ],
    starMethod: {
      situation: 'The ambiguous problem and its context',
      task: 'What was expected of you despite the lack of clarity',
      action: 'How you gathered information, scoped, and executed',
      result: 'The solution and how stakeholders reacted',
    },
  },
  {
    id: 'mentoring-others',
    title: 'Mentoring or Teaching Others',
    category: 'Leadership',
    company: 'Google, Microsoft, Shopify',
    description: `Tell me about a time you mentored someone or helped a teammate grow. What was your approach?`,
    followUps: [
      'How did you adjust your approach to their learning style?',
      'What was the biggest challenge in mentoring them?',
      'How did you balance mentoring with your own work?',
    ],
    starMethod: {
      situation: 'Who you mentored and the context',
      task: 'What they needed help with and your goal',
      action: 'Your mentoring approach and specific actions',
      result: 'Their growth and the impact on the team',
    },
  },
];

export const CATEGORIES = [
  'All',
  'Leadership',
  'Teamwork',
  'Conflict',
  'Problem-Solving',
  'Adaptability',
  'Communication',
] as const;
