import AppLayout from '@/layouts/app-layout'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { useCallback, useEffect, useState } from 'react'
import axios from '@/axios-config'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MessageSquare, Plus } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
    {
        title: 'Service Requests',
        href: '/technician/service-requests',
    },
]

interface ServiceRequest {
    id: number
    conversation_id: number
    customer: {
        id: number
        name: string
        email: string
        phone?: string | null
    }
    rate_tier: string
    amount: number | string
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
    payment_status: 'unpaid' | 'paid' | 'partially_paid' | 'refunded'
    customer_payment_status?: 'unpaid' | 'paid' | 'partial'
    customer_payment_method?: 'cash' | 'gcash' | 'other' | null
    booking_fee_status?: 'unpaid' | 'paid'
    booking_fee_total?: number | string
    customer_notes?: string | null
    technician_notes?: string | null
    service_date?: string | null
    created_at: string
}

interface Conversation {
    id: number
    customer: {
        id: number
        name: string
        email: string
    }
    last_message_at?: string | null
}

export default function TechnicianServiceRequests() {
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])
    const [filterStatus, setFilterStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [openReceiptModal, setOpenReceiptModal] = useState(false)
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
    const [receiptItems, setReceiptItems] = useState<Array<{ desc: string; qty: number; unit_price: number }>>([{ desc: '', qty: 1, unit_price: 0 }])
    const [receiptNotes, setReceiptNotes] = useState('')
    const [feeComplexity, setFeeComplexity] = useState<'simple' | 'standard' | 'complex'>('standard')

    const loadServiceRequests = useCallback(async () => {
        try {
            setLoading(true)
            const params: Record<string, unknown> = {}
            if (filterStatus) {
                params.status = filterStatus
            }
            const response = await axios.get('/api/service-requests', { params })
            // Filter out completed requests by default (unless explicitly filtering for completed)
            let requests = response.data || []
            if (!filterStatus || filterStatus !== 'completed') {
                requests = requests.filter((sr: ServiceRequest) => sr.status !== 'completed')
            }
            // Sort by created_at DESC to show newest first (all receipts should be visible, including multiple for same customer)
            requests.sort((a: ServiceRequest, b: ServiceRequest) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            setServiceRequests(requests)
        } catch (error) {
            console.error('Error loading service requests:', error)
            setServiceRequests([])
        } finally {
            setLoading(false)
        }
    }, [filterStatus])

    useEffect(() => {
        loadServiceRequests()
    }, [filterStatus, loadServiceRequests])

    // Load conversations for receipt generation
    useEffect(() => {
        axios.get('/api/conversations').then(r => {
            setConversations(r.data || [])
        }).catch(() => {
            setConversations([])
        })
    }, [])

    const updateRequestStatus = async (requestId: number, newStatus: ServiceRequest['status']) => {
        // Refresh CSRF token before request
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) {
            localStorage.setItem('csrf_token', csrfToken)
        }
        try {
            await axios.patch(`/api/service-requests/${requestId}/status`, { status: newStatus }, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || ''
                }
            })
            // Update local state immediately
            setServiceRequests(prev => prev.map(sr => 
                sr.id === requestId ? { ...sr, status: newStatus } : sr
            ))
            // Refresh full list in background
            loadServiceRequests()
        } catch (error) {
            console.error('Error updating status:', error)
            const err = error as { response?: { status?: number; data?: { message?: string } } }
            if (err.response?.status === 419) {
                // Retry with fresh token
                const freshToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                if (freshToken) {
                    try {
                        await axios.patch(`/api/service-requests/${requestId}/status`, { status: newStatus }, {
                            headers: {
                                'X-CSRF-TOKEN': freshToken
                            }
                        })
                        setServiceRequests(prev => prev.map(sr => 
                            sr.id === requestId ? { ...sr, status: newStatus } : sr
                        ))
                        loadServiceRequests()
                    } catch (retryErr) {
                        alert('Session expired. Please refresh the page.')
                    }
                } else {
                    alert('Session expired. Please refresh the page.')
                }
            } else {
                alert(err.response?.data?.message || 'Failed to update service request status')
            }
        }
    }

    const getStatusBadge = (status: ServiceRequest['status']) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
            pending: { variant: 'secondary', label: 'Pending' },
            confirmed: { variant: 'default', label: 'Confirmed' },
            in_progress: { variant: 'default', label: 'In Progress' },
            completed: { variant: 'default', label: 'Completed' },
            cancelled: { variant: 'destructive', label: 'Cancelled' },
        }
        const config = variants[status] || { variant: 'outline' as const, label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    const getPaymentBadge = (paymentStatus?: ServiceRequest['payment_status'] | ServiceRequest['customer_payment_status']) => {
        if (!paymentStatus) return null
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
            unpaid: { variant: 'destructive', label: 'Customer Payment: Unpaid' },
            paid: { variant: 'default', label: 'Customer Payment: Paid' },
            partially_paid: { variant: 'secondary', label: 'Customer Payment: Partially Paid' },
            partial: { variant: 'secondary', label: 'Customer Payment: Partially Paid' },
            refunded: { variant: 'outline', label: 'Customer Payment: Refunded' },
        }
        const config = variants[paymentStatus] || { variant: 'outline' as const, label: `Customer Payment: ${paymentStatus}` }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    const getBookingFeeBadge = (bookingFeeStatus?: ServiceRequest['booking_fee_status']) => {
        if (!bookingFeeStatus) return null
        const variants: Record<string, { variant: 'default' | 'destructive', label: string }> = {
            unpaid: { variant: 'destructive', label: 'Booking Fee: Unpaid' },
            paid: { variant: 'default', label: 'Booking Fee: Paid' },
        }
        const config = variants[bookingFeeStatus] || { variant: 'outline' as const, label: `Booking Fee: ${bookingFeeStatus}` }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    const getRateTierLabel = (tier: string) => {
        const labels: Record<string, string> = {
            normal: 'Normal Rate',
            standard: 'Standard Rate',
            advanced: 'Advanced Rate',
            base: 'Base Rate',
        }
        return labels[tier] || tier
    }

    const formatCurrency = (value: number | string | null | undefined) => {
        const n = Number(value ?? 0)
        return n.toFixed(2)
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Service Requests" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-bold">Service Requests</h1>
                    <Button 
                        variant="default" 
                        className="gap-2"
                        onClick={() => setOpenReceiptModal(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Generate Receipt
                    </Button>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                    <Button
                        variant={filterStatus === null ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus(null)}
                    >
                        All
                    </Button>
                    <Button
                        variant={filterStatus === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('pending')}
                    >
                        Pending
                    </Button>
                    <Button
                        variant={filterStatus === 'confirmed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('confirmed')}
                    >
                        Confirmed
                    </Button>
                    <Button
                        variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('in_progress')}
                    >
                        In Progress
                    </Button>
                    <Button
                        variant={filterStatus === 'completed' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('completed')}
                    >
                        Completed
                    </Button>
                </div>

                {/* Service Requests List */}
                {loading ? (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">Loading service requests...</p>
                    </Card>
                ) : serviceRequests.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">
                            {filterStatus 
                                ? `No ${filterStatus} service requests found`
                                : 'No service requests yet'
                            }
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Customers will send you service requests through messages
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {serviceRequests.map((request, index) => (
                            <Card key={request.id} className={`p-4 ${index === 0 && request.status === 'pending' ? 'border-blue-500 border-2' : ''}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h3 className="text-lg font-semibold">
                                                Request #{request.id} - {request.customer.name}
                                            </h3>
                                            {index === 0 && request.status === 'pending' && (
                                                <Badge variant="default" className="bg-blue-500">New Receipt</Badge>
                                            )}
                                            {getStatusBadge(request.status)}
                                            {getPaymentBadge(request.customer_payment_status || request.payment_status)}
                                            {getBookingFeeBadge(request.booking_fee_status)}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Rate Tier</p>
                                                <p className="font-medium">{getRateTierLabel(request.rate_tier)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Amount</p>
                                                <p className="font-semibold text-lg">₱{formatCurrency(request.amount)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Customer</p>
                                                <p className="font-medium">{request.customer.email}</p>
                                                {request.customer.phone && (
                                                    <p className="text-xs text-muted-foreground">{request.customer.phone}</p>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Created</p>
                                                <p className="font-medium">
                                                    {new Date(request.created_at).toLocaleDateString()}
                                                </p>
                                                {request.service_date && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Service Date: {new Date(request.service_date).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {request.customer_notes && (
                                            <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                                <p className="text-xs text-muted-foreground mb-1">Customer Notes:</p>
                                                <p className="text-sm">{request.customer_notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-4 flex flex-col gap-2">
                                        {/* Status Actions */}
                                        {request.status === 'pending' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => updateRequestStatus(request.id, 'confirmed')}
                                                >
                                                    Accept Request
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateRequestStatus(request.id, 'cancelled')}
                                                >
                                                    Cancel
                                                </Button>
                                            </>
                                        )}
                                        {request.status === 'confirmed' && (
                                            <Button
                                                size="sm"
                                                onClick={() => updateRequestStatus(request.id, 'in_progress')}
                                            >
                                                Start Service
                                            </Button>
                                        )}
                                        {request.status === 'in_progress' && (
                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    if (!confirm('Mark this service request as completed?')) return
                                                    // Refresh CSRF token from meta tag before request
                                                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                    if (csrfToken) {
                                                        localStorage.setItem('csrf_token', csrfToken)
                                                    }
                                                    try {
                                                        await axios.patch(`/api/service-requests/${request.id}/complete`, {}, {
                                                            headers: {
                                                                'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || ''
                                                            }
                                                        })
                                                        loadServiceRequests()
                                                    } catch (err: unknown) {
                                                        const error = err as { response?: { status?: number; data?: { message?: string } } }
                                                        if (error.response?.status === 419) {
                                                            // Retry with fresh token
                                                            const freshToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                            if (freshToken) {
                                                                try {
                                                                    await axios.patch(`/api/service-requests/${request.id}/complete`, {}, {
                                                                        headers: {
                                                                            'X-CSRF-TOKEN': freshToken
                                                                        }
                                                                    })
                                                                    loadServiceRequests()
                                                                } catch (retryErr) {
                                                                    alert('Session expired. Please refresh the page.')
                                                                }
                                                            } else {
                                                                alert('Session expired. Please refresh the page.')
                                                            }
                                                        } else {
                                                            alert(error.response?.data?.message || 'Failed to mark as completed')
                                                        }
                                                    }
                                                }}
                                            >
                                                Mark as Completed
                                            </Button>
                                        )}
                                        
                                        {/* Customer Payment Actions */}
                                        {(request.status === 'confirmed' || request.status === 'in_progress' || request.status === 'completed') && (
                                            (request.customer_payment_status || request.payment_status) === 'unpaid' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={async () => {
                                                        // Refresh CSRF token from meta tag before request
                                                        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                        if (csrfToken) {
                                                            localStorage.setItem('csrf_token', csrfToken)
                                                        }
                                                        try {
                                                            await axios.patch(`/api/service-requests/${request.id}/customer-payment`, {
                                                                customer_payment_status: 'paid',
                                                                customer_payment_method: 'cash',
                                                            }, {
                                                                headers: {
                                                                    'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || ''
                                                                }
                                                            })
                                                            loadServiceRequests()
                                                        } catch (err: unknown) {
                                                            const error = err as { response?: { status?: number; data?: { message?: string } } }
                                                            if (error.response?.status === 419) {
                                                                // Retry with fresh token
                                                                const freshToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                                                if (freshToken) {
                                                                    try {
                                                                        await axios.patch(`/api/service-requests/${request.id}/customer-payment`, {
                                                                            customer_payment_status: 'paid',
                                                                            customer_payment_method: 'cash',
                                                                        }, {
                                                                            headers: {
                                                                                'X-CSRF-TOKEN': freshToken
                                                                            }
                                                                        })
                                                                        loadServiceRequests()
                                                                    } catch (retryErr) {
                                                                        alert('Session expired. Please refresh the page.')
                                                                    }
                                                                } else {
                                                                    alert('Session expired. Please refresh the page.')
                                                                }
                                                            } else {
                                                                alert(error.response?.data?.message || 'Failed to update customer payment')
                                                            }
                                                        }
                                                    }}
                                                >
                                                    Mark Customer Paid
                                                </Button>
                                            ) : null
                                        )}
                                        
                                        {/* Message Button */}
                                        <Link href={`/messages?conversation=${request.conversation_id}`}>
                                            <Button size="sm" variant="outline" className="gap-2">
                                                <MessageSquare className="h-4 w-4" />
                                                Message
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Receipt Generation Modal */}
            <Dialog open={openReceiptModal} onOpenChange={(open) => {
                if (!open) {
                    setSelectedConversation(null)
                    setReceiptItems([{ desc: '', qty: 1, unit_price: 0 }])
                    setReceiptNotes('')
                    setFeeComplexity('standard')
                }
                setOpenReceiptModal(open)
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Generate New Receipt</DialogTitle>
                        <DialogDescription>Select a conversation and create a receipt for a new pending service request.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Conversation Selector */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Conversation</label>
                            {conversations.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No conversations found. Start a conversation with a customer first.</p>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {conversations.map((conv) => (
                                        <button
                                            key={conv.id}
                                            type="button"
                                            onClick={() => setSelectedConversation(conv)}
                                            className={`w-full text-left p-3 rounded-md border transition-colors ${
                                                selectedConversation?.id === conv.id
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-background hover:bg-accent'
                                            }`}
                                        >
                                            <div className="font-medium">{conv.customer.name}</div>
                                            <div className="text-xs opacity-80">{conv.customer.email}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedConversation && (
                            <>
                                {/* Receipt Items */}
                                <div className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-neutral-500">
                                        <div className="col-span-7">Description</div>
                                        <div className="col-span-2">Qty</div>
                                        <div className="col-span-3">Unit Price</div>
                                    </div>
                                    {receiptItems.map((it, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                            <Input 
                                                className="col-span-7" 
                                                placeholder="Item description" 
                                                value={it.desc} 
                                                onChange={(e) => {
                                                    const arr = [...receiptItems]
                                                    arr[idx] = { ...arr[idx], desc: e.target.value }
                                                    setReceiptItems(arr)
                                                }} 
                                            />
                                            <Input 
                                                className="col-span-2" 
                                                type="number" 
                                                min={0} 
                                                value={it.qty} 
                                                onChange={(e) => {
                                                    const arr = [...receiptItems]
                                                    arr[idx] = { ...arr[idx], qty: Number(e.target.value) }
                                                    setReceiptItems(arr)
                                                }} 
                                            />
                                            <div className="col-span-3 flex items-center gap-2">
                                                <Input
                                                    className="w-2/3"
                                                    type="number"
                                                    min={0}
                                                    value={it.unit_price === 0 ? '' : it.unit_price}
                                                    onChange={(e) => {
                                                        const next = e.target.value === '' ? 0 : Number(e.target.value)
                                                        const arr = [...receiptItems]
                                                        arr[idx] = { ...arr[idx], unit_price: next }
                                                        setReceiptItems(arr)
                                                    }}
                                                />
                                                <div className="w-1/3 text-right text-xs text-muted-foreground">
                                                    ₱{(Number(it.qty || 0) * Number(it.unit_price || 0)).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => setReceiptItems((a) => [...a, { desc: '', qty: 1, unit_price: 0 }])}
                                        >
                                            Add item
                                        </Button>
                                        {receiptItems.length > 1 && (
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => setReceiptItems((a) => a.slice(0, -1))}
                                            >
                                                Remove last
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                                    <textarea 
                                        id="notes" 
                                        placeholder="Optional notes" 
                                        value={receiptNotes} 
                                        onChange={(e) => setReceiptNotes(e.target.value)} 
                                        className="w-full rounded-md border bg-background p-2 text-sm" 
                                    />
                                </div>

                                {/* Booking Fee Complexity */}
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">Booking fee complexity</div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            variant={feeComplexity === 'simple' ? 'default' : 'outline'} 
                                            onClick={() => setFeeComplexity('simple')}
                                        >
                                            Simple (₱10)
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant={feeComplexity === 'standard' ? 'default' : 'outline'} 
                                            onClick={() => setFeeComplexity('standard')}
                                        >
                                            Standard (₱20)
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant={feeComplexity === 'complex' ? 'default' : 'outline'} 
                                            onClick={() => setFeeComplexity('complex')}
                                        >
                                            Complex (₱40)
                                        </Button>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="text-right text-sm font-medium">
                                    Total: ₱{receiptItems.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0).toFixed(2)}
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenReceiptModal(false)}>Cancel</Button>
                        <Button 
                            onClick={async () => {
                                if (!selectedConversation) {
                                    alert('Please select a conversation')
                                    return
                                }
                                const total = receiptItems.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0)
                                if (total <= 0) {
                                    alert('Total must be greater than 0')
                                    return
                                }
                                if (receiptItems.some(it => !it.desc.trim())) {
                                    alert('Every item needs a description')
                                    return
                                }
                                // Refresh CSRF token from meta tag before request
                                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                if (csrfToken) {
                                    localStorage.setItem('csrf_token', csrfToken)
                                }
                                try {
                                    // Create new service request with receipt (this will create a pending request)
                                    const res = await axios.post('/api/service-requests', {
                                        conversation_id: selectedConversation.id,
                                        receipt_items: receiptItems,
                                        receipt_total: total,
                                        receipt_notes: receiptNotes || undefined,
                                        booking_fee_complexity: feeComplexity,
                                    }, {
                                        headers: {
                                            'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || ''
                                        }
                                    })
                                    // Add the new service request to the list immediately
                                    const newRequest = res.data.service_request
                                    const customer = newRequest.customer || {}
                                    const customerName = customer.name || 
                                        (customer.first_name ? `${customer.first_name} ${customer.last_name || ''}`.trim() : 'Customer')
                                    
                                    // Transform to match ServiceRequest interface
                                    const transformedRequest: ServiceRequest = {
                                        id: newRequest.id,
                                        conversation_id: newRequest.conversation_id,
                                        customer: {
                                            id: customer.id || 0,
                                            name: customerName,
                                            email: customer.email || '',
                                            phone: customer.phone || null,
                                        },
                                        rate_tier: newRequest.rate_tier || '',
                                        amount: newRequest.amount || 0,
                                        status: newRequest.status || 'pending',
                                        payment_status: newRequest.payment_status || 'unpaid',
                                        customer_payment_status: newRequest.customer_payment_status || 'unpaid',
                                        customer_payment_method: newRequest.customer_payment_method || null,
                                        booking_fee_status: newRequest.booking_fee_status || 'unpaid',
                                        booking_fee_total: newRequest.booking_fee_total || 0,
                                        customer_notes: newRequest.customer_notes || null,
                                        technician_notes: newRequest.technician_notes || null,
                                        service_date: newRequest.service_date || null,
                                        created_at: newRequest.created_at || new Date().toISOString(),
                                    }
                                    // Add new request at the top of the list immediately
                                    setServiceRequests(prev => {
                                        // Filter out any existing request with the same ID (in case of duplicates)
                                        const filtered = prev.filter(sr => sr.id !== transformedRequest.id)
                                        // Add new one at the top
                                        return [transformedRequest, ...filtered]
                                    })
                                    // Close modal and reset
                                    setOpenReceiptModal(false)
                                    setSelectedConversation(null)
                                    setReceiptItems([{ desc: '', qty: 1, unit_price: 0 }])
                                    setReceiptNotes('')
                                    setFeeComplexity('standard')
                                    // Refresh the full list in background to ensure consistency
                                    loadServiceRequests()
                                    // Show success message
                                    alert(`New receipt generated! Service request #${newRequest.id} is now pending.`)
                                    // Scroll to top to show the new request
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                } catch (error) {
                                    const err = error as { response?: { status?: number; data?: { message?: string } } }
                                    if (err.response?.status === 419) {
                                        // Retry with fresh token
                                        const freshToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                                        if (freshToken) {
                                            try {
                                                const retryRes = await axios.post('/api/service-requests', {
                                                    conversation_id: selectedConversation.id,
                                                    receipt_items: receiptItems,
                                                    receipt_total: total,
                                                    receipt_notes: receiptNotes || undefined,
                                                    booking_fee_complexity: feeComplexity,
                                                }, {
                                                    headers: {
                                                        'X-CSRF-TOKEN': freshToken
                                                    }
                                                })
                                                // Add the new service request to the list immediately
                                                const retryNewRequest = retryRes.data.service_request
                                                const retryCustomer = retryNewRequest.customer || {}
                                                const retryCustomerName = retryCustomer.name || 
                                                    (retryCustomer.first_name ? `${retryCustomer.first_name} ${retryCustomer.last_name || ''}`.trim() : 'Customer')
                                                
                                                const retryTransformedRequest: ServiceRequest = {
                                                    id: retryNewRequest.id,
                                                    conversation_id: retryNewRequest.conversation_id,
                                                    customer: {
                                                        id: retryCustomer.id || 0,
                                                        name: retryCustomerName,
                                                        email: retryCustomer.email || '',
                                                        phone: retryCustomer.phone || null,
                                                    },
                                                    rate_tier: retryNewRequest.rate_tier || '',
                                                    amount: retryNewRequest.amount || 0,
                                                    status: retryNewRequest.status || 'pending',
                                                    payment_status: retryNewRequest.payment_status || 'unpaid',
                                                    customer_payment_status: retryNewRequest.customer_payment_status || 'unpaid',
                                                    customer_payment_method: retryNewRequest.customer_payment_method || null,
                                                    booking_fee_status: retryNewRequest.booking_fee_status || 'unpaid',
                                                    booking_fee_total: retryNewRequest.booking_fee_total || 0,
                                                    customer_notes: retryNewRequest.customer_notes || null,
                                                    technician_notes: retryNewRequest.technician_notes || null,
                                                    service_date: retryNewRequest.service_date || null,
                                                    created_at: retryNewRequest.created_at || new Date().toISOString(),
                                                }
                                                // Add new request at the top of the list immediately
                                                setServiceRequests(prev => {
                                                    // Filter out any existing request with the same ID (in case of duplicates)
                                                    const filtered = prev.filter(sr => sr.id !== retryTransformedRequest.id)
                                                    // Add new one at the top
                                                    return [retryTransformedRequest, ...filtered]
                                                })
                                                // Close modal and reset
                                                setOpenReceiptModal(false)
                                                setSelectedConversation(null)
                                                setReceiptItems([{ desc: '', qty: 1, unit_price: 0 }])
                                                setReceiptNotes('')
                                                setFeeComplexity('standard')
                                                // Refresh the full list in background to ensure consistency
                                                loadServiceRequests()
                                                alert(`New receipt generated! Service request #${retryNewRequest.id} is now pending.`)
                                                // Scroll to top to show the new request
                                                window.scrollTo({ top: 0, behavior: 'smooth' })
                                            } catch (retryErr) {
                                                alert('Session expired. Please refresh the page and try again.')
                                            }
                                        } else {
                                            alert('Session expired. Please refresh the page and try again.')
                                        }
                                    } else if (err.response?.status === 403 || err.response?.status === 401) {
                                        alert('You do not have permission to create service requests.')
                                    } else {
                                        const errorMsg = err.response?.data?.message || 'Failed to create receipt'
                                        alert(errorMsg)
                                        console.error('Receipt creation error:', error)
                                    }
                                }
                            }}
                            disabled={
                                !selectedConversation || 
                                receiptItems.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0) <= 0 || 
                                receiptItems.some(it => !it.desc.trim())
                            }
                        >
                            Create Pending Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    )
}

