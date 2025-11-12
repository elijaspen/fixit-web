<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        // Support multi-auth: customer, technician, admin
        $role = null;
        $user = null;
        if ($request->user('customer')) {
            $role = 'customer';
            $user = $request->user('customer');
        } elseif ($request->user('technician')) {
            $role = 'technician';
            $user = $request->user('technician');
        } elseif ($request->user('admin')) {
            $role = 'admin';
            $user = $request->user('admin');
        }

        // Compute unread total for navbar badge (technicians and customers)
        $unreadTotal = 0;
        try {
            if ($user && in_array($role, ['customer', 'technician'], true)) {
                $readerType = $role === 'technician' ? \App\Models\Technician::class : \App\Models\Customer::class;
                $conversationIds = \App\Models\Conversation::query()
                    ->when($role === 'technician',
                        fn($q) => $q->where('technician_id', $user->id),
                        fn($q) => $q->where('customer_id', $user->id)
                    )
                    ->pluck('id');
                if ($conversationIds->isNotEmpty()) {
                    $unreadTotal = \App\Models\Message::query()
                        ->whereIn('conversation_id', $conversationIds)
                        // exclude my own messages: NOT (sender_type = me AND sender_id = me)
                        ->where(function ($q) use ($user) {
                            $q->where('sender_type', '!=', get_class($user))
                              ->orWhere('sender_id', '!=', $user->id);
                        })
                        // no read receipt by me
                        ->whereRaw(
                            'NOT EXISTS (select 1 from message_read_receipts mrr where mrr.message_id = messages.id and mrr.reader_type = ? and mrr.reader_id = ?)',
                            [$readerType, $user->id]
                        )
                        ->count();
                }
            }
        } catch (\Throwable $e) {
            // Swallow errors to avoid breaking rendering
            $unreadTotal = 0;
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
                'role' => $role,
                'unread_total' => $unreadTotal,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'csrf' => csrf_token(),
        ];
    }
}
