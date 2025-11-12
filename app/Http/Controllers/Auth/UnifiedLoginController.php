<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\RedirectResponse;

class UnifiedLoginController extends Controller
{
    /**
     * Handle an incoming authentication request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $guards = [
            'customer' => 'customer',
            'technician' => 'technician',
            'admin' => 'admin',
        ];

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->attempt($credentials, true)) {
                $request->session()->regenerate();
                
                return redirect()->intended('/dashboard');
            }
        }

        throw ValidationException::withMessages([
            'email' => __('auth.failed'),
        ])->status(422);
    }
}