import AuthLayout from '@/layouts/auth-layout'
import { AuthNavbar } from '@/components/auth-navbar'
import { Head, Link, useForm } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEffect } from 'react'

export default function LoginPage() {
    // 2. Setup the useForm hook
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
    });

    // Automatically reset password field on error
    useEffect(() => {
        return () => {
            reset('password');
        };
    }, [reset]);

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // 3. Use the 'post' function from the hook
        // This will automatically follow the redirect from your
        // Laravel controller and perform a FULL page reload,
        // getting the new CSRF token.
        post('/auth/login/unified');
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
                            value={data.email} // Use data.email
                            onChange={(e) => setData('email', e.target.value)} // Use setData
                            placeholder="Email"
                            required
                            autoFocus
                            disabled={processing} // Use processing
                        />
                        {/* 4. Automatically show validation errors */}
                        {errors.email && (
                            <div className="text-sm text-red-600 dark:text-red-400">{errors.email}</div>
                        )}
                    </div>
                    <div>
                        <Input
                            type="password"
                            value={data.password} // Use data.password
                            onChange={(e) => setData('password', e.target.value)} // Use setData
                            placeholder="Password"
                            required
                            disabled={processing} // Use processing
                        />
                        {errors.password && (
                             <div className="text-sm text-red-600 dark:text-red-400">{errors.password}</div>
                        )}
                    </div>
                    
                    {/* Handle general auth failed error */}
                    {errors.email && !errors.password && (
                        <div className="text-sm text-red-600 dark:text-red-400">{errors.email}</div>
                    )}

                    <Button type="submit" className="w-full bg-black hover:bg-black/90 text-white border border-black dark:border-white/20" disabled={processing}>
                        {processing ? 'Logging in...' : 'Log in'}
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