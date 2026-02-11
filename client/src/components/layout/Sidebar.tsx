import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Receipt,
    BarChart3,
    CreditCard,
    Users,
    PieChart,
    FileText,
    Settings,
    LogOut,
    Wallet,
    Handshake,
    LineChart,
    Building2,
    ChevronDown,
    ChevronRight,
    Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';

const Icons: Record<string, any> = {
    LayoutDashboard,
    Receipt,
    BarChart3,
    CreditCard,
    Users,
    PieChart,
    FileText,
    Settings,
    Wallet,
    Handshake,
    LineChart,
    Building2,
    Shield
};

export function Sidebar() {
    const location = useLocation();
    const { hasPermission, isSuperAdmin, isDeptHead, profile, signOut } = useAuth();
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        '/departamentos': true
    });

    const toggleMenu = (path: string) => {
        setExpandedMenus(prev => ({ ...prev, [path]: !prev[path] }));
    };

    // Filter nav items based on user permissions
    const visibleItems = NAV_ITEMS.filter(item => {
        // Superadmin-only items
        if (item.superadminOnly && !isSuperAdmin()) return false;
        // Check module permission
        if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
        return true;
    });

    return (
        <div className="h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0">
            <div className="p-6 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                    <div className="bg-primary h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
                        I
                    </div>
                    <span className="font-bold text-xl text-sidebar-foreground">imfinance</span>
                </div>
                {profile && (
                    <div className="mt-2 text-xs text-sidebar-foreground/60">
                        {profile.display_name}
                        <span className="ml-1 px-1.5 py-0.5 bg-sidebar-accent/50 rounded text-[10px] uppercase">
                            {profile.role === 'superadmin' ? 'Admin' : profile.role === 'dept_head' ? 'Jefe Depto' : 'Usuario'}
                        </span>
                    </div>
                )}
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {visibleItems.map((item) => {
                    const Icon = Icons[item.icon || ''];
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = expandedMenus[item.path];
                    const isActive = location.pathname === item.path;
                    const isChildActive = hasChildren && item.children!.some(c => location.pathname === c.path);

                    if (hasChildren) {
                        // Filter children for dept_head — only show their department
                        let filteredChildren = item.children!;
                        if (isDeptHead() && profile?.department_code) {
                            filteredChildren = item.children!.filter(c => {
                                if (!c.deptCode) return true;
                                // Map department_code to deptCode in nav children
                                return c.deptCode === profile.department_code;
                            });
                        }

                        if (filteredChildren.length === 0) return null;

                        return (
                            <div key={item.path}>
                                <button
                                    onClick={() => toggleMenu(item.path)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium w-full",
                                        isChildActive
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                    )}
                                >
                                    {Icon && <Icon size={20} />}
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                </button>
                                {isExpanded && (
                                    <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                                        {filteredChildren.map(child => {
                                            const isChildItemActive = location.pathname === child.path;
                                            return (
                                                <Link
                                                    key={child.path}
                                                    to={child.path}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm",
                                                        isChildItemActive
                                                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-2 w-2 rounded-full",
                                                        isChildItemActive ? "bg-primary" : "bg-sidebar-foreground/30"
                                                    )} />
                                                    {child.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                        >
                            {Icon && <Icon size={20} />}
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-md text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-colors text-sm font-medium"
                >
                    <LogOut size={20} />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
