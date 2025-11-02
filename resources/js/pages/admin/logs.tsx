import AdminLayout from '@/layouts/admin-layout'
import { Head, Link } from '@inertiajs/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '@/axios-config'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ServiceRequestLog {
    id: number
    amount: number | string
    status: string
    booking_fee_status: 'unpaid' | 'paid'
    booking_fee_total?: number | string
    booking_fee_payment_method?: string | null
    booking_fee_reference?: string | null
    booking_fee_paid_at?: string | null
    receipt_attachments?: string[] | null
    receipt_items?: Array<{ desc: string; qty: number; unit_price: number }>
    receipt_notes?: string | null
    customer?: { name: string }
    technician?: { name: string }
    created_at: string
    completed_at?: string | null
}

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<ServiceRequestLog[]>([])
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [viewing, setViewing] = useState<ServiceRequestLog | null>(null)

    const srId = useMemo(() => {
        try {
            const u = new URL(window.location.href)
            const v = u.searchParams.get('sr')
            return v ? Number(v) : undefined
        } catch {
            return undefined
        }
    }, [])

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, unknown> = { status: 'completed', page }
            if (srId) params.id = srId // optional future server-side filter; client filters too
            const r = await axios.get('/api/admin/service-requests', { params })
            const payload = r.data
            const items: ServiceRequestLog[] = (payload.data || payload) as ServiceRequestLog[]
            setLogs(srId ? items.filter(i => i.id === srId) : items)
            if (payload.current_page) {
                setLastPage(payload.last_page || 1)
            }
        } finally {
            setLoading(false)
        }
    }, [page, srId])

    useEffect(() => { load() }, [load])

    return (
        <AdminLayout breadcrumbs={[{ title: 'Admin', href: '/admin' }, { title: 'Logs', href: '/admin/logs' }]}>
            <Head title="Admin • Logs" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Completed Transactions Logs</h1>
                    <Link href="/admin/service-requests">
                        <Button variant="outline">Back to Service Requests</Button>
                    </Link>
                </div>

                <Card className="p-4">
                    {loading ? (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : logs.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No completed transactions found.</div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((sr) => (
                                <Card key={sr.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="font-semibold">SR #{sr.id}</div>
                                            <div className="text-sm text-neutral-600 truncate">{sr.customer?.name ?? '-'} → {sr.technician?.name ?? '-'}</div>
                                        </div>
                                        <div className="text-right text-sm">
                                            <div className="font-semibold">₱{Number(sr.amount || 0).toFixed(2)}</div>
                                            <div className="text-xs text-neutral-500">Created {new Date(sr.created_at).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded border px-2 py-0.5 text-xs text-green-700 bg-green-50 border-green-300">Completed</span>
                                        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${sr.booking_fee_status === 'paid' ? 'text-green-700 bg-green-50 border-green-300' : 'text-yellow-800 bg-yellow-50 border-yellow-300'}`}>Booking Fee: {sr.booking_fee_status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                                        <div>
                                            <div className="text-neutral-500">Completed At</div>
                                            <div className="font-medium">{sr.completed_at ? new Date(sr.completed_at).toLocaleString() : '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-neutral-500">Booking Fee Paid At</div>
                                            <div className="font-medium">{sr.booking_fee_paid_at ? new Date(sr.booking_fee_paid_at).toLocaleString() : '-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-neutral-500">Total Amount</div>
                                            <div className="font-medium">₱{(Number(sr.amount || 0) + Number(sr.booking_fee_total || 0)).toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2">
                                        <Button size="sm" onClick={() => setViewing(sr)}>View Receipt</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                        <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                        <div className="text-xs text-neutral-600">Page {page} of {lastPage}</div>
                        <Button size="sm" variant="outline" disabled={page >= lastPage || loading} onClick={() => setPage(p => Math.min(lastPage, p + 1))}>Next</Button>
                    </div>
                </Card>
                <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Official Receipt</DialogTitle>
                            <DialogDescription>Rendered as seen by technicians.</DialogDescription>
                        </DialogHeader>
                        {viewing && (
                            <div className="space-y-4 text-sm">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-lg font-semibold">FixIt Services</div>
                                        <div className="text-xs text-neutral-600">Transaction Receipt</div>
                                    </div>
                                    <div className="text-right text-xs text-neutral-600">
                                        <div>SR #{viewing.id}</div>
                                        <div>Date: {new Date(viewing.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <div className="font-medium">Billed To</div>
                                        <div>{viewing.customer?.name ?? 'Customer'}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-medium">Technician</div>
                                        <div>{viewing.technician?.name ?? 'Technician'}</div>
                                    </div>
                                </div>

                                {Array.isArray(viewing.receipt_items) && viewing.receipt_items.length > 0 ? (
                                    <div className="border rounded-md">
                                        <div className="grid grid-cols-12 gap-2 border-b bg-neutral-50 p-2 text-[11px] font-medium text-neutral-600">
                                            <div className="col-span-7">Description</div>
                                            <div className="col-span-2 text-right">Qty</div>
                                            <div className="col-span-3 text-right">Line Total</div>
                                        </div>
                                        <div className="divide-y">
                                            {viewing.receipt_items.map((it, idx) => (
                                                <div key={idx} className="grid grid-cols-12 gap-2 p-2">
                                                    <div className="col-span-7">{it.desc}</div>
                                                    <div className="col-span-2 text-right">{Number(it.qty || 0)}</div>
                                                    <div className="col-span-3 text-right">₱{(Number(it.qty || 0) * Number(it.unit_price || 0)).toFixed(2)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-muted-foreground">No items.</div>
                                )}

                                {viewing.receipt_notes && (
                                    <div>
                                        <div className="text-xs font-medium text-neutral-600">Notes</div>
                                        <div className="text-neutral-700">{viewing.receipt_notes}</div>
                                    </div>
                                )}

                                <div className="ml-auto w-full max-w-sm space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <div className="text-neutral-600">Booking Fee</div>
                                        <div>₱{Number(viewing.booking_fee_total || 0).toFixed(2)}</div>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                        <div>Total</div>
                                        <div>₱{(Number(viewing.amount || 0) + Number(viewing.booking_fee_total || 0)).toFixed(2)}</div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-xs font-medium text-neutral-600">Attachments</div>
                                    {Array.isArray(viewing.receipt_attachments) && viewing.receipt_attachments.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {viewing.receipt_attachments.map((att: string | { path: string; uploaded_by_type?: string }, idx: number) => {
                                                // Handle both old format (string) and new format (object)
                                                const path = typeof att === 'string' ? att : att.path
                                                const uploadedByType = typeof att === 'object' ? (att.uploaded_by_type || 'technician') : 'technician'
                                                const isPdf = path.toLowerCase().endsWith('.pdf')
                                                return (
                                                    <div key={idx} className="border rounded p-2 relative">
                                                        {isPdf ? (
                                                            <a className="text-primary underline" href={`/storage/${path}`} target="_blank" rel="noreferrer">Open PDF (Attachment {idx+1})</a>
                                                        ) : (
                                                            <a href={`/storage/${path}`} target="_blank" rel="noreferrer">
                                                                <img src={`/storage/${path}`} alt={`Attachment ${idx+1}`} className="h-32 w-full object-cover rounded" />
                                                            </a>
                                                        )}
                                                        {uploadedByType === 'technician' && (
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 rounded-b">
                                                                Uploaded by Technician
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-xs text-neutral-500">No attachments yet.</div>
                                    )}
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    )
}
