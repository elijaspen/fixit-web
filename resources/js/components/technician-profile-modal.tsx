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
import { Star, Mail, MapPin, Calendar, DollarSign, Briefcase, FileText } from 'lucide-react'
import { useState } from 'react'
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
    const [selectedPricingTier, setSelectedPricingTier] = useState<PricingTier | null>(null)

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
                        <div className="h-32 w-32 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                            <span className="text-4xl">👤</span>
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
                                {/* Placeholder calendar - will be replaced with actual calendar component */}
                                <p className="text-sm text-muted-foreground mb-2">Available dates:</p>
                                <div className="text-sm">
                                    {technician.availability_notes || 'Check availability by messaging the technician'}
                                </div>
                                {/* TODO: Add calendar component here */}
                                <div className="mt-4 text-sm text-muted-foreground italic">
                                    Calendar component will be implemented here
                                </div>
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

                    {/* Rating Section */}
                    <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-4">Rating Section</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Efficiency</span>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${
                                                i < Math.round(rating * 0.9)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'fill-none text-neutral-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Speed</span>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${
                                                i < Math.round(rating * 0.8)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'fill-none text-neutral-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Accuracy</span>
                                <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${
                                                i < Math.round(rating)
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'fill-none text-neutral-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4 italic">
                            Note: Message the technician for booking
                        </p>
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

