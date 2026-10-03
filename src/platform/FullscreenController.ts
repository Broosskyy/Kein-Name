export interface FullscreenDocumentLike {
  fullscreenElement?: unknown;
  webkitFullscreenElement?: unknown;
  documentElement?: FullscreenElementLike;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void> | void;
}
export interface FullscreenElementLike {
  requestFullscreen?: (options?: FullscreenOptions) => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export class FullscreenController {
  constructor(private readonly documentLike: FullscreenDocumentLike, private readonly element: FullscreenElementLike, private readonly onChange: () => void) {}
  get supported(): boolean {
    return this.requestTargets().some((target) => Boolean(
      (target.requestFullscreen && this.documentLike.exitFullscreen)
      || (target.webkitRequestFullscreen && this.documentLike.webkitExitFullscreen),
    ));
  }
  get active(): boolean { return Boolean(this.documentLike.fullscreenElement || this.documentLike.webkitFullscreenElement); }
  async toggle(): Promise<boolean> {
    if (!this.supported) return false;
    try {
      if (this.active) {
        if (this.documentLike.exitFullscreen) await this.documentLike.exitFullscreen();
        else await this.documentLike.webkitExitFullscreen?.();
      } else {
        let entered = false;
        let lastError: unknown;
        // Chromium usually accepts the game shell. Some Android/WebView builds
        // only accept the document root, so try both during the same gesture.
        for (const target of this.requestTargets()) {
          try {
            if (target.requestFullscreen) {
              try { await target.requestFullscreen({ navigationUI: 'hide' }); }
              catch { await target.requestFullscreen(); }
            } else if (target.webkitRequestFullscreen) await target.webkitRequestFullscreen();
            else continue;
            entered = true;
            break;
          } catch (error) { lastError = error; }
        }
        if (!entered) throw lastError ?? new Error('Fullscreen request unavailable');
      }
      this.onChange();
      return true;
    } catch (error) {
      console.warn('[fullscreen] request rejected', error);
      return false;
    }
  }

  private requestTargets(): FullscreenElementLike[] {
    const targets = [this.element];
    const root = this.documentLike.documentElement;
    if (root && root !== this.element) targets.push(root);
    return targets;
  }
}
