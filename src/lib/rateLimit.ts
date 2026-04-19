type RateLimitInfo = {
  count: number;
  resetTime: number;
};

// Global map to hold rate limiting info per IP.
// Note: In serverless environments (like Vercel), this state is local to each function instance 
// and will be wiped when the instance sleeps. However, it's effective for preventing short-term abuse.
// For strict global enforcement, a database like Upstash Redis would be required.
const rateLimitMap = new Map<string, RateLimitInfo>();

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  let info = rateLimitMap.get(key);
  
  if (!info || now > info.resetTime) {
    info = {
      count: 0,
      resetTime: now + windowMs
    };
  }
  
  info.count += 1;
  rateLimitMap.set(key, info);
  
  if (info.count > limit) {
    return false; // Rate limit exceeded
  }
  return true;
}

// Optional: clean up expired items to prevent memory leaks in long-running instances
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}
