<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class UnifiedLoginController extends Controller
{
    public function __invoke(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Try guards in order: customer, technician, admin
        $guards = [
            'customer' => 'customer',
            'technician' => 'technician',
            'admin' => 'admin',
        ];

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->attempt($credentials, true)) {
                $request->session()->regenerate();
                return response()->json([
                    'message' => 'Logged in',
                    'role' => $guard,
                ]);
            }
        }

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ])->status(422);
    }
}


