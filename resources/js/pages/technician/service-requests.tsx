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
import { MessageSquare, Plus, FileText, Send } from 'lucide-react'

// --- Interfaces and Utilities ---

interface ReceiptItem {
    desc: string
    qty: number
    unit_price: number
}

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
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'awaiting_quote_approval'
    payment_status: 'unpaid' | 'paid' | 'partially_paid' | 'refunded'
    customer_payment_status?: 'unpaid' | 'paid' | 'partial'
    customer_payment_method?: 'cash' | 'gcash' | 'other' | null
    booking_fee_status?: 'unpaid' | 'paid'
    booking_fee_total?: number | string
    booking_fee_complexity?: 'simple' | 'standard' | 'complex'
    customer_notes?: string | null
    technician_notes?: string | null
    service_date?: string | null
    created_at: string
    receipt_items?: ReceiptItem[] // Items provided by the Customer
}

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

const formatCurrency = (value: number | string | null | undefined): string => {
    const n = Number(value ?? 0)
    return n.toFixed(2)
}

// --- Main Component ---

export default function TechnicianServiceRequests() {
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])
    const [filterStatus, setFilterStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    
    // NEW states for Edit Details flow
    const [openEditDetailsModal, setOpenEditDetailsModal] = useState(false)
    const [selectedRequestForEdit, setSelectedRequestForEdit] = useState<ServiceRequest | null>(null)

    const loadServiceRequests = useCallback(async () => {
        try {
            setLoading(true)
            const params: Record<string, unknown> = {}
            if (filterStatus) {
                params.status = filterStatus
            }
            const response = await axios.get('/api/service-requests', { params })

            const requests = response.data || []
            
            // PRIORITY SORT FIX: Updated status order for new workflow
            const statusOrder: Record<string, number> = {
                'pending': 1, // Needs Pricing (from customer)
                'awaiting_quote_approval': 2, // Priced, Awaiting Customer Payment
                'confirmed': 3, // Ready to Start
                'in_progress': 4,
                'completed': 5,
                'cancelled': 6,
            };

            const sortedRequests = requests.sort((a: ServiceRequest, b: ServiceRequest) => {
                const priorityA = statusOrder[a.status] || 99;
                const priorityB = statusOrder[b.status] || 99;

                // 1. Primary Sort: Compare by status priority
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                // 2. Secondary Sort: If priorities are the same, sort by newest date (DESC)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            
            setServiceRequests(sortedRequests)
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

    const updateRequestStatus = async (requestId: number, newStatus: ServiceRequest['status']) => {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) { localStorage.setItem('csrf_token', csrfToken) }
        try {
            await axios.patch(`/api/service-requests/${requestId}/status`, { status: newStatus }, {
                headers: { 'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || '' }
            })
            setServiceRequests(prev => prev.map(sr => 
                sr.id === requestId ? { ...sr, status: newStatus } : sr
            ))
            loadServiceRequests()
        } catch (error) {
            const err = error as { response?: { status?: number; data?: { message?: string } } }
            
            // CSRF Token/Session Handling
            if (err.response?.status === 419) {
                alert('Your session has expired. Please refresh the page and try again.')
                window.location.reload()
                return
            }
            alert(err.response?.data?.message || 'Failed to update service request status')
        }
    }

    const handleEditDetailsClick = (request: ServiceRequest) => {
        setSelectedRequestForEdit(request)
        setOpenEditDetailsModal(true)
    }
    
    // UTILITY: handleMarkComplete is correctly defined here
    const handleMarkComplete = async (request: ServiceRequest) => {
        if (!confirm('Mark this service request as completed?')) return
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) { localStorage.setItem('csrf_token', csrfToken) }
        try {
            await axios.patch(`/api/service-requests/${request.id}/complete`, {}, {
                headers: { 'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || '' }
            })
            loadServiceRequests()
        } catch (e) {
            alert('Failed to mark as completed')
        }
    }
    
    // UTILITY: handleMarkCustomerPaid is defined here
    const handleMarkCustomerPaid = async (request: ServiceRequest) => {
        if (!confirm(`Mark final service payment of ₱${formatCurrency(request.amount)} as paid?`)) return
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        if (csrfToken) { localStorage.setItem('csrf_token', csrfToken) }
        
        try {
            // Note: This API call updates the 'customer_payment_status' to 'paid'
            await axios.patch(`/api/service-requests/${request.id}/customer-payment`, {
                customer_payment_status: 'paid',
                customer_payment_method: 'cash', // Assuming manual update means cash/manual
            }, {
                headers: { 'X-CSRF-TOKEN': csrfToken || localStorage.getItem('csrf_token') || '' }
            })
            loadServiceRequests()
            alert('Customer payment marked as received.')
        } catch (error) {
            const err = error as { response?: { status?: number; data?: { message?: string } } }
            if (err.response?.status === 419) {
                alert('Session expired. Please refresh the page.')
                window.location.reload()
                return
            }
            alert(err.response?.data?.message || 'Failed to update customer payment')
        }
    }


    const getStatusBadge = (status: ServiceRequest['status']) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
            pending: { variant: 'secondary', label: 'Needs Pricing' },
            awaiting_quote_approval: { variant: 'default', label: 'Awaiting Customer' },
            confirmed: { variant: 'default', label: 'Confirmed (Ready)' },
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Service Requests" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-4xl font-bold">Service Requests</h1>
                    {/* Removed Generate Receipt button */}
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
                        Needs Pricing
                    </Button>
                    <Button
                        variant={filterStatus === 'awaiting_quote_approval' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('awaiting_quote_approval')}
                    >
                        Awaiting Customer
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
                                ? `No matching service requests found`
                                : 'No service requests yet. Customers will send you requests.'
                            }
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {serviceRequests.map((request, index) => {
                            const needsPricing = request.status === 'pending' && Number(request.amount || 0) === 0
                            const isAwaitingApproval = request.status === 'awaiting_quote_approval'
                            const isReadyToStart = request.status === 'confirmed'
                            const isPriced = Number(request.amount || 0) > 0
                            const isBookingFeePaid = request.booking_fee_status === 'paid'
                            const isCustomerUnpaid = (request.customer_payment_status || request.payment_status) === 'unpaid'
                            const hasCustomerNotes = !!request.customer_notes
                            
                            // Determine if 'Mark Completed' should be disabled
                            const isMarkCompleteDisabled = request.status === 'in_progress' && !isBookingFeePaid;

                            return (
                            <Card key={request.id} className={`p-4 ${index === 0 && needsPricing ? 'border-blue-500 border-2' : ''}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h3 className="text-lg font-semibold">
                                                Request #{request.id} - {request.customer.name}
                                            </h3>
                                            {index === 0 && needsPricing && (
                                                <Badge variant="default" className="bg-blue-500">New Request</Badge>
                                            )}
                                            {getStatusBadge(request.status)}
                                            {getPaymentBadge(request.customer_payment_status || request.payment_status)}
                                            {getBookingFeeBadge(request.booking_fee_status)}
                                        </div>
                                        
                                        {/* Card Content with 3 columns and Booking Fee */}
                                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Rate Tier</p>
                                                <p className="font-medium">{getRateTierLabel(request.rate_tier)}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Service Amount</p>
                                                <p className="font-semibold text-lg">
                                                    {Number(request.amount || 0) > 0 
                                                        ? `₱${formatCurrency(request.amount)}`
                                                        : <span className="text-muted-foreground text-base">TBD</span>
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Booking Fee</p>
                                                <p className="font-semibold text-lg">
                                                    {Number(request.booking_fee_total || 0) > 0
                                                        ? `₱${formatCurrency(request.booking_fee_total)}`
                                                        : <span className="text-muted-foreground text-base">TBD</span>
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Customer Email</p>
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
                                            {request.receipt_items && request.receipt_items.length > 0 && (
                                                <div>
                                                    <p className="text-muted-foreground">Items Requested</p>
                                                    <p className="font-medium text-xs text-green-700 dark:text-green-300">
                                                        {request.receipt_items.length} item(s) listed
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {hasCustomerNotes && (
                                            <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Customer Notes:</p>
                                                <p className="text-sm">{request.customer_notes}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-4 flex flex-col gap-2">
                                        
                                        {/* 1. NEEDS PRICING or VIEW/EDIT */}
                                        {(needsPricing || isAwaitingApproval) && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleEditDetailsClick(request)}
                                                className="gap-2"
                                                variant={needsPricing ? 'default' : 'outline'}
                                            >
                                                <FileText className="h-4 w-4" />
                                                {needsPricing ? 'Edit Details' : 'View/Edit Details'}
                                            </Button>
                                        )}
                                        
                                        {/* 2. AWAITING CUSTOMER APPROVAL (Display Only) */}
                                        {isAwaitingApproval && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled
                                            >
                                                Awaiting Customer Approval
                                            </Button>
                                        )}

                                        {/* 3. READY TO START SERVICE */}
                                        {isReadyToStart && (
                                            <Button
                                                size="sm"
                                                onClick={() => updateRequestStatus(request.id, 'in_progress')}
                                            >
                                                Start Service
                                            </Button>
                                        )}

                                        {/* 4. MARK CUSTOMER PAID (Visible if Confirmed/In Progress/Completed AND Customer Unpaid) */}
                                        {(isReadyToStart || request.status === 'in_progress' || request.status === 'completed') && isPriced && isCustomerUnpaid && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleMarkCustomerPaid(request)}
                                            >
                                                Mark Customer Paid
                                            </Button>
                                        )}

                                        {/* 5. MARK COMPLETED (Disabled if Booking Fee Unpaid) */}
                                        {request.status === 'in_progress' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleMarkComplete(request)}
                                                disabled={!isBookingFeePaid}
                                                title={!isBookingFeePaid ? "Must wait for admin to confirm booking fee payment" : undefined}
                                                // --- FIX: Apply cursor-not-allowed class conditionally ---
                                                className={`
                                                    ${!isBookingFeePaid ? 'cursor-not-allowed bg-gray-400 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-600' : ''}
                                                `}
                                                // --- END FIX ---
                                            >
                                                Mark as Completed
                                            </Button>
                                        )}
                                        
                                        {/* Message Button (Always available) */}
                                        <Link href={`/messages?conversation=${request.conversation_id}`}>
                                            <Button size="sm" variant="outline" className="gap-2 mt-2">
                                                <MessageSquare className="h-4 w-4" />
                                                Message
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        )})}
                    </div>
                )}
            </div>

            {/* NEW: Edit Details Modal */}
            {selectedRequestForEdit && (
                <EditServiceDetailsModal 
                    request={selectedRequestForEdit}
                    open={openEditDetailsModal}
                    onOpenChange={setOpenEditDetailsModal}
                    onDetailsSaved={loadServiceRequests}
                />
            )}
        </AppLayout>
    )
}

// --- EDIT SERVICE DETAILS MODAL COMPONENT (for Technician to set price/fee) ---
function EditServiceDetailsModal({ request, open, onOpenChange, onDetailsSaved }: { request: ServiceRequest, open: boolean, onOpenChange: (open: boolean) => void, onDetailsSaved: () => void }) {
    
    // Initial data setup for the modal
    const initialItems: ReceiptItem[] = request.receipt_items && request.receipt_items.length > 0 
        ? request.receipt_items.map(item => ({...item, unit_price: Number(item.unit_price || 0)}))
        : [{ desc: request.customer_notes || '', qty: 1, unit_price: Number(request.amount || 0) }]

    const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>(initialItems)
    const [technicianNotes, setTechnicianNotes] = useState(request.technician_notes || '')
    const [feeComplexity, setFeeComplexity] = useState<'simple' | 'standard' | 'complex'>(
        (request.booking_fee_complexity || 'standard') as 'simple' | 'standard' | 'complex'
    )
    const [saving, setSaving] = useState(false)

    // Calculate the total amount from line items
    const total = receiptItems.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0)

    const formatCurrency = (value: number | string | null | undefined): string => {
        const n = Number(value ?? 0)
        return n.toFixed(2)
    }

    const handleSave = async () => {
        if (!request.id || total <= 0) {
            alert('Total service amount must be greater than ₱0.00 to complete the receipt.')
            return
        }
        if (receiptItems.some(it => !it.desc.trim())) {
            alert('Every item needs a description.')
            return
        }

        setSaving(true)
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        
        try {
            // API ROUTE: /api/service-requests/{id}/edit-details
            await axios.patch(`/api/service-requests/${request.id}/edit-details`, {
                receipt_items: receiptItems,
                receipt_total: total,
                technician_notes: technicianNotes || undefined,
                booking_fee_complexity: feeComplexity,
            }, {
                headers: { 'X-CSRF-TOKEN': csrfToken || '' }
            })
            
            // Success
            onDetailsSaved()
            onOpenChange(false)
            alert(`Details saved for Request #${request.id}. Receipt complete. Awaiting customer approval.`)

        } catch (error) {
            const err = error as { response?: { data?: { message?: string } } }
            alert(err.response?.data?.message || 'Failed to save details.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Service Details for Request #{request.id}</DialogTitle>
                    <DialogDescription>
                        Complete the receipt by setting the unit prices and booking fee. Status changes to "Awaiting Customer Approval" upon saving.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    
                    {/* Item Input Grid: Technician sets the unit_price */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 gap-2 text-sm font-medium text-neutral-500">
                            <div className="col-span-6">Description (Customer Request)</div>
                            <div className="col-span-2 text-center">Qty</div>
                            <div className="col-span-4">Unit Price (₱)</div>
                        </div>
                        {receiptItems.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                <Input 
                                    className="col-span-6" 
                                    placeholder="Service or item description" 
                                    value={it.desc} 
                                    onChange={(e) => {
                                        const arr = [...receiptItems]
                                        arr[idx] = { ...arr[idx], desc: e.target.value }
                                        setReceiptItems(arr)
                                    }} 
                                />
                                <Input 
                                    className="col-span-2 text-center" 
                                    type="number" 
                                    min={1} 
                                    value={it.qty} 
                                    onChange={(e) => {
                                        const arr = [...receiptItems]
                                        arr[idx] = { ...arr[idx], qty: Number(e.target.value) || 1 }
                                        setReceiptItems(arr)
                                    }} 
                                />
                                <div className="col-span-4 flex items-center gap-2">
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
                                <Plus className="h-4 w-4 mr-1" /> Add item
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

                    {/* Technician Notes */}
                    <div className="space-y-2">
                        <label htmlFor="tech-notes" className="text-sm font-medium">Technician Notes (Visible to Customer)</label>
                        <textarea 
                            id="tech-notes" 
                            placeholder="Optional notes or clarification about the estimate..." 
                            value={technicianNotes} 
                            onChange={(e) => setTechnicianNotes(e.target.value)} 
                            className="w-full rounded-md border bg-background p-2 text-sm" 
                        />
                    </div>

                    {/* Booking Fee Complexity */}
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Booking fee complexity (sets the total booking fee)</div>
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
                    <div className="text-right text-lg font-bold pt-2 border-t">
                        Total Service Amount: ₱{total.toFixed(2)}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving || total <= 0 || receiptItems.some(it => !it.desc.trim())}
                    >
                        {saving ? 'Saving…' : 'Save Details & Complete Receipt'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}