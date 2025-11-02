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
import * as profile from '@/routes/profile';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { LayoutGrid, MessageSquare, Settings as SettingsIcon, FileText } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';

const getMainNavItems = (role?: string): NavItem[] => {
    const items: NavItem[] = [
        {
            title: 'Home',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Messages',
            href: '/messages',
            icon: MessageSquare,
        },
    ];

    // Add Service Requests link for technicians
    if (role === 'technician') {
        items.push({
            title: 'Service Requests',
            href: '/technician/service-requests',
            icon: FileText,
        });
    }

    items.push({
        title: 'Settings',
        href: '/settings/profile',
        icon: SettingsIcon,
    });

    return items;
};

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const page = usePage<SharedData>();
    const role = (page.props as unknown as { auth?: { role?: string } }).auth?.role as string | undefined;
    const mainNavItems = getMainNavItems(role);

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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
