
type EventCallback<T = any> = (data: T) => void;

export class EventEmitter<Events extends Record<string, any> = Record<string, any>> {
  private eventListeners: Map<keyof Events, EventCallback[]> = new Map();

  /**
   * Register an event listener
   */
  public on<K extends keyof Events>(event: K, callback: (data: Events[K]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback as EventCallback);
  }

  /**
   * Remove an event listener
   */
  public off<K extends keyof Events>(event: K, callback?: (data: Events[K]) => void): void {
    if (!callback) {
      // Remove all listeners for this event
      this.eventListeners.delete(event);
      return;
    }

    const callbacks = this.eventListeners.get(event);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback as EventCallback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }

    // Clean up if no listeners remain
    if (callbacks.length === 0) {
      this.eventListeners.delete(event);
    }
  }

  /**
   * Emit an event with data
   */
  public emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const callbacks = this.eventListeners.get(event);
    if (!callbacks) return;

    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${String(event)}:`, error);
      }
    });
  }

  /**
   * Return a promise that resolves on the next occurrence of an event
   */
  public once<K extends keyof Events>(event: K): Promise<Events[K]> {
    return new Promise(resolve => {
      const onceCallback = (data: Events[K]) => {
        this.off(event, onceCallback as any);
        resolve(data);
      };
      this.on(event, onceCallback);
    });
  }

  /**
   * Remove all event listeners
   */
  public removeAllListeners(): void {
    this.eventListeners.clear();
  }
}
