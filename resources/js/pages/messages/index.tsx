import AppLayout from '@/layouts/app-layout'
import { Head, usePage } from '@inertiajs/react'
import { type BreadcrumbItem, type SharedData } from '@/types'
import { useEffect, useRef, useState, useCallback } from 'react'
import { echo } from '@/echo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import axios from '@/axios-config'
import { Paperclip, X as XIcon, FileText, Send, Plus } from 'lucide-react'

// --- Interfaces ---
interface ReceiptItem {
    desc: string
    qty: number
    unit_price: number
}

interface Conversation {
    id: number
    customer_id?: number
    technician_id?: number
    customer?: { name: string }
    technician?: { name: string }
    unread_count?: number
}
interface Technician {
    id: number
    name: string
    standard_rate?: number | null
    professional_rate?: number | null
    premium_rate?: number | null
    base_pricing?: number | null
}
type PricingTier = 'normal' | 'standard' | 'advanced' | 'base'
interface Message {
    id: number
    sender_type: string
    sender_id: number
    body: string
    attachments?: string[]
}
interface ServiceRequest {
    id: number
    rate_tier: string | null
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
    receipt_items?: Array<{ desc: string; qty: number; unit_price: number }>
    receipt_notes?: string | null
    receipt_attachments?: string[]
    created_at: string
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Messages',
        href: '/messages',
    },
]

function formatCurrency(value: number | string | null | undefined): string {
    const n = Number(value ?? 0)
    return n.toFixed(2)
}

// Custom hook to fetch and update service request state
const useServiceRequestUpdater = (active: Conversation | null, setServiceRequest: (sr: ServiceRequest | null) => void) => {
    return useCallback(async () => {
        if (!active?.id) return
        try {
            const r = await axios.get(`/api/conversations/${active.id}/service-requests`)
            const requests: ServiceRequest[] = r.data
            if (requests.length > 0) {
                const activeRequest = requests.find(sr => ['pending', 'awaiting_quote_approval', 'confirmed', 'in_progress'].includes(sr.status)) || requests[0]
                setServiceRequest(activeRequest)
            } else {
                setServiceRequest(null)
            }
        } catch (e) {
            console.error('Error fetching service requests:', e)
            setServiceRequest(null)
        }
    }, [active, setServiceRequest])
}

// --- START: CUSTOMER MODAL COMPONENT (MOVED TO TOP TO FIX REFERENCE ERROR) ---

interface CreateRequestModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    technicianId: number
    onSuccess: () => void // Callback to refresh the service request state
}

function CreateRequestModal({ open, onOpenChange, technicianId, onSuccess }: CreateRequestModalProps) {
    const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([{ desc: '', qty: 1, unit_price: 0 }])
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isItemListValid = receiptItems.some(it => it.desc.trim().length > 0 && Number(it.qty) > 0)
    
    const handleSubmit = async () => {
        if (!isItemListValid) {
            setError('Please describe the required service in at least one item and set a quantity greater than zero.')
            return
        }
        
        setLoading(true)
        setError(null)
        
        const validItems = receiptItems.filter(it => it.desc.trim() && Number(it.qty) > 0)

        try {
            await axios.post('/api/customer/service-requests', {
                technician_id: technicianId,
                receipt_items: validItems, 
                customer_notes: notes || undefined,
            })
            
            onSuccess() 
            onOpenChange(false)
            setNotes('')
            setReceiptItems([{ desc: '', qty: 1, unit_price: 0 }]) 
            alert('Service Request Submitted! The technician will send you an estimate shortly.')
            
        } catch (err: any) {
            console.error('Service Request Submission Error:', err)
            
            let msg = 'Submission failed. Please check the console for validation details.';
            
            // DETAILED ERROR HANDLING FOR 422
            if (err.response && err.response.status === 422 && err.response.data && err.response.data.errors) {
                const errors = err.response.data.errors;
                const firstErrorKey = Object.keys(errors)[0];
                if (firstErrorKey) {
                    msg = `Validation Error on '${firstErrorKey}': ${errors[firstErrorKey][0]}`;
                }
            } else if (err.response && err.response.data && err.response.data.message) {
                 msg = err.response.data.message;
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(open) => {
            if (!open) { setNotes(''); setError(null); setReceiptItems([{ desc: '', qty: 1, unit_price: 0 }]) } 
            onOpenChange(open)
        }}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create Service Request</DialogTitle>
                    <DialogDescription>
                        List the items or services you require. The technician will use this to issue an estimate.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    
                    {/* Item Input Grid */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Items/Services Required</label>
                        <div className="grid grid-cols-10 gap-2 text-xs font-medium text-neutral-500">
                            <div className="col-span-8">Description</div>
                            <div className="col-span-2">Qty</div>
                        </div>
                        {receiptItems.map((it, idx) => (
                            <div key={idx} className="grid grid-cols-10 gap-2 items-center">
                                {/* Description Input */}
                                <Input 
                                    className="col-span-8" 
                                    placeholder="e.g., AC Unit Diagnostic Fee" 
                                    value={it.desc} 
                                    onChange={(e) => {
                                        const arr = [...receiptItems]
                                        arr[idx] = { ...arr[idx], desc: e.target.value, unit_price: 0 }
                                        setReceiptItems(arr)
                                    }} 
                                />
                                {/* Quantity Input */}
                                <Input 
                                    className="col-span-2" 
                                    type="number" 
                                    min={1} 
                                    value={it.qty} 
                                    onChange={(e) => {
                                        const arr = [...receiptItems]
                                        arr[idx] = { ...arr[idx], qty: Number(e.target.value) || 1, unit_price: 0 }
                                        setReceiptItems(arr)
                                    }} 
                                />
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

                    {/* General Notes Field */}
                    <div>
                        <label htmlFor="customer-notes" className="text-sm font-medium">Additional Notes (Location, Time preference, etc.)</label>
                        <textarea
                            id="customer-notes"
                            placeholder="e.g., The leak is coming from the left side. I am available after 5 PM."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                        />
                    </div>
                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !isItemListValid}>
                        <FileText className="h-4 w-4 mr-1" />
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// --- END: CUSTOMER MODAL COMPONENT ---


export default function MessagesPage() {
    const page = usePage<SharedData>()
    const role = (page.props && (page.props as unknown as { auth?: { role?: string } }).auth?.role) as string | undefined
    const isTechnician = role === 'technician'
    const isCustomer = role === 'customer' // Defined for clarity
    
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [active, setActive] = useState<Conversation | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [body, setBody] = useState('')
    const [pendingAttachments, setPendingAttachments] = useState<string[]>([])
    const [typing, setTyping] = useState(false)
    const [technician, setTechnician] = useState<Technician | null>(null)
    const [selectedRate, setSelectedRate] = useState<PricingTier | null>(null)
    const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null)
    
    // New state for customer flow
    const [openCreateRequestModal, setOpenCreateRequestModal] = useState(false)
    
    // Existing states for Technician flow
    const [openReceiptModal, setOpenReceiptModal] = useState(false)
    const [editingReceipt, setEditingReceipt] = useState(false)
    const [receiptItems, setReceiptItems] = useState<Array<{ desc: string; qty: number; unit_price: number }>>([{ desc: '', qty: 1, unit_price: 0 }])
    const [receiptNotes, setReceiptNotes] = useState('')
    const [feeComplexity, setFeeComplexity] = useState<'simple' | 'standard' | 'complex'>('standard')
    const [openViewReceipt, setOpenViewReceipt] = useState(false)
    const receiptRef = useRef<HTMLDivElement>(null)
    const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    const updateServiceRequest = useServiceRequestUpdater(active, setServiceRequest)

    // --- CUSTOMER APPROVAL HANDLER ---
    const handleCustomerApproval = async (requestId: number) => {
        if (!confirm(`By approving, you accept the service price (₱${formatCurrency(serviceRequest?.amount)}) and agree to pay the non-refundable booking fee (₱${formatCurrency(serviceRequest?.booking_fee_total)}) to confirm the job. Continue?`)) {
            return;
        }
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        try {
            // API CALLS THE NEW APPROVAL ROUTE (to set status to 'confirmed')
            await axios.patch(`/api/service-requests/${requestId}/approve`, {
                // Payment details would go here
            }, {
                headers: { 'X-CSRF-TOKEN': csrfToken || '' }
            });
            
            // Update UI state
            updateServiceRequest(); 
            
            alert('Quote Approved! The booking is now confirmed. The technician will receive the booking fee and can start service.');

        } catch (error) {
            console.error('Approval failed:', error);
            alert('Failed to approve quote. Please ensure payment was successful.');
        }
    }
    // --- END NEW LOGIC ---


    // Dispatches unread count update
    useEffect(() => {
        if (!conversations) return;
        try {
            const total = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);
            window.dispatchEvent(new CustomEvent('unread:update', { detail: { total } }));
        } catch (e) {
            console.error("Failed to dispatch unread count", e);
        }
    }, [conversations]);

    // Helpers for scroll stick-to-bottom behavior
    const scrollToBottom = () => {
        const el = scrollRef.current
        if (!el) return
        el.scrollTop = el.scrollHeight
    }
    const isNearBottom = () => {
        const el = scrollRef.current
        if (!el) return true
        const threshold = 80 // px
        return el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    }

    useEffect(() => {
        axios.get('/api/conversations').then(r => {
            setConversations(r.data)
            
            // Auto-select conversation from URL parameter if present
            const urlParams = new URLSearchParams(window.location.search)
            const conversationId = urlParams.get('conversation')
            if (conversationId) {
                const found = r.data.find((c: Conversation) => c.id === Number(conversationId))
                if (found) {
                    setConversations(prev => prev.map(cc => cc.id === found.id ? { ...cc, unread_count: 0 } : cc))
                    setActive(found)
                    window.history.replaceState({}, '', '/messages')
                } else {
                    axios.get(`/api/conversations/${conversationId}`)
                        .then(res => {
                            const newConv: Conversation = res.data
                            setConversations(prev => {
                                if (prev.find(c => c.id === newConv.id)) {
                                    return prev
                                }
                                return [newConv, ...prev]
                            })
                            setActive(newConv)
                            window.history.replaceState({}, '', '/messages')
                        })
                        .catch(err => {
                            console.error('Error fetching conversation:', err)
                            window.history.replaceState({}, '', '/messages')
                        })
                }
            }
        }).catch(err => {
            console.error('Error loading conversations:', err)
        })
    }, [])

    useEffect(() => {
        if (!active) return
        const conversationId = active.id
        
        // Fetch messages
        axios.get(`/api/conversations/${conversationId}/messages`).then(r => {
            setMessages(r.data as Message[])
            requestAnimationFrame(() => scrollToBottom())
        })
        
        // Fetch Technician Details (if applicable)
        if (active.technician_id) {
            axios.get(`/api/technicians/${active.technician_id}`).then(r => {
                const tech: Technician = r.data
                setTechnician(tech)
                // Auto-select first available rate (kept for existing logic)
                if (tech.standard_rate) {
                    setSelectedRate('normal')
                } else if (tech.professional_rate) {
                    setSelectedRate('standard')
                } else if (tech.premium_rate) {
                    setSelectedRate('advanced')
                } else if (tech.base_pricing) {
                    setSelectedRate('base')
                }
            }).catch(err => {
                console.error('Error fetching technician:', err)
                setTechnician(null)
            })

            // Fetch service requests for this conversation using the custom hook
            updateServiceRequest()

        } else {
            Promise.resolve().then(() => {
                setTechnician(null)
                setServiceRequest(null)
            })
        }
        
        // mark as read on open
        const markRead = async () => {
            try {
                await axios.post(`/api/conversations/${conversationId}/read`);
                setConversations(prev => {
                    return prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
                })
            } catch {
                // Silently fail for read marks
            }
        }
        markRead()
        
        if (!echo) {
            return
        }
        
        const channel = echo.private(`conversation.${conversationId}`)
            .listen('MessageSent', (e: Message) => {
                const shouldStick = isNearBottom()
                setMessages(prev => [...prev, e])
                if (shouldStick) {
                    setTimeout(() => scrollToBottom(), 0)
                }
            })
            .listen('TypingStarted', () => {
                setTyping(true)
                setTimeout(() => setTyping(false), 1500)
            })

        return () => {
            if (!echo) return
            channel.stopListening('MessageSent')
            channel.stopListening('TypingStarted')
            echo.leave(`private-conversation.${conversationId}`)
        }
    }, [active, updateServiceRequest])

    // Mark read on tab focus
    useEffect(() => {
        if (!active) return
        const conversationId = active.id
        const onFocus = async () => {
            try {
                await axios.post(`/api/conversations/${conversationId}/read`);
            } catch {
                // Silently fail for read marks
            }
        }
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [active])

    const onSend = async () => {
        if (!active || !body.trim()) return
        
        const payload: { body: string; attachments?: string[] } = { body }
        if (pendingAttachments.length > 0) {
            payload.attachments = pendingAttachments
        }
        const r = await axios.post(`/api/conversations/${active.id}/messages`, payload)
        setMessages(prev => [...prev, r.data as Message])
        setBody('')
        setPendingAttachments([])
        setTimeout(() => scrollToBottom(), 0)
    }

    // ... (availableTiers logic is fine) ...
    const availableTiers: Array<{ value: PricingTier; label: string; rate: number }> = []
    if (technician) {
        if (technician.standard_rate) {
            availableTiers.push({ value: 'normal', label: 'Normal Rate', rate: technician.standard_rate })
        }
        if (technician.professional_rate) {
            availableTiers.push({ value: 'standard', label: 'Standard Rate', rate: technician.professional_rate })
        }
        if (technician.premium_rate) {
            availableTiers.push({ value: 'advanced', label: 'Advanced Rate', rate: technician.premium_rate })
        }
        if (availableTiers.length === 0 && technician.base_pricing) {
            availableTiers.push({ value: 'base', label: 'Base Rate', rate: technician.base_pricing })
        }
    }

    const onTyping = async () => {
        if (!active) return
        try { 
            await axios.post(`/api/conversations/${active.id}/typing`)
        } catch {
            // Ignore typing errors
        }
    }

    // Helper to check if a service request needs a quote or is active
    const isServiceRequestActive = (sr: ServiceRequest | null) => {
        if (!sr) return false;
        return ['pending', 'awaiting_quote_approval', 'confirmed', 'in_progress'].includes(sr.status);
    }


    return (
        <>
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Messages" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-6">
                <div className="mb-4">
                    <h1 className="text-2xl font-semibold">Messages</h1>
                    <p className="text-muted-foreground">Chat with technicians</p>
                </div>
                
                <div className="flex h-[calc(100vh-240px)] gap-4">
                    <Card className="w-72 shrink-0 p-4">
                        <div className="mb-4 text-sm font-medium text-neutral-500">Conversations</div>
                        <div className="space-y-2 overflow-y-auto">
                            {conversations.length === 0 ? (
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                    No conversations yet
                                </div>
                            ) : (
                                conversations.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={async () => {
                                            setConversations(prev => prev.map(cc => cc.id === c.id ? { ...cc, unread_count: 0 } : cc))
                                            setActive(c)
                                            try {
                                                await axios.post(`/api/conversations/${c.id}/read`)
                                                const r = await axios.get('/api/conversations')
                                                setConversations(r.data)
                                            } catch {
                                                // ignore network/CSRF hiccups; UI is already optimistic
                                            }
                                        }}
                                        className={`w-full rounded-lg p-3 text-left transition-colors ${
                                            active?.id === c.id
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 text-sm font-semibold">
                                                {isTechnician ? (c.customer?.name || 'Customer') : (c.technician?.name || 'Technician')}
                                            </div>
                                            {!!(c.unread_count && c.unread_count > 0) && (
                                                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] leading-5 text-white">
                                                    {c.unread_count > 9 ? '9+' : c.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </Card>
                    
                    <Card className="flex min-w-0 flex-1 flex-col">
                        {active ? (
                            <>
                                <div className="border-b p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0">
                                            <h2 className="truncate text-lg font-semibold">
                                                {isTechnician ? (active.customer?.name || 'Customer') : (active.technician?.name || 'Technician')}
                                            </h2>
                                        </div>
                                        {/* CUSTOMER ACTION: CREATE SERVICE REQUEST BUTTON */}
                                        {isCustomer && active?.technician_id && !isServiceRequestActive(serviceRequest) && (
                                            <Button 
                                                size="sm" 
                                                variant="default" 
                                                className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 gap-1"
                                                onClick={() => setOpenCreateRequestModal(true)}
                                            >
                                                <FileText className="h-4 w-4" />
                                                Create Service Request
                                            </Button>
                                        )}
                                    </div>
                                    
                                    {/* --- CUSTOMER APPROVAL/QUOTE DISPLAY --- */}
                                    {isCustomer && serviceRequest && 
                                        serviceRequest.status === 'awaiting_quote_approval' && (
                                        
                                        <Card className="m-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-200">
                                                        Quote Awaiting Your Approval
                                                    </h3>
                                                    <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-300">
                                                        Service Price: ₱{formatCurrency(serviceRequest.amount)}
                                                    </p>
                                                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                                                        Required Booking Fee: ₱{formatCurrency(serviceRequest.booking_fee_total)}
                                                    </p>
                                                </div>

                                                <Button 
                                                    className="mt-3 bg-green-600 hover:bg-green-700 gap-2"
                                                    onClick={() => handleCustomerApproval(serviceRequest.id)}
                                                >
                                                    <Send className="h-4 w-4" />
                                                    Approve Quote & Pay Fee
                                                </Button>
                                            </div>
                                        </Card>
                                    )}
                                    {/* --- END CUSTOMER APPROVAL/QUOTE DISPLAY --- */}

                                    {serviceRequest && (
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-xs text-neutral-600">
                                                {/* Status/Amount display here */}
                                            </div>
                                            <div className="ml-auto flex flex-wrap items-center gap-2">
                                                {isTechnician && serviceRequest.receipt_items && serviceRequest.receipt_items.length > 0 && (
                                                    <Button 
                                                        onClick={() => {
                                                            setEditingReceipt(true)
                                                            const items = serviceRequest?.receipt_items ?? [{ desc: '', qty: 1, unit_price: 0 }]
                                                            setReceiptItems(items.map(i => ({ desc: i.desc, qty: Number(i.qty||0), unit_price: Number(i.unit_price||0) })))
                                                            setReceiptNotes(serviceRequest?.receipt_notes ?? '')
                                                            setFeeComplexity((serviceRequest?.booking_fee_complexity || 'standard') as 'simple' | 'standard' | 'complex')
                                                            setOpenReceiptModal(true)
                                                        }}
                                                        size="sm"
                                                        variant="outline"
                                                        className="whitespace-nowrap"
                                                    >
                                                        Edit Receipt
                                                    </Button>
                                                )}
                                                {/* ... (rest of the header actions like upload and view receipt) ... */}
                                                {isTechnician && (
                                                    <>
                                                        <input
                                                            id={`header-receipt-upload-${serviceRequest.id}`}
                                                            type="file"
                                                            multiple
                                                            accept=".jpg,.jpeg,.png,.pdf"
                                                            style={{ display: 'none' }}
                                                            onChange={async (e) => {
                                                                const files = (e.currentTarget as HTMLInputElement).files
                                                                if (!files || files.length === 0) return
                                                                const form = new FormData()
                                                                Array.from(files).slice(0,5).forEach(f => form.append('files[]', f))
                                                                try {
                                                                    await axios.post(`/api/service-requests/${serviceRequest.id}/receipts`, form, { 
                                                                        headers: { 
                                                                            'Content-Type': 'multipart/form-data',
                                                                        } 
                                                                    })
                                                                    updateServiceRequest() // Refresh service request data
                                                                } catch {
                                                                    alert('Failed to upload receipt(s)')
                                                                } finally {
                                                                    (e.currentTarget as HTMLInputElement).value = ''
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                            onClick={() => document.getElementById(`header-receipt-upload-${serviceRequest.id}`)?.click()}
                                                        >
                                                            Upload receipt
                                                        </Button>
                                                    </>
                                                )}
                                                {(serviceRequest.receipt_items && serviceRequest.receipt_items.length > 0) && (
                                                    <Button 
                                                        onClick={() => setOpenViewReceipt(true)} 
                                                        size="sm"
                                                        className="bg-blue-600 text-white hover:bg-blue-700"
                                                    >
                                                        View receipt
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {messages.map((m: Message) => {
                                        const sender = m.sender_type.split('\\').pop()
                                        const isFromTechnician = sender === 'Technician'
                                        const isMine = (isTechnician && isFromTechnician) || (!isTechnician && !isFromTechnician)
                                        const displayName = isMine ? 'You' : (isFromTechnician ? 'Technician' : 'Customer')
                                        return (
                                            <div key={m.id} className={`flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
                                                <div className={`text-[11px] text-neutral-500 ${isMine ? 'self-end' : 'self-start'}`}>
                                                    {displayName}
                                                </div>
                                                <div className={`rounded-lg p-3 max-w-[80%] ${isMine ? 'bg-primary text-primary-foreground' : 'bg-neutral-100 dark:bg-neutral-800 text-foreground'}`}>
                                                    {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                                                    {m.attachments && Array.isArray(m.attachments) && (
                                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                                            {m.attachments.map((src: string, idx: number) => (
                                                                <button
                                                                    type="button"
                                                                    key={idx}
                                                                    onClick={() => setImageViewerSrc(src)}
                                                                    className="group relative"
                                                                    title="View attachment"
                                                                >
                                                                    <img src={src} alt={`attachment-${idx+1}`} className="h-28 w-full object-cover rounded border" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {typing && (
                                        <div className="text-xs text-neutral-500 italic">Typing…</div>
                                    )}
                                </div>
                                <div className="flex gap-2 border-t p-4">
                                    <input
                                        id="chat-upload-input"
                                        type="file"
                                        multiple
                                        accept=".jpg,.jpeg,.png"
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const inputEl = e.currentTarget as HTMLInputElement
                                            const files = inputEl.files
                                            if (!files || files.length === 0) return
                                            const readers = Array.from(files).slice(0, 5).map(file => new Promise<string>((resolve) => {
                                                const fr = new FileReader()
                                                fr.onload = () => resolve(String(fr.result))
                                                fr.readAsDataURL(file)
                                            }))
                                            const images = await Promise.all(readers)
                                            setPendingAttachments(prev => [...prev, ...images])
                                            if (inputEl) inputEl.value = ''
                                        }}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => document.getElementById('chat-upload-input')?.click()}
                                        title={'Attach image'}
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </Button>
                                    {pendingAttachments.length > 0 && (
                                        <div className="flex items-center gap-2 overflow-x-auto">
                                            {pendingAttachments.map((src, i) => (
                                                <div key={i} className="relative">
                                                    <img src={src} alt="preview" className="h-10 w-10 rounded object-cover border" />
                                                    <button
                                                        type="button"
                                                        className="absolute -top-1 -right-1 rounded-full bg-black/70 text-white p-0.5"
                                                        onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                                        aria-label="Remove attachment"
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <Input
                                        ref={(input) => {
                                            if (input && active) {
                                                const urlParams = new URLSearchParams(window.location.search)
                                                if (urlParams.get('conversation')) {
                                                    setTimeout(() => input.focus(), 100)
                                                }
                                            }
                                        }}
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        onInput={onTyping}
                                        placeholder="Type a message..."
                                        className="flex-1"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                onSend()
                                            }
                                        }}
                                    />
                                    <Button onClick={onSend} disabled={!body.trim()}>
                                        Send
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-center">
                                    <p className="text-lg font-medium text-neutral-500">Select a conversation</p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Choose a conversation from the list to start chatting
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </AppLayout>

        {/* --- CUSTOMER: CREATE SERVICE REQUEST MODAL --- */}
        {active?.technician_id && (
            <CreateRequestModal
                open={openCreateRequestModal}
                onOpenChange={setOpenCreateRequestModal}
                technicianId={active.technician_id}
                onSuccess={updateServiceRequest}
            />
        )}


        {/* --- TECHNICIAN: EDIT RECEIPT MODAL (Unchanged but remains for existing logic) --- */}
        <Dialog open={openReceiptModal} onOpenChange={(open) => {
            if (!open) setEditingReceipt(false)
            setOpenReceiptModal(open)
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Receipt</DialogTitle>
                    <DialogDescription>Update existing receipt items and notes.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-neutral-500">
                        <div className="col-span-7">Description</div>
                        <div className="col-span-2">Qty</div>
                        <div className="col-span-3">Unit Price</div>
                    </div>
                    {receiptItems.map((it, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <Input className="col-span-7" placeholder="Item description" value={it.desc} onChange={(e) => {
                                const arr = [...receiptItems]; arr[idx] = { ...arr[idx], desc: e.target.value }; setReceiptItems(arr)
                            }} />
                            <Input className="col-span-2" type="number" min={0} value={it.qty} onChange={(e) => {
                                const arr = [...receiptItems]; arr[idx] = { ...arr[idx], qty: Number(e.target.value) }; setReceiptItems(arr)
                            }} />
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    className="w-2/3"
                                    type="number"
                                    min={0}
                                    value={it.unit_price === 0 ? '' : it.unit_price}
                                    onChange={(e) => {
                                        const next = e.target.value === '' ? 0 : Number(e.target.value)
                                        const arr = [...receiptItems]; arr[idx] = { ...arr[idx], unit_price: next }; setReceiptItems(arr)
                                    }}
                                />
                                <div className="w-1/3 text-right text-xs text-muted-foreground">
                                    ₱{(Number(it.qty || 0) * Number(it.unit_price || 0)).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setReceiptItems((a) => [...a, { desc: '', qty: 1, unit_price: 0 }])}>Add item</Button>
                        {receiptItems.length > 1 && (
                            <Button size="sm" variant="ghost" onClick={() => setReceiptItems((a) => a.slice(0, -1))}>Remove last</Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="notes" className="text-sm font-medium">Notes</label>
                        <textarea id="notes" placeholder="Optional notes" value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} className="w-full rounded-md border bg-background p-2 text-sm" />
                    </div>
                    <div className="space-y-2">
                        <div className="text-sm font-medium">Booking fee complexity</div>
                        <div className="flex gap-2">
                            <Button size="sm" variant={feeComplexity === 'simple' ? 'default' : 'outline'} onClick={() => setFeeComplexity('simple')}>Simple (₱10)</Button>
                            <Button size="sm" variant={feeComplexity === 'standard' ? 'default' : 'outline'} onClick={() => setFeeComplexity('standard')}>Standard (₱20)</Button>
                            <Button size="sm" variant={feeComplexity === 'complex' ? 'default' : 'outline'} onClick={() => setFeeComplexity('complex')}>Complex (₱40)</Button>
                        </div>
                    </div>
                    <div className="text-right text-sm font-medium">
                        Total: ₱{receiptItems.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0).toFixed(2)}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenReceiptModal(false)}>Cancel</Button>
                    <Button onClick={async () => {
                        if (!active || !serviceRequest) return
                        const total = receiptItems.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0)
                        if (total <= 0) { alert('Total must be greater than 0'); return }
                        if (receiptItems.some(it => !it.desc.trim())) { alert('Every item needs a description'); return }
                        try {
                            const res = await axios.patch(`/api/service-requests/${serviceRequest.id}/receipt`, {
                                receipt_items: receiptItems,
                                receipt_total: total,
                                receipt_notes: receiptNotes || undefined,
                                booking_fee_complexity: feeComplexity,
                            });
                            setServiceRequest(res.data.service_request)
                            await axios.post(`/api/conversations/${active.id}/messages`, { body: `Receipt updated • New total ₱${total.toFixed(2)}` })
                            setOpenReceiptModal(false)
                            setReceiptItems([{ desc: '', qty: 1, unit_price: 0 }])
                            setReceiptNotes('')
                            axios.get(`/api/conversations/${active.id}/messages`).then(r => setMessages(r.data))
                        } catch (error) {
                            const err = error as { response?: { data?: { message?: string } } }
                            alert(err?.response?.data?.message || 'Failed to update receipt')
                        }
                    }}
                    disabled={receiptItems.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.unit_price || 0)), 0) <= 0 || receiptItems.some(it => !it.desc.trim())}
                    >Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Image Viewer Modal remains unchanged */}
        <Dialog open={!!imageViewerSrc} onOpenChange={(open) => !open && setImageViewerSrc(null)}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Attachment</DialogTitle>
                    <DialogDescription>Click outside to close or right-click to save.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-auto">
                    {imageViewerSrc && (
                        <a href={imageViewerSrc} target="_blank" rel="noreferrer">
                            <img src={imageViewerSrc} alt="Attachment preview" className="mx-auto max-h-[68vh] w-auto rounded" />
                        </a>
                    )}
                </div>
            </DialogContent>
        </Dialog>

        {/* View Receipt Modal FIX APPLIED HERE */}
        <Dialog open={openViewReceipt} onOpenChange={setOpenViewReceipt}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Official Receipt</DialogTitle>
                    <DialogDescription>View the official receipt for this service request.</DialogDescription>
                </DialogHeader>
                <div ref={receiptRef} className="space-y-4 text-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-lg font-semibold">FixIt Services</div>
                            <div className="text-xs text-neutral-600">Transaction Receipt</div>
                        </div>
                        <div className="text-right text-xs text-neutral-600">
                            <div>SR #{serviceRequest?.id}</div>
                            <div>Date: {serviceRequest ? new Date(serviceRequest.created_at).toLocaleDateString() : '-'}</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <div className="font-medium">Billed To</div>
                            <div>{active?.customer?.name ?? 'Customer'}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-medium">Technician</div>
                            <div>{active?.technician?.name ?? 'Technician'}</div>
                        </div>
                    </div>
                    {serviceRequest?.receipt_items && serviceRequest.receipt_items.length > 0 ? (
                        <div className="border rounded-md">
                            <div className="grid grid-cols-12 gap-2 border-b bg-neutral-50 p-2 text-[11px] font-medium text-neutral-600">
                                <div className="col-span-7">Description</div>
                                <div className="col-span-2 text-right">Qty</div>
                                <div className="col-span-3 text-right">Line Total</div>
                            </div>
                            <div className="divide-y">
                                {serviceRequest.receipt_items.map((it, idx) => (
                                    <div key={idx} className="grid grid-cols-12 gap-2 p-2">
                                        <div className="col-span-7">{it.desc}</div>
                                        <div className="col-span-2 text-right">{Number(it.qty || 0)}</div>
                                        <div className="col-span-3 text-right">₱{(Number(it.unit_price || 0)).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-muted-foreground">No items.</div>
                    )}
                    {serviceRequest?.receipt_notes && (
                        <div>
                            <div className="text-xs font-medium text-neutral-600">Notes</div>
                            <div className="text-neutral-700">{serviceRequest.receipt_notes}</div>
                        </div>
                    )}
                    <div className="ml-auto w-full max-w-sm space-y-1 text-sm">
                        <div className="flex justify-between">
                            <div className="text-neutral-600">Booking Fee</div>
                            <div>₱{formatCurrency(serviceRequest?.booking_fee_total)}</div>
                        </div>
                        <div className="flex justify-between font-semibold">
                            <div>Total</div>
                            <div>₱{formatCurrency((Number(serviceRequest?.amount ?? 0)) + (Number(serviceRequest?.booking_fee_total ?? 0)))}</div>
                        </div>
                    </div>
                    <div data-noexport="1" className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-neutral-600">Attachments</div>
                            {isTechnician && serviceRequest && (
                                <div className="flex items-center gap-2">
                                    <input
                                        id="receipt-upload-input"
                                        type="file"
                                        multiple
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        style={{ display: 'none' }}
                                        onChange={async (e) => {
                                            const inputEl = e.currentTarget as HTMLInputElement
                                            const files = inputEl.files
                                            if (!files || files.length === 0) return
                                            const form = new FormData()
                                            Array.from(files).slice(0,5).forEach(f => form.append('files[]', f))
                                            try {
                                                await axios.post(`/api/service-requests/${serviceRequest.id}/receipts`, form, { 
                                                    headers: { 
                                                        'Content-Type': 'multipart/form-data',
                                                    } 
                                                })
                                                updateServiceRequest() // Refresh service request data
                                            } catch {
                                                alert('Failed to upload receipt(s)')
                                            } finally {
                                                if (inputEl) inputEl.value = ''
                                            }
                                        }}
                                    />
                                    <Button size="sm" variant="default" onClick={() => document.getElementById('receipt-upload-input')?.click()}>
                                        Upload receipt
                                    </Button>
                                </div>
                            )}
                        </div>
                        {serviceRequest?.receipt_attachments && serviceRequest.receipt_attachments.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {serviceRequest.receipt_attachments.map((att: string | { path: string; uploaded_by_type?: string }, i: number) => {
                                    const path = typeof att === 'string' ? att : att.path
                                    const uploadedByType = typeof att === 'object' ? (att.uploaded_by_type || 'technician') : 'technician'
                                    const isPdf = path.toLowerCase().endsWith('.pdf')
                                    const canRemove = isTechnician && uploadedByType === 'technician'
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
                                                        try {
                                                            await axios.delete(`/api/service-requests/${serviceRequest.id}/receipts?path=${encodeURIComponent(path)}`);
                                                            updateServiceRequest() // Refresh service request data
                                                        } catch {
                                                            alert('Failed to remove attachment')
                                                        }
                                                    }}
                                                >
                                                    ✕
                                                </button>
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
                <DialogFooter>
                    <Button variant="destructive" onClick={() => setOpenViewReceipt(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    )
}