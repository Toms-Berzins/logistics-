import { EventEmitter } from 'events';
import { OptimisticUpdate, RealtimeError } from './types';

export class OptimisticUpdatesManager extends EventEmitter {
  private updates = new Map<string, OptimisticUpdate>();
  private defaultTimeout = 10000; // 10 seconds

  public create<T>(
    id: string,
    data: T,
    rollback: () => void,
    confirm: () => void,
    timeout = this.defaultTimeout
  ): OptimisticUpdate<T> {
    // If update already exists, clear its timeout
    if (this.updates.has(id)) {
      this.cancel(id);
    }

    const update: OptimisticUpdate<T> = {
      id,
      data,
      timestamp: new Date().toISOString(),
      rollback,
      confirm,
      timeout
    };

    this.updates.set(id, update);

    // Set timeout for automatic rollback
    setTimeout(() => {
      if (this.updates.has(id)) {
        this.rollback(id);
        this.emit('optimistic:timeout', update);
      }
    }, timeout);

    return update;
  }

  public confirm(id: string): boolean {
    const update = this.updates.get(id);
    if (!update) return false;

    try {
      update.confirm();
      this.updates.delete(id);
      this.emit('optimistic:confirmed', update);
      return true;
    } catch (error) {
      console.error('Error confirming optimistic update:', error);
      return false;
    }
  }

  public rollback(id: string): boolean {
    const update = this.updates.get(id);
    if (!update) return false;

    try {
      update.rollback();
      this.updates.delete(id);
      this.emit('optimistic:rollback', update);
      return true;
    } catch (error) {
      console.error('Error rolling back optimistic update:', error);
      return false;
    }
  }

  public cancel(id: string): boolean {
    return this.updates.delete(id);
  }

  public has(id: string): boolean {
    return this.updates.has(id);
  }

  public get(id: string): OptimisticUpdate | undefined {
    return this.updates.get(id);
  }

  public getAll(): OptimisticUpdate[] {
    return Array.from(this.updates.values());
  }

  public clear(): void {
    // Rollback all pending updates
    for (const [id] of this.updates) {
      this.rollback(id);
    }
  }

  public getPendingCount(): number {
    return this.updates.size;
  }

  public getOldestUpdate(): OptimisticUpdate | undefined {
    let oldest: OptimisticUpdate | undefined;
    
    for (const update of this.updates.values()) {
      if (!oldest || new Date(update.timestamp) < new Date(oldest.timestamp)) {
        oldest = update;
      }
    }
    
    return oldest;
  }

  // Batch operations
  public confirmAll(): number {
    let confirmedCount = 0;
    const updateIds = Array.from(this.updates.keys());
    
    for (const id of updateIds) {
      if (this.confirm(id)) {
        confirmedCount++;
      }
    }
    
    return confirmedCount;
  }

  public rollbackAll(): number {
    let rolledBackCount = 0;
    const updateIds = Array.from(this.updates.keys());
    
    for (const id of updateIds) {
      if (this.rollback(id)) {
        rolledBackCount++;
      }
    }
    
    return rolledBackCount;
  }

  // Find updates by criteria
  public findByPattern(pattern: RegExp): OptimisticUpdate[] {
    return Array.from(this.updates.values()).filter(update => 
      pattern.test(update.id)
    );
  }

  public findOlderThan(maxAge: number): OptimisticUpdate[] {
    const cutoff = Date.now() - maxAge;
    return Array.from(this.updates.values()).filter(update => 
      new Date(update.timestamp).getTime() < cutoff
    );
  }

  // Cleanup old updates
  public cleanupOldUpdates(maxAge: number = 60000): number { // 1 minute default
    const oldUpdates = this.findOlderThan(maxAge);
    let cleanedCount = 0;
    
    for (const update of oldUpdates) {
      if (this.rollback(update.id)) {
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}