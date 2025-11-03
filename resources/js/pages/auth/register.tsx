import { useForm, Head, usePage, router } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { AuthNavbar } from '@/components/auth-navbar'

export default function Register() {
    const page = usePage();
    const role = (() => {
        try {
            const url = new URL(page.url as string, window.location.origin);
            return url.searchParams.get('role') ?? undefined;
        } catch {
            return undefined;
        }
    })();
    const sideImageSrc = role === 'technician'
        ? '/images/technician-formpic.png'
        : role === 'customer'
            ? '/images/userformpic.png'
            : undefined;
    const { data, setData, processing, errors, post } = useForm({
        first_name: '',
        last_name: '',
        address: '',
        expertise: '',
        email: '',
        password: '',
        password_confirmation: ''
    });
    const action = role === 'technician' ? '/auth/technician/register' :
                  role === 'customer' ? '/auth/customer/register' : '/register';
    return (
        <>
            <AuthNavbar />
        <AuthLayout
            title="Create an account"
            description="Enter your details below to create your account"
            sideImageSrc={sideImageSrc}
        >
            <Head title="Register" />
                <form
                    onSubmit={e => {
                        e.preventDefault();
                        post(action, {
                            onSuccess: () => router.visit('/dashboard')
                        });
                    }}
                className="flex flex-col gap-6"
            >
                        {role && (
                            <input type="hidden" name="role" value={role} />
                        )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input id="first_name" type="text" name="first_name" required autoComplete="given-name" placeholder="First name" maxLength={100} tabIndex={1}
                                value={data.first_name}
                                onChange={e => setData('first_name', e.target.value)}
                            />
                            <InputError message={errors.first_name} className="mt-2" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input id="last_name" type="text" name="last_name" required autoComplete="family-name" placeholder="Last name" maxLength={100} tabIndex={2}
                                value={data.last_name}
                                onChange={e => setData('last_name', e.target.value)}
                            />
                            <InputError message={errors.last_name} className="mt-2" />
                        </div>
                    </div>
                            <div className="grid gap-2">
                        <Label htmlFor="address">Address</Label>
                        <Input id="address" type="text" name="address" required autoComplete="street-address" placeholder="Address" maxLength={100} tabIndex={3}
                            value={data.address}
                            onChange={e => setData('address', e.target.value)}
                        />
                        <InputError message={errors.address} className="mt-2" />
                    </div>
                    {role === 'technician' && (
                        <div className="grid gap-2">
                            <Label htmlFor="expertise">Specialization</Label>
                            <Input id="expertise" type="text" name="expertise" required placeholder="Specialization (e.g., Mobile Repair)" maxLength={100} tabIndex={4}
                                value={data.expertise}
                                onChange={e => setData('expertise', e.target.value)}
                                />
                            <InputError message={errors.expertise} className="mt-2" />
                            </div>
                    )}
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                        <Input id="email" type="email" name="email" required tabIndex={5} autoComplete="email" placeholder="email@example.com"
                            value={data.email}
                            onChange={e => setData('email', e.target.value)}
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" name="password" required tabIndex={6} autoComplete="new-password" placeholder="Password"
                            value={data.password}
                            onChange={e => setData('password', e.target.value)}
                                />
                                <InputError message={errors.password} />
                            </div>
                            <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm password</Label>
                        <Input id="password_confirmation" type="password" name="password_confirmation" required tabIndex={7} autoComplete="new-password" placeholder="Confirm password"
                            value={data.password_confirmation}
                            onChange={e => setData('password_confirmation', e.target.value)}
                                />
                        <InputError message={errors.password_confirmation} />
                            </div>
                            <Button
                                type="submit"
                                className="mt-2 w-full bg-black hover:bg-black/90 text-white border border-black dark:border-white/20"
                        tabIndex={8}
                                data-test="register-user-button"
                        disabled={processing}
                            >
                                {processing && <Spinner />}
                                Create account
                            </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                        <TextLink href={role === 'technician' ? '/auth/technician/login' : role === 'customer' ? '/auth/customer/login' : '/auth/login'} tabIndex={9} className="!text-foreground font-medium">
                                Log in
                            </TextLink>
                        </div>
                </form>
            </AuthLayout>
                    </>
    );
}
