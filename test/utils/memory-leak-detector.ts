
export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export class MemoryLeakDetector {
  private baseline: MemoryStats | null = null;
  private snapshots: MemoryStats[] = [];

  /**
   * Take a memory snapshot
   */
  takeSnapshot(): MemoryStats {
    const usage = process.memoryUsage();
    const stats: MemoryStats = {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
    };
    this.snapshots.push(stats);
    return stats;
  }

  /**
   * Set the baseline memory usage
   */
  setBaseline() {
    // Try to trigger GC if possible before taking baseline
    this.triggerGC();
    this.baseline = this.takeSnapshot();
  }

  /**
   * Trigger garbage collection if --expose-gc is enabled
   */
  triggerGC() {
    if (global.gc) {
      global.gc();
    } else {
      // fallback: allocate some memory and hope it triggers GC? 
      // Not reliable, but let's just log a warning if not available
    }
  }

  /**
   * Check for potential memory leak
   * @param threshold Percentage of allowed growth (default 10%)
   */
  check(threshold: number = 0.1): {
    leaking: boolean;
    growth: number;
    baseline: number;
    current: number;
  } {
    if (!this.baseline) {
      throw new Error('Baseline not set. Call setBaseline() first.');
    }

    const current = this.takeSnapshot();
    const growth = (current.heapUsed - this.baseline.heapUsed) / this.baseline.heapUsed;
    
    return {
      leaking: growth > threshold,
      growth,
      baseline: this.baseline.heapUsed,
      current: current.heapUsed,
    };
  }

  /**
   * Get all snapshots
   */
  getSnapshots() {
    return this.snapshots;
  }

  /**
   * Format bytes to MB
   */
  static toMB(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}
