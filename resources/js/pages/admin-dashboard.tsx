import AdminLayout from '@/layouts/admin-layout'
import { dashboard } from '@/routes'
import { type BreadcrumbItem } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Users, FileText, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import axios from '@/axios-config'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
]

export default function AdminDashboard() {
    const [stats, setStats] = useState<{ total_users: number; total_technicians: number; total_customers: number; pending_service_requests: number } | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const r = await axios.get('/api/admin/stats')
                setStats(r.data)
            } catch {
                setStats(null)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])
    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-4xl font-bold">Admin Dashboard</h1>
                    <p className="text-lg text-muted-foreground mt-2">Manage the FixIt platform</p>
                </div>

                {/* Quick Stats Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                                <p className="text-2xl font-bold">{loading || !stats ? '—' : stats.total_users}</p>
                                <p className="text-xs text-muted-foreground mt-1">Admins, Technicians, and Customers</p>
                            </div>
                            <Users className="h-10 w-10 text-primary" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Technicians</p>
                                <p className="text-2xl font-bold">{loading || !stats ? '—' : stats.total_technicians}</p>
                                <p className="text-xs text-muted-foreground mt-1">Verified and unverified</p>
                            </div>
                            <Users className="h-10 w-10 text-blue-500" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Customers</p>
                                <p className="text-2xl font-bold">{loading || !stats ? '—' : stats.total_customers}</p>
                                <p className="text-xs text-muted-foreground mt-1">Registered customers</p>
                            </div>
                            <Users className="h-10 w-10 text-green-600" />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Service Requests</p>
                                <p className="text-2xl font-bold">{loading || !stats ? '—' : stats.pending_service_requests}</p>
                                <p className="text-xs text-muted-foreground mt-1">Awaiting technician action</p>
                            </div>
                            <FileText className="h-10 w-10 text-yellow-600" />
                        </div>
                        <Link href="/admin/service-requests?status=pending" className="mt-4 inline-block">
                            <Button variant="outline" className="w-full">View Pending</Button>
                        </Link>
                    </Card>
                </div>

                {/* Management Sections */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-6 w-6 text-primary" />
                            <h3 className="text-lg font-semibold">Technician Management</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            View all technicians, verify credentials, and manage their accounts. 
                            Review uploaded licenses and certificates.
                        </p>
                        <Link href="/admin/technicians">
                            <Button className="w-full">Go to Technicians</Button>
                        </Link>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <FileText className="h-6 w-6 text-yellow-500" />
                            <h3 className="text-lg font-semibold">Review & Moderation</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Moderate reviews and ratings, view system logs, and monitor platform activity.
                        </p>
                        <div className="flex gap-2">
                            <Link href="/admin/reviews" className="flex-1">
                                <Button variant="outline" className="w-full">Reviews</Button>
                            </Link>
                            <Link href="/admin/logs" className="flex-1">
                                <Button variant="outline" className="w-full">Logs</Button>
                            </Link>
                        </div>
                    </Card>
                </div>

                {/* Info Card */}
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                                Verification Process
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Technicians must upload both a license and certificates before they can be verified. 
                                Once verified, their profile becomes visible to customers. You can unverify technicians 
                                at any time if needed.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </AdminLayout>
    )
}

