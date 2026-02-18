import { fetchApi } from './client';
import { Client, CreateClientDTO, UpdateClientDTO } from '../../types/client';

export const clientsApi = {
    // Get all clients
    getAll: async (): Promise<Client[]> => {
        const data = await fetchApi<{ clients: Client[] }>('/clients');
        return data.clients;
    },

    // Get single client
    getById: async (id: string): Promise<Client> => {
        const data = await fetchApi<{ client: Client }>(`/clients/${id}`);
        return data.client;
    },

    // Get verticals
    getVerticals: async (): Promise<{ id: string; name: string; code: string }[]> => {
        const data = await fetchApi<{ verticals: { id: string; name: string; code: string }[] }>('/clients/verticals');
        return data.verticals;
    },

    // Create client
    create: async (data: CreateClientDTO): Promise<Client> => {
        const result = await fetchApi<{ client: Client }>('/clients', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return result.client;
    },

    // Update client
    update: async (id: string, data: UpdateClientDTO): Promise<Client> => {
        const result = await fetchApi<{ client: Client }>(`/clients/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        return result.client;
    },

    // Delete client (soft delete)
    delete: async (id: string): Promise<void> => {
        await fetchApi(`/clients/${id}`, {
            method: 'DELETE',
        });
    },

    // Duplicate client
    duplicate: async (id: string, newName: string): Promise<Client> => {
        const result = await fetchApi<{ client: Client }>(`/clients/${id}/duplicate`, {
            method: 'POST',
            body: JSON.stringify({ new_name: newName }),
        });
        return result.client;
    }
};
