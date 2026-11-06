import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiFetch } from '@/services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import {
  Card,
  Button,
  Badge,
  Grid,
  buttonVariants,
} from '@/components/ui/StandardComponents';
import {
  ArrowRight,
  Calendar,
  MapPin,
  CheckCircle2,
  Download,
  MessageSquare,
  FileText,
  ShieldCheck,
  Star
} from 'lucide-react';
import { formatPrice } from '@/utils/formatPrice';
import { getWhatsAppPhone } from '@/utils/whatsapp';
import { SEO } from '@/components/SEO';
import { PageLayout } from '@/components/layouts/PageLayout';
import { COMPANY_CITY_LINE, COMPANY_CNPJ, COMPANY_LEGAL_NAME, SITE_NAME } from '@/data/site';
import { logger } from '../utils/logger';

interface ProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  itemType: string;
}

interface Proposal {
  id: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  totalPrice: number;
  items: ProposalItem[];
  clientId?: string;
}

// O tipo do item vinha cru do backend ("Item equipment").
const ITEM_TYPE_LABELS: Record<string, string> = {
  EQUIPMENT: 'Equipamento',
  SERVICE: 'Serviço',
  KIT: 'Kit',
};
const itemTypeLabel = (type?: string) => (type ? ITEM_TYPE_LABELS[type.toUpperCase()] ?? type : 'Item');

export default function ProposalViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const data = await apiFetch<Proposal | { data: Proposal }>(`/bookings/${id}`);
        const result = 'data' in data ? data.data : data;
        setProposal(result);
      } catch (error) {
        logger.error('Erro ao buscar proposta:', 'ProposalViewPage', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProposal();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!proposal) return;
    const text = `Olá! Acabei de visualizar a proposta comercial *#${proposal.id}* para o evento *${proposal.eventTitle}*. Gostaria de confirmar alguns detalhes.`;
    window.open(`https://wa.me/${getWhatsAppPhone()}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-background">
        <BrandLoader size={120} label="Carregando sua proposta..." />
      </div>
    );
  }

  if (!proposal) {
    return (
      <PageLayout title="Proposta não encontrada" description="Esta proposta não existe, expirou ou o link está incompleto.">
        <div className="text-center">
          <Link to="/contato" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            Falar com a equipe
          </Link>
        </div>
      </PageLayout>
    );
  }

  const eventDate = proposal.eventDate ? new Date(proposal.eventDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }) : 'Data não informada';

  return (
    // print-color-adjust: imprime os fundos coloridos (antes vinha de um <style> inline).
    <div className="min-h-screen bg-background py-12 px-4 print:bg-white print:py-0 [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
      <SEO
        title={`Proposta Comercial - ${proposal.eventTitle}`}
        description={`Visualização oficial da proposta #${proposal.id} para locação de equipamentos audiovisual.`}
      />

      <div className="max-w-4xl mx-auto space-y-8">

        {/* Barra de ações — oculta na impressão */}
        <div className="flex flex-wrap justify-between items-center gap-3 print:hidden">
          <Badge variant="primary" size="lg" className="font-bold uppercase tracking-wide">
            Proposta exclusiva
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} leftIcon={<Download className="h-4 w-4" aria-hidden="true" />}>
              Imprimir / PDF
            </Button>
            <Button variant="success" size="sm" onClick={handleWhatsApp} leftIcon={<MessageSquare className="h-4 w-4" aria-hidden="true" />}>
              WhatsApp
            </Button>
          </div>
        </div>

        {/* Cabeçalho.
            Achado: era `bg-primary text-white` — no tema escuro o primary é prata e o texto branco
            sumia. Agora o texto usa text-primary-foreground. A "caixa de logo" de enfeite saiu. */}
        <Card className="p-0 border-none overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-primary-foreground" aria-hidden="true">
            <FileText size={200} />
          </div>

          <div className="bg-primary p-8 md:p-12 text-primary-foreground">
             <div className="flex flex-col md:flex-row justify-between gap-8">
               <div className="space-y-4">
                 <p className="font-black tracking-tighter text-2xl uppercase">{SITE_NAME}</p>
                 <div>
                   <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{proposal.eventTitle}</h1>
                   <p className="text-primary-foreground/80 mt-2 font-medium">Orçamento ID: <span className="font-mono text-primary-foreground">#{proposal.id}</span></p>
                 </div>
               </div>

               <div className="flex flex-col md:items-end justify-end space-y-2">
                  <div className="md:text-right">
                    <p className="text-xs font-black uppercase tracking-widest text-primary-foreground/80">Total da Proposta</p>
                    <p className="text-4xl md:text-5xl font-black">{formatPrice(Number(proposal.totalPrice))}</p>
                  </div>
               </div>
             </div>
          </div>

          <div className="p-8 bg-card flex flex-wrap gap-8 border-b border-border">
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <Calendar className="h-5 w-5" aria-hidden="true" />
               </div>
               <div>
                 <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Data do Evento</p>
                 <p className="font-bold text-foreground">{eventDate}</p>
               </div>
             </div>

             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <MapPin className="h-5 w-5" aria-hidden="true" />
               </div>
               <div>
                 <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Local</p>
                 <p className="font-bold text-foreground">{proposal.location}</p>
               </div>
             </div>

             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <ShieldCheck className="h-5 w-5" aria-hidden="true" />
               </div>
               <div>
                 <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Válido até</p>
                 <p className="font-bold text-foreground">7 dias após emissão</p>
               </div>
             </div>
          </div>
        </Card>

        {/* Itens */}
        <section className="space-y-6">
           <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
             <CheckCircle2 className="h-6 w-6 text-primary" aria-hidden="true" />
             Itens e Serviços Inclusos
           </h2>

           <div className="space-y-4">
              {proposal.items && proposal.items.length > 0 ? (
                proposal.items.map((item: ProposalItem, idx: number) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-6 bg-card border border-border rounded-2xl hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-6">
                       <div className="h-12 w-12 flex-shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                         {item.quantity}x
                       </div>
                       <div>
                         <h3 className="font-bold text-lg text-foreground">{item.description}</h3>
                         <p className="text-sm text-muted-foreground">{itemTypeLabel(item.itemType)}</p>
                       </div>
                    </div>
                    <div className="sm:text-right">
                       <p className="font-mono font-bold text-xl text-foreground">{formatPrice(Number(item.totalPrice))}</p>
                       {item.discount > 0 && (
                         <p className="text-xs text-success font-bold italic">Desconto aplicado</p>
                       )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  Consulte os detalhes técnicos abaixo.
                </div>
              )}
           </div>
        </section>

        {/* Diferencial + próximo passo.
            Achado: o botão "Aprovar Proposta Agora" não fazia nada (sem onClick). Trocado pela ação
            que já existe na página: confirmar pelo WhatsApp. */}
        <Grid columns={{ sm: 1, md: 2 }} gap={8}>
          <div className="bg-primary/5 p-8 rounded-3xl space-y-4">
             <div className="flex items-center gap-2 text-primary font-bold">
                <Star className="h-5 w-5 fill-current" aria-hidden="true" />
                Diferencial X Produções
             </div>
             <p className="text-sm leading-relaxed text-muted-foreground">
               Todos os equipamentos passam por manutenção rigorosa antes de cada evento. Nossa equipe técnica estará de prontidão para garantir que seu evento seja um sucesso absoluto.
             </p>
          </div>
          <div className="flex flex-col justify-center items-center space-y-4 text-center print:hidden">
             <p className="text-sm font-medium text-muted-foreground">Pronto para fechar?</p>
             <Button
               variant="success"
               size="lg"
               fullWidth
               onClick={handleWhatsApp}
               rightIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
             >
               Confirmar pelo WhatsApp
             </Button>
          </div>
        </Grid>

        {/* Convite para criar conta */}
        {!proposal.clientId && (
          <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-primary-foreground shadow-2xl shadow-primary/20 animate-in fade-in slide-in-from-top-4 duration-700 print:hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform group-hover:rotate-45 duration-500" aria-hidden="true">
               <Star size={120} />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="space-y-3">
                 {/* D6, parte 1 (02/11/2026): prometia rastrear esta proposta, notificações e "baixar notas
                     fiscais" depois do cadastro. O cadastro não traz esta proposta para a conta, e não há nota
                     fiscal no site. O convite agora diz só o que a conta faz. */}
                 <h2 className="text-2xl md:text-3xl font-black tracking-tight">Peça os próximos eventos com mais rapidez</h2>
                 <p className="text-primary-foreground/80 max-w-lg font-medium">
                   Com uma conta, você acompanha os pedidos feitos por ela. Esta proposta continua neste link; para ajustar ou confirmar, fale com a nossa equipe.
                 </p>
               </div>
               <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                 <Button
                   onClick={() => navigate('/cadastro')}
                   size="lg"
                   className="px-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-black rounded-2xl shadow-lg ring-4 ring-primary-foreground/10"
                   rightIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
                 >
                   Criar minha conta
                 </Button>
               </div>
            </div>
          </div>
        )}

        {/* Rodapé.
            Achado: mostrava "CNPJ 00.000.000/0001-00 • São Paulo, SP" (placeholder). Agora usa os
            dados reais da empresa (src/data/site.ts). */}
        <footer className="pt-20 pb-12 text-center space-y-2 border-t border-border text-muted-foreground">
           <p className="text-xs font-black uppercase tracking-[0.3em]">{COMPANY_LEGAL_NAME}</p>
           <p className="text-xs">CNPJ {COMPANY_CNPJ} • {COMPANY_CITY_LINE}</p>
        </footer>
      </div>
    </div>
  );
}
