import { AuthNavbar } from '@/components/auth-navbar'
import AuthLayout from '@/layouts/auth-layout'
import { Head, Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import axios from '@/axios-config'
import { router } from '@inertiajs/react'

export default function CustomerRegisterPage() {
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [password_confirmation, setPasswordConfirmation] = useState('')
    const [address, setAddress] = useState('')
    const [error, setError] = useState<string | null>(null)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        try {
            await axios.post('/auth/customer/register', { 
                first_name: firstName, 
                last_name: lastName,
                email, 
                password, 
                password_confirmation,
                address
            })
            router.visit('/dashboard')
        } catch (error: unknown) {
            const err = error as { response?: { data?: { message?: string } } }
            setError(err.response?.data?.message || 'Register failed')
        }
    }

    return (
        <>
            <AuthNavbar />
            <AuthLayout
                title="Create Customer Account"
                description="Sign up as a customer to find technicians"
                sideImageSrc="/images/chooserolepic.jpg"
            >
                    <Head title="Customer Register" />
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Input value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First Name" required maxLength={100} />
                            </div>
                            <div>
                                <Input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last Name" required maxLength={100} />
                            </div>
                        </div>
                        <div>
                            <Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Address" required maxLength={100} />
                        </div>
                        <div>
                            <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required maxLength={100} />
                        </div>
                        <div>
                            <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
                        </div>
                        <div>
                            <Input type="password" value={password_confirmation} onChange={e=>setPasswordConfirmation(e.target.value)} placeholder="Confirm Password" required />
                        </div>
                        {error && <div className="text-sm text-red-600">{error}</div>}
                        <Button type="submit" className="w-full">Create Account</Button>
                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="text-primary hover:underline">
                                Log in
                            </Link>
                        </div>
                    </form>
                </AuthLayout>
        </>
    )
}


