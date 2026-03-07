/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createAndClickAnchor, appendScriptIfNotExists } from '../dom';

// JSDOM environment provides document
describe('dom utils', () => {
  it('createAndClickAnchor creates and removes anchor and revokes objectUrl', () => {
    const blobUrl = 'blob:http://localhost/fake-blob';
    // spy on document body appendChild/removeChild
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(Node.prototype, 'removeChild');
        if (!(window.URL && (window.URL as any).revokeObjectURL)) {
            (window.URL as any).revokeObjectURL = () => undefined;
    }
        const revokeSpy = vi.spyOn((window.URL as any), 'revokeObjectURL').mockImplementation(() => undefined);

    createAndClickAnchor({ href: 'http://example.com/file.txt', download: 'file.txt' });
    expect(appendSpy).toHaveBeenCalled();

    // objectUrl revocation path
    createAndClickAnchor({ href: blobUrl, download: 'file.txt', revokeObjectUrl: true, objectUrl: blobUrl });
    expect(revokeSpy).toHaveBeenCalledWith(blobUrl);

  appendSpy.mockRestore();
  removeSpy.mockRestore();
  revokeSpy.mockRestore();
  });

  it('appendScriptIfNotExists blocks unsafe src and returns null', () => {
        const result = appendScriptIfNotExists({ src: 'javascript:alert(1)' as any, async: true });
    expect(result).toBeNull();
  });
});
