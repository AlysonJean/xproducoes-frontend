import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '@/services/api';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { 
  Card, 
  Button, 
  Badge,
  Grid
} from '@/components/ui/StandardComponents';
import { 
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
import { SEO } from '@/components/SEO';

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
        console.error('Erro ao buscar proposta:', error);
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
    window.open(`https://wa.me/5531989252272?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <BrandLoader fullScreen size="xl" label="Preparando sua proposta exclusiva..." />;
  if (!proposal) return <div className="p-20 text-center">Proposta não encontrada ou expirada.</div>;

  const eventDate = proposal.eventDate ? new Date(proposal.eventDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }) : 'Data não informada';

  return (
    <div className="min-h-screen bg-surface py-12 px-4 print:bg-white print:py-0">
      <SEO 
        title={`Proposta Comercial - ${proposal.eventTitle} | X Produções`}
        description={`Visualização oficial da proposta #${proposal.id} para locação de equipamentos audiovisual.`}
      />
      
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Actions Bar - Hidden on print */}
        <div className="flex justify-between items-center print:hidden">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-4 py-1.5 rounded-full">
            PROPOSTA EXCLUSIVA
          </Badge>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button size="sm" onClick={handleWhatsApp} className="bg-green-600 hover:bg-green-700 text-white gap-2 border-none">
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
        </div>

        {/* Header Hero */}
        <Card className="p-0 border-none overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <FileText size={200} />
          </div>
          
          <div className="bg-primary p-12 text-white">
             <div className="flex flex-col md:flex-row justify-between gap-8">
               <div className="space-y-4">
                 <div className="h-12 w-48 bg-white/10 rounded-lg flex items-center justify-center font-black tracking-tighter text-2xl uppercase">
                   X PRODUÇÕES
                 </div>
                 <div>
                   <h1 className="text-4xl font-extrabold tracking-tight">{proposal.eventTitle}</h1>
                   <p className="text-primary-foreground/80 mt-2 font-medium">Orçamento ID: <span className="font-mono text-white">#{proposal.id}</span></p>
                 </div>
               </div>
               
               <div className="flex flex-col items-end justify-end space-y-2">
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-widest opacity-60">Total da Proposta</p>
                    <p className="text-5xl font-black">{formatPrice(Number(proposal.totalPrice))}</p>
                  </div>
               </div>
             </div>
          </div>
          
          <div className="p-8 bg-card flex flex-wrap gap-8 border-b">
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                 <Calendar className="h-5 w-5" />
               </div>
               <div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Data do Evento</p>
                 <p className="font-bold">{eventDate}</p>
               </div>
             </div>
             
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                 <MapPin className="h-5 w-5" />
               </div>
               <div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Local</p>
                 <p className="font-bold">{proposal.location}</p>
               </div>
             </div>

             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                 <ShieldCheck className="h-5 w-5" />
               </div>
               <div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Válido até</p>
                 <p className="font-bold">7 dias após emissão</p>
               </div>
             </div>
          </div>
        </Card>

        {/* Item List */}
        <section className="space-y-6">
           <h2 className="text-xl font-bold flex items-center gap-2">
             <CheckCircle2 className="h-6 w-6 text-primary" />
             Itens e Serviços Inclusos
           </h2>
           
           <div className="space-y-4">
              {proposal.items && proposal.items.length > 0 ? (
                proposal.items.map((item: ProposalItem, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-6 bg-card border rounded-2xl hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-6">
                       <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                         {item.quantity}x
                       </div>
                       <div>
                         <h3 className="font-bold text-lg">{item.description}</h3>
                         <p className="text-sm text-muted-foreground">Item {item.itemType?.toLowerCase()}</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-mono font-bold text-xl">{formatPrice(Number(item.totalPrice))}</p>
                       {item.discount > 0 && (
                         <p className="text-xs text-emerald-500 font-bold italic">Desconto aplicado</p>
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

        {/* Comparison/Trust section */}
        <Grid columns={{ sm: 1, md: 2 }} gap={8}>
          <div className="bg-primary/5 p-8 rounded-3xl space-y-4">
             <div className="flex items-center gap-2 text-primary font-bold">
                <Star className="h-5 w-5 fill-primary" />
                Diferencial X Produções
             </div>
             <p className="text-sm leading-relaxed text-muted-foreground">
               Todos os equipamentos passam por manutenção rigorosa antes de cada evento. Nossa equipe técnica estará de prontidão para garantir que seu evento seja um sucesso absoluto.
             </p>
          </div>
          <div className="flex flex-col justify-center items-center space-y-4 text-center">
             <p className="text-sm font-medium text-muted-foreground">Pronto para fechar?</p>
             <Button className="w-full h-14 text-lg rounded-2xl shadow-xl shadow-primary/30 gap-2">
               Aprovar Proposta Agora <ArrowRight className="h-5 w-5" />
             </Button>
          </div>
        </Grid>

        {/* Registration Nudge */}
        {!proposal.clientId && (
          <div className="relative group overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-white shadow-2xl shadow-primary/20 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform group-hover:rotate-45 duration-500">
               <Star size={120} />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
               <div className="space-y-3">
                 <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">BENEFÍCIO EXCLUSIVO</Badge>
                 <h2 className="text-2xl md:text-3xl font-black tracking-tight">Rastreie este orçamento em tempo real</h2>
                 <p className="text-primary-foreground/80 max-w-lg font-medium">
                   Crie sua conta agora para receber notificações de status, baixar notas fiscais e gerenciar todo o seu histórico de eventos em um só lugar.
                 </p>
               </div>
               <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                 <Button 
                   onClick={() => navigate(`/cadastro?bookingId=${id}`)}
                   className="h-14 px-8 bg-white text-primary hover:bg-white/90 font-black rounded-2xl shadow-lg ring-4 ring-white/10"
                 >
                   Criar Minha Conta <ArrowRight className="ml-2 h-5 w-5" />
                 </Button>
               </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="pt-20 pb-12 text-center space-y-4 border-t opacity-50">
           <p className="text-[10px] font-black uppercase tracking-[0.3em]">X Produções e Eventos Audiovisual</p>
           <p className="text-xs">CNPJ 00.000.000/0001-00 • São Paulo, SP</p>
        </footer>
      </div>
      
      {/* Dynamic CSS for print */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
        }
      `}} />
    </div>
  );
}

function ArrowRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
