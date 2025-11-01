import AppLayout from '@/layouts/app-layout'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '@/axios-config'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, MessageSquare, Settings, TrendingUp, AlertCircle, FileText, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
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
    customer_notes?: string | null
    technician_notes?: string | null
    service_date?: string | null
    created_at: string
}

interface TechnicianDashboardProps {
    currentUser: {
        name?: string;
        is_verified?: boolean;
    }
}

export default function TechnicianDashboard({ currentUser }: TechnicianDashboardProps) {
    const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([])
    const [filterStatus, setFilterStatus] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [month, setMonth] = useState<string>('') // YYYY-MM

    const loadServiceRequests = useCallback(async () => {
        try {
            setLoading(true)
            const params: Record<string, unknown> = {}
            if (filterStatus) {
                params.status = filterStatus
            }
            const response = await axios.get('/api/service-requests', { params })
            setServiceRequests(response.data)
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

    // Initialize current month
    useEffect(() => {
        const now = new Date()
        setMonth(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
    }, [])

    const monthLabel = useMemo(() => {
        if (!month) return ''
        const [y,m] = month.split('-').map(n=>parseInt(n,10))
        const d = new Date(y, m-1, 1)
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    }, [month])

    const isPrevDisabled = useMemo(() => {
        if (!month) return true
        const now = new Date()
        const currentY = now.getFullYear()
        const currentM = now.getMonth() + 1
        const [y,m] = month.split('-').map(n=>parseInt(n,10))
        // disable if target month is the current month (can't go to past months)
        return y < currentY || (y === currentY && m <= currentM)
    }, [month])

    // no-op: availability is handled inside AvailabilityEditor

    const updateRequestStatus = async (requestId: number, newStatus: ServiceRequest['status']) => {
        try {
            await axios.patch(`/api/service-requests/${requestId}/status`, { status: newStatus })
            loadServiceRequests()
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update service request status')
        }
    }

    // Calculate stats
    const stats = {
        pending: serviceRequests.filter(sr => sr.status === 'pending').length,
        confirmed: serviceRequests.filter(sr => sr.status === 'confirmed').length,
        inProgress: serviceRequests.filter(sr => sr.status === 'in_progress').length,
        completed: serviceRequests.filter(sr => sr.status === 'completed').length,
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

    const getPaymentBadge = (paymentStatus: ServiceRequest['payment_status']) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
            unpaid: { variant: 'destructive', label: 'Unpaid' },
            paid: { variant: 'default', label: 'Paid' },
            partially_paid: { variant: 'secondary', label: 'Partially Paid' },
            refunded: { variant: 'outline', label: 'Refunded' },
        }
        const config = variants[paymentStatus] || { variant: 'outline' as const, label: paymentStatus }
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
            <Head title="Technician Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-4xl font-bold">Welcome back, {currentUser?.name || 'Technician'}!</h1>
                    <p className="text-lg text-muted-foreground mt-2">Manage your service requests and bookings</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Requests</p>
                                <p className="text-2xl font-bold">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">In Progress</p>
                                <p className="text-2xl font-bold">{stats.inProgress}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                        </div>
                    </Card>
                    <Card className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold">{stats.completed}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </Card>
                </div>

                {/* Verification Alert */}
                {!currentUser?.is_verified && (
                    <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        Verification Required
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                        Upload your license and certificates to get verified and visible to customers
                                    </p>
                                </div>
                            </div>
                            <Link href="/settings/credentials">
                                <Button size="sm" variant="default">
                                    Upload Credentials
                                </Button>
                            </Link>
                        </div>
                    </Card>
                )}

                {/* Quick Actions */}
                <div className="flex gap-4">
                    <Link href="/messages">
                        <Button variant="outline" className="gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Messages
                        </Button>
                    </Link>
                    <Link href="/settings/profile">
                        <Button variant="outline" className="gap-2">
                            <Settings className="h-4 w-4" />
                            Profile Settings
                        </Button>
                    </Link>
                    {currentUser?.is_verified && (
                        <Link href="/settings/credentials">
                            <Button variant="outline" className="gap-2">
                                <FileText className="h-4 w-4" />
                                Credentials
                            </Button>
                        </Link>
                    )}
                    <Link href="/settings/reviews">
                        <Button variant="outline" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Reviews
                        </Button>
                    </Link>
                    <div className="ml-auto">
                        <Badge variant={currentUser?.is_verified ? 'default' : 'secondary'}>
                            {currentUser?.is_verified ? '✓ Verified' : '⏳ Pending Verification'}
                        </Badge>
                    </div>
                </div>

                {/* Availability Editor */}
                <Card className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <h2 className="text-lg font-semibold">Monthly Availability</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" disabled={isPrevDisabled} onClick={() => {
                                if (!month) return
                                const [y,m] = month.split('-').map(n=>parseInt(n,10))
                                const d = new Date(y, m-1, 1)
                                d.setMonth(d.getMonth()-1)
                                setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
                            }} aria-label="Previous month">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="min-w-[120px] text-center text-sm text-muted-foreground">{monthLabel}</div>
                            <Button variant="ghost" size="icon" onClick={() => {
                                if (!month) return
                                const [y,m] = month.split('-').map(n=>parseInt(n,10))
                                const d = new Date(y, m-1, 1)
                                d.setMonth(d.getMonth()+1)
                                setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
                            }} aria-label="Next month">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <MonthAvailabilityEditor month={month} onChangeMonth={setMonth} />
                </Card>

                {/* Service Requests Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Service Requests</h2>
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
                    </div>

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
                            {serviceRequests.map((request) => (
                                <Card key={request.id} className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold">
                                                    Request #{request.id} - {request.customer.name}
                                                </h3>
                                                {getStatusBadge(request.status)}
                                                {getPaymentBadge(request.payment_status)}
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
                                                <div className="text-xs text-muted-foreground max-w-[220px]">
                                                    Completion will be done by admin after your booking fee is paid and receipts are verified.
                                                </div>
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
            </div>
        </AppLayout>
    )
}
function MonthAvailabilityEditor({ month, onChangeMonth }: { month: string; onChangeMonth: (m: string) => void }) {
    const [days, setDays] = useState<Array<{ date: string; status: 'available' | 'unavailable' }>>([])
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        if (!month) return
        setLoading(true)
        try {
            // Always resolve technician id first, then use id-based monthly endpoint
            const me = await axios.get('/api/technician/me')
            const techId = me.data?.id
            if (techId) {
                const res = await axios.get(`/api/technicians/${techId}/availability/month`, { params: { month } })
                const fetched = Array.isArray(res.data?.days) ? res.data.days : []
                setDays(fetched)
            } else {
                setDays([])
            }
        } catch {
            setDays([])
        } finally {
            setLoading(false)
        }
    }, [month])

    useEffect(() => {
        load()
    }, [load])

    const toggleByDate = (iso: string) => {
        setDays(prev => {
            const idx = prev.findIndex(d => d.date === iso)
            if (idx === -1) {
                // default is available; first click marks it unavailable
                return [...prev, { date: iso, status: 'unavailable' }]
            }
            const next = [...prev]
            next[idx] = { ...next[idx], status: next[idx].status === 'available' ? 'unavailable' : 'available' }
            return next
        })
    }

    const save = async () => {
        if (!month || days.length === 0) return
        const now = new Date()
        const isoToday = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
        // Only send changes from default (available). Past dates excluded.
        const changed = days.filter(d => d.date >= isoToday && d.status === 'unavailable')
        if (changed.length === 0) {
            alert('Nothing to save')
            return
        }
        setSaving(true)
        try {
            const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
            const csrf = meta?.getAttribute('content') || undefined
            try {
                await axios.post('/api/technicians/me/availability', { days: changed }, { headers: csrf ? { 'X-CSRF-TOKEN': csrf } : undefined })
            } catch (err: unknown) {
                // Fallback: no id-based save route; if "me" fails due to session host mismatch, prompt user
                throw err
            }
            // Reload current month to reflect persisted state (matches customer view)
            await load()
            alert('Availability saved')
        } catch (e) {
            alert('Failed to save availability')
        } finally {
            setSaving(false)
        }
    }

    const monthLabel = useMemo(() => {
        if (!month) return ''
        const [y,m] = month.split('-').map(n=>parseInt(n,10))
        const d = new Date(y, m-1, 1)
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    }, [month])

    const cells = useMemo(() => {
        if (!month) return [] as Array<{ key: string; label: string; iso?: string; muted?: boolean; status?: 'available'|'unavailable'; disabled?: boolean }>
        const [y,m] = month.split('-').map(n=>parseInt(n,10))
        const first = new Date(y, m-1, 1)
        const startWeekday = (first.getDay() + 6) % 7 // Mon=0
        const daysInMonth = new Date(y, m, 0).getDate()
        const out: Array<{ key: string; label: string; iso?: string; muted?: boolean; status?: 'available'|'unavailable'; disabled?: boolean }>=[]
        for (let i=0;i<startWeekday;i++) out.push({ key: `b-${i}`, label: '', muted: true })
        for (let d=1; d<=daysInMonth; d++) {
            const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const rec = days.find(x=>x.date===iso)
            const today = new Date()
            const isoToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
            const isPast = iso < isoToday
            out.push({ key: iso, label: String(d), iso, status: rec?.status || 'available', disabled: isPast })
        }
        const rem = out.length % 7
        if (rem) for (let i=0;i<7-rem;i++) out.push({ key:`t-${i}`, label:'', muted:true })
        return out
    }, [month, days])

    return (
        <div>
            <div className="mb-2 text-sm text-muted-foreground">{monthLabel}</div>
            {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(h => (
                        <div key={h} className="text-center text-[11px] text-muted-foreground">{h}</div>
                    ))}
                    {cells.map(cell => {
                        if (cell.muted) return <div key={cell.key} />
                        const today = new Date()
                        const isoToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
                        const isToday = cell.iso === isoToday
                        return (
                            <button
                                key={cell.key}
                                type="button"
                                onClick={() => cell.iso && !cell.disabled && toggleByDate(cell.iso)}
                                disabled={cell.disabled}
                                className={`rounded border p-2 text-center text-xs transition-colors ${cell.disabled ? 'bg-neutral-50 text-neutral-400 cursor-not-allowed' : 'cursor-pointer hover:border-neutral-400'} ${cell.status === 'available' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                                aria-pressed={cell.status === 'available'}
                                aria-label={`Set ${cell.label} ${cell.status === 'available' ? 'unavailable' : 'available'}`}
                            >
                                <div className="font-medium">{cell.label}</div>
                            </button>
                        )
                    })}
                </div>
            )}
            <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
        </div>
    )
}

