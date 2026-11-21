import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { GlassCard } from './StandardComponents';
import { buttonVariants } from './Button';
import { Textarea } from './Textarea';
import { apiFetch } from '../../services/api';
import { BRIEFING_TEXT_MAX, BRIEFING_TEXT_MIN, briefingTextState } from '../../utils/briefing';

// "Conte seu evento" (pedido de Alyson em 20/11/2026): no lugar do teste rápido, que fazia as mesmas 3 perguntas do
// briefing e depois abria o briefing para conferir as mesmas respostas. A pessoa escreve o evento do jeito dela; o
// servidor lê o texto com a IA da Cloudflare (POST /briefing/interpret) e o briefing abre com as respostas marcadas,
// para conferir e completar (utils/briefing.ts: briefingFromText). A IA não escolhe kit nem fala preço.
// Se a leitura falhar (IA fora do ar, cota do dia, limite por conexão), o briefing abre do mesmo jeito, com o texto em
// "Quer contar mais alguma coisa?". Nada fica preso aqui.

const EXEMPLO = 'Ex.: casamento num salão em Contagem, umas 150 pessoas, dia 14 de março, das 18h à meia-noite, com banda e DJ.';
// O servidor desiste da IA em 10 s; aqui, uma folga para a rede.
const LEITURA_TIMEOUT_MS = 15_000;

export const ConteSeuEvento = () => {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    if (lendo) return;
    const limpo = texto.trim();
    if (limpo.length < BRIEFING_TEXT_MIN) {
      setErro('Conte um pouco mais: o tipo de festa, a data, quantas pessoas, a cidade...');
      return;
    }
    setErro(null);
    setLendo(true);
    let prefill: unknown = {};
    try {
      const resposta = await apiFetch<{ prefill?: unknown }>('/briefing/interpret', {
        method: 'POST',
        body: JSON.stringify({ text: limpo }),
        timeoutMs: LEITURA_TIMEOUT_MS,
      });
      prefill = resposta?.prefill ?? {};
    } catch {
      prefill = {};
    }
    navigate('/briefing', { state: briefingTextState(limpo, prefill) });
  };

  return (
    <GlassCard hoverEffect={false} className="mx-auto max-w-3xl">
      <form onSubmit={enviar} noValidate className="space-y-4 p-2 md:p-6">
        <Textarea
          label="Como vai ser o seu evento?"
          rows={4}
          maxLength={BRIEFING_TEXT_MAX}
          placeholder={EXEMPLO}
          value={texto}
          disabled={lendo}
          error={erro ?? undefined}
          description="Não escreva nome, telefone nem e-mail aqui: eles ficam para o fim do pedido."
          onChange={(event) => {
            setTexto(event.target.value);
            if (erro) setErro(null);
          }}
        />
        <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
          <p>
            Uma inteligência artificial (Cloudflare) lê o texto só para marcar as respostas, e ele não fica guardado lá.{' '}
            <Link to="/privacidade" className="underline underline-offset-2 hover:text-foreground">
              Política de Privacidade
            </Link>
          </p>
          <span className="shrink-0 tabular-nums">
            {texto.length}/{BRIEFING_TEXT_MAX}
          </span>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" disabled={lendo} className={buttonVariants({ size: 'lg', className: 'rounded-full' })}>
            {lendo ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                Lendo o seu texto...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                Preencher o pedido
              </>
            )}
          </button>
          <Link to="/briefing" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
            Prefiro responder passo a passo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </form>
    </GlassCard>
  );
};
