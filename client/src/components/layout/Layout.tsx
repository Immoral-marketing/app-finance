import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
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
        </div>
    );
}
