export interface FullscreenDocumentLike {
  fullscreenElement?: unknown; exitFullscreen?: () => Promise<void>;
}
export interface FullscreenElementLike { requestFullscreen?: () => Promise<void> }

export class FullscreenController {
  constructor(private readonly documentLike: FullscreenDocumentLike, private readonly element: FullscreenElementLike, private readonly onChange: () => void) {}
  get supported(): boolean { return Boolean(this.element.requestFullscreen && this.documentLike.exitFullscreen); }
  get active(): boolean { return Boolean(this.documentLike.fullscreenElement); }
  async toggle(): Promise<boolean> {
    if (!this.supported) return false;
    if (this.active) await this.documentLike.exitFullscreen?.(); else await this.element.requestFullscreen?.();
    this.onChange(); return true;
  }
}
