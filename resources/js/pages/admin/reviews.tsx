import AdminLayout from '@/layouts/admin-layout'
import { Head } from '@inertiajs/react'
import { type BreadcrumbItem } from '@/types'
import { useEffect, useState } from 'react'
import axios from '@/axios-config'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

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

interface ReviewRow {
    id: number
    rating: number
    comment?: string | null
    created_at?: string
    customer?: { id?: number; name?: string }
    technician?: { id?: number; name?: string }
}

export default function AdminReviewsPage() {
    const [rows, setRows] = useState<ReviewRow[]>([])
    const [loading, setLoading] = useState(true)
    const [technicianId, setTechnicianId] = useState<string>('')
    const [rating, setRating] = useState<string>('')

    const load = async () => {
        try {
            setLoading(true)
            const params: Record<string, string | number> = {}
            if (technicianId) params.technician_id = Number(technicianId)
            if (rating && rating !== 'all') params.rating = Number(rating)
            const r = await axios.get('/api/admin/reviews', { params })
            setRows(r.data?.data || [])
        } catch {
            setRows([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Reviews - Admin" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <div className="mb-2 text-xl font-semibold">Reviews</div>
                <Card className="p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            placeholder="Filter by technician ID"
                            value={technicianId}
                            onChange={(e) => setTechnicianId(e.target.value)}
                            className="w-48"
                        />
                        <Select value={rating} onValueChange={setRating}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by rating" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All ratings</SelectItem>
                                {[1,2,3,4,5].map((n) => (
                                    <SelectItem key={n} value={String(n)}>{n} star{n>1?'s':''}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={load}>Apply</Button>
                    </div>
                </Card>

                {loading ? (
                    <Card className="p-8 text-center text-muted-foreground">Loading…</Card>
                ) : rows.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground">No reviews found</Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {rows.map((rev) => (
                            <Card key={rev.id} className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="font-medium">{rev.customer?.name || 'Customer'}</div>
                                    <div className="text-sm">{new Date(rev.created_at || '').toLocaleDateString()}</div>
                                </div>
                                <div className="text-sm text-muted-foreground">Technician: {rev.technician?.name || rev.technician?.id}</div>
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
        </AdminLayout>
    )
}


