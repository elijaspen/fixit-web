import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Only initialize on client side
if (typeof window !== 'undefined') {
    // @ts-expect-error: attaching Pusher to window for Echo runtime
    window.Pusher = Pusher
}

const realtimeEnabled = (typeof window !== 'undefined') && ((import.meta.env.VITE_REALTIME_ENABLED ?? '0') === '1')

export const echo = (typeof window !== 'undefined' && realtimeEnabled) ? new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || 'local',
    wsHost: import.meta.env.VITE_PUSHER_HOST || window.location.hostname,
    wsPort: Number(import.meta.env.VITE_PUSHER_PORT || 6001),
    wssPort: Number(import.meta.env.VITE_PUSHER_PORT || 6001),
    forceTLS: false,
    disableStats: true,
    enabledTransports: ['ws'],
    authEndpoint: '/broadcasting/auth',
    withCredentials: true,
    cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'mt1', // Required by Pusher, but not used for self-hosted WebSockets
}) : null


