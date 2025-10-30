<?php

namespace App\Http\Controllers\Chat;

use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Events\TypingStarted;
use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageReadReceipt;
use App\Models\Technician;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user() ?? $request->user('customer') ?? $request->user('technician');
        $isTechnician = method_exists($user, 'isTechnician') && $user->isTechnician();
        
        $query = Conversation::query()
            ->with(['customer:id,first_name,last_name', 'technician:id,first_name,last_name'])
            ->when($isTechnician, 
                fn($q) => $q->where('technician_id', $user->id)->whereHas('messages'), // Technicians only see conversations with messages
                fn($q) => $q->where('customer_id', $user->id) // Customers see all their conversations (including empty ones they initiated)
            )
            ->orderByDesc('last_message_at')
            ->orderByDesc('created_at') // Fallback to creation time for empty conversations
            ->limit(50);
        
        return response()->json($query->get());
    }
    
    public function show(Request $request, $id)
    {
        $user = $request->user() ?? $request->user('customer') ?? $request->user('technician');
        $conversation = Conversation::with(['customer:id,first_name,last_name', 'technician:id,first_name,last_name'])
            ->findOrFail($id);
        
        // Authorize access
        $isTechnician = method_exists($user, 'isTechnician') && $user->isTechnician();
        if ($isTechnician && $conversation->technician_id !== $user->id) {
            abort(403);
        }
        if (!$isTechnician && $conversation->customer_id !== $user->id) {
            abort(403);
        }
        
        return response()->json($conversation);
    }

    public function createOrFetch(Request $request)
    {
        $data = $request->validate([
            'technician_id' => ['required', 'exists:technicians,id'],
        ]);
        $customer = $request->user('customer');
        if (! $customer) {
            throw ValidationException::withMessages(['auth' => 'Must be logged in as customer']);
        }
        $conversation = Conversation::firstOrCreate([
            'customer_id' => $customer->id,
            'technician_id' => $data['technician_id'],
        ]);
        return response()->json($conversation);
    }

    public function messages(Request $request, Conversation $conversation)
    {
        $this->authorizeAccess($request, $conversation);
        $messages = $conversation->messages()->orderByDesc('id')->limit(50)->get()->reverse()->values();
        return response()->json($messages);
    }

    public function send(Request $request, Conversation $conversation)
    {
        $user = $this->authorizeAccess($request, $conversation);
        $validated = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array'],
        ]);

        $message = $conversation->messages()->create([
            'sender_type' => $user instanceof Technician ? Technician::class : get_class($user),
            'sender_id' => $user->id,
            'body' => $validated['body'] ?? null,
            'attachments' => $validated['attachments'] ?? null,
        ]);

        $conversation->update(['last_message_at' => now()]);

        broadcast(new MessageSent($message))->toOthers();

        return response()->json($message);
    }

    public function typing(Request $request, Conversation $conversation)
    {
        $user = $this->authorizeAccess($request, $conversation);
        broadcast(new TypingStarted($conversation->id, $user instanceof Technician ? Technician::class : get_class($user), $user->id))->toOthers();
        return response()->json(['ok' => true]);
    }

    public function read(Request $request, Conversation $conversation)
    {
        $user = $this->authorizeAccess($request, $conversation);
        $ids = $conversation->messages()->pluck('id');
        $now = now();
        foreach ($ids as $id) {
            MessageReadReceipt::updateOrCreate([
                'message_id' => $id,
                'reader_type' => $user instanceof Technician ? Technician::class : get_class($user),
                'reader_id' => $user->id,
            ], [
                'read_at' => $now,
            ]);
            broadcast(new MessageRead($conversation->id, $id, $user instanceof Technician ? Technician::class : get_class($user), $user->id))->toOthers();
        }
        return response()->json(['ok' => true]);
    }

    private function authorizeAccess(Request $request, Conversation $conversation)
    {
        $customer = $request->user('customer');
        $technician = $request->user('technician');
        $user = $customer ?: $technician;
        abort_unless($user && ($conversation->customer_id === ($customer->id ?? -1) || $conversation->technician_id === ($technician->id ?? -1)), 403);
        return $user;
    }
}


