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
import { edit as editPassword } from '@/routes/user-password';
import { edit as editAppearance } from '@/routes/appearance';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type SharedData } from '@/types';
import { LayoutGrid, User, Lock, Palette, FileText, FolderOpen } from 'lucide-react';

const getSettingsNavItems = (role?: string): NavItem[] => {
    const items: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Profile',
            href: profile.edit(),
            icon: User,
        },
        {
            title: 'Password',
            href: editPassword(),
            icon: Lock,
        },
        
        {
            title: 'Appearance',
            href: editAppearance(),
            icon: Palette,
        },
    ];

    // Add Credentials link for technicians only
    if (role === 'technician') {
        items.splice(4, 0, {
            title: 'Credentials',
            href: '/settings/credentials',
            icon: FileText,
        });
    }

    return items;
};

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderOpen,
    },
];

export function SettingsSidebar() {
    const page = usePage<SharedData>();
    const role = (page.props as unknown as { auth?: { role?: string } }).auth?.role as string | undefined;
    const settingsNavItems = getSettingsNavItems(role);

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
                                    className="h-16 w-16 object-contain" 
                                />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={settingsNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

