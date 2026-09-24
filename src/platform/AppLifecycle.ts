export interface LifecycleCallbacks {
  pause(nowMs: number): void;
  resume(nowMs: number): void;
  resize(): void;
}

export class AppLifecycle {
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.callbacks.pause(performance.now());
    else this.callbacks.resume(performance.now());
  };
  private readonly onPageHide = (): void => this.callbacks.pause(performance.now());
  private readonly onPageShow = (): void => this.callbacks.resume(performance.now());
  private readonly onResize = (): void => this.scheduleResize();
  private resizeFrame = 0;

  constructor(private readonly callbacks: LifecycleCallbacks) {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('pagehide', this.onPageHide);
    window.addEventListener('pageshow', this.onPageShow);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    window.visualViewport?.addEventListener('resize', this.onResize);
  }

  destroy(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    window.visualViewport?.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.resizeFrame);
  }

  private scheduleResize(): void {
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => this.callbacks.resize());
  }
}
