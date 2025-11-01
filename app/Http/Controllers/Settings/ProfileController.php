<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        // Resolve the authenticated actor across guards
        $actor = $request->user() ?? $request->user('customer') ?? $request->user('technician') ?? $request->user('admin');
        if (!$actor) {
            abort(401);
        }

        $data = $request->validated();

        // If actor is Admin, map first/last to name; others use first_name/last_name directly
        if ($actor instanceof \App\Models\Admin) {
            if (array_key_exists('first_name', $data) || array_key_exists('last_name', $data)) {
                $actor->name = trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? ''));
            }
            if (array_key_exists('email', $data)) {
                $actor->email = $data['email'];
            }
        } else {
            // Fill only allowed attributes
            if (method_exists($actor, 'getFillable')) {
                $fillable = array_flip($actor->getFillable());
                $actor->fill(array_intersect_key($data, $fillable));
            }
            if (array_key_exists('email', $data)) {
                $actor->email = $data['email'];
            }
        }

        // Reset email verification timestamp if email changed
        if ($actor->isDirty('email') && property_exists($actor, 'email_verified_at')) {
            $actor->email_verified_at = null;
        }

        $actor->save();

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
