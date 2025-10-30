import { dashboard, home } from '@/routes'
import { selectRole } from '@/routes/auth'
import { type SharedData } from '@/types'
import { Link, usePage } from '@inertiajs/react'

export function AuthNavbar() {
    const page = usePage<SharedData>()
    const { auth } = page.props
    const canRegister = true // You can pass this as prop or get from shared data if needed

    return (
        <header className="fixed left-0 right-0 top-0 z-30 w-full border-b border-white/10 bg-black/50 text-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
            <nav className="flex w-full items-center justify-between gap-4 px-3 py-3 text-white md:px-4 lg:px-6">
                <Link href={home()} className="flex items-center gap-2 pl-0 text-white" prefetch>
                    <img src="/images/fixitlogo.png" alt="FixIt" className="h-20 w-20 -my-6 object-contain" />
                    <span className="sr-only">Home</span>
                </Link>

                <div className="ml-auto flex items-center gap-6 pr-0">
                    <div className="hidden items-center gap-6 text-white md:flex">
                        <Link href={home()} className="hover:underline" prefetch>Home</Link>
                        <Link href="#contact" className="hover:underline">Contact Us</Link>
                        <Link href="#about" className="hover:underline">About Us</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="inline-block rounded-sm border border-white/30 px-5 py-1.5 text-sm leading-normal text-white hover:border-white/60"
                                prefetch
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/auth/login"
                                    className="inline-block rounded-sm border border-transparent px-5 py-1.5 text-sm leading-normal text-white hover:border-white/40"
                                    prefetch
                                >
                                    Log in
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={selectRole.url({ query: { next: 'register' } })}
                                        className="inline-block rounded-sm border border-white/30 px-5 py-1.5 text-sm leading-normal text-white hover:border-white/60"
                                        prefetch
                                    >
                                        Register
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    )
}

