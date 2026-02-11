const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3010';

export interface Vertical {
    id: string;
    name: string;
    code: string;
    created_at?: string;
}

export interface Department {
    id: string;
    name: string;
    code: string;
    display_order: number;
    created_at?: string;
}

const getHeaders = () => {
    return {
        'Content-Type': 'application/json',
        // Add auth headers here if needed later
    };
};

export const settingsApi = {
    // Verticals
    getVerticals: async (): Promise<Vertical[]> => {
        const res = await fetch(`${API_URL}/settings/verticals`);
        if (!res.ok) throw new Error('Failed to fetch verticals');
        const data = await res.json();
        return data.verticals;
    },

    createVertical: async (data: { name: string; code?: string }): Promise<Vertical> => {
        const res = await fetch(`${API_URL}/settings/verticals`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create vertical');
        const json = await res.json();
        return json.vertical;
    },

    updateVertical: async (id: string, data: { name: string; code?: string }): Promise<Vertical> => {
        const res = await fetch(`${API_URL}/settings/verticals/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update vertical');
        const json = await res.json();
        return json.vertical;
    },

    deleteVertical: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/settings/verticals/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete vertical');
    },

    // Departments
    getDepartments: async (): Promise<Department[]> => {
        const res = await fetch(`${API_URL}/settings/departments`);
        if (!res.ok) throw new Error('Failed to fetch departments');
        const data = await res.json();
        return data.departments;
    },

    createDepartment: async (data: { name: string; code: string; display_order?: number }): Promise<Department> => {
        const res = await fetch(`${API_URL}/settings/departments`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create department');
        const json = await res.json();
        return json.department;
    },

    updateDepartment: async (id: string, data: { name: string; code: string; display_order?: number }): Promise<Department> => {
        const res = await fetch(`${API_URL}/settings/departments/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update department');
        const json = await res.json();
        return json.department;
    },
};
