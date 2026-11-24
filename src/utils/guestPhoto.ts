// Onda 4 da auditoria de 19/11 (F8-20): a foto do convidado no mural, conferida e reduzida no aparelho. Os mesmos limites e frases do servidor (backend/src/middlewares/publicWallUpload.ts).
export const GUEST_PHOTO_TYPES = /^image\/(jpeg|png|webp|gif|heic|heif)$/;
export const GUEST_PHOTO_TYPE_MESSAGE = 'Envie uma foto (JPG, PNG, WEBP, GIF ou HEIC).';
export const GUEST_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const GUEST_PHOTO_TOO_BIG = 'Foto muito grande (máx. 10 MB).';
const RESIZE_ABOVE_BYTES = 2 * 1024 * 1024;
const RESIZE_MAX_SIDE = 1920;

// JPEG, PNG ou WEBP acima de 2 MB sai com o maior lado em até 1920 px (JPEG 85%). Se o aparelho não consegue ler a
// imagem (HEIC fora do Safari, por exemplo), vai a original.
export function shouldResizeGuestPhoto(file: File): boolean {
    return /^image\/(jpeg|png|webp)$/.test(file.type) && file.size > RESIZE_ABOVE_BYTES && typeof createImageBitmap === 'function';
}

export async function prepareGuestPhoto(file: File): Promise<File> {
    if (!shouldResizeGuestPhoto(file)) return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, RESIZE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const context = canvas.getContext('2d');
        if (!context) return file;
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
        if (!blob || blob.size >= file.size) return file;
        return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'foto'}.jpg`, { type: 'image/jpeg' });
    } catch {
        return file;
    }
}
