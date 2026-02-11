import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollApi, PayrollRecord } from '@/lib/api/payroll';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import { Users, DollarSign, Wallet, ArrowRight, CheckCircle, X, History } from 'lucide-react';
import { format } from 'date-fns';

export default function Payroll() {
    const queryClient = useQueryClient(); // Add queryClient here
    const [date, setDate] = useState(new Date());
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [showSalaryModal, setShowSalaryModal] = useState(false);

    // Salary Update State
    const [salaryForm, setSalaryForm] = useState({
        new_salary: '',
        effective_from: format(new Date(), 'yyyy-MM-dd'),
        change_reason: ''
    });

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Fetch Payroll Data
    const { data: payrollData, isLoading } = useQuery({
        queryKey: ['payroll', year, month],
        queryFn: () => payrollApi.getPayroll(year, month),
    });

    // Fetch Selected Employee Details
    const { data: employeeData } = useQuery({
        queryKey: ['employee', selectedEmployeeId],
        queryFn: () => payrollApi.getEmployee(selectedEmployeeId!),
        enabled: !!selectedEmployeeId,
    });

    // Generate Payroll Mutation
    const generateMutation = useMutation({
        mutationFn: () => payrollApi.generatePayroll(year, month),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll', year, month] });
        }
    });

    // Update Salary Mutation
    const salaryMutation = useMutation({
        mutationFn: async () => {
            if (!selectedEmployeeId) return;
            await payrollApi.updateSalary(selectedEmployeeId, {
                new_salary: Number(salaryForm.new_salary),
                effective_from: salaryForm.effective_from,
                change_reason: salaryForm.change_reason
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employee', selectedEmployeeId] });
            queryClient.invalidateQueries({ queryKey: ['payroll'] });
            setShowSalaryModal(false);
            setSalaryForm({ new_salary: '', effective_from: format(new Date(), 'yyyy-MM-dd'), change_reason: '' });
        }
    });

    const handleEmployeeClick = (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        setShowSalaryModal(true);
    };

    const payroll = payrollData?.payroll || [];

    // Calculate Totals
    const totalGross = payroll.reduce((sum, p) => sum + Number(p.gross_pay), 0);
    const totalNet = payroll.reduce((sum, p) => sum + Number(p.net_pay), 0);
    const totalCompanyCost = payroll.reduce((sum, p) => sum + Number(p.total_company_cost), 0);
    const pendingPayment = payroll.filter(p => !p.is_paid).length;

    const selectedEmployee = employeeData?.employee;

    // We need to cast the 'any' type from the API response to access salary_history if strictly typed
    // Assuming API returns it, we can use it.
    const salaryHistory = (selectedEmployee as any)?.salary_history || [];

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payroll Management</h1>
                    <p className="text-muted-foreground mt-1">Manage employee salaries and payments.</p>
                </div>
                <div className="flex items-center gap-4">
                    <PeriodSelector value={date} onChange={setDate} />
                    <Button
                        className="gap-2"
                        onClick={() => generateMutation.mutate()}
                        disabled={generateMutation.isPending}
                    >
                        {generateMutation.isPending ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <CheckCircle size={16} />}
                        Generate Payroll
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Gross Salary</p>
                                <h3 className="text-2xl font-bold mt-2">{formatCurrency(totalGross)}</h3>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <Users size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Net to Pay</p>
                                <h3 className="text-2xl font-bold mt-2">{formatCurrency(totalNet)}</h3>
                            </div>
                            <div className="p-2 bg-green-100 rounded-full text-green-600">
                                <Wallet size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-yellow-600">
                            <span className="font-medium">{pendingPayment} employees pending payment</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Company Cost</p>
                                <h3 className="text-2xl font-bold mt-2">{formatCurrency(totalCompanyCost)}</h3>
                            </div>
                            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                                <DollarSign size={20} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payroll Table */}
            <Card>
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Employee</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Position</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Base Salary</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Bonuses</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground text-blue-600">Gross Pay</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground text-green-600">Net Pay</th>
                                <th className="h-10 px-4 text-center font-medium text-muted-foreground">Status</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Loading payroll...</td></tr>
                            ) : payroll.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No payroll items generated for {format(date, 'MMMM yyyy')}. Click Generate above.</td></tr>
                            ) : (
                                payroll.map((p) => (
                                    <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => handleEmployeeClick(p.employee_id)}>
                                        <td className="p-4 font-medium">{p.employee?.full_name}</td>
                                        <td className="p-4 text-muted-foreground">{p.employee?.position}</td>
                                        <td className="p-4">{formatCurrency(p.base_salary)}</td>
                                        <td className="p-4">{formatCurrency(p.bonuses)}</td>
                                        <td className="p-4 text-right font-bold text-blue-600">{formatCurrency(p.gross_pay)}</td>
                                        <td className="p-4 text-right font-bold text-green-600">{formatCurrency(p.net_pay)}</td>
                                        <td className="p-4 text-center">
                                            <Badge variant={p.is_paid ? 'default' : 'secondary'} className={p.is_paid ? 'bg-green-500 hover:bg-green-600' : ''}>
                                                {p.is_paid ? 'PAID' : 'PENDING'}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEmployeeClick(p.employee_id); }}>
                                                <ArrowRight size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Salary Modal */}
            {showSalaryModal && selectedEmployee && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
                        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
                            <div>
                                <CardTitle>{selectedEmployee.full_name}</CardTitle>
                                <CardDescription>{selectedEmployee.position} • {selectedEmployee.department?.name || 'General'}</CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowSalaryModal(false)}>
                                <X size={20} />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6 p-6">

                            {/* Current Salary Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Current Base Salary</p>
                                    <h3 className="text-2xl font-bold text-primary">{formatCurrency(selectedEmployee.current_salary)}</h3>
                                </div>
                                <div className="text-right">
                                    <Badge variant={selectedEmployee.is_active ? 'default' : 'destructive'} className="mb-2">
                                        {selectedEmployee.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground">Employee Code: {selectedEmployee.employee_code}</p>
                                </div>
                            </div>

                            {/* Update Form */}
                            <div className="space-y-4 border p-4 rounded-lg">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <DollarSign size={16} /> Update Salary
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">New Salary Amount</label>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={salaryForm.new_salary}
                                            onChange={(e) => setSalaryForm({ ...salaryForm, new_salary: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Effective From</label>
                                        <Input
                                            type="date"
                                            value={salaryForm.effective_from}
                                            onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium">Change Reason</label>
                                        <Input
                                            placeholder="e.g. Annual Review, Promotion"
                                            value={salaryForm.change_reason}
                                            onChange={(e) => setSalaryForm({ ...salaryForm, change_reason: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={() => salaryMutation.mutate()}
                                    disabled={!salaryForm.new_salary || !salaryForm.change_reason || salaryMutation.isPending}
                                >
                                    {salaryMutation.isPending ? 'Updating...' : 'Update Salary'}
                                </Button>
                            </div>

                            {/* Salary History */}
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-4">
                                    <History size={16} /> Salary History
                                </h4>
                                <div className="border rounded-md overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Previous</th>
                                                <th className="px-4 py-2 text-left">New</th>
                                                <th className="px-4 py-2 text-left">Date</th>
                                                <th className="px-4 py-2 text-left">Reason</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salaryHistory.length === 0 ? (
                                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No history available</td></tr>
                                            ) : (
                                                salaryHistory.map((h: any, i: number) => (
                                                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                                                        <td className="px-4 py-2 text-muted-foreground">{h.old_salary ? formatCurrency(h.old_salary) : '-'}</td>
                                                        <td className="px-4 py-2 font-medium">{formatCurrency(h.new_salary)}</td>
                                                        <td className="px-4 py-2">{format(new Date(h.effective_from), 'MMM d, yyyy')}</td>
                                                        <td className="px-4 py-2 text-xs text-muted-foreground">{h.change_reason || '-'}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
