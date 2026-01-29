/**
 * Performance profiling utilities
 * Add lightweight timing logs around: initial render, tab/screen change, and every data fetch
 */

type PerformanceMark = {
  name: string
  timestamp: number
  type: 'render' | 'fetch' | 'tab-change' | 'navigation'
}

class PerformanceProfiler {
  private marks: PerformanceMark[] = []
  private enabled: boolean = true

  constructor() {
    // Enable in development or when explicitly enabled
    this.enabled = import.meta.env.DEV || localStorage.getItem('perf-profiling') === 'true'
  }

  mark(name: string, type: PerformanceMark['type'] = 'render') {
    if (!this.enabled) return

    const timestamp = performance.now()
    const mark: PerformanceMark = { name, timestamp, type }
    this.marks.push(mark)

    // Log to console with emoji for easy identification
    const emoji = {
      render: '🎨',
      fetch: '📡',
      'tab-change': '🔄',
      navigation: '🧭'
    }[type]

    console.log(`${emoji} [PERF] ${name} at ${timestamp.toFixed(2)}ms`, {
      type,
      elapsed: this.marks.length > 1 
        ? `${(timestamp - this.marks[this.marks.length - 2].timestamp).toFixed(2)}ms since last`
        : 'initial'
    })
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (!this.enabled) return

    const start = this.marks.find(m => m.name === startMark)
    const end = endMark ? this.marks.find(m => m.name === endMark) : this.marks[this.marks.length - 1]

    if (start && end) {
      const duration = end.timestamp - start.timestamp
      console.log(`⏱️ [PERF] ${name}: ${duration.toFixed(2)}ms`)
      return duration
    }
  }

  getMarks() {
    return this.marks
  }

  clear() {
    this.marks = []
  }

  // Log network requests
  logFetch(url: string, method: string, duration?: number) {
    if (!this.enabled) return

    const durationStr = duration ? ` (${duration.toFixed(2)}ms)` : ''
    console.log(`📡 [FETCH] ${method} ${url}${durationStr}`)
  }
}

export const profiler = new PerformanceProfiler()

// React hook for component render timing
export const useRenderTiming = (componentName: string) => {
  React.useEffect(() => {
    profiler.mark(`${componentName} rendered`, 'render')
  })
}

// Helper to time async operations
export const timeAsync = async <T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> => {
  const start = performance.now()
  profiler.mark(`${name} start`, 'fetch')
  
  try {
    const result = await operation()
    const duration = performance.now() - start
    profiler.mark(`${name} end`, 'fetch')
    profiler.logFetch(name, 'GET', duration)
    return result
  } catch (error) {
    const duration = performance.now() - start
    profiler.mark(`${name} error`, 'fetch')
    profiler.logFetch(name, 'GET', duration)
    throw error
  }
}

// Import React for the hook
import React from 'react'

