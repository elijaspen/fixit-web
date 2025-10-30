<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LogoutController extends Controller
{
    /**
     * Handle logout for any guard (customer, technician, admin)
     */
    public function __invoke(Request $request)
    {
        // Logout from all guards
        Auth::guard('customer')->logout();
        Auth::guard('technician')->logout();
        Auth::guard('admin')->logout();
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // For Inertia requests, return a redirect that will cause a full page reload
        // This ensures CSRF token is refreshed properly
        if ($request->header('X-Inertia')) {
            return redirect()->route('home');
        }

        // Regular redirect for non-Inertia requests
        return redirect()->route('home');
    }
}

