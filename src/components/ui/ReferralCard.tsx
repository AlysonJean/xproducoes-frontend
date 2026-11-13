import { useEffect, useState } from 'react';
import { Gift, Copy, MessageCircle } from 'lucide-react';
import { Button, Card } from './StandardComponents';
import { authAPI } from '../../services/api';
import { useNotifications } from '../../contexts/NotificationContext';
import { logger } from '../../utils/logger';
import type { ReferralStats } from '../../types/domains/dashboard';
import { SITE_NAME } from '../../data/site';

// Auditoria do orçamento (12/11/2026), O9, D4 e E7: o cartão prometia "10% de desconto na primeira locação". O código
// de indicação (backend/src/services/referralService.ts) vale nos itens, com teto, não desconta frete nem pedágio e
// vale uma vez por cliente (não só na primeira locação); a recompensa de quem indica tem o mesmo teto e vence em 90
// dias. Os números são os do servidor (REFERRAL_MAX_DISCOUNT, REWARD_MAX_DISCOUNT e REWARD_VALIDITY_DAYS).
const REFERRAL_MAX_DISCOUNT = 150;
const REWARD_VALIDITY_DAYS = 90;
// O link levava a /orcamento, que sem carrinho manda ao briefing, e o briefing não tem campo de cupom. Os kits levam
// ao carrinho, e o pedido com carrinho tem o campo do código.
const REFERRAL_LANDING_PATH = '/kits';

const referralRuleText = (percent: number) =>
  `${percent}% de desconto nos itens (até R$ ${REFERRAL_MAX_DISCOUNT}; não vale para frete nem pedágio; uma vez por cliente)`;

// Achado (produto): negócio pediu um jeito de trazer clientes novos via indicação de
// clientes existentes — reaproveita o sistema de Coupon (ver referralService.ts no
// backend). Falha silenciosamente (retorna null) em vez de mostrar erro no dashboard: essa
// seção é um "bônus", não deve nunca ser o motivo de uma tela de erro pro cliente.
export const ReferralCard = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    let active = true;
    authAPI
      .getReferral()
      .then((res) => {
        if (active) setStats((res.data?.data ?? res.data) as ReferralStats);
      })
      .catch((e) => logger.debug('Referral stats indisponível', 'ReferralCard', e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || !stats) return null;

  // Achado: emojis fora do BMP (ex. 🎉) chegam corrompidos (U+FFFD) na mensagem depois do
  // redirect wa.me → api.whatsapp.com — confirmado que a string sai correta do nosso código
  // (bytes certos até a chamada de window.open) e só quebra depois da navegação real, ou
  // seja, é o servidor do WhatsApp que não lida bem com caracteres astrais nesse link.
  // Evitado aqui em vez de perseguir um bug de terceiro para um emoji decorativo.
  const shareMessage = `Oi! Conheça a ${SITE_NAME}: aluguel de som, luz e estrutura para eventos. Com o meu código *${stats.code}* você ganha ${referralRuleText(stats.discountPercent)}. Escolha os itens e use o código no pedido: ${window.location.origin}${REFERRAL_LANDING_PATH}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(stats.code);
      addNotification({ type: 'success', title: 'Copiado!', message: 'Código de indicação copiado.' });
    } catch (e) {
      logger.error('Falha ao copiar código de indicação', 'ReferralCard', e);
    }
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-foreground">Indique um amigo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Seu amigo ganha <strong>{referralRuleText(stats.discountPercent)}</strong> no pedido com o seu código.
              Quando a locação dele for concluída, você ganha um código de {stats.discountPercent}% nos itens (também até
              R$ {REFERRAL_MAX_DISCOUNT}), válido por {REWARD_VALIDITY_DAYS} dias.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center justify-between gap-3 rounded-lg border border-dashed border-primary/40 bg-background px-4 py-3">
                <span className="font-mono text-lg font-bold tracking-widest text-primary">{stats.code}</span>
                <Button variant="ghost" size="sm" onClick={handleCopy} leftIcon={<Copy className="h-4 w-4" />}>
                  Copiar
                </Button>
              </div>
              <Button
                variant="primary"
                onClick={handleShareWhatsApp}
                leftIcon={<MessageCircle className="h-4 w-4" />}
                className="sm:w-auto"
              >
                Compartilhar
              </Button>
            </div>

            {(stats.timesUsed > 0 || stats.rewardsEarned > 0) && (
              <div className="mt-4 flex gap-6 text-sm text-muted-foreground">
                <span>
                  <strong className="text-foreground">{stats.timesUsed}</strong> amigo(s) usaram seu código
                </span>
                <span>
                  <strong className="text-foreground">{stats.rewardsEarned}</strong> recompensa(s) ganha(s)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
