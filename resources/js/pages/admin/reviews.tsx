import AdminLayout from '@/layouts/admin-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'Reviews',
        href: '/admin/reviews',
    },
]

export default function AdminReviewsPage() {
    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Reviews - Admin" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <div className="mb-4 text-xl font-semibold">Reviews</div>
                <div className="text-muted-foreground">Moderation UI coming soon.</div>
            </div>
        </AdminLayout>
    )
}


