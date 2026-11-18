import { describe, it, expect } from 'vitest';
import { BOOKING_CANCELLED_MESSAGE, contractErrorMessage } from '@/components/proposal/contractHelpers';

// Teste de 17/11/2026: nas rotas do aceite (preparar, aceitar, desistir), a reserva cancelada pela equipe responde
// 410 PROPOSAL_CANCELLED; a tela diz que a reserva foi cancelada, não que o link venceu.
describe('contractErrorMessage: reserva cancelada', () => {
  it('410 PROPOSAL_CANCELLED: "Esta reserva foi cancelada..."', () => {
    expect(contractErrorMessage({ status: 410, message: 'x', code: 'PROPOSAL_CANCELLED' }, 'fallback')).toBe(BOOKING_CANCELLED_MESSAGE);
    expect(BOOKING_CANCELLED_MESSAGE).toBe('Esta reserva foi cancelada. Se tiver alguma dúvida, fale com a equipe pelo WhatsApp.');
  });

  it('410 com outro código ou sem código: "Este link venceu ou foi trocado"', () => {
    for (const code of ['PROPOSAL_GONE', null, undefined]) {
      expect(contractErrorMessage({ status: 410, message: 'x', code }, 'fallback')).toBe('Este link venceu ou foi trocado. Peça um novo link à equipe.');
    }
  });
});
