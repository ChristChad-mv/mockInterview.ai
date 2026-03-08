/**
 * MockInterview.ai — systemDesignProblems.ts
 */

export interface SystemDesignProblem {
  id: string;
  title: string;
  difficulty: 'Medium' | 'Hard';
  category: string;
  description: string;
  requirements: {
    functional: string[];
    nonFunctional: string[];
  };
  hints: string[];
  keyComponents: string[];
}

export const systemDesignProblems: SystemDesignProblem[] = [
  {
    id: 'url-shortener',
    title: 'Design a URL Shortener',
    difficulty: 'Medium',
    category: 'Web Services',
    description: `Design a URL shortening service like bit.ly or tinyurl.com. The service should generate a short, unique alias for a given URL and redirect users to the original URL when they visit the short link.`,
    requirements: {
      functional: [
        'Given a long URL, generate a short and unique alias',
        'When users access the short link, redirect them to the original URL',
        'Users can optionally pick a custom short link',
        'Links expire after a default timespan (configurable)',
      ],
      nonFunctional: [
        'The system should be highly available (if the service is down, all redirections fail)',
        'URL redirection should happen in real-time with minimal latency',
        'Shortened links should not be guessable (not predictable)',
      ],
    },
    hints: [
      'Think about the encoding scheme — base62 vs base64 vs hashing',
      'How do you handle collisions?',
      'Consider read-heavy vs write-heavy traffic patterns',
      'What caching strategy would you use?',
    ],
    keyComponents: [
      'Load Balancer',
      'Application Servers',
      'Database (SQL or NoSQL)',
      'Cache (Redis/Memcached)',
      'Key Generation Service',
    ],
  },
  {
    id: 'chat-system',
    title: 'Design a Chat System',
    difficulty: 'Hard',
    category: 'Real-time Systems',
    description: `Design a chat system like WhatsApp, Facebook Messenger, or Slack. Support both 1-on-1 and group messaging with real-time delivery, read receipts, and online status indicators.`,
    requirements: {
      functional: [
        'Support 1-on-1 and group chats',
        'Real-time message delivery',
        'Online/offline status indicators',
        'Read receipts and delivery confirmation',
        'Message history and persistence',
        'Push notifications for offline users',
      ],
      nonFunctional: [
        'Low latency message delivery (< 100ms for online users)',
        'High availability — chat should always be accessible',
        'Messages should be reliably stored and never lost',
        'Support millions of concurrent connections',
      ],
    },
    hints: [
      'WebSocket vs Long Polling vs Server-Sent Events?',
      'How do you handle the fan-out problem for group chats?',
      'Think about message ordering and consistency',
      'How do you handle users on multiple devices?',
    ],
    keyComponents: [
      'WebSocket Gateway',
      'Chat Service',
      'Presence Service',
      'Notification Service',
      'Message Queue (Kafka)',
      'Database (messages)',
      'Cache (recent messages)',
      'Object Storage (media)',
    ],
  },
  {
    id: 'twitter-feed',
    title: 'Design Twitter / News Feed',
    difficulty: 'Hard',
    category: 'Social Media',
    description: `Design a social media news feed like Twitter's home timeline. Users should see posts from people they follow in chronological (or ranked) order. Handle the "celebrity problem" where some users have millions of followers.`,
    requirements: {
      functional: [
        'Users can create posts (tweets)',
        'Users can follow/unfollow other users',
        'Home timeline shows posts from followed users',
        'Support both chronological and ranked feeds',
        'Like, retweet, and reply functionality',
      ],
      nonFunctional: [
        'News feed generation should be fast (< 200ms)',
        'Handle celebrity accounts with millions of followers',
        'Eventually consistent — slight delays are acceptable',
        'High availability over strict consistency',
      ],
    },
    hints: [
      'Fan-out on write vs fan-out on read — trade-offs?',
      'How do you handle the celebrity problem (millions of followers)?',
      'Consider a hybrid approach for different user types',
      'What ranking algorithm would you use?',
    ],
    keyComponents: [
      'Load Balancer',
      'Post Service',
      'Fan-out Service',
      'Timeline Cache (Redis)',
      'User Graph Service',
      'Database (posts, users)',
      'Message Queue',
      'CDN (media)',
    ],
  },
  {
    id: 'rate-limiter',
    title: 'Design a Rate Limiter',
    difficulty: 'Medium',
    category: 'Infrastructure',
    description: `Design a rate limiter that can be used to throttle API requests. It should support different rate limiting strategies (fixed window, sliding window, token bucket) and work in a distributed environment.`,
    requirements: {
      functional: [
        'Limit the number of requests a client can make in a given time window',
        'Support multiple rate limiting algorithms',
        'Return appropriate HTTP headers (X-RateLimit-Remaining, Retry-After)',
        'Support rate limiting by IP, user ID, or API key',
        'Different limits for different API endpoints',
      ],
      nonFunctional: [
        'Low latency — should not add significant overhead to API calls',
        'Accurate counting in a distributed environment',
        'Fault tolerant — if the rate limiter goes down, allow traffic through',
        'Memory efficient',
      ],
    },
    hints: [
      'Compare fixed window, sliding window log, sliding window counter, and token bucket',
      'How do you handle distributed counting with multiple servers?',
      'Think about race conditions with concurrent requests',
      'Where should the rate limiter sit in the architecture?',
    ],
    keyComponents: [
      'API Gateway',
      'Rate Limiter Middleware',
      'Redis (distributed counters)',
      'Configuration Service',
      'Monitoring/Alerting',
    ],
  },
  {
    id: 'video-streaming',
    title: 'Design YouTube / Video Streaming',
    difficulty: 'Hard',
    category: 'Media',
    description: `Design a video streaming platform like YouTube. Users can upload, transcode, store, and stream videos. The system should support adaptive bitrate streaming, recommendations, and handle massive scale.`,
    requirements: {
      functional: [
        'Users can upload videos',
        'Videos are transcoded into multiple resolutions and formats',
        'Adaptive bitrate streaming based on network conditions',
        'Search and discovery (recommendations)',
        'Comments, likes, and view counts',
      ],
      nonFunctional: [
        'Low startup latency for video playback',
        'Smooth streaming without buffering',
        'Handle concurrent uploads and views at scale',
        'Cost-effective storage for petabytes of video data',
      ],
    },
    hints: [
      'How does video transcoding work? Think about the pipeline.',
      'CDN strategy for global distribution',
      'Consider chunk-based upload for large files',
      'How does adaptive bitrate streaming (HLS/DASH) work?',
    ],
    keyComponents: [
      'Upload Service',
      'Transcoding Pipeline',
      'Object Storage (S3/GCS)',
      'CDN',
      'Streaming Service',
      'Metadata Database',
      'Search Service (Elasticsearch)',
      'Recommendation Engine',
      'Message Queue',
    ],
  },
  {
    id: 'parking-lot',
    title: 'Design a Parking Lot System',
    difficulty: 'Medium',
    category: 'Object-Oriented Design',
    description: `Design an automated parking lot system. The system should manage multiple floors, different vehicle types (motorcycle, car, bus), and handle entry/exit with payment processing.`,
    requirements: {
      functional: [
        'Multiple floors with different spot sizes (compact, regular, large)',
        'Support different vehicle types',
        'Automated entry/exit with ticket generation',
        'Real-time availability tracking per floor',
        'Payment processing (hourly rate, flat rate)',
        'Display boards showing available spots',
      ],
      nonFunctional: [
        'Real-time updates of spot availability',
        'Handle concurrent entry/exit without conflicts',
        'System should work even if some components fail',
        'Quick entry/exit processing (< 1 second)',
      ],
    },
    hints: [
      'Think about the class hierarchy for vehicles and parking spots',
      'How do you efficiently find the nearest available spot?',
      'Consider the strategy pattern for different pricing models',
      'How do you handle concurrent access to the same spot?',
    ],
    keyComponents: [
      'Entry/Exit Gates',
      'Ticket Service',
      'Spot Allocation Service',
      'Payment Service',
      'Display Board Service',
      'Database',
      'Real-time Event Bus',
    ],
  },
];
