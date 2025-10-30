import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { SettingsSidebar } from '@/components/settings-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function SettingsSidebarLayout({
    children,
    breadcrumbs = [],
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <SettingsSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="p-6">
                    {children}
                </div>
            </AppContent>
        </AppShell>
    );
}

