import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AIChatWidget } from '@/components/shared/AIChatWidget';
import { useAuth } from '@/context/AuthContext';

export function Layout() {
    const { profile, user } = useAuth();

    return (
        <div className="min-h-screen bg-muted/40 font-sans">
            <Sidebar />
            <div className="pl-64 flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-6 overflow-x-auto">
                    <div className="mx-auto max-w-7xl animate-in fade-in zoom-in duration-300">
                        <Outlet />
                    </div>
                </main>
            </div>
            {/* ChatHub flotante — disponible en toda la app */}
            {profile && (
                <AIChatWidget
                    userRole={profile.role}
                    deptCode={profile.department_code}
                    year={new Date().getFullYear()}
                    currentUser={user ? { id: user.id, email: user.email || '', full_name: profile.display_name, role: profile.role } : undefined}
                />
            )}
        </div>
    );
}
