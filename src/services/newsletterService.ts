import { apiFetch } from './api';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

// D8c (aprovada em 02/11/2026), pergunta 5: a inscrição saiu do site e do servidor (ninguém envia newsletter). Fica
// só a leitura das inscrições antigas, na tela do painel.
export const newsletterService = {
  getAllSubscribers: async (): Promise<NewsletterSubscriber[]> => {
    return apiFetch('/newsletter/subscribers');
  },
};
