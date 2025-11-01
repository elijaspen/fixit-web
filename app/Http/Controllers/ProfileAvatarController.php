<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileAvatarController extends Controller
{
    // POST /api/profile/avatar
    public function upload(Request $request)
    {
        $user = $request->user() ?? $request->user('customer') ?? $request->user('technician') ?? $request->user('admin');
        if (!$user) {
            abort(401);
        }

        $request->validate([
            'avatar' => ['required', 'image', 'max:5120'], // 5MB
        ]);

        $file = $request->file('avatar');
        $path = $file->store('avatars', 'public');

        // Persist on appropriate model
        $user->avatar_path = $path;
        $user->save();

        return response()->json([
            'message' => 'Avatar uploaded',
            'avatar_url' => Storage::disk('public')->url($path),
            'avatar_path' => $path,
        ]);
    }
}


