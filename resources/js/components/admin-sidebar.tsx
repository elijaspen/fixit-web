import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { LayoutGrid, Users, FileText, Settings as SettingsIcon } from 'lucide-react';

const adminNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Technicians',
        href: '/admin/technicians',
        icon: Users,
    },
    {
        title: 'Service Requests',
        href: '/admin/service-requests',
        icon: FileText,
    },
    {
        title: 'Reviews',
        href: '/admin/reviews',
        icon: FileText,
    },
    {
        title: 'Logs',
        href: '/admin/logs',
        icon: FileText,
    },
    {
        title: 'Settings',
        href: '/settings/profile',
        icon: SettingsIcon,
    },
];

const footerNavItems: NavItem[] = [];

export function AdminSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch className="flex items-center justify-center">
                                <img 
                                    src="/images/fixitlogo.png" 
                                    alt="FixIt" 
                                    className="h-20 w-20 object-contain" 
                                />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={adminNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

