/**
 * Client-Side Rate Limiter
 *
 * Provides rate limiting for API requests to prevent abuse.
 * This is a client-side check - server-side enforcement is also required.
 *
 * Defense against: DoS attacks, API abuse, malicious automation
 */

import { ref } from 'vue';

interface RateLimitConfig {
  maxRequests: number;  // Maximum number of requests
  windowMs: number;     // Time window in milliseconds
}

interface RequestLog {
  timestamps: number[];
  lastCleanup: number;
}

class RateLimiter {
  private requests: Map<string, RequestLog> = new Map();
  private cleanupInterval: number = 60000; // Clean up every minute

  constructor() {
    // Periodic cleanup of old request logs
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), this.cleanupInterval);
    }
  }

  /**
   * Check if request is within rate limit
   *
   * @param key - Unique identifier (wallet address, action type, etc.)
   * @param config - Rate limit configuration
   * @returns true if request is allowed
   * @throws Error if rate limit exceeded
   */
  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const { maxRequests, windowMs } = config;

    // Get or create request log
    let log = this.requests.get(key);
    if (!log) {
      log = { timestamps: [], lastCleanup: now };
      this.requests.set(key, log);
    }

    // Remove expired timestamps
    log.timestamps = log.timestamps.filter(t => now - t < windowMs);
    log.lastCleanup = now;

    // Check if limit exceeded
    if (log.timestamps.length >= maxRequests) {
      const oldestRequest = log.timestamps[0];
      if (oldestRequest === undefined) {
        throw new Error('Rate limit exceeded. Too many requests.');
      }
      const resetIn = Math.ceil((oldestRequest + windowMs - now) / 1000);

      throw new Error(
        `Rate limit exceeded. Too many requests. Please try again in ${resetIn} seconds.`
      );
    }

    // Log this request
    log.timestamps.push(now);

    return true;
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const log = this.requests.get(key);

    if (!log) return config.maxRequests;

    // Count valid requests within window
    const validTimestamps = log.timestamps.filter(
      t => now - t < config.windowMs
    );

    return Math.max(0, config.maxRequests - validTimestamps.length);
  }

  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(key: string, config: RateLimitConfig): number {
    const now = Date.now();
    const log = this.requests.get(key);

    if (!log || log.timestamps.length === 0) return 0;

    const oldestRequest = log.timestamps[0];
    if (oldestRequest === undefined) return 0;

    const resetTime = oldestRequest + config.windowMs - now;

    return Math.max(0, Math.ceil(resetTime / 1000));
  }

  /**
   * Clear rate limit for a specific key (useful for testing)
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  resetAll(): void {
    this.requests.clear();
  }

  /**
   * Cleanup expired request logs
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, log] of this.requests.entries()) {
      if (now - log.lastCleanup > maxAge) {
        this.requests.delete(key);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Project operations
  PROJECT_CREATE: { maxRequests: 5, windowMs: 60 * 1000 },      // 5 per minute
  PROJECT_UPDATE: { maxRequests: 10, windowMs: 60 * 1000 },     // 10 per minute
  PROJECT_DELETE: { maxRequests: 3, windowMs: 60 * 1000 },      // 3 per minute

  // Treasury operations
  TREASURY_FUND: { maxRequests: 10, windowMs: 60 * 1000 },      // 10 per minute
  TREASURY_WITHDRAW: { maxRequests: 5, windowMs: 60 * 1000 },   // 5 per minute

  // Auth operations
  WALLET_CONNECT: { maxRequests: 20, windowMs: 60 * 1000 },     // 20 per minute
  SIGNATURE_REQUEST: { maxRequests: 15, windowMs: 60 * 1000 },  // 15 per minute

  // Read operations (more lenient)
  PROJECT_READ: { maxRequests: 100, windowMs: 60 * 1000 },      // 100 per minute
} as const;

/**
 * Composable for rate limiting with reactive state
 */
export function useRateLimiter() {
  const isBlocked = ref(false);
  const remainingRequests = ref<number | null>(null);
  const resetIn = ref<number | null>(null);

  /**
   * Check rate limit with reactive state updates
   */
  const checkLimit = async (
    key: string,
    config: RateLimitConfig
  ): Promise<boolean> => {
    try {
      rateLimiter.check(key, config);

      // Update reactive state
      remainingRequests.value = rateLimiter.getRemaining(key, config);
      resetIn.value = rateLimiter.getResetTime(key, config);
      isBlocked.value = false;

      return true;

    } catch (error) {
      isBlocked.value = true;
      remainingRequests.value = 0;
      resetIn.value = rateLimiter.getResetTime(key, config);

      throw error;
    }
  };

  /**
   * Get current rate limit status
   */
  const getStatus = (key: string, config: RateLimitConfig) => {
    remainingRequests.value = rateLimiter.getRemaining(key, config);
    resetIn.value = rateLimiter.getResetTime(key, config);

    return {
      remaining: remainingRequests.value,
      resetIn: resetIn.value,
      isBlocked: remainingRequests.value === 0
    };
  };

  return {
    checkLimit,
    getStatus,
    isBlocked,
    remainingRequests,
    resetIn
  };
}

/**
 * Usage Example:
 *
 * import { rateLimiter, RATE_LIMITS } from '@/composables/useRateLimiter';
 * import { useWallet } from 'solana-wallets-vue';
 *
 * const { publicKey } = useWallet();
 *
 * const deleteProject = async (projectId: string) => {
 *   try {
 *     // Check rate limit
 *     const key = `delete:${publicKey.value}`;
 *     rateLimiter.check(key, RATE_LIMITS.PROJECT_DELETE);
 *
 *     // Proceed with deletion
 *     await supabase.from('projects').delete().eq('id', projectId);
 *
 *   } catch (error) {
 *     if (error.message.includes('Rate limit')) {
 *       alert(error.message);
 *     } else {
 *       throw error;
 *     }
 *   }
 * };
 */

/**
 * With Reactive Composable:
 *
 * const { publicKey } = useWallet();
 * const { checkLimit, remainingRequests, resetIn } = useRateLimiter();
 *
 * const deleteProject = async (projectId: string) => {
 *   try {
 *     const key = `delete:${publicKey.value}`;
 *     await checkLimit(key, RATE_LIMITS.PROJECT_DELETE);
 *
 *     // Show remaining requests
 *     console.log(`Remaining: ${remainingRequests.value}`);
 *
 *     await supabase.from('projects').delete().eq('id', projectId);
 *
 *   } catch (error) {
 *     alert(`${error.message} Reset in ${resetIn.value}s`);
 *   }
 * };
 */
