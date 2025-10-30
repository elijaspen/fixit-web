<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MultiAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated via any guard (customer, technician, admin, or default)
        $authenticated = $request->user()
            || $request->user('customer')
            || $request->user('technician')
            || $request->user('admin');

        if (! $authenticated) {
            return redirect()->route('login');
        }

        return $next($request);
    }
}

