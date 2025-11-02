import AdminLayout from '@/layouts/admin-layout'
import { Head, router } from '@inertiajs/react'
import { useCallback, useEffect, useState } from 'react'
import axios from '@/axios-config'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ServiceRequest {
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

export default function AdminServiceRequestsPage() {
    const [requests, setRequests] = useState<ServiceRequest[]>([])
    const [onlyOutstanding, setOnlyOutstanding] = useState(true)
    const [technicianId, setTechnicianId] = useState('')
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const [lastPage, setLastPage] = useState(1)
    const [viewing, setViewing] = useState<ServiceRequest | null>(null)
    const totalCount = requests.length
    const totalAmount = requests.reduce((s, r) => s + Number(r.amount || 0), 0)
    const outstandingCount = requests.filter(r => r.booking_fee_status !== 'paid').length
    const outstandingSum = requests.filter(r => r.booking_fee_status !== 'paid').reduce((s, r) => s + Number(r.booking_fee_total || 0), 0)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, unknown> = {}
            if (onlyOutstanding) params.outstanding_fees = 1
            if (technicianId) params.technician_id = Number(technicianId)
            params.page = page
            const r = await axios.get('/api/admin/service-requests', { params })
            const payload = r.data
            const updatedRequests = payload.data || payload
            setRequests(updatedRequests)
            if (payload.current_page) {
                setLastPage(payload.last_page || 1)
            }
        } finally {
            setLoading(false)
        }
    }, [onlyOutstanding, page, technicianId])

    useEffect(() => { load() }, [load])

    return (
        <AdminLayout breadcrumbs={[{ title: 'Admin', href: '/admin' }, { title: 'Service Requests', href: '/admin/service-requests' }] }>
            <Head title="Admin • Service Requests" />
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <Card className="p-4">
                        <div className="text-xs text-neutral-600">Total SRs</div>
                        <div className="text-2xl font-bold">{loading ? '—' : totalCount}</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-xs text-neutral-600">Total Amount</div>
                        <div className="text-2xl font-bold">{loading ? '—' : `₱${totalAmount.toFixed(2)}`}</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-xs text-neutral-600">Outstanding Fees</div>
                        <div className="text-2xl font-bold">{loading ? '—' : outstandingCount}</div>
                    </Card>
                    <Card className="p-4">
                        <div className="text-xs text-neutral-600">Outstanding Sum</div>
                        <div className="text-2xl font-bold">{loading ? '—' : `₱${outstandingSum.toFixed(2)}`}</div>
                    </Card>
                </div>
                <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2">
                        <input id="outstanding" type="checkbox" checked={onlyOutstanding} onChange={(e) => setOnlyOutstanding(e.target.checked)} />
                        <label htmlFor="outstanding" className="text-sm">Outstanding booking fees only</label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Input placeholder="Technician ID (optional)" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className="w-56" />
                        <Button size="sm" onClick={load} disabled={loading}>Filter</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                            const rows = requests.map(r => ({
                                id: r.id,
                                customer: r.customer?.name || '',
                                technician: r.technician?.name || '',
                                amount: Number(r.amount || 0).toFixed(2),
                                booking_fee_status: r.booking_fee_status,
                                booking_fee_total: Number(r.booking_fee_total || 0).toFixed(2),
                                created_at: r.created_at,
                            }))
                            const header = Object.keys(rows[0] || {id:'',customer:'',technician:'',amount:'',booking_fee_status:'',booking_fee_total:'',created_at:''})
                            const csv = [header.join(','), ...rows.map(row => header.map(h => `"${String((row as Record<string, unknown>)[h]).replace(/"/g,'""')}"`).join(','))].join('\n')
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'service_requests.csv'
                            a.click()
                            URL.revokeObjectURL(url)
                        }}>Export CSV</Button>
                    </div>
                </div>

                <Card className="p-4">
                    <div className="space-y-3">
                        {requests.length === 0 ? (
                            <div className="p-4 text-base text-muted-foreground">No records</div>
                        ) : (
                            requests.map((sr) => (
                                <Card key={sr.id} className="p-4">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold">SR #{sr.id}</div>
                                            <div className="text-sm text-neutral-700">₱{Number(sr.amount || 0).toFixed(2)}</div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                                            <div>
                                                <div className="text-neutral-500">Customer</div>
                                                <div className="font-medium truncate">{sr.customer?.name || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-neutral-500">Technician</div>
                                                <div className="font-medium truncate">{sr.technician?.name || '-'}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="inline-flex items-center rounded border px-2 py-0.5 text-xs text-neutral-800 bg-neutral-50">{sr.status === 'in_progress' ? 'In Progress' : sr.status.charAt(0).toUpperCase() + sr.status.slice(1)}</span>
                                            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${sr.booking_fee_status === 'paid' ? 'border-green-300 text-green-700 bg-green-50' : 'border-yellow-300 text-yellow-800 bg-yellow-50'}`}>Booking Fee: {sr.booking_fee_status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                                        </div>
                                        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                                            <Button size="sm" className="h-8 px-3" onClick={() => setViewing(sr)}>View Receipt</Button>
                                            <Button size="sm" variant="outline" className="h-8 px-3" onClick={() => (document.getElementById(`sr-upload-${sr.id}`) as HTMLInputElement)?.click()}>Upload Receipt</Button>
                                            {sr.booking_fee_status === 'unpaid' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-8 px-3 border-green-300 text-green-700 hover:bg-green-50"
                                                    onClick={async () => {
                                                        if (!confirm('Mark booking fee as paid?')) return
                                                        // Refresh CSRF token from meta tag before request
                                                        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                        if (csrfToken) {
                                                            localStorage.setItem('csrf_token', csrfToken)
                                                        }
                                                        try {
                                                            await axios.post(`/api/admin/service-requests/${sr.id}/booking-fee/mark-received`, {}, {
                                                                headers: {
                                                                    'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || ''
                                                                }
                                                            })
                                                            load()
                                                        } catch (err: unknown) {
                                                            const error = err as { response?: { status?: number; data?: { message?: string } } }
                                                            if (error.response?.status === 419) {
                                                                // Retry with fresh token
                                                                const freshToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                                if (freshToken) {
                                                                    try {
                                                                        await axios.post(`/api/admin/service-requests/${sr.id}/booking-fee/mark-received`, {}, {
                                                                            headers: {
                                                                                'X-CSRF-TOKEN': freshToken
                                                                            }
                                                                        })
                                                                        load()
                                                                    } catch (retryErr) {
                                                                        alert('Session expired. Please refresh the page.')
                                                                    }
                                                                } else {
                                                                    alert('Session expired. Please refresh the page.')
                                                                }
                                                            } else {
                                                                alert(error.response?.data?.message || 'Failed to mark booking fee as paid')
                                                            }
                                                        }
                                                    }}
                                                >
                                                    Mark Fee Paid
                                                </Button>
                                            )}
                                            {sr.status === 'completed' && (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 px-3" 
                                                    onClick={() => {
                                                        router.visit(`/admin/logs?sr=${sr.id}`)
                                                    }}
                                                >
                                                    Logs
                                                </Button>
                                            )}
                                        </div>
                                        <input
                                            id={`sr-upload-${sr.id}`}
                                            type="file"
                                            multiple
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            style={{ display: 'none' }}
                                            onChange={async (e) => {
                                                const inputEl = e.currentTarget as HTMLInputElement
                                                const files = inputEl.files
                                                if (!files || files.length === 0) return
                                                // Cache reference before async operation
                                                const inputId = `sr-upload-${sr.id}`
                                                const form = new FormData()
                                                Array.from(files).slice(0,5).forEach(f => form.append('files[]', f))
                                                try {
                                                    // Refresh CSRF token before request
                                                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                    if (csrfToken) {
                                                        localStorage.setItem('csrf_token', csrfToken)
                                                    }
                                                    await axios.post(`/api/service-requests/${sr.id}/receipts`, form, { 
                                                        headers: { 
                                                            'Content-Type': 'multipart/form-data',
                                                            'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || ''
                                                        } 
                                                    })
                                                    load()
                                                } finally {
                                                    // Reset input value using cached ID
                                                    const resetInput = document.getElementById(inputId) as HTMLInputElement
                                                    if (resetInput) {
                                                        resetInput.value = ''
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
                        <div className="text-xs text-neutral-600">Page {page} of {lastPage}</div>
                        <Button size="sm" variant="outline" disabled={page >= lastPage || loading} onClick={() => setPage(p => Math.min(lastPage, p + 1))}>Next</Button>
                    </div>
                </Card>
                <AdminServiceRequestsViewReceiptModal 
                    viewing={viewing} 
                    onClose={() => setViewing(null)} 
                    onUpdate={(updated) => {
                        setViewing(updated)
                        // Reload the list in the background to keep everything in sync
                        load()
                    }} 
                />
            </div>
        </AdminLayout>
    )
}

// View Receipt Modal rendered at root to avoid grid nesting issues
export function AdminServiceRequestsViewReceiptModal({ 
    viewing, 
    onClose,
    onUpdate 
}: { 
    viewing: ServiceRequest | null
    onClose: () => void
    onUpdate: (updated: ServiceRequest) => void 
}) {
    return (
        <Dialog open={!!viewing} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Official Receipt</DialogTitle>
                    <DialogDescription>Rendered as seen by technicians.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    {viewing ? (
                        <>
                            {/* Header */}
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

                            {/* Parties */}
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

                            {/* Items */}
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

                            {/* Notes */}
                            {viewing.receipt_notes && (
                                <div>
                                    <div className="text-xs font-medium text-neutral-600">Notes</div>
                                    <div className="text-neutral-700">{viewing.receipt_notes}</div>
                                </div>
                            )}

                            {/* Totals */}
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

                            {/* Attachments */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium text-neutral-600">Attachments</div>
                                </div>
                                {Array.isArray(viewing.receipt_attachments) && viewing.receipt_attachments.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {viewing.receipt_attachments.map((att: string | { path: string; uploaded_by_type?: string }, i: number) => {
                                            // Handle both old format (string) and new format (object)
                                            const path = typeof att === 'string' ? att : att.path
                                            const uploadedByType = typeof att === 'object' ? (att.uploaded_by_type || 'technician') : 'technician'
                                            const isPdf = path.toLowerCase().endsWith('.pdf')
                                            const canRemove = uploadedByType === 'admin' // Admin can only remove their own uploads
                                            return (
                                                <div key={i} className="border rounded p-2 relative">
                                                    {isPdf ? (
                                                        <a className="text-primary underline" href={`/storage/${path}`} target="_blank" rel="noreferrer">Open PDF (Attachment {i+1})</a>
                                                    ) : (
                                                        <a href={`/storage/${path}`} target="_blank" rel="noreferrer">
                                                            <img src={`/storage/${path}`} alt={`Attachment ${i+1}`} className="h-32 w-full object-cover rounded" />
                                                        </a>
                                                    )}
                                                    {canRemove && (
                                                        <button
                                                            type="button"
                                                            className="absolute -top-2 -right-2 rounded-full bg-red-600 text-white p-1 text-[10px] hover:bg-red-700"
                                                            title="Remove attachment"
                                                            onClick={async () => {
                                                                if (!confirm('Remove this attachment?')) return
                                                                try {
                                                                    // Refresh CSRF token before request
                                                                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                                    if (csrfToken) {
                                                                        localStorage.setItem('csrf_token', csrfToken)
                                                                    }
                                                                    // Send path as query parameter for DELETE requests
                                                                    const response = await axios.delete(`/api/service-requests/${viewing.id}/receipts?path=${encodeURIComponent(path)}`, {
                                                                        headers: {
                                                                            'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || ''
                                                                        }
                                                                    })
                                                                    // Update viewing state immediately with the response data - attachment disappears right away!
                                                                    if (viewing && response.data?.attachments !== undefined) {
                                                                        const updated = { ...viewing, receipt_attachments: response.data.attachments }
                                                                        onUpdate(updated)
                                                                    } else if (viewing) {
                                                                        // Fallback: remove from current state if response doesn't have attachments
                                                                        const updated = { 
                                                                            ...viewing, 
                                                                            receipt_attachments: (viewing.receipt_attachments || []).filter((a: string | { path: string }) => {
                                                                                const p = typeof a === 'string' ? a : a.path
                                                                                return p !== path
                                                                            }) 
                                                                        }
                                                                        onUpdate(updated)
                                                                    }
                                                                } catch (err: unknown) {
                                                                    const error = err as { response?: { status?: number; data?: { message?: string; error?: string } } }
                                                                    console.error('Delete attachment error:', error, 'Full error:', err)
                                                                    const errorMessage = error.response?.data?.message || error.response?.data?.error || `Failed to remove attachment (${error.response?.status || 'unknown error'}). Please try again.`
                                                                    alert(errorMessage)
                                                                }
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
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
                        </>
                    ) : null}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

                


