import SettingsSidebarLayout from '@/layouts/settings/settings-sidebar-layout'
import { type BreadcrumbItem } from '@/types'
import { Head, usePage } from '@inertiajs/react'
import { useState } from 'react'
import axios from '@/axios-config'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import HeadingSmall from '@/components/heading-small'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings/profile',
    },
    {
        title: 'Credentials',
        href: '/settings/credentials',
    },
]

export default function Credentials() {
    const { auth } = usePage<{ auth: { role?: string; user?: { is_verified?: boolean; license_image_path?: string | null; certificates_image_path?: string | null } } }>().props
    const technician = auth.user
    const isTechnician = auth.role === 'technician'

    const [licenseFile, setLicenseFile] = useState<File | null>(null)
    const [certificatesFile, setCertificatesFile] = useState<File | null>(null)
    const [uploadingLicense, setUploadingLicense] = useState(false)
    const [uploadingCertificates, setUploadingCertificates] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [licensePath, setLicensePath] = useState<string | null>(technician?.license_image_path || null)
    const [certificatesPath, setCertificatesPath] = useState<string | null>(technician?.certificates_image_path || null)

    if (!isTechnician) {
        return (
            <SettingsSidebarLayout breadcrumbs={breadcrumbs}>
                <Head title="Credentials" />
                <div className="space-y-6">
                    <HeadingSmall
                        title="Credentials & Verification"
                        description="Only available for technicians"
                    />
                    <Card className="p-6">
                        <p className="text-muted-foreground">This section is only available for technicians.</p>
                    </Card>
                </div>
            </SettingsSidebarLayout>
        )
    }

    const handleLicenseUpload = async () => {
        if (!licenseFile) {
            setError('Please select a file first')
            return
        }

        setUploadingLicense(true)
        setError(null)
        setSuccess(null)

        try {
            const formData = new FormData()
            formData.append('license', licenseFile)

            const response = await axios.post('/api/technician/upload/license', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            setLicensePath(response.data.path)
            setSuccess('License uploaded successfully! It will be reviewed by an admin for verification.')
            setLicenseFile(null)
            
            // Refresh the page data
            window.location.reload()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            setError(err.response?.data?.message || 'Failed to upload license')
        } finally {
            setUploadingLicense(false)
        }
    }

    const handleCertificatesUpload = async () => {
        if (!certificatesFile) {
            setError('Please select a file first')
            return
        }

        setUploadingCertificates(true)
        setError(null)
        setSuccess(null)

        try {
            const formData = new FormData()
            formData.append('certificates', certificatesFile)

            const response = await axios.post('/api/technician/upload/certificates', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            setCertificatesPath(response.data.path)
            setSuccess('Certificates uploaded successfully! They will be reviewed by an admin for verification.')
            setCertificatesFile(null)
            
            // Refresh the page data
            window.location.reload()
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            setError(err.response?.data?.message || 'Failed to upload certificates')
        } finally {
            setUploadingCertificates(false)
        }
    }

    const getFileUrl = (path: string | null) => {
        if (!path) return null
        return `/storage/${path}`
    }

    const isVerified = technician?.is_verified === true

    return (
        <SettingsSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="Credentials & Verification" />

            <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <HeadingSmall
                            title="Credentials & Verification"
                            description="Upload your license and certificates for admin verification"
                        />
                        <Badge variant={isVerified ? 'default' : 'secondary'} className="gap-2">
                            {isVerified ? (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Verified
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-4 w-4" />
                                    Pending Verification
                                </>
                            )}
                        </Badge>
                    </div>

                    {error && (
                        <Card className="p-4 bg-destructive/10 border-destructive">
                            <p className="text-sm text-destructive">{error}</p>
                        </Card>
                    )}

                    {success && (
                        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                        </Card>
                    )}

                    {/* Verification Status Info */}
                    {!isVerified && (
                        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                            <div className="flex gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                        Verification Required
                                    </p>
                                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                        You need to upload your license and certificates to be verified by an admin. 
                                        Once verified, your profile will be visible to customers.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* License Upload */}
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">Professional License</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Upload a clear photo or scan of your professional license. 
                                Accepted formats: JPG, PNG, PDF (max 5MB)
                            </p>

                            {licensePath && (
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-medium">License uploaded</span>
                                        </div>
                                        <a
                                            href={getFileUrl(licensePath)!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            View License
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        id="license-upload"
                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                        onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    <label htmlFor="license-upload">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full gap-2"
                                            asChild
                                        >
                                            <span>
                                                <Upload className="h-4 w-4" />
                                                {licenseFile ? licenseFile.name : licensePath ? 'Replace License' : 'Select License File'}
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                                {licenseFile && (
                                    <Button
                                        onClick={handleLicenseUpload}
                                        disabled={uploadingLicense}
                                        className="gap-2"
                                    >
                                        {uploadingLicense ? 'Uploading...' : 'Upload'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Certificates Upload */}
                    <Card className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold">Certificates</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Upload your professional certificates or training documents. 
                                Accepted formats: JPG, PNG, PDF (max 5MB)
                            </p>

                            {certificatesPath && (
                                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-medium">Certificates uploaded</span>
                                        </div>
                                        <a
                                            href={getFileUrl(certificatesPath)!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            View Certificates
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        id="certificates-upload"
                                        accept="image/jpeg,image/jpg,image/png,application/pdf"
                                        onChange={(e) => setCertificatesFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                    <label htmlFor="certificates-upload">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full gap-2"
                                            asChild
                                        >
                                            <span>
                                                <Upload className="h-4 w-4" />
                                                {certificatesFile ? certificatesFile.name : certificatesPath ? 'Replace Certificates' : 'Select Certificates File'}
                                            </span>
                                        </Button>
                                    </label>
                                </div>
                                {certificatesFile && (
                                    <Button
                                        onClick={handleCertificatesUpload}
                                        disabled={uploadingCertificates}
                                        className="gap-2"
                                    >
                                        {uploadingCertificates ? 'Uploading...' : 'Upload'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Info Card */}
                    <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>Note:</strong> After uploading your documents, an admin will review them. 
                            Once verified, your technician profile will be visible to customers searching for services. 
                            This process may take 1-3 business days.
                        </p>
                    </Card>
                </div>
        </SettingsSidebarLayout>
    )
}

