export interface FullscreenDocumentLike {
  fullscreenElement?: unknown;
  webkitFullscreenElement?: unknown;
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
    return Boolean(
      (this.element.requestFullscreen && this.documentLike.exitFullscreen)
      || (this.element.webkitRequestFullscreen && this.documentLike.webkitExitFullscreen),
    );
  }
  get active(): boolean { return Boolean(this.documentLike.fullscreenElement || this.documentLike.webkitFullscreenElement); }
  async toggle(): Promise<boolean> {
    if (!this.supported) return false;
    try {
      if (this.active) {
        if (this.documentLike.exitFullscreen) await this.documentLike.exitFullscreen();
        else await this.documentLike.webkitExitFullscreen?.();
      } else if (this.element.requestFullscreen) {
        try {
          await this.element.requestFullscreen({ navigationUI: 'hide' });
        } catch (standardError) {
          // Some mobile implementations expose the standard method but reject
          // the navigationUI option. Retry once without options while the
          // original pointer activation is still current.
          try { await this.element.requestFullscreen(); }
          catch { throw standardError; }
        }
      } else {
        await this.element.webkitRequestFullscreen?.();
      }
      this.onChange();
      return true;
    } catch (error) {
      console.warn('[fullscreen] request rejected', error);
      return false;
    }
  }
}
