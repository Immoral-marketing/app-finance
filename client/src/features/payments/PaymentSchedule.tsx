import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatCurrency, cn } from '@/lib/utils';
import { Plus, Check, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
    id: string;
    payment_concept: string;
    payee_name: string;
    total_amount: number;
    due_date: string;
    payment_date?: string;
    status: 'pending' | 'paid' | 'overdue';
}

export default function PaymentSchedule() {
    const queryClient = useQueryClient();
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPayment, setNewPayment] = useState({
        payment_concept: '',
        payee_name: '',
        total_amount: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
    });

    const { data: paymentsData, isLoading } = useQuery({
        queryKey: ['payments', year, month],
        queryFn: () => adminApi.getPayments(year, month),
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            await adminApi.createPayment({
                ...data,
                fiscal_year: year,
                fiscal_month: month,
                total_amount: Number(data.total_amount),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments', year, month] });
            setShowAddForm(false);
            setNewPayment({
                payment_concept: '',
                payee_name: '',
                total_amount: '',
                due_date: format(new Date(), 'yyyy-MM-dd'),
            });
        },
    });

    const statusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            await adminApi.updatePaymentStatus(id, status, status === 'paid' ? new Date().toISOString() : undefined);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payments', year, month] });
        },
    });

    const handlePrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear(y => y - 1);
        } else {
            setMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear(y => y + 1);
        } else {
            setMonth(m => m + 1);
        }
    };

    const payments = paymentsData?.payments || [];
    const totalDue = payments.reduce((acc: number, p: Payment) => acc + Number(p.total_amount), 0);
    const totalPaid = payments
        .filter((p: Payment) => p.status === 'paid')
        .reduce((acc: number, p: Payment) => acc + Number(p.total_amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Payment Schedule</h1>
                    <p className="text-muted-foreground mt-1">Manage weekly payments and obligations</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrevMonth}>Prev Month</Button>
                    <div className="flex items-center px-4 font-bold bg-white border rounded-md min-w-[160px] justify-center">
                        {format(new Date(year, month - 1), 'MMMM yyyy')}
                    </div>
                    <Button variant="outline" onClick={handleNextMonth}>Next Month</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Total Due</p>
                        <h3 className="text-2xl font-bold">{formatCurrency(totalDue)}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                        <h3 className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                        <h3 className="text-2xl font-bold text-orange-600">{formatCurrency(totalDue - totalPaid)}</h3>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Payments</CardTitle>
                    <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                        <Plus size={16} className="mr-2" /> Add Payment
                    </Button>
                </CardHeader>
                <CardContent>
                    {showAddForm && (
                        <div className="mb-6 p-4 border rounded-lg bg-gray-50 flex flex-wrap gap-4 items-end">
                            <div className="w-full md:w-1/4 space-y-2">
                                <label className="text-xs font-medium">Concept</label>
                                <Input
                                    value={newPayment.payment_concept}
                                    onChange={(e) => setNewPayment({ ...newPayment, payment_concept: e.target.value })}
                                    placeholder="e.g. Office Rent"
                                />
                            </div>
                            <div className="w-full md:w-1/4 space-y-2">
                                <label className="text-xs font-medium">Payee</label>
                                <Input
                                    value={newPayment.payee_name}
                                    onChange={(e) => setNewPayment({ ...newPayment, payee_name: e.target.value })}
                                    placeholder="e.g. Landlord LLC"
                                />
                            </div>
                            <div className="w-full md:w-1/6 space-y-2">
                                <label className="text-xs font-medium">Amount</label>
                                <Input
                                    type="number"
                                    value={newPayment.total_amount}
                                    onChange={(e) => setNewPayment({ ...newPayment, total_amount: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="w-full md:w-1/6 space-y-2">
                                <label className="text-xs font-medium">Due Date</label>
                                <Input
                                    type="date"
                                    value={newPayment.due_date}
                                    onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })}
                                />
                            </div>
                            <Button
                                onClick={() => createMutation.mutate(newPayment)}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending && <Loader2 className="animate-spin mr-2" size={16} />}
                                Save
                            </Button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="text-center py-8">Loading payments...</div>
                    ) : (
                        <div className="space-y-2">
                            {payments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No payments scheduled for this month.</div>
                            ) : (
                                payments.map((payment: Payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-full ${payment.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {payment.status === 'paid' ? <Check size={20} /> : <CalendarIcon size={20} />}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{payment.payment_concept}</h4>
                                                <p className="text-sm text-muted-foreground">{payment.payee_name} • Due {format(new Date(payment.due_date), 'MMM d')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="font-bold">{formatCurrency(payment.total_amount)}</div>
                                                <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'} className={
                                                    payment.status === 'paid' ? 'bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }>
                                                    {payment.status.toUpperCase()}
                                                </Badge>
                                            </div>
                                            {payment.status !== 'paid' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => statusMutation.mutate({ id: payment.id, status: 'paid' })}
                                                    disabled={statusMutation.isPending}
                                                >
                                                    Mark Paid
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
