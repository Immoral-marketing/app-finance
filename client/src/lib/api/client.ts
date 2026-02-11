import { supabase } from '@/lib/supabase';

const SERVICES = {
    ADMIN: 'http://localhost:3010',
    PAYROLL: 'http://localhost:3011',
    COMMISSIONS: 'http://localhost:3012'
};

interface FetchOptions extends RequestInit {
    service?: keyof typeof SERVICES;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { service = 'ADMIN', ...init } = options;
    const baseUrl = SERVICES[service];

    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(`${baseUrl}${endpoint}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...init.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'API request failed');
    }

    return response.json();
}
