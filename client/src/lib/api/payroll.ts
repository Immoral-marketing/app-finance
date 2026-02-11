import { fetchApi } from './client';

export interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    employee_code: string;
    position: string;
    department_id: string;
    current_salary: number;
    is_active: boolean;
}

export interface PayrollRecord {
    id: string;
    employee_id: string;
    employee: { full_name: string; position: string };
    fiscal_year: number;
    fiscal_month: number;
    base_salary: number;
    bonuses: number;
    variable_pay: number;
    gross_pay: number;
    net_pay: number;
    total_company_cost: number;
    is_paid: boolean;
}

export const payrollApi = {
    getEmployees: () => {
        return fetchApi<{ employees: Employee[] }>('/employees', { service: 'PAYROLL' });
    },

    getPayroll: (year: number, month: number) => {
        return fetchApi<{ payroll: PayrollRecord[] }>(`/payroll/${year}/${month}`, { service: 'PAYROLL' });
    },

    generatePayroll: (year: number, month: number) => {
        return fetchApi('/payroll/generate', {
            service: 'PAYROLL',
            method: 'POST',
            body: JSON.stringify({ fiscal_year: year, fiscal_month: month })
        });
    },

    updatePayrollItem: (id: string, data: Partial<PayrollRecord>) => {
        return fetchApi(`/payroll/${id}`, {
            service: 'PAYROLL',
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    getEmployee: (id: string) => {
        return fetchApi<{ employee: Employee }>(`/employees/${id}`, { service: 'PAYROLL' });
    },

    updateSalary: (id: string, data: { new_salary: number; effective_from: string; change_reason: string }) => {
        return fetchApi(`/employees/${id}/salary`, {
            service: 'PAYROLL',
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
};
