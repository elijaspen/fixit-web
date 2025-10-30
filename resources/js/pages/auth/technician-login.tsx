import AppSidebarLayout from '@/layouts/app/app-sidebar-layout'
import { AppContent } from '@/components/app-content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import axios from '@/axios-config'
import { isAxiosError, type AxiosError } from 'axios'
import { router } from '@inertiajs/react'

type LaravelResponse = { message?: string; errors?: Record<string, string[] | string> }

function parseLaravelMessage(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined
    const obj = data as LaravelResponse
    if (obj.errors && typeof obj.errors === 'object') {
        const firstKey = Object.keys(obj.errors)[0]
        const v = obj.errors[firstKey]
        if (Array.isArray(v)) return v[0]
        if (typeof v === 'string') return v
    }
    if (typeof obj.message === 'string') return obj.message
    return undefined
}

// Type guard helper for Axios errors
function isAxiosErrorWithMessage(err: unknown): err is AxiosError<{ message: string }> {
    if (typeof err !== 'object' || err === null || !('isAxiosError' in err)) return false
    const axiosErr = err as AxiosError
    if (axiosErr.isAxiosError) {
        const data = axiosErr.response?.data
        return typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
    }
    return false
}

function extractFirstError(err: unknown): string {
    if (!isAxiosError(err) || !err.response) return 'Login failed'
    const res = err.response
    if (res.status === 419) return 'Session expired. Please refresh the page and try again.'
    if (res.status === 422) {
        const msg = parseLaravelMessage(res.data)
        if (msg) return msg
        return 'Validation failed'
    }
    const fallback = parseLaravelMessage(res.data)
    return fallback ?? 'Login failed'
}

export default function TechnicianLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        try {
            await axios.post('/auth/technician/login', { email, password })
            router.visit('/dashboard')
        } catch (err: unknown) {
            if (isAxiosErrorWithMessage(err)) {
                setError(extractFirstError(err))
            } else {
                setError('Login failed')
            }
        }
    }

    return (
        <AppSidebarLayout breadcrumbs={[{ title: 'Technician Login', href: '/auth/technician/login' }]}>
            <AppContent>
                <form onSubmit={onSubmit} className="mx-auto mt-10 w-full max-w-sm space-y-4 rounded border p-6">
                    <div className="text-lg font-semibold">Technician Login</div>
                    <div className="space-y-2">
                        <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required />
                        <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
                    </div>
                    {error.length > 0 && <div className="text-sm text-red-600">{error}</div>}
                    <Button type="submit" className="w-full">Login</Button>
                </form>
            </AppContent>
        </AppSidebarLayout>
    )
}


