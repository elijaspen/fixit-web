import AuthLayoutTemplate from '@/layouts/auth/auth-split-layout';

export default function AuthLayout({
    children,
    title,
    description,
    sideImageSrc,
    ...props
}: {
    children: React.ReactNode;
    title: string;
    description: string;
    sideImageSrc?: string;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description} sideImageSrc={sideImageSrc} {...props}>
            {children}
        </AuthLayoutTemplate>
    );
}
