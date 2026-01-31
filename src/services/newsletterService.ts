import { apiFetch } from './api';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export const newsletterService = {
  subscribe: async (email: string) => {
    return apiFetch('/newsletter/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  getAllSubscribers: async (): Promise<NewsletterSubscriber[]> => {
    return apiFetch('/newsletter/subscribers');
  },
};
