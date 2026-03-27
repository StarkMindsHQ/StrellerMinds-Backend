export const CACHE_TTL = {
  DEFAULT: 300, // 5 minutes
  SHORT: 60, // 1 minute
  MEDIUM: 900, // 15 minutes
  LONG: 3600, // 1 hour
  EXTENDED: 86400, // 24 hours
} as const;

export const CACHE_KEYS = {
  COURSE: (id: string) => `course:${id}`,
  COURSE_LIST: (filters: string) => `courses:list:${filters}`,
  USER_PROFILE: (id: string) => `user:profile:${id}`,
  ANALYTICS: (type: string, id: string) => `analytics:${type}:${id}`,
  DASHBOARD: (userId: string) => `dashboard:${userId}`,
  ASSIGNMENTS: (courseId: string) => `assignments:${courseId}`,
  FORUM_POSTS: (courseId: string) => `forum:posts:${courseId}`,
  LEARNING_PATH: (userId: string) => `learning-path:${userId}`,
} as const;

export const HTTP_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300',
  'ETag': 'auto',
  'Last-Modified': 'auto',
} as const;