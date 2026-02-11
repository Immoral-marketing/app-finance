import { fetchApi } from './client';

export interface Partner {
    id: string;
    name: string;
    commission_type: 'percentage' | 'fixed';
    default_commission_rate: number;
}

export interface PartnerCommission {
    id: string;
    partner_id: string;
    partner_name: string;
    client_id: string;
    client_name: string;
    fiscal_year: number;
    fiscal_month: number;
    client_billing_amount: number;
    commission_rate: number;
    commission_amount: number;
    is_paid: boolean;
}

export const commissionsApi = {
    getPartners: () => {
        return fetchApi<{ partners: Partner[] }>('/partners', { service: 'COMMISSIONS' });
    },

    getCommissions: (year: number, month: number) => {
        return fetchApi<{ commissions: PartnerCommission[] }>(`/partners/commissions/${year}/${month}`, { service: 'COMMISSIONS' });
    },

    calculateCommissions: (year: number, month: number) => {
        return fetchApi('/partners/commissions/calculate', {
            service: 'COMMISSIONS',
            method: 'POST',
            body: JSON.stringify({ fiscal_year: year, fiscal_month: month })
        });
    }
};
