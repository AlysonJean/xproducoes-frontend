import { useParams } from 'react-router-dom';
import { NoticeCard, PROPOSAL_HELP_TEXT, ProposalShell } from '@/components/proposal/ProposalShell';

// P15 (aprovada em 02/11/2026), parte 1: endereço antigo /proposta/<número da reserva>, dos links mandados antes do
// link seguro. Achado: a página que ficava aqui chamava GET /bookings/:id, que exige login e ser dono da reserva (o
// cliente que abria o link via "Proposta não encontrada"), tinha uma validade fixa de "7 dias após emissão" e um
// convite de conta que prometia "baixar notas fiscais"; e o número da reserva dá para adivinhar. Agora este endereço
// só avisa que o link não vale mais, sem chamar a API. A proposta abre pelo link seguro /proposta#token=...
// (pages/PublicProposalPage.tsx).
export default function LegacyProposalLinkPage() {
  const { id } = useParams<{ id: string }>();
  // O número ajuda a equipe a achar a reserva; só vai se tiver a cara de um número de reserva.
  const code = id && /^[A-Za-z0-9-]{1,60}$/.test(id) ? id : null;
  return (
    <ProposalShell>
      <NoticeCard
        message="Este link não vale mais. Peça um novo link à equipe."
        whatsappText={code ? `Olá! O link da proposta ${code} não abre mais. Pode me mandar um novo?` : PROPOSAL_HELP_TEXT}
      />
    </ProposalShell>
  );
}
