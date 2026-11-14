// Aceite online (13/11/2026): os tipos do contrato da API do aceite (roteiro da leva B, "CONTRATO DA API"). O servidor
// só oferece o aceite com CONTRACTS_ENABLED=true; desligado, as rotas respondem 404 e o /proposals/view não traz
// contract.enabled = true.

export type ContractPersonType = 'PF' | 'PJ';
/** OWN_EVENT: cliente final (evento próprio). RESALE: revendedor (produz ou revende o evento de outra pessoa). */
export type ContractPurpose = 'OWN_EVENT' | 'RESALE';
/** NONE só no /proposals/view (nenhum contrato preparado); SUPERSEDED só nas telas da reserva (trocado por outro). */
export type ContractState = 'NONE' | 'PREPARED' | 'ACCEPTED' | 'WITHDRAWN' | 'SUPERSEDED';

export interface ContractAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ContractRepresentative {
  name: string;
  cpf: string;
  role: string;
}

/** O contratante, como vai no corpo do POST /proposals/contract/prepare. */
export interface ContractParty {
  personType: ContractPersonType;
  name: string;
  document: string;
  email: string;
  phone: string;
  address: ContractAddress;
  representative?: ContractRepresentative;
  purpose: ContractPurpose;
}

/** Valor e vencimento de uma parcela (ISO 8601). */
export interface ContractInstallment {
  amount: number;
  dueDate: string;
}

export interface ContractOtp {
  /** O e-mail do código, mascarado pelo servidor. */
  sentTo: string;
  expiresAt: string;
}

export interface ContractCancellationRule {
  range: string;
  percent: number;
}

/** O resumo da contratação, montado pelo servidor a partir da reserva e da finalidade. */
export interface ContractSummary {
  object: string;
  eventDate: string;
  eventEndDate: string | null;
  location: string;
  total: number;
  initialPayment: ContractInstallment;
  balance: ContractInstallment;
  freight: string;
  cancellation: ContractCancellationRule[];
  withdrawalDays: 7 | null;
  forum: string;
}

/** 200 do POST /proposals/contract/prepare. */
export interface ContractPrepared {
  contractId: string;
  templateVersion: string;
  sha256: string;
  summary: ContractSummary;
  otp: ContractOtp;
}

/** 200 do POST /proposals/contract/accept. */
export interface ContractAccepted {
  acceptedAt: string;
  protocol: string;
  sha256: string;
  initialPayment: ContractInstallment;
  balance: ContractInstallment;
  withdrawUntil: string | null;
  pix: { key: string; keyType: 'CNPJ' };
}

/**
 * O contato da reserva para começar o passo 1 (prefill do /proposals/view, revisão de 14/11/2026). Só vem enquanto o
 * aceite pode começar (aceite no ar e nenhum contrato aceito); o que a reserva não tiver vem null.
 */
export interface ProposalPrefill {
  name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * O campo contract do /proposals/view (também na resposta { state: "closed" }). contractId vem desde o preparado
 * (PREPARED, ACCEPTED, WITHDRAWN): com ele, o link aceito oferece "Baixar contrato (PDF)". withdrawnAt vem no WITHDRAWN.
 */
export interface ProposalContractStatus {
  enabled: boolean;
  state: ContractState;
  contractId?: string;
  acceptedAt?: string | null;
  withdrawnAt?: string | null;
  withdrawUntil?: string | null;
  canWithdraw?: boolean;
  sha256?: string | null;
  /** Só no ACCEPTED: os mesmos dados da resposta do aceite, para a página mostrar a parcela inicial e o PIX ao reabrir. */
  protocol?: string | null;
  initialPayment?: ContractInstallment | null;
  balance?: ContractInstallment | null;
  pix?: { key: string; keyType: 'CNPJ' } | null;
}

/** contractSummary do GET /bookings/:id (cliente e admin); null sem contrato. Do contratante, só o nome. */
export interface BookingContractSummary {
  state: ContractState;
  acceptedAt: string | null;
  withdrawUntil: string | null;
  partyName?: string | null;
}

/**
 * GET /bookings/:id/contract (área do cliente). No PREPARED, acceptedAt e os vencimentos vêm nulos (o cartão só mostra
 * os vencimentos do aceito). withdrawnAt é lido quando vier.
 */
export interface ClientContract {
  state: ContractState;
  acceptedAt: string | null;
  sha256: string | null;
  withdrawUntil: string | null;
  canWithdraw: boolean;
  initialPayment: ContractInstallment | null;
  balance: ContractInstallment | null;
  protocol?: string | null;
  withdrawnAt?: string | null;
}

/** Um evento da trilha do aceite (gerado, código enviado, código conferido, aceito, e-mail enviado, desistiu). */
export interface AdminContractEvent {
  type: string;
  createdAt: string;
}

/** O contratante como o painel recebe (o documento completo; a ficha mascara na tela). */
export interface AdminContractParty extends Omit<ContractParty, 'address' | 'representative' | 'purpose'> {
  address: ContractAddress | null;
  representative: ContractRepresentative | null;
}

/**
 * GET /admin/bookings/:id/contract, com os nomes combinados com o servidor (state, templateVersion, sha256, acceptedAt,
 * withdrawnAt, withdrawReason, ip, userAgent, otpEmail, purpose, party, initialPayment, balance, events). withdrawUntil
 * é lido quando vier. Ver normalizeAdminContract em components/proposal/contractHelpers.ts.
 */
export interface AdminContract {
  state: ContractState;
  purpose: ContractPurpose | null;
  templateVersion: string | null;
  sha256: string | null;
  acceptedAt: string | null;
  withdrawUntil: string | null;
  withdrawnAt: string | null;
  withdrawReason: string | null;
  ip: string | null;
  userAgent: string | null;
  otpEmail: string | null;
  party: AdminContractParty | null;
  initialPayment: ContractInstallment | null;
  balance: ContractInstallment | null;
  events: AdminContractEvent[];
}
