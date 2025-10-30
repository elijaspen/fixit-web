import { PropsWithChildren } from 'react'
import { Link, router } from '@inertiajs/react'

export default function AdminLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen">
            <aside className="w-64 shrink-0 border-r p-4">
                <div className="mb-6 text-lg font-semibold">Manage</div>
                <nav className="flex flex-col gap-2 text-sm">
                    <Link href="/admin/technicians" className="rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">Technicians</Link>
                    <Link href="/admin/reviews" className="rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">Reviews</Link>
                    <Link href="/admin/logs" className="rounded px-2 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800">Logs</Link>
                </nav>
            </aside>
            <main className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center justify-between border-b p-4">
                    <Link href="/" className="text-base font-semibold">FixIt</Link>
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            router.post('/logout', {}, {
                                preserveScroll: false,
                                preserveState: false,
                                onSuccess: () => {
                                    // Force full page reload to get fresh CSRF token
                                    window.location.href = '/';
                                },
                            });
                        }}
                        className="rounded border px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                        Logout
                    </button>
                </header>
                <div className="flex-1 p-6">{children}</div>
            </main>
        </div>
    )
}


