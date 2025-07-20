import { EventEmitter } from 'events';
import { EventSubscription, RealtimeMessage, RateLimit } from './types';

export class EventRouter extends EventEmitter {
  private subscriptions = new Map<string, Map<string, EventSubscription>>();
  private rateLimits = new Map<string, RateLimit>();
  private requestCounts = new Map<string, { count: number; windowStart: number }>();
  private throttleTimers = new Map<string, NodeJS.Timeout>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  // Subscription Management
  public subscribe(
    eventType: string,
    callback: (data: unknown) => void,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      throttle?: number;
      debounce?: number;
    }
  ): string {
    const subscriptionId = this.generateSubscriptionId();
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      callback,
      options
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, new Map());
    }

    this.subscriptions.get(eventType)!.set(subscriptionId, subscription);
    
    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subs] of this.subscriptions) {
      if (subs.has(subscriptionId)) {
        subs.delete(subscriptionId);
        
        // Clean up timers
        this.clearTimers(subscriptionId);
        
        // Remove event type map if empty
        if (subs.size === 0) {
          this.subscriptions.delete(eventType);
        }
        
        return true;
      }
    }
    return false;
  }

  public unsubscribeFromEvent(eventType: string): number {
    const subs = this.subscriptions.get(eventType);
    if (!subs) return 0;

    const count = subs.size;
    
    // Clear all timers for this event type
    for (const subscription of subs.values()) {
      this.clearTimers(subscription.id);
    }
    
    this.subscriptions.delete(eventType);
    return count;
  }

  public unsubscribeAll(): number {
    let totalCount = 0;
    
    for (const [eventType] of this.subscriptions) {
      totalCount += this.unsubscribeFromEvent(eventType);
    }
    
    // Clear all timers
    this.throttleTimers.clear();
    this.debounceTimers.clear();
    
    return totalCount;
  }

  // Message Routing
  public route(message: RealtimeMessage): void {
    const subscriptions = this.subscriptions.get(message.type);
    if (!subscriptions || subscriptions.size === 0) {
      return;
    }

    // Check rate limiting
    if (!this.checkRateLimit(message.type)) {
      this.emit('rate_limit_exceeded', { eventType: message.type, message });
      return;
    }

    // Sort subscriptions by priority
    const sortedSubscriptions = Array.from(subscriptions.values()).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const aPriority = priorityOrder[a.options?.priority || 'medium'];
      const bPriority = priorityOrder[b.options?.priority || 'medium'];
      return aPriority - bPriority;
    });

    // Route to each subscription
    for (const subscription of sortedSubscriptions) {
      this.routeToSubscription(subscription, message);
    }
  }

  // Rate Limiting
  public setRateLimit(eventType: string, rateLimit: RateLimit): void {
    this.rateLimits.set(eventType, rateLimit);
  }

  public removeRateLimit(eventType: string): boolean {
    return this.rateLimits.delete(eventType);
  }

  public clearRateLimits(): void {
    this.rateLimits.clear();
    this.requestCounts.clear();
  }

  // Statistics
  public getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      return this.subscriptions.get(eventType)?.size || 0;
    }
    
    let total = 0;
    for (const subs of this.subscriptions.values()) {
      total += subs.size;
    }
    return total;
  }

  public getEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  public getSubscriptionsByEventType(eventType: string): EventSubscription[] {
    const subs = this.subscriptions.get(eventType);
    return subs ? Array.from(subs.values()) : [];
  }

  public getRateLimitStatus(eventType: string): {
    hasLimit: boolean;
    limit?: RateLimit;
    currentCount: number;
    windowStart: number;
    isLimited: boolean;
  } {
    const limit = this.rateLimits.get(eventType);
    const counts = this.requestCounts.get(eventType) || { count: 0, windowStart: Date.now() };
    
    return {
      hasLimit: !!limit,
      limit,
      currentCount: counts.count,
      windowStart: counts.windowStart,
      isLimited: limit ? counts.count >= limit.maxRequests : false
    };
  }

  // Private Methods
  private routeToSubscription(subscription: EventSubscription, message: RealtimeMessage): void {
    const { throttle, debounce } = subscription.options || {};
    
    if (debounce) {
      this.handleDebounce(subscription, message, debounce);
    } else if (throttle) {
      this.handleThrottle(subscription, message, throttle);
    } else {
      this.executeCallback(subscription, message);
    }
  }

  private handleThrottle(subscription: EventSubscription, message: RealtimeMessage, throttleMs: number): void {
    const timerId = `throttle_${subscription.id}`;
    
    if (!this.throttleTimers.has(timerId)) {
      this.executeCallback(subscription, message);
      
      this.throttleTimers.set(timerId, setTimeout(() => {
        this.throttleTimers.delete(timerId);
      }, throttleMs));
    }
  }

  private handleDebounce(subscription: EventSubscription, message: RealtimeMessage, debounceMs: number): void {
    const timerId = `debounce_${subscription.id}`;
    
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(timerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new debounce timer
    const timer = setTimeout(() => {
      this.executeCallback(subscription, message);
      this.debounceTimers.delete(timerId);
    }, debounceMs);
    
    this.debounceTimers.set(timerId, timer);
  }

  private executeCallback(subscription: EventSubscription, message: RealtimeMessage): void {
    try {
      subscription.callback(message.data);
      this.emit('message_routed', { subscription, message });
    } catch (error) {
      this.emit('callback_error', { subscription, message, error });
    }
  }

  private checkRateLimit(eventType: string): boolean {
    const limit = this.rateLimits.get(eventType);
    if (!limit) return true;

    const now = Date.now();
    const counts = this.requestCounts.get(eventType);
    
    if (!counts || now - counts.windowStart >= limit.windowMs) {
      // Start new window
      this.requestCounts.set(eventType, { count: 1, windowStart: now });
      return true;
    }
    
    if (counts.count >= limit.maxRequests) {
      // Check burst allowance
      if (limit.burst && counts.count < limit.maxRequests + limit.burst) {
        counts.count++;
        return true;
      }
      return false;
    }
    
    counts.count++;
    return true;
  }

  private clearTimers(subscriptionId: string): void {
    const throttleKey = `throttle_${subscriptionId}`;
    const debounceKey = `debounce_${subscriptionId}`;
    
    const throttleTimer = this.throttleTimers.get(throttleKey);
    if (throttleTimer) {
      clearTimeout(throttleTimer);
      this.throttleTimers.delete(throttleKey);
    }
    
    const debounceTimer = this.debounceTimers.get(debounceKey);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      this.debounceTimers.delete(debounceKey);
    }
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  public cleanup(): void {
    this.unsubscribeAll();
    this.clearRateLimits();
  }
}