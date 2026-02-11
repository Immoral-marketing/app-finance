export interface FeeConfig {
    fee_type: 'fixed' | 'variable';
    fixed_pct: number;
    variable_ranges: {
        min: number;
        max: number | null;
        pct: number;
    }[];
    platform_cost_first: number;
    platform_cost_additional: number;
    calculation_type: 'auto' | 'manual';
    use_platform_costs?: boolean;
}

export interface Client {
    id: string;
    name: string;
    legal_name?: string;
    tax_id?: string;
    email?: string;
    phone?: string;
    address?: string;
    vertical_id?: string;
    vertical?: {
        id: string;
        name: string;
        code: string;
    };
    fee_config: FeeConfig;
    is_active: boolean;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateClientDTO {
    name: string;
    legal_name?: string;
    tax_id?: string;
    email?: string;
    phone?: string;
    address?: string;
    vertical_id?: string;
    fee_config: FeeConfig;
    notes?: string;
}

export interface UpdateClientDTO extends Partial(CreateClientDTO) { }
