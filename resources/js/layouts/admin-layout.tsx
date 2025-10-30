import AdminSidebarLayout from '@/layouts/admin/admin-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

interface AdminLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs }: AdminLayoutProps) => (
    <AdminSidebarLayout breadcrumbs={breadcrumbs}>
        {children}
    </AdminSidebarLayout>
);

