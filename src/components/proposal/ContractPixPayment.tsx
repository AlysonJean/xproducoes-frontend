import { useId, useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/StandardComponents';
import { formatPrice } from '@/utils/formatPrice';
import { formatCnpj, normalizeDocument } from '@/utils/document';
import { contractDate, copyText } from './contractHelpers';

// Semanas 2 e 3 do teste do aceite (16/11/2026): "PIX com valor já preenchido: QR Code e copia e cola do sinal, não só a
// chave". O servidor monta o "PIX copia e cola" (BR Code do Banco Central, com a chave do CNPJ, o valor da parcela
// inicial e o protocolo como identificador); aqui ele vira QR Code (para ler com outro aparelho) e um botão de copiar
// (para colar no app do banco no mesmo celular). A chave do CNPJ continua à vista, como alternativa. Sem o código
// (parcela já registrada, ou servidor antigo), só a chave. O QR Code fica sempre em fundo branco (o tema escuro não
// atrapalha a leitura).

export interface ContractPixPaymentProps {
  /** O "PIX copia e cola" com o valor (o texto do QR Code). */
  copyPaste?: string | null;
  /** A chave PIX (CNPJ, com ou sem pontuação). */
  pixKey: string;
  amount?: number | null;
  dueDate?: string | null;
}

export function ContractPixPayment({ copyPaste, pixKey, amount, dueDate }: ContractPixPaymentProps) {
  const [status, setStatus] = useState<string | null>(null);
  const codeId = useId();

  const copy = async (text: string, done: string, failed: string) => {
    setStatus((await copyText(text)) ? done : failed);
  };

  return (
    <div className="space-y-4">
      {typeof amount === 'number' && (
        <p>
          Valor: <strong>{formatPrice(amount)}</strong>
          {dueDate ? <>, até {contractDate(dueDate)}</> : null}.
        </p>
      )}
      {copyPaste && (
        <div className="space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div role="img" aria-label="QR Code do PIX, já com o valor" className="w-fit shrink-0 rounded-lg border-2 border-border bg-white p-3">
              <QRCode value={copyPaste} size={184} level="M" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p>
                <strong>No computador:</strong> abra o app do banco no celular, escolha Pix e leia o QR Code.
              </p>
              <p>
                <strong>No celular:</strong> copie o código e cole no app do banco, em Pix copia e cola. O valor já vem preenchido.
              </p>
              <Button
                type="button"
                size="lg"
                onClick={() =>
                  void copy(copyPaste, 'Código PIX copiado. Cole no app do banco, em Pix copia e cola.', 'Não deu para copiar. Selecione o código abaixo e copie.')
                }
                leftIcon={<Copy className="h-5 w-5" aria-hidden="true" />}
                className="w-full normal-case tracking-normal sm:w-auto"
              >
                Copiar código PIX
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={codeId} className="block font-medium text-foreground">
              Código PIX copia e cola
            </label>
            <textarea
              id={codeId}
              readOnly
              rows={3}
              value={copyPaste}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full resize-none break-all rounded-lg border-2 border-border bg-card p-3 font-mono text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}
      <div className="space-y-2">
        <p>
          {copyPaste ? 'Ou use a chave PIX (CNPJ): ' : 'Chave PIX (CNPJ): '}
          <strong className="font-mono">{formatCnpj(pixKey)}</strong>
        </p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => void copy(normalizeDocument(pixKey), 'Chave PIX copiada.', 'Não deu para copiar. Selecione a chave e copie.')}
          leftIcon={<Copy className="h-5 w-5" aria-hidden="true" />}
          className="w-full normal-case tracking-normal sm:w-auto"
        >
          Copiar chave PIX
        </Button>
      </div>
      {/* Sempre na página (só o texto muda): o leitor de tela anuncia a cópia. */}
      <p role="status" className="min-h-6 text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
