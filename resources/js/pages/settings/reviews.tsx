import SettingsSidebarLayout from '@/layouts/settings/settings-sidebar-layout'
import { Head, usePage } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { Card } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import axios from '@/axios-config'

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'Reviews', href: '/settings/reviews' },
]

interface ReviewItem {
    id: number
    rating: number
    comment?: string | null
    created_at?: string
    customer?: { id?: number; name?: string }
}

interface Summary { average: number; count: number }

export default function TechnicianReviewsPage() {
    const { auth } = usePage<{ auth: { role?: string; user?: { id: number } } }>().props
    const technicianId = auth?.user?.id
    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState<Summary>({ average: 0, count: 0 })

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true)
                const r = await axios.get('/api/reviews')
                setReviews(r.data || [])
                if (technicianId) {
                    try {
                        const s = await axios.get(`/api/technicians/${technicianId}/reviews/summary`)
                        setSummary({ average: Number(s.data?.average || 0), count: Number(s.data?.count || 0) })
                    } catch {
                        setSummary({ average: 0, count: 0 })
                    }
                }
            } catch (e) {
                setReviews([])
                setSummary({ average: 0, count: 0 })
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [technicianId])

    return (
        <SettingsSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="My Reviews" />
            <div className="space-y-6">
                <div className="text-2xl font-semibold">My Reviews</div>
                {/* Summary */}
                <Card className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} viewBox="0 0 24 24" className={`h-5 w-5 ${i < Math.round(summary.average) ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-neutral-300'}`}>
                                    <path d="M12 .587l3.668 7.431L24 9.748l-6 5.853L19.335 24 12 19.897 4.665 24 6 15.601 0 9.748l8.332-1.73z" />
                                </svg>
                            ))}
                        </div>
                        <div className="text-sm text-muted-foreground">{summary.average.toFixed(1)} • {summary.count} {summary.count === 1 ? 'review' : 'reviews'}</div>
                    </div>
                </Card>
                {loading ? (
                    <div className="text-muted-foreground">Loading reviews…</div>
                ) : reviews.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">No reviews yet</Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {reviews.map((rev) => (
                            <Card key={rev.id} className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">{rev.customer?.name || 'Customer'}</div>
                                    <div className="text-sm">{new Date(rev.created_at || '').toLocaleDateString()}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} viewBox="0 0 24 24" className={`h-4 w-4 ${i < rev.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-neutral-300'}`}>
                                            <path d="M12 .587l3.668 7.431L24 9.748l-6 5.853L19.335 24 12 19.897 4.665 24 6 15.601 0 9.748l8.332-1.73z" />
                                        </svg>
                                    ))}
                                </div>
                                {rev.comment && <div className="text-sm text-neutral-700">{rev.comment}</div>}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </SettingsSidebarLayout>
    )
}


