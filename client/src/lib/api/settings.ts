import { fetchApi } from './client';

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

export const settingsApi = {
    // Verticals
    getVerticals: async (): Promise<Vertical[]> => {
        const data = await fetchApi<{ verticals: Vertical[] }>('/settings/verticals');
        return data.verticals;
    },

    createVertical: async (data: { name: string; code?: string }): Promise<Vertical> => {
        const json = await fetchApi<{ vertical: Vertical }>('/settings/verticals', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return json.vertical;
    },

    updateVertical: async (id: string, data: { name: string; code?: string }): Promise<Vertical> => {
        const json = await fetchApi<{ vertical: Vertical }>(`/settings/verticals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return json.vertical;
    },

    deleteVertical: async (id: string): Promise<void> => {
        await fetchApi(`/settings/verticals/${id}`, {
            method: 'DELETE',
        });
    },

    // Departments
    getDepartments: async (): Promise<Department[]> => {
        const data = await fetchApi<{ departments: Department[] }>('/settings/departments');
        return data.departments;
    },

    createDepartment: async (data: { name: string; code: string; display_order?: number }): Promise<Department> => {
        const json = await fetchApi<{ department: Department }>('/settings/departments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return json.department;
    },

    updateDepartment: async (id: string, data: { name: string; code: string; display_order?: number }): Promise<Department> => {
        const json = await fetchApi<{ department: Department }>(`/settings/departments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
        return json.department;
    },
};
