import AppLayout from '@/layouts/app-layout'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { useEffect, useMemo, useState, useCallback } from 'react'
import axios from '@/axios-config'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TechnicianCard } from '@/components/technician-card'
import { TechnicianProfileModal } from '@/components/technician-profile-modal'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Star } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
]

interface Technician {
    id: number
    name: string
    email: string
    phone?: string | null
    address?: string | null
    latitude?: number | null
    longitude?: number | null
    expertise?: string | null
    services?: string | null
    base_pricing?: number | null
    standard_rate?: number | null
    professional_rate?: number | null
    premium_rate?: number | null
    availability_notes?: string | null
    license_image_path?: string | null
    certificates_image_path?: string | null
    created_at?: string
    // Added avatar_path based on modal's needs
    avatar_path?: string | null 
}

export default function CustomerDashboard() {
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [filteredTechnicians, setFilteredTechnicians] = useState<Technician[]>([])
    const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [ratings, setRatings] = useState<Record<number, { average: number; count: number }>>({})
    
    // --- NEW: State to hold rating permission ---
    const [canRateSelectedTechnician, setCanRateSelectedTechnician] = useState(false)

    useEffect(() => {
        loadTechnicians()
    }, [])

    const filterTechnicians = useCallback(() => {
        if (!searchQuery.trim()) {
            setFilteredTechnicians(technicians)
            return
        }

        const query = searchQuery.toLowerCase()
        const filtered = technicians.filter((tech) => {
            const matchesLocation = tech.address?.toLowerCase().includes(query)
            const matchesSpecialization = tech.expertise?.toLowerCase().includes(query)
            const matchesName = tech.name.toLowerCase().includes(query)
            // TODO: Add rating filter when ratings are implemented
            
            return matchesLocation || matchesSpecialization || matchesName
        })
        setFilteredTechnicians(filtered)
    }, [searchQuery, technicians])

    useEffect(() => {
        filterTechnicians()
    }, [searchQuery, technicians, filterTechnicians])

    const loadTechnicians = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/technicians')
            const technicianData = response.data || []
            setTechnicians(technicianData)
            setFilteredTechnicians(technicianData)
            
            // Fetch ratings summary in parallel
            const summaries = await Promise.all(technicianData.map(async (t: Technician) => {
                try {
                    const r = await axios.get(`/api/technicians/${t.id}/reviews/summary`)
                    return [t.id, { average: Number(r.data?.average || 0), count: Number(r.data?.count || 0) }] as const
                } catch {
                    return [t.id, { average: 0, count: 0 }] as const
                }
            }))
            const map: Record<number, { average: number; count: number }> = {}
            summaries.forEach(([id, s]) => { map[id] = s })
            setRatings(map)
        } catch (error) {
            console.error('Error loading technicians:', error)
            setTechnicians([])
            setFilteredTechnicians([])
            setRatings({})
        } finally {
            setLoading(false)
        }
    }

    // --- FIX: Updated function to check for rating permission ---
    const handleViewProfile = async (technicianId: number) => {
        try {
            // Reset permission state on every open
            setCanRateSelectedTechnician(false);

            // Fetch profile and permission concurrently
            const [profileRes, canRateRes] = await Promise.all([
                axios.get(`/api/technicians/${technicianId}`),
                axios.get(`/api/technicians/${technicianId}/can-rate`) // Calls the new endpoint
            ]);

            setSelectedTechnician(profileRes.data);
            setCanRateSelectedTechnician(canRateRes.data.canRate); // Set state (true/false)
            setIsProfileModalOpen(true);

        } catch (error) {
            console.error('Error loading technician profile or rating status:', error);
            // Fallback: If permission check fails (e.g., 403), just load profile
            try {
                 const profileRes = await axios.get(`/api/technicians/${technicianId}`);
                 setSelectedTechnician(profileRes.data);
                 setIsProfileModalOpen(true);
            } catch (e) {
                 console.error('Failed to load technician profile:', e);
            }
        }
    }

    // --- FIX: Correctly derive nearby and popular technicians ---

    // Nearby is just the first 6 results from the general filter
    const nearbyTechnicians = useMemo(() => {
        return filteredTechnicians.slice(0, 6)
    }, [filteredTechnicians])

    // Popular is sorted by rating and must have at least one rating
    const popularTechnicians = useMemo(() => {
        return filteredTechnicians
            // 1. Filter to only those with ratings
            .filter(tech => ratings[tech.id] && ratings[tech.id].count > 0)
            // 2. Sort by average rating (highest first)
            .sort((a, b) => (ratings[b.id]?.average || 0) - (ratings[a.id]?.average || 0))
            // 3. Take the top 6
            .slice(0, 6);
    }, [filteredTechnicians, ratings])
    
    // --- END FIX ---


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Hero Section */}
                <div className="space-y-4">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold">Welcome to FixIt</h1>
                        <p className="text-lg text-muted-foreground mt-2">
                            Search the best service providers to solve your device problems
                        </p>
                    </div>

                    {/* Search and Filter Bar */}
                    <Card className="p-4">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search for location, ratings, or specialization"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Nearby Suggestions Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <h2 className="text-2xl font-semibold">Nearby Suggestions</h2>
                        </div>
                        {nearbyTechnicians.length > 6 && (
                            <Button variant="ghost" size="sm">
                                View all
                            </Button>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-muted-foreground">Loading technicians...</div>
                    ) : nearbyTechnicians.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {nearbyTechnicians.map((technician) => (
                                <TechnicianCard
                                    key={technician.id}
                                    technician={technician}
                                    rating={ratings[technician.id]?.average || 0}
                                    ratingCount={ratings[technician.id]?.count || 0}
                                    onViewProfile={handleViewProfile}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 text-center">
                            <p className="text-muted-foreground">No technicians found for your search</p>
                        </Card>
                    )}
                </div>

                {/* Popular Ratings Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-primary fill-primary" />
                            <h2 className="text-2xl font-semibold">Popular Ratings</h2>
                        </div>
                        {popularTechnicians.length > 6 && (
                            <Button variant="ghost" size="sm">
                                View all
                            </Button>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-muted-foreground">Loading technicians...</div>
                    ) : popularTechnicians.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {popularTechnicians.map((technician) => (
                                <TechnicianCard
                                    key={technician.id}
                                    technician={technician}
                                    rating={ratings[technician.id]?.average || 0}
                                    ratingCount={ratings[technician.id]?.count || 0}
                                    onViewProfile={handleViewProfile}
                                />
                            ))}
                        </div>
                    ) : (
                        // FIX: Updated "No technicians" message
                        <Card className="p-8 text-center">
                            <p className="text-muted-foreground">No technicians with ratings found</p>
                        </Card>
                    )}
                </div>

                {/* Technician Profile Modal */}
                <TechnicianProfileModal
                    technician={selectedTechnician}
                    rating={selectedTechnician ? (ratings[selectedTechnician.id]?.average || 0) : 0}
                    open={isProfileModalOpen}
                    onOpenChange={setIsProfileModalOpen}
                    canRate={canRateSelectedTechnician}
                />
            </div>
        </AppLayout>
    )
}