import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { router } from '@inertiajs/react'
import axios from '@/axios-config'

interface TechnicianCardProps {
    technician: {
        id: number
        name: string
        expertise?: string | null
        address?: string | null
        base_pricing?: number | null
    }
    rating?: number // Will be implemented later
    onViewProfile: (technicianId: number) => void
}

export function TechnicianCard({ technician, rating = 0, onViewProfile }: TechnicianCardProps) {
    const handleMessage = async () => {
        try {
            const response = await axios.post('/api/conversations', { technician_id: technician.id })
            // Redirect to messages with the conversation ID to auto-select it
            router.visit(`/messages?conversation=${response.data.id}`, { 
                preserveScroll: false 
            })
        } catch (error) {
            console.error('Error creating conversation:', error)
        }
    }

    return (
        <Card className="overflow-hidden">
            <div className="flex gap-4 p-4">
                {/* Placeholder for technician picture */}
                <div className="h-20 w-20 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
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
                        {rating > 0 && <span className="ml-1 text-xs text-muted-foreground">({rating.toFixed(1)})</span>}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                        To view technician's availability, pricing and credentials.
                    </p>
                    
                    <div className="flex gap-2 mt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewProfile(technician.id)}
                        >
                            View Here
                        </Button>
                        <Button size="sm" onClick={handleMessage}>
                            Message
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    )
}

