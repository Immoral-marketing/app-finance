import { Client, CreateClientDTO, UpdateClientDTO } from '../../types/client';

const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3010';

export const clientsApi = {
    // Get all clients
    getAll: async (): Promise<Client[]> => {
        const res = await fetch(`${API_URL}/clients`);
        if (!res.ok) throw new Error('Failed to fetch clients');
        const data = await res.json();
        return data.clients;
    },

    // Get single client
    getById: async (id: string): Promise<Client> => {
        const res = await fetch(`${API_URL}/clients/${id}`);
        if (!res.ok) throw new Error('Failed to fetch client');
        const data = await res.json();
        return data.client;
    },

    // Get verticals
    getVerticals: async (): Promise<{ id: string; name: string; code: string }[]> => {
        const res = await fetch(`${API_URL}/clients/verticals`);
        if (!res.ok) throw new Error('Failed to fetch verticals');
        const data = await res.json();
        return data.verticals;
    },

    // Create client
    create: async (data: CreateClientDTO): Promise<Client> => {
        const res = await fetch(`${API_URL}/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to create client');
        const result = await res.json();
        return result.client;
    },

    // Update client
    update: async (id: string, data: UpdateClientDTO): Promise<Client> => {
        const res = await fetch(`${API_URL}/clients/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('Failed to update client');
        const result = await res.json();
        return result.client;
    },

    // Delete client (soft delete)
    delete: async (id: string): Promise<void> => {
        const res = await fetch(`${API_URL}/clients/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete client');
    },

    // Duplicate client
    duplicate: async (id: string, newName: string): Promise<Client> => {
        const res = await fetch(`${API_URL}/clients/${id}/duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_name: newName }),
        });
        if (!res.ok) throw new Error('Failed to duplicate client');
        const result = await res.json();
        return result.client;
    }
};
