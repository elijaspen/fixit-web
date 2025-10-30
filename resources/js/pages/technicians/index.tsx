//
import { AppContent } from '@/components/app-content'
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout'
import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { router } from '@inertiajs/react'

interface TechnicianListItem { id: number; name: string; expertise?: string | null }

export default function TechniciansBrowsePage() {
    const [techs, setTechs] = useState<TechnicianListItem[]>([])
    useEffect(() => {
        // Placeholder: list all technicians via API (to be added later). Using /api/technician/me as stub if logged in.
        axios.get('/api/technician/me').then(r => setTechs(r.data ? [r.data] : [])).catch(()=>setTechs([]))
    }, [])

    const onMessage = async (technicianId: number) => {
        await axios.post('/api/conversations', { technician_id: technicianId })
        router.visit(`/messages`, { replace: false })
    }

    return (
        <AppSidebarLayout breadcrumbs={[{ title: 'Technicians', href: '/technicians' }]}>
            <AppContent>
                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
                    {techs.map(t => (
                        <div key={t.id} className="rounded border p-4">
                            <div className="text-lg font-semibold">{t.name}</div>
                            <div className="text-sm text-neutral-500">{t.expertise || 'Technician'}</div>
                            <div className="mt-3 flex gap-2">
                                <Button onClick={() => onMessage(t.id)}>Message</Button>
                                <Button variant="outline" onClick={() => router.visit('/booking')}>Book</Button>
                            </div>
                        </div>
                    ))}
                    {techs.length===0 && <div className="text-neutral-500">No technicians yet.</div>}
                </div>
            </AppContent>
        </AppSidebarLayout>
    )
}


