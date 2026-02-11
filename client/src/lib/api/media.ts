const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3010';

export interface PlatformInvestment {
    platform_id: string;
    platform_name: string;
    platform_code: string;
    actual_amount: number;
}

export interface ClientInvestment {
    client_id: string;
    client_name: string;
    planned_investment: number; // Global Planned
    total_actual: number;
    completion_percentage: number;
    platforms: PlatformInvestment[];
}

export interface MonthlyInvestmentResponse {
    investments: ClientInvestment[];
}

export const mediaApi = {
    getPlatforms: async () => {
        const res = await fetch(`${API_URL}/media/platforms`);
        if (!res.ok) throw new Error('Failed to fetch platforms');
        const data = await res.json();
        return data.platforms;
    },

    getMonthlyInvestment: async (year: number, month: number): Promise<MonthlyInvestmentResponse> => {
        const res = await fetch(`${API_URL}/media/investment/${year}/${month}`);
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || 'Failed to fetch investments');
        }
        return res.json();
    },

    updatePlannedInvestment: async (data: {
        client_id: string;
        fiscal_year: number;
        fiscal_month: number;
        amount: number
    }) => {
        const res = await fetch(`${API_URL}/media/planned`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update planned investment');
        return res.json();
    },

    updatePlatformInvestment: async (data: {
        client_id: string;
        fiscal_year: number;
        fiscal_month: number;
        platform_id: string;
        amount: number
    }) => {
        const res = await fetch(`${API_URL}/media/platform`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update platform investment');
        return res.json();
    }
};
