import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import { selectRole } from '@/routes/auth';
import { dashboard } from '@/routes';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type PropsWithChildren } from 'react';

interface AuthLayoutProps {
    title?: string;
    description?: string;
    sideImageSrc?: string;
}

export default function AuthSplitLayout({
    children,
    title,
    description,
    sideImageSrc,
}: PropsWithChildren<AuthLayoutProps>) {
    const { name, quote } = usePage<SharedData>().props;

    return (
        <div className="relative grid min-h-screen flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            {/* Top navbar consistent with landing page */}
            <header className="fixed left-0 right-0 top-0 z-30 w-full border-b border-white/10 bg-black/50 text-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                <nav className="flex w-full items-center justify-between gap-4 px-3 py-3 text-white md:px-4 lg:px-6">
                    <Link href={home()} className="flex items-center gap-2 pl-0 text-white">
                        <img src="/images/fixitlogo.png" alt="FixIt" className="h-20 w-20 -my-6 object-contain" />
                        <span className="sr-only">Home</span>
                    </Link>
                    <div className="ml-auto flex items-center gap-6 pr-0">
                        <div className="hidden items-center gap-6 text-white md:flex">
                            <Link href={home()} className="hover:underline">Home</Link>
                            <Link href="/#about" className="hover:underline">About Us</Link>
                            <Link href="/#contact" className="hover:underline">Contact Us</Link>
                        </div>
                        <div className="flex items-center gap-3">
                            {usePage<SharedData>().props.auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-block rounded-sm border border-white/30 px-5 py-1.5 text-sm leading-normal text-white hover:border-white/60"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/login"
                                        className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-white hover:border-white/40"
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href={selectRole.url({ query: { next: 'register' } })}
                                        className="inline-block rounded-sm border border-white/30 px-5 py-1.5 text-sm leading-normal text-white hover:border-white/60"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </nav>
            </header>
            {/* Left photo panel (no logo/quote) */}
            <div className="relative hidden h-full flex-col bg-muted p-0 text-white lg:flex dark:border-r">
                <img
                    src={sideImageSrc ?? "/images/auth-side.jpg"}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    aria-hidden="true"
                />
                <div className="absolute inset-0 bg-zinc-900/50" />
            </div>
            {/* Right form panel */}
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
