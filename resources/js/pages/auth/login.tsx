import AuthLayout from '@/layouts/auth-layout'
import { AuthNavbar } from '@/components/auth-navbar'
import { Head, Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import axios from '@/axios-config'
import { router } from '@inertiajs/react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)
        try {
            // Try customer first, then technician, then admin
            try {
                const customerResponse = await axios.post('/auth/customer/login', { email, password })
                if (customerResponse.status === 200) {
                    // Update CSRF token from response header (check both cases)
                    const newToken = customerResponse.headers['x-csrf-token'] || customerResponse.headers['X-CSRF-TOKEN']
                    if (newToken) {
                        const meta = document.querySelector('meta[name="csrf-token"]')
                        if (meta) meta.setAttribute('content', newToken)
                        localStorage.setItem('csrf_token', newToken)
                    }
                    // Navigate directly - Inertia will sync auth state
                    router.visit('/dashboard', { preserveScroll: false })
                    return
                }
            } catch (customerErr: unknown) {
                // Check if it's a 419 CSRF error that was retried
                const customerError = customerErr as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }; config?: { _retry?: boolean } }
                if (customerError?.response?.status === 419 && customerError?.config?._retry) {
                    // CSRF retry failed, show error
                    setError('CSRF token expired. Please try again.')
                    setLoading(false)
                    return
                }
                // Try technician
                try {
                    const techResponse = await axios.post('/auth/technician/login', { email, password })
                    if (techResponse.status === 200) {
                        const newToken = techResponse.headers['x-csrf-token'] || techResponse.headers['X-CSRF-TOKEN']
                        if (newToken) {
                            const meta = document.querySelector('meta[name="csrf-token"]')
                            if (meta) meta.setAttribute('content', newToken)
                            localStorage.setItem('csrf_token', newToken)
                        }
                        router.visit('/dashboard', { preserveScroll: false })
                        return
                    }
                } catch (technicianErr: unknown) {
                    const technicianError = technicianErr as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }; config?: { _retry?: boolean } }
                    if (technicianError?.response?.status === 419 && technicianError?.config?._retry) {
                        setError('CSRF token expired. Please try again.')
                        setLoading(false)
                        return
                    }
                    // Try admin
                    try {
                        const adminResponse = await axios.post('/auth/admin/login', { email, password })
                        if (adminResponse.status === 200) {
                            const newToken = adminResponse.headers['x-csrf-token'] || adminResponse.headers['X-CSRF-TOKEN']
                            if (newToken) {
                                const meta = document.querySelector('meta[name="csrf-token"]')
                                if (meta) meta.setAttribute('content', newToken)
                                localStorage.setItem('csrf_token', newToken)
                            }
                            router.visit('/admin', { preserveScroll: false })
                            return
                        }
                    } catch (adminErr: unknown) {
                        const adminError = adminErr as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }; config?: { _retry?: boolean } }
                        if (adminError?.response?.status === 419 && adminError?.config?._retry) {
                            setError('CSRF token expired. Please try again.')
                            setLoading(false)
                            return
                        }
                        // All failed - show appropriate error
                        const errors = adminError?.response?.data?.errors || technicianError?.response?.data?.errors || customerError?.response?.data?.errors
                        if (errors) {
                            const firstError = Object.values(errors)[0] as string[]
                            setError(firstError?.[0] || 'Validation failed')
                        } else {
                            const errorMsg = adminError?.response?.data?.message || technicianError?.response?.data?.message || customerError?.response?.data?.message || 'Invalid email or password'
                            setError(errorMsg)
                        }
                        setLoading(false)
                        return
                    }
                }
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } }
            setError(error?.response?.data?.message || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <AuthNavbar />
            <AuthLayout
                title="Log in"
                description="Sign in to your account"
                sideImageSrc="/images/chooserolepic.jpg"
            >
                    <Head title="Log in" />
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                autoFocus
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                disabled={loading}
                            />
                        </div>
                        {error && (
                            <div className="text-sm text-red-600">{error}</div>
                        )}
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Logging in...' : 'Log in'}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link href="/auth/select-role?next=register" className="text-primary hover:underline">
                                Register
                            </Link>
                        </div>
                    </form>
                </AuthLayout>
        </>
    )
}
