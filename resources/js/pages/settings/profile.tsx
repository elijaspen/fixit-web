import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { send } from '@/routes/verification';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Form, Head, Link, usePage } from '@inertiajs/react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SettingsSidebarLayout from '@/layouts/settings/settings-sidebar-layout';
import { edit } from '@/routes/profile';
import axios from '@/axios-config'
import { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: '/settings/profile',
    },
    {
        title: 'Profile',
        href: edit().url,
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<SharedData>().props;
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [selectedName, setSelectedName] = useState<string>('')
    const user = auth.user as unknown as {
        first_name?: string;
        last_name?: string;
        address?: string;
        email: string;
        email_verified_at: string | null;
        avatar?: string | null;
        avatar_path?: string | null;
        name?: string | null;
    };

    return (
        <SettingsSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.avatar || (user.avatar_path ? `/storage/${user.avatar_path}` : undefined)} alt={user.name || 'Avatar'} />
                            <AvatarFallback>
                                {(user.first_name?.[0] || '') + (user.last_name?.[0] || (user.email?.[0] || 'U'))}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <Label htmlFor="avatar">Profile picture</Label>
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    ref={fileInputRef}
                                    id="avatar"
                                    name="avatar"
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const inputEl = e.currentTarget
                                        const file = inputEl.files?.[0]
                                        if (!file) return
                                        setSelectedName(file.name)
                                        const form = new FormData()
                                        form.append('avatar', file)
                                        try {
                                            await axios.post('/api/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
                                            window.location.reload()
                                        } catch (err: unknown) {
                                            alert('Failed to upload avatar')
                                        } finally {
                                            // Reset file input safely using stored reference
                                            inputEl.value = ''
                                        }
                                    }}
                                    className="hidden"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                    Choose file
                                </Button>
                                <span className="text-xs text-muted-foreground truncate max-w-[220px]" title={selectedName || 'No file chosen'}>
                                    {selectedName || 'No file chosen'}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">PNG or JPG up to 5MB.</p>
                        </div>
                    </div>
                    <HeadingSmall
                        title="Profile information"
                        description="Update your name and email address"
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label htmlFor="first_name">First Name</Label>
                                        <Input
                                            id="first_name"
                                            className="mt-1 block w-full"
                                            defaultValue={user.first_name ?? ''}
                                            name="first_name"
                                            required
                                            autoComplete="given-name"
                                            placeholder="First name"
                                            maxLength={100}
                                        />
                                        <InputError className="mt-2" message={errors.first_name} />
                                    </div>
                                    <div>
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <Input
                                            id="last_name"
                                            className="mt-1 block w-full"
                                            defaultValue={user.last_name ?? ''}
                                            name="last_name"
                                            required
                                            autoComplete="family-name"
                                            placeholder="Last name"
                                            maxLength={100}
                                        />
                                        <InputError className="mt-2" message={errors.last_name} />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        className="mt-1 block w-full"
                                        defaultValue={user.address ?? ''}
                                        name="address"
                                        required
                                        autoComplete="street-address"
                                        placeholder="Home or business address"
                                        maxLength={100}
                                    />
                                    <InputError className="mt-2" message={errors.address} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                        maxLength={100}
                                    />
                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                {mustVerifyEmail &&
                                    user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to resend the
                                                    verification email.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    A new verification link has
                                                    been sent to your email
                                                    address.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Save
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            Saved
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>

                <DeleteUser />
            </div>
        </SettingsSidebarLayout>
    );
}
