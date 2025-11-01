import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Star, Mail, MapPin, Calendar, DollarSign, Briefcase, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '@/axios-config'
import { router } from '@inertiajs/react'

interface TechnicianProfileModalProps {
    technician: {
        id: number
        name: string
        email: string
        address?: string | null
        expertise?: string | null
        services?: string | null
        base_pricing?: number | null
        standard_rate?: number | null
        professional_rate?: number | null
        premium_rate?: number | null
        availability_notes?: string | null
        license_image_path?: string | null
        certificates_image_path?: string | null
        components?: Array<{
            id: number
            component_name: string
            description?: string | null
            price: number
            device_type?: string | null
            compatibility?: string | null
            in_stock: boolean
        }>
    } | null
    rating?: number
    open: boolean
    onOpenChange: (open: boolean) => void
}

type PricingTier = 'normal' | 'standard' | 'advanced' | 'base'

export function TechnicianProfileModal({ technician, rating = 0, open, onOpenChange }: TechnicianProfileModalProps) {
    const [showAvailability, setShowAvailability] = useState(false)
    const [month, setMonth] = useState<string>('') // YYYY-MM
    const [monthDays, setMonthDays] = useState<Array<{ date: string; status: 'available' | 'unavailable' }>>([])
    const [loadingAvailability, setLoadingAvailability] = useState(false)
    const [selectedPricingTier, setSelectedPricingTier] = useState<PricingTier | null>(null)
    const [myRating, setMyRating] = useState<number>(0)
    const [myComment, setMyComment] = useState<string>('')
    const [savingReview, setSavingReview] = useState(false)
    const [hoverRating, setHoverRating] = useState<number | null>(null)

    // Determine available pricing tiers (must be before any early returns)
    const availableTiers: Array<{ value: PricingTier; label: string; rate: number; description: string }> = []
    
    if (technician) {
        if (technician.standard_rate) {
            availableTiers.push({
                value: 'normal',
                label: 'Normal Rate',
                rate: technician.standard_rate,
                description: 'Fix includes: Screen protector installation, battery replacement, simple software updates, basic cleaning, charging port cleaning, and minor cosmetic repairs.'
            })
        }
        
        if (technician.professional_rate) {
            availableTiers.push({
                value: 'standard',
                label: 'Standard Rate',
                rate: technician.professional_rate,
                description: 'Fix includes: Screen replacement, LCD repair, camera module replacement, software troubleshooting and reinstallation, speaker replacement, and moderate hardware repairs.'
            })
        }
        
        if (technician.premium_rate) {
            availableTiers.push({
                value: 'advanced',
                label: 'Advanced Rate',
                rate: technician.premium_rate,
                description: 'Fix includes: Motherboard repair, water damage recovery, advanced microsoldering, IC chip replacement, severe hardware damage repair, and complete device restoration.'
            })
        }

        // If no tier rates but has base pricing
        if (availableTiers.length === 0 && technician.base_pricing) {
            availableTiers.push({
                value: 'base',
                label: 'Base Rate',
                rate: technician.base_pricing,
                description: 'Starting price - final price may vary based on diagnosis and parts needed.'
            })
        }
    }

    // Compute selected tier with a safe default without mutating state in effects
    const computedSelectedTier: PricingTier | undefined = selectedPricingTier || availableTiers[0]?.value
    const currentTier = computedSelectedTier ? availableTiers.find(t => t.value === computedSelectedTier) || null : null

    useEffect(() => {
        if (!open || !technician) return
        // Prefill user's existing review if present
        axios.get(`/api/technicians/${technician.id}/reviews/mine`).then(r => {
            const rev = r.data as { rating?: number; comment?: string } | null
            if (rev) {
                setMyRating(rev.rating ?? 0)
                setMyComment(rev.comment ?? '')
            } else {
                setMyRating(0)
                setMyComment('')
            }
        }).catch(() => {
            setMyRating(0)
            setMyComment('')
        })

        // Initialize current month YYYY-MM
        const now = new Date()
        const yyyyMm = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
        setMonth(yyyyMm)
    }, [open, technician?.id])

    const loadAvailability = useCallback(async (yyyyMm: string) => {
        if (!technician) return
        setLoadingAvailability(true)
        try {
            const res = await axios.get(`/api/technicians/${technician.id}/availability/month`, { params: { month: yyyyMm } })
            setMonthDays(res.data.days || [])
        } catch (e) {
            setMonthDays([])
        } finally {
            setLoadingAvailability(false)
        }
    }, [technician?.id])

    useEffect(() => {
        if (!open || !technician || !month) return
        loadAvailability(month)
    }, [open, technician?.id, month, loadAvailability])

    const nextMonth = () => {
        const [y, m] = month.split('-').map(n => parseInt(n, 10))
        const d = new Date(y, m - 1, 1)
        d.setMonth(d.getMonth() + 1)
        setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
    }
    const prevMonth = () => {
        const [y, m] = month.split('-').map(n => parseInt(n, 10))
        const d = new Date(y, m - 1, 1)
        d.setMonth(d.getMonth() - 1)
        setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
    }

    const monthLabel = useMemo(() => {
        if (!month) return ''
        const [y, m] = month.split('-').map(n => parseInt(n, 10))
        const d = new Date(y, m - 1, 1)
        return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    }, [month])

    const monthCells = useMemo(() => {
        if (!month) return [] as Array<{ key: string; label: string; status?: 'available'|'unavailable'; muted?: boolean }>
        const [y, m] = month.split('-').map(n => parseInt(n, 10))
        const first = new Date(y, m - 1, 1)
        const startWeekday = (first.getDay() + 6) % 7 // make Monday=0
        const daysInMonth = new Date(y, m, 0).getDate()
        const cells: Array<{ key: string; label: string; status?: 'available'|'unavailable'; muted?: boolean; disabled?: boolean }> = []
        // leading blanks for the first week
        for (let i = 0; i < startWeekday; i++) {
            cells.push({ key: `blank-${i}`, label: '', muted: true })
        }
        // actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const iso = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const record = monthDays.find(d => d.date === iso)
            const today = new Date()
            const isoToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
            const isPast = iso < isoToday
            cells.push({ key: iso, label: String(day), status: record?.status || 'available', disabled: isPast })
        }
        // trailing blanks to complete grid rows (optional)
        const remainder = cells.length % 7
        if (remainder !== 0) {
            for (let i = 0; i < 7 - remainder; i++) {
                cells.push({ key: `blank-tail-${i}`, label: '', muted: true })
            }
        }
        return cells
    }, [month, monthDays])

    if (!technician) return null

    const handleMessage = async () => {
        try {
            const response = await axios.post('/api/conversations', { technician_id: technician.id })
            onOpenChange(false)
            // Redirect to messages with the conversation ID to auto-select it
            router.visit(`/messages?conversation=${response.data.id}`, {
                preserveScroll: false
            })
        } catch (error) {
            console.error('Error creating conversation:', error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Technician Profile</DialogTitle>
                    <DialogDescription>
                        View technician's details and credentials
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Picture and Basic Info */}
                    <div className="flex gap-6">
                        <div className="h-32 w-32 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                            {technician.avatar_path ? (
                                <img src={`/storage/${technician.avatar_path}`} alt={technician.name} className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-4xl">👤</span>
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold">{technician.name}</h2>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{technician.address || 'Address not provided'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{technician.email}</span>
                                </div>
                            </div>
                            
                            {/* Star Rating */}
                            <div className="flex items-center gap-1 mt-3">
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        className={`h-5 w-5 ${
                                            i < Math.round(rating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'fill-none text-neutral-300'
                                        }`}
                                    />
                                ))}
                                {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">({rating.toFixed(1)})</span>}
                            </div>
                        </div>
                    </div>

                    {/* Availability */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold">Availability</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAvailability(!showAvailability)}
                            >
                                {showAvailability ? 'Hide Calendar' : 'Show Calendar'}
                            </Button>
                        </div>
                        {showAvailability && (
                            <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Previous month">
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="text-sm font-medium">{monthLabel}</div>
                                    <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Next month">
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                {loadingAvailability ? (
                                    <div className="text-sm text-muted-foreground">Loading availability…</div>
                                ) : (
                                    <div className="grid grid-cols-7 gap-2">
                                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                                            <div key={d} className="text-center text-[11px] text-muted-foreground">{d}</div>
                                        ))}
                                        {monthCells.map(cell => {
                                            if (cell.muted) return <div key={cell.key} />
                                            const isAvailable = cell.status === 'available'
                                            const today = new Date()
                                            const isoToday = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
                                            const isToday = cell.key === isoToday
                                            return (
                                                <div key={cell.key} className={`rounded border p-2 text-center text-xs ${cell.disabled ? 'bg-neutral-50 text-neutral-400' : isAvailable ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'} ${isToday ? 'ring-2 ring-blue-400' : ''}`}>
                                                    <div className="font-medium">{cell.label}</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                                {technician.availability_notes && (
                                    <div className="mt-3 text-xs text-muted-foreground">{technician.availability_notes}</div>
                                )}
                            </div>
                        )}
                        {!showAvailability && (
                            <p className="text-sm text-muted-foreground">
                                {technician.availability_notes || 'Click "Show Calendar" to view available dates'}
                            </p>
                        )}
                    </div>

                    {/* Pricing Tiers */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold">Service Pricing</h3>
                            </div>
                            {availableTiers.length > 0 && (
                                <Select
                                    value={computedSelectedTier}
                                    onValueChange={(value) => setSelectedPricingTier(value as PricingTier)}
                                >
                                    <SelectTrigger className="w-48">
                                        <SelectValue placeholder="Select rate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTiers.map((tier) => (
                                            <SelectItem key={tier.value} value={tier.value}>
                                                {tier.label} - ₱{tier.rate.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        
                        {currentTier ? (
                            <div className={`border-l-4 pl-3 py-3 rounded ${
                                currentTier.value === 'normal' 
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                                    : currentTier.value === 'standard'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                    : currentTier.value === 'advanced'
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                                    : 'border-neutral-400 bg-neutral-50 dark:bg-neutral-900'
                            }`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm mb-1">{currentTier.label}</p>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            <span className="font-semibold">₱{currentTier.rate.toFixed(2)}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {currentTier.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">Pricing available upon consultation</p>
                        )}
                    </div>

                    {/* Component Pricing */}
                    {technician.components && technician.components.length > 0 && (
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <DollarSign className="h-5 w-5 text-muted-foreground" />
                                <h3 className="font-semibold">Component Pricing</h3>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {technician.components.map((component) => (
                                    <div key={component.id} className="flex items-center justify-between p-2 border rounded hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{component.component_name}</p>
                                            {component.description && (
                                                <p className="text-xs text-muted-foreground truncate">{component.description}</p>
                                            )}
                                            {component.compatibility && (
                                                <p className="text-xs text-muted-foreground">Compatible: {component.compatibility}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <p className="text-sm font-semibold whitespace-nowrap">₱{component.price.toFixed(2)}</p>
                                            {!component.in_stock && (
                                                <span className="text-xs text-red-500">Out of stock</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Specialization */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">Specialization</h3>
                        </div>
                        <p className="text-sm">{technician.expertise || 'Not specified'}</p>
                        {technician.services && (
                            <div className="mt-2">
                                <p className="text-sm font-medium mb-1">Services:</p>
                                <p className="text-sm text-muted-foreground">{technician.services}</p>
                            </div>
                        )}
                    </div>

                    {/* License and Certificates */}
                    <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">License and Certificates</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {technician.license_image_path ? (
                                <div>
                                    <p className="text-sm font-medium mb-2">License</p>
                                    <img
                                        src={`/storage/${technician.license_image_path}`}
                                        alt="License"
                                        className="w-full rounded border"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium mb-2">License</p>
                                    <div className="w-full h-32 rounded border bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm text-muted-foreground">
                                        Not uploaded
                                    </div>
                                </div>
                            )}
                            {technician.certificates_image_path ? (
                                <div>
                                    <p className="text-sm font-medium mb-2">Certificates</p>
                                    <img
                                        src={`/storage/${technician.certificates_image_path}`}
                                        alt="Certificates"
                                        className="w-full rounded border"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm font-medium mb-2">Certificates</p>
                                    <div className="w-full h-32 rounded border bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-sm text-muted-foreground">
                                        Not uploaded
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Rating & Review */}
                    <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">Rate this technician</h3>
                        <div className="flex items-center gap-2">
                            {[...Array(5)].map((_, i) => {
                                const index = i + 1
                                const filled = (hoverRating ?? myRating) >= index
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        className="p-0.5"
                                        onMouseEnter={() => setHoverRating(index)}
                                        onMouseLeave={() => setHoverRating(null)}
                                        onClick={() => setMyRating(index)}
                                        aria-label={`Rate ${index} star${index>1?'s':''}`}
                                    >
                                        <Star className={`h-6 w-6 ${filled ? 'fill-yellow-400 text-yellow-400' : 'fill-none text-neutral-300'}`} />
                                    </button>
                                )
                            })}
                            <span className="text-sm text-muted-foreground ml-2">{myRating}/5</span>
                        </div>
                        <div className="mt-3">
                            <textarea
                                value={myComment}
                                onChange={(e) => setMyComment(e.target.value)}
                                placeholder="Write a short review (optional)"
                                className="w-full rounded-md border bg-background p-2 text-sm min-h-[80px]"
                            />
                        </div>
                        <div className="mt-3 flex justify-end">
                            <Button
                                disabled={savingReview || myRating === 0}
                                onClick={async () => {
                                    if (myRating === 0) return
                                    try {
                                        setSavingReview(true)
                                        await axios.post(`/api/technicians/${technician.id}/reviews`, { rating: myRating, comment: myComment || undefined })
                                        // Optionally show a toast; for now, simple alert
                                        alert('Review saved')
                                    } catch (e) {
                                        alert('Failed to save review')
                                    } finally {
                                        setSavingReview(false)
                                    }
                                }}
                            >
                                {savingReview ? 'Saving…' : 'Submit Review'}
                            </Button>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                        <Button onClick={handleMessage}>
                            Message for Booking
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

