import AdminLayout from '@/layouts/admin-layout'
import axios from '@/axios-config'
import { useCallback, useEffect, useState } from 'react'
import { Head } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { type BreadcrumbItem } from '@/types'
import { 
    CheckCircle, 
    XCircle, 
    FileText, 
    Search, 
    Eye, 
    Trash2,
    AlertCircle
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin',
    },
    {
        title: 'Technicians',
        href: '/admin/technicians',
    },
]

interface Technician {
    id: number
    name: string
    first_name: string
    last_name: string
    email: string
    phone?: string | null
    address?: string | null
    expertise?: string | null
    is_verified: boolean
    license_image_path?: string | null
    certificates_image_path?: string | null
    has_credentials: boolean
    created_at: string
}

export default function AdminTechniciansPage() {
    const [technicians, setTechnicians] = useState<Technician[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterVerified, setFilterVerified] = useState<string>('all')
    const [filterCredentials, setFilterCredentials] = useState<string>('all')
    const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    const loadTechnicians = useCallback(async () => {
        try {
            setLoading(true)
            const params: Record<string, unknown> = {}
            
            if (filterVerified !== 'all') {
                params.is_verified = filterVerified === 'verified'
            }
            
            if (filterCredentials !== 'all') {
                params.has_credentials = filterCredentials === 'has'
            }

            if (searchQuery) {
                params.search = searchQuery
            }

            const response = await axios.get('/api/admin/technicians', { params })
            setTechnicians(response.data.data || response.data)
        } catch (error) {
            console.error('Error loading technicians:', error)
            setTechnicians([])
        } finally {
            setLoading(false)
        }
    }, [filterVerified, filterCredentials, searchQuery])

    useEffect(() => {
        loadTechnicians()
    }, [loadTechnicians])

    const handleVerify = async (technicianId: number, verify: boolean) => {
        try {
            await axios.patch(`/api/admin/technicians/${technicianId}/verification`, {
                is_verified: verify,
            })
            loadTechnicians()
            if (selectedTechnician?.id === technicianId) {
                setSelectedTechnician({ ...selectedTechnician, is_verified: verify })
            }
        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: { message?: string } } }
            const status = err.response?.status
            const message = err.response?.data?.message || 'Failed to update verification status'
            console.error('Error updating verification:', error)
            alert(`Verify failed (${status ?? 'unknown'}): ${message}`)
        }
    }

    const handleDelete = async () => {
        if (!deletingId) return

        try {
            await axios.delete(`/api/admin/technicians/${deletingId}`)
            loadTechnicians()
            setShowDeleteConfirm(false)
            setDeletingId(null)
            if (selectedTechnician?.id === deletingId) {
                setShowDetailsModal(false)
            }
        } catch (error: unknown) {
            const err = error as { response?: { status?: number; data?: { message?: string } } }
            const status = err.response?.status
            const message = err.response?.data?.message || 'Failed to delete technician'
            console.error('Error deleting technician:', error)
            alert(`Disable failed (${status ?? 'unknown'}): ${message}`)
        }
    }

    const getFileUrl = (path: string | null) => {
        if (!path) return null
        return `/storage/${path}`
    }

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Technicians - Admin" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Technicians Management</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage and verify technician accounts
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <Card className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterVerified} onValueChange={setFilterVerified}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Verification Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="unverified">Unverified</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCredentials} onValueChange={setFilterCredentials}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Credentials" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="has">Has Credentials</SelectItem>
                                <SelectItem value="missing">Missing Credentials</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </Card>

                {/* Technicians List */}
                {loading ? (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">Loading technicians...</p>
                    </Card>
                ) : technicians.length === 0 ? (
                    <Card className="p-8 text-center">
                        <p className="text-muted-foreground">No technicians found</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {technicians.map((technician) => (
                            <Card key={technician.id} className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold">{technician.name}</h3>
                                            {technician.is_verified ? (
                                                <Badge variant="default" className="gap-1">
                                                    <CheckCircle className="h-3 w-3" />
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="gap-1">
                                                    <XCircle className="h-3 w-3" />
                                                    Unverified
                                                </Badge>
                                            )}
                                            {!technician.has_credentials && (
                                                <Badge variant="destructive" className="gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Missing Credentials
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                                            <div>
                                                <p className="text-muted-foreground">Email</p>
                                                <p className="font-medium">{technician.email}</p>
                                            </div>
                                            {technician.phone && (
                                                <div>
                                                    <p className="text-muted-foreground">Phone</p>
                                                    <p className="font-medium">{technician.phone}</p>
                                                </div>
                                            )}
                                            {technician.expertise && (
                                                <div>
                                                    <p className="text-muted-foreground">Expertise</p>
                                                    <p className="font-medium">{technician.expertise}</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-muted-foreground">Joined</p>
                                                <p className="font-medium">
                                                    {new Date(technician.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-3">
                                            {technician.license_image_path && (
                                                <Badge variant="outline" className="gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    License
                                                </Badge>
                                            )}
                                            {technician.certificates_image_path && (
                                                <Badge variant="outline" className="gap-1">
                                                    <FileText className="h-3 w-3" />
                                                    Certificates
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <div className="ml-4 flex flex-col gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setSelectedTechnician(technician)
                                                setShowDetailsModal(true)
                                            }}
                                            className="gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View Details
                                        </Button>
                                        {technician.is_verified ? (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleVerify(technician.id, false)}
                                            >
                                                Unverify
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleVerify(technician.id, true)}
                                                disabled={!technician.has_credentials}
                                            >
                                                Verify
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => {
                                                setDeletingId(technician.id)
                                                setShowDeleteConfirm(true)
                                            }}
                                            className="gap-2"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Disable
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Details Modal */}
                <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Technician Details</DialogTitle>
                            <DialogDescription>
                                View technician information and credentials
                            </DialogDescription>
                        </DialogHeader>
                        {selectedTechnician && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Personal Information</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Name</p>
                                            <p className="font-medium">{selectedTechnician.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Email</p>
                                            <p className="font-medium">{selectedTechnician.email}</p>
                                        </div>
                                        {selectedTechnician.phone && (
                                            <div>
                                                <p className="text-muted-foreground">Phone</p>
                                                <p className="font-medium">{selectedTechnician.phone}</p>
                                            </div>
                                        )}
                                        {selectedTechnician.address && (
                                            <div>
                                                <p className="text-muted-foreground">Address</p>
                                                <p className="font-medium">{selectedTechnician.address}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedTechnician.expertise && (
                                    <div>
                                        <h3 className="font-semibold mb-2">Expertise</h3>
                                        <p className="text-sm">{selectedTechnician.expertise}</p>
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-semibold mb-2">Verification Status</h3>
                                    <div className="flex items-center gap-2">
                                        {selectedTechnician.is_verified ? (
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Verified
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="gap-1">
                                                <XCircle className="h-3 w-3" />
                                                Unverified
                                            </Badge>
                                        )}
                                        {selectedTechnician.has_credentials ? (
                                            <Badge variant="outline" className="gap-1">
                                                <FileText className="h-3 w-3" />
                                                Has Credentials
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive" className="gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Missing Credentials
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Credentials</h3>
                                    <div className="space-y-2">
                                        {selectedTechnician.license_image_path ? (
                                            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Professional License</span>
                                                    <a
                                                        href={getFileUrl(selectedTechnician.license_image_path)!}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-primary hover:underline"
                                                    >
                                                        View License
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                                <p className="text-sm text-muted-foreground">License not uploaded</p>
                                            </div>
                                        )}
                                        {selectedTechnician.certificates_image_path ? (
                                            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium">Certificates</span>
                                                    <a
                                                        href={getFileUrl(selectedTechnician.certificates_image_path)!}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-primary hover:underline"
                                                    >
                                                        View Certificates
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                                <p className="text-sm text-muted-foreground">Certificates not uploaded</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4 border-t">
                                    {selectedTechnician.is_verified ? (
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                handleVerify(selectedTechnician.id, false)
                                                setShowDetailsModal(false)
                                            }}
                                            className="flex-1"
                                        >
                                            Unverify
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => {
                                                handleVerify(selectedTechnician.id, true)
                                                setShowDetailsModal(false)
                                            }}
                                            disabled={!selectedTechnician.has_credentials}
                                            className="flex-1"
                                        >
                                            Verify Technician
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDetailsModal(false)}
                                        className="flex-1"
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Disable Technician</DialogTitle>
                            <DialogDescription>
                                This will unverify the technician and remove their visibility from customers. 
                                This action can be reversed by verifying them again.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-2 pt-4">
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                className="flex-1"
                            >
                                Disable
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeleteConfirm(false)
                                    setDeletingId(null)
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AdminLayout>
    )
}
