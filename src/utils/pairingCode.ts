// Onda 4 da auditoria de 19/11 (F8-10): o código de pareamento do telão, 6 dígitos (100000–999999) sorteados com crypto.getRandomValues.
export function randomPairingCode(): string {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    return String(100000 + (n[0] % 900000));
}
