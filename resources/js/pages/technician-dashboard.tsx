import AppLayout from '@/layouts/app-layout'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { useEffect, useMemo, useState, useCallback } from 'react'
import axios from '@/axios-config'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MessageSquare, Settings, AlertCircle, FileText, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
]

interface TechnicianDashboardProps {
    currentUser: {
        name?: string;
        is_verified?: boolean;
    }
}


export default function TechnicianDashboard({ currentUser }: TechnicianDashboardProps) {
    const [month, setMonth] = useState<string>('') // YYYY-MM

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


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Technician Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-4xl font-bold">Welcome back, {currentUser?.name || 'Technician'}!</h1>
                    <p className="text-lg text-muted-foreground mt-2">Manage your service requests and bookings</p>
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
                    <Link href="/technician/service-requests">
                        <Button variant="default" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Service Requests
                        </Button>
                    </Link>
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
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${currentUser?.is_verified ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                            {currentUser?.is_verified ? '✓ Verified' : '⏳ Pending Verification'}
                        </div>
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

