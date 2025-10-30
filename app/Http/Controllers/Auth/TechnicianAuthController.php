<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Technician;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

class TechnicianAuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:100', 'unique:technicians,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:32'],
            'address' => ['required', 'string', 'max:100'],
            'expertise' => ['nullable', 'string', 'max:100'],
            'services' => ['nullable', 'string', 'max:100'],
            'base_pricing' => ['nullable', 'numeric', 'min:0'],
        ]);

        $technician = Technician::create([
            'first_name' => $validated['first_name'],
            'last_name' => $validated['last_name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'],
            'expertise' => $validated['expertise'] ?? null,
            'services' => $validated['services'] ?? null,
            'base_pricing' => $validated['base_pricing'] ?? null,
        ]);

        Auth::guard('technician')->login($technician);

        return redirect()->route('dashboard');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (! Auth::guard('technician')->attempt($credentials, $request->boolean('remember'))) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Logged in',
        ])->header('X-CSRF-TOKEN', csrf_token());
    }

    public function logout(Request $request)
    {
        Auth::guard('technician')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user('technician'));
    }
}


