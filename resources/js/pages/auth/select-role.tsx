import AuthLayout from '@/layouts/auth-layout'
import { AuthNavbar } from '@/components/auth-navbar'
import { Head, Link } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { register } from '@/routes'

export default function SelectRole() {
    const roles: Array<{
        key: 'customer' | 'technician'
        title: string
        description: string
    }> = [
        {
            key: 'customer',
            title: 'Customer',
            description: 'Find help for device issues and manage your tickets.',
        },
        {
            key: 'technician',
            title: 'Technician',
            description: 'Offer repairs and track assigned jobs efficiently.',
        },
    ]

    const nextHref = (role: 'customer' | 'technician') => {
        return register({ query: { role } })
    }

    return (
        <>
            <AuthNavbar />
            <AuthLayout
                title="Sign up as"
                description="Choose your role to create an account"
                sideImageSrc="/images/chooserolepic.jpg"
            >
                    <Head title="Select role" />

                    <div className="grid gap-4 sm:grid-cols-2">
                        {roles.map((r) => (
                            <Link
                                key={r.key}
                                href={nextHref(r.key)}
                                className="group block h-full"
                            >
                                <Card className="h-full cursor-pointer border-muted-foreground/20 p-5 transition-colors hover:border-primary">
                                    <div className="flex h-full flex-col">
                                        <div>
                                            <div className="mb-2 text-base font-semibold">{r.title}</div>
                                            <div className="text-sm text-muted-foreground">{r.description}</div>
                                        </div>
                                        <Button className="mt-auto bg-black hover:bg-black/90 text-white border border-black dark:border-white/20" variant="default">
                                            Continue
                                        </Button>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </AuthLayout>
        </>
    )
}
