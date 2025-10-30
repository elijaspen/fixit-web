import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import CustomerDashboard from './customer-dashboard';
import TechnicianDashboard from './technician-dashboard';
import AdminDashboard from './admin-dashboard';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

interface DashboardProps {
    role?: string;
}

export default function Dashboard({ role }: DashboardProps) {
    // The InertiaJS page props shape is typically { auth: { user, role } }, so type accordingly
    const page = usePage<{ auth: { user?: { name?: string; is_verified?: boolean }; role?: string } }>();
    const currentRole = role || page.props.auth?.role;
    const currentUser = page.props.auth?.user;
    if (currentRole === 'customer') {
        return <CustomerDashboard />;
    }
    if (currentRole === 'technician') {
        return <TechnicianDashboard currentUser={currentUser || {}} />;
    }
    if (currentRole === 'admin') {
        return <AdminDashboard />;
    }

    // Fallback for unauthenticated or unknown role
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="mb-4">
                    <h1 className="text-2xl font-semibold">Dashboard</h1>
                    <p className="text-neutral-600 dark:text-neutral-400">Please log in to continue</p>
                </div>
            </div>
        </AppLayout>
    );
}
