import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { commissionsApi } from '@/lib/api/commissions';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { formatCurrency } from '@/lib/utils';
import { Users, Briefcase, RefreshCw } from 'lucide-react';

export default function Commissions() {
    const [date, setDate] = useState(new Date());
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Fetch Commissions
    const { data: commData, isLoading } = useQuery({
        queryKey: ['commissions', year, month],
        queryFn: () => commissionsApi.getCommissions(year, month),
    });

    const commissions = commData?.commissions || [];

    const totalCommission = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
                    <p className="text-muted-foreground mt-1">Partner and Platform commission tracking.</p>
                </div>
                <div className="flex items-center gap-4">
                    <PeriodSelector value={date} onChange={setDate} />
                    <Button variant="secondary" className="gap-2">
                        <RefreshCw size={16} />
                        Recalculate
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Partner Commissions</p>
                                <h3 className="text-2xl font-bold mt-2">{formatCurrency(totalCommission)}</h3>
                            </div>
                            <div className="p-2 bg-orange-100 rounded-full text-orange-600">
                                <Users size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-muted-foreground">
                            <span>Generated from {commissions.length} active referrals</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Platform Income (WillMay)</p>
                                <h3 className="text-2xl font-bold mt-2">{formatCurrency(0)}</h3>
                            </div>
                            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                                <Briefcase size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-muted-foreground">
                            <span>No platform income recorded for this period</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Partner</th>
                                <th className="h-10 px-4 text-left font-medium text-muted-foreground">Referred Client</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Client Billing</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground">Rate</th>
                                <th className="h-10 px-4 text-right font-medium text-muted-foreground text-orange-600">Commission</th>
                                <th className="h-10 px-4 text-center font-medium text-muted-foreground">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading commissions...</td></tr>
                            ) : commissions.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No commissions found.</td></tr>
                            ) : (
                                commissions.map((c) => (
                                    <tr key={c.id} className="border-b hover:bg-muted/50 transition-colors">
                                        <td className="p-4 font-medium">{c.partner_name}</td>
                                        <td className="p-4">{c.client_name}</td>
                                        <td className="p-4 text-right text-muted-foreground">{formatCurrency(c.client_billing_amount)}</td>
                                        <td className="p-4 text-right">{c.commission_rate}%</td>
                                        <td className="p-4 text-right font-bold text-orange-600">{formatCurrency(c.commission_amount)}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.is_paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {c.is_paid ? 'PAID' : 'PENDING'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
