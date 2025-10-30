<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Conversation;

Broadcast::routes();

Broadcast::channel('conversation.{id}', function ($user, $id) {
    return Conversation::query()
        ->where('id', $id)
        ->where(function ($q) use ($user) {
            return $q->where('customer_id', $user->id)
                ->orWhere('technician_id', $user->id);
        })
        ->exists();
});


