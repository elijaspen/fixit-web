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
            const res = await axios.post('/auth/login/unified', { email, password })
            // If admin, go to admin index; else dashboard
            const role = (res.data?.role as string | undefined) || null
            if (role === 'admin') {
                router.visit('/admin', { preserveScroll: false })
            } else {
                router.visit('/dashboard', { preserveScroll: false })
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
                            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
                        )}
                        <Button type="submit" className="w-full bg-black hover:bg-black/90 text-white border border-black dark:border-white/20" disabled={loading}>
                            {loading ? 'Logging in...' : 'Log in'}
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link href="/auth/select-role?next=register" className="text-foreground hover:underline font-medium">
                                Register
                            </Link>
                        </div>
                    </form>
                </AuthLayout>
        </>
    )
}
