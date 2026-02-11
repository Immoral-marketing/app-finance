import { Bell, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function Header() {
    const { profile } = useAuth();

    const displayName = profile?.display_name || 'Usuario';
    const roleLabel = profile?.role === 'superadmin'
        ? 'Superadmin'
        : profile?.role === 'dept_head'
            ? 'Jefe Depto'
            : 'Usuario';
    const initials = displayName
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <header className="h-16 px-6 border-b border-border bg-background flex items-center justify-between sticky top-0 z-10 w-full">
            <div className="w-96">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar clientes, servicios..."
                        className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors">
                    <Bell size={20} className="text-muted-foreground" />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full" />
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-border">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{roleLabel}</p>
                    </div>
                    <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm">
                        {initials}
                    </div>
                </div>
            </div>
        </header>
    );
}
