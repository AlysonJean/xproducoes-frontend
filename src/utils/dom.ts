/* eslint-disable @typescript-eslint/no-unused-vars, no-control-regex */
// Utilities for safe transient DOM operations (anchors, script injection)
import { normalizeString } from './string';
import type { AnchorOptions, ScriptOptions } from '@/types';

export function isSafeUrl(u: string): boolean {
  if (!u) return false;
  const trimmed = String(u).trim();
  try {
    // No servidor, tratamos como seguro se for path relativo ou se for absoluto com protocolo ok
    if (typeof window === 'undefined') {
       if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) return true;
       const parsed = new URL(trimmed, 'http://localhost:3000');
       const proto = (parsed.protocol || '').toLowerCase();
       return proto === 'http:' || proto === 'https:';
    }
    const parsed = new URL(trimmed, window.location.href);
    const proto = (parsed.protocol || '').toLowerCase();
    return proto === 'http:' || proto === 'https:' || proto === 'blob:';
    } catch (e) {
    return false;
  }
}

export function sanitizeFilename(name: string | undefined): string | undefined {
  if (!name) return undefined;
  // keep only basename, remove path separators, control chars and newlines
  const base = name.split(/[\\/]/).pop() || name;
  // remove characters that could break headers or filesystem: newlines, null, etc.
    return base.replace(/[\x00-\x1F\x7F"'<>\\/\\\\]/g, '_').slice(0, 200);
}

export function createAndClickAnchor(opts: AnchorOptions): void {
  // Validate href
  if (!isSafeUrl(opts.href)) {
    // do not attempt to append unsafe hrefs
     
    console.warn('createAndClickAnchor blocked insecure href:', opts.href);
    return;
  }

  const a = document.createElement('a');
  a.href = opts.href;
  const safeDownload = sanitizeFilename(opts.download);
  if (safeDownload) a.download = safeDownload;
  if (opts.target) a.target = opts.target;
  if (opts.rel) a.rel = opts.rel;
  a.style.display = 'none';
  // append, click, remove in finally
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    if (a.parentNode) a.parentNode.removeChild(a);
    if (opts.revokeObjectUrl && opts.objectUrl) {
      try {
        window.URL.revokeObjectURL(opts.objectUrl);
            } catch (e) {
        /* ignore */
      }
    }
  }
}

export function appendScriptIfNotExists(opts: ScriptOptions): HTMLScriptElement | null {
  try {
    // Basic validation of script src to avoid script injection from unsafe schemes
  if (!isSafeUrl(opts.src) || normalizeString(opts.src.trim()).startsWith('blob:')) {
      // scripts should be loaded over http(s); blob: is not a valid external script source here
      console.warn('appendScriptIfNotExists blocked insecure script src:', opts.src);
      return null;
    }

    const existing = Array.from(document.getElementsByTagName('script')).find((s) => s.src && s.src.indexOf(opts.src) !== -1);
    if (existing) return existing as HTMLScriptElement;
    const script = document.createElement('script');
    if (opts.async) script.async = true;
    if (opts.defer) script.defer = true;
    if (opts.crossOrigin) script.crossOrigin = opts.crossOrigin;
    script.src = opts.src;
    document.head.appendChild(script);
    return script;
  } catch (err) {
    // do not throw in UI code path
     
    console.warn('appendScriptIfNotExists failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
