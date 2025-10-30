import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import SettingsSidebarLayout from '@/layouts/settings/settings-sidebar-layout';
import { edit as editAppearance } from '@/routes/appearance';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings/profile',
    },
    {
        title: 'Appearance',
        href: editAppearance().url,
    },
];

export default function Appearance() {
    return (
        <SettingsSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="Appearance settings" />

            <div className="space-y-6">
                    <HeadingSmall
                        title="Appearance settings"
                        description="Update your account's appearance settings"
                    />
                    <AppearanceTabs />
                </div>
        </SettingsSidebarLayout>
    );
}
