import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { router, usePage } from '@inertiajs/react'
import axios from '@/axios-config'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface TechnicianCardProps {
    technician: {
        id: number
        name: string
        expertise?: string | null
        address?: string | null
        base_pricing?: number | null
        avatar_path?: string | null
    }
    rating?: number
    ratingCount?: number
    onViewProfile: (technicianId: number) => void
}

export function TechnicianCard({ technician, rating = 0, ratingCount = 0, onViewProfile }: TechnicianCardProps) {
    const page = usePage()
    const handleMessage = async () => {
        try {
            // Get CSRF token from Inertia props (most reliable) or meta tag
            const csrfToken = (page.props as { csrf?: string })?.csrf || 
                             document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
                             localStorage.getItem('csrf_token')
            
            // Update meta tag and localStorage if we got it from props
            if (csrfToken && (page.props as { csrf?: string })?.csrf) {
                const meta = document.querySelector('meta[name="csrf-token"]')
                if (meta) {
                    meta.setAttribute('content', csrfToken)
                }
                localStorage.setItem('csrf_token', csrfToken)
            }
            
            // Axios interceptor should handle CSRF, but we'll also explicitly set it
            const response = await axios.post('/api/conversations', { technician_id: technician.id }, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken || ''
                }
            })
            // Redirect to messages with the conversation ID to auto-select it
            router.visit(`/messages?conversation=${response.data.id}`, { 
                preserveScroll: false 
            })
        } catch (error) {
            console.error('Error creating conversation:', error)
            const err = error as { response?: { status?: number; data?: { message?: string } } }
            if (err.response?.status === 419) {
                // Try to get fresh token from Inertia props or meta tag and retry once
                const freshToken = (page.props as { csrf?: string })?.csrf || 
                                  document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
                if (freshToken) {
                    try {
                        // Update meta and localStorage
                        const meta = document.querySelector('meta[name="csrf-token"]')
                        if (meta) {
                            meta.setAttribute('content', freshToken)
                        }
                        localStorage.setItem('csrf_token', freshToken)
                        
                        const retryResponse = await axios.post('/api/conversations', { technician_id: technician.id }, {
                            headers: {
                                'X-CSRF-TOKEN': freshToken
                            }
                        })
                        router.visit(`/messages?conversation=${retryResponse.data.id}`, {
                            preserveScroll: false
                        })
                        return
                    } catch (retryErr) {
                        alert('Session expired. Please refresh the page and try again.')
                    }
                } else {
                    alert('Session expired. Please refresh the page and try again.')
                }
            } else {
                alert(err.response?.data?.message || 'Failed to create conversation. Please try again.')
            }
        }
    }

    return (
        <Card className="overflow-hidden">
            <div className="flex gap-4 p-4">
                {/* Technician picture */}
                <div className="h-20 w-20 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden ring-1 ring-neutral-300">
                    {technician.avatar_path ? (
                        <img src={`/storage/${technician.avatar_path}`} alt={technician.name} className="h-full w-full object-cover" />
                    ) : (
                        <span className="text-2xl">👤</span>
                    )}
                </div>
                
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div>
                        <h3 className="text-lg font-semibold">{technician.name}</h3>
                        <p className="text-sm text-muted-foreground">{technician.expertise || 'Technician'}</p>
                    </div>
                    
                    {/* Star Rating */}
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
                        {rating > 0 && <span className="ml-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>}
                        {ratingCount > 0 && <span className="ml-1 text-xs text-muted-foreground">• {ratingCount}</span>}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                        To view technician's availability, pricing and credentials.
                    </p>
                    
                    <div className="flex gap-2 mt-2">
                        <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onViewProfile(technician.id)}
                                    className="!bg-black !hover:bg-gray-800 !text-white !hover:text-white border-border dark:border-white/20 transition-colors"
                                >
                                    View Here
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="z-[100] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700">
                                View technician's profile, availability, and credentials
                            </TooltipContent>
                        </Tooltip>
                        <Button size="sm" onClick={handleMessage}>
                            Message
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}

