<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Illuminate\Http\Request;
use App\Http\Controllers\Auth\CustomerAuthController;
use App\Http\Controllers\Auth\TechnicianAuthController;
use App\Http\Controllers\Auth\AdminAuthController;
use App\Http\Controllers\Auth\LogoutController;
use App\Http\Controllers\TechnicianAvailabilityController;
use App\Http\Controllers\ProfileAvatarController;
use App\Http\Controllers\AdminStatsController;
use App\Http\Controllers\Chat\ConversationController;
use App\Http\Controllers\ServiceRequestController; // Added for the conversation block

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware([\App\Http\Middleware\MultiAuth::class])->group(function () {
    Route::get('dashboard', function (Request $request) {
        // Redirect guests to the default Fortify login route
        if (!$request->user() && !$request->user('customer') && !$request->user('technician') && !$request->user('admin')) {
            return redirect()->route('login');
        }
        if ($request->user('admin')) {
            return redirect()->route('admin.index');
        }
        $user = $request->user() ?? $request->user('customer') ?? $request->user('technician') ?? $request->user('admin');
        $role = null;
        if ($request->user('customer')) {
            $role = 'customer';
        } elseif ($request->user('technician')) {
            $role = 'technician';
        } elseif ($request->user('admin')) {
            $role = 'admin';
        }
        return Inertia::render('dashboard', [
            'user' => $user,
            'role' => $role,
        ]);
    })->name('dashboard');

    Route::get('messages', function () {
        return Inertia::render('messages/index');
    })->name('messages.index');

    Route::get('technicians', function () {
        return Inertia::render('technicians/index');
    })->name('technicians.index');

    Route::get('technician/service-requests', function () {
        return Inertia::render('technician/service-requests');
    })->name('technician.service-requests');
});

// Unified login page (no role selection)
Route::get('/auth/login', fn() => Inertia::render('auth/login'))->name('auth.login');
// Unified login endpoint (tries all guards)
Route::post('/auth/login/unified', [\App\Http\Controllers\Auth\UnifiedLoginController::class, '__invoke'])->name('auth.login.unified');

// Role selection ONLY for registration
Route::get('/auth/select-role', function (Request $request) {
    $next = $request->query('next', 'register');
    // Only allow register, redirect login requests to unified login
    if ($next !== 'register') {
        return redirect()->route('auth.login');
    }
    return Inertia::render('auth/select-role', [
        'next' => 'register',
    ]);
})->name('auth.select-role');

// Registration pages (still role-specific)
Route::get('/auth/customer/register', fn() => Inertia::render('auth/customer-register'))->name('auth.customer.register');
Route::get('/auth/technician/register', fn() => Inertia::render('auth/technician-register'))->name('auth.technician.register');

// Redirect old login routes to unified login
Route::get('/auth/customer/login', fn() => redirect()->route('auth.login'))->name('auth.customer.login');
Route::get('/auth/technician/login', fn() => redirect()->route('auth.login'))->name('auth.technician.login');

// Optional: Session-based endpoints under web middleware (for session guards)
Route::post('/auth/customer/login', [CustomerAuthController::class, 'login']);
Route::post('/auth/customer/register', [CustomerAuthController::class, 'register']);
Route::post('/auth/technician/login', [TechnicianAuthController::class, 'login']);
Route::post('/auth/technician/register', [TechnicianAuthController::class, 'register']);
Route::post('/auth/admin/login', [AdminAuthController::class, 'login']);

// Unified logout route (handles all guards)
Route::post('/logout', LogoutController::class)->name('logout');
// Fallback GET logout to avoid CSRF edge cases in some clients
Route::get('/logout', LogoutController::class)->name('logout.get');

require __DIR__.'/settings.php';

// Admin UI shell (protected by admin guard)
Route::prefix('admin')->middleware('auth:admin')->group(function () {
    Route::get('/', fn() => Inertia::render('admin/index'))->name('admin.index');
    Route::get('/technicians', fn() => Inertia::render('admin/technicians'))->name('admin.technicians');
    Route::get('/service-requests', fn() => Inertia::render('admin/service-requests'))->name('admin.service-requests');
    Route::get('/reviews', fn() => Inertia::render('admin/reviews'))->name('admin.reviews');
    Route::get('/logs', fn() => Inertia::render('admin/logs'))->name('admin.logs');
});

// API endpoints that require session (web) guards, but keep /api prefix for frontend
Route::prefix('api')->middleware(['web'])->group(function () {
    // Technician availability (session guard)
    Route::middleware('auth:technician')->group(function () {
        Route::get('technicians/me/availability', [TechnicianAvailabilityController::class, 'indexMe']);
        Route::get('technicians/me/availability/month', [TechnicianAvailabilityController::class, 'monthIndexMe']);
        Route::post('technicians/me/availability', [TechnicianAvailabilityController::class, 'upsert']);
    });

    // Public-to-auth roles (customer/technician/admin) viewing a technician availability
    Route::middleware('auth:customer,technician,admin')->group(function () {
        Route::get('technicians/{technician}/availability', [TechnicianAvailabilityController::class, 'index']);
        Route::get('technicians/{technician}/availability/month', [TechnicianAvailabilityController::class, 'monthIndex']);
        // Profile avatar upload (any role)
        Route::post('profile/avatar', [ProfileAvatarController::class, 'upload']);
        // Me endpoints by role (for client to fetch avatar without errors)
        Route::get('customer/me', [CustomerAuthController::class, 'me'])->middleware('auth:customer');
        Route::get('technician/me', [TechnicianAuthController::class, 'me'])->middleware('auth:technician');
        Route::get('admin/me', [AdminAuthController::class, 'me'])->middleware('auth:admin');
        // Admin stats
        Route::get('admin/stats', [AdminStatsController::class, 'index'])->middleware('auth:admin');
    });

    // --- 2. PASTE THE CONVERSATION ROUTES HERE ---
    // Conversations & messages (now uses 'web' guards for session)
    Route::middleware(['auth:customer,technician'])->group(function () {
        Route::get('conversations', [ConversationController::class, 'index']);
        Route::post('conversations', [ConversationController::class, 'createOrFetch']);
        // More specific routes first (with /messages, /typing, /read)
        Route::get('conversations/{conversation}/messages', [ConversationController::class, 'messages']);
        Route::post('conversations/{conversation}/messages', [ConversationController::class, 'send']);
        Route::post('conversations/{conversation}/typing', [ConversationController::class, 'typing']);
        Route::post('conversations/{conversation}/read', [ConversationController::class, 'read']);
        Route::get('conversations/{conversation}/service-requests', [ServiceRequestController::class, 'forConversation']);
        // Less specific route last (single conversation by ID)
        Route::get('conversations/{id}', [ConversationController::class, 'show']);
    });
});