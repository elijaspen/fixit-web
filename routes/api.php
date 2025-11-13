<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Auth\CustomerAuthController;
use App\Http\Controllers\Auth\TechnicianAuthController;
use App\Http\Controllers\Settings\TechnicianProfileController;
use App\Http\Controllers\Chat\ConversationController;
use App\Http\Controllers\TechnicianController;
use App\Http\Controllers\ServiceRequestController; 
use App\Http\Controllers\ReviewController; // <-- Make sure ReviewController is imported

Route::middleware(['web'])->group(function () {

    // --- NEW FIX: CUSTOMER APPROVAL ROUTE ADDED ---
    
    // 1. CUSTOMER: Create the new service request (amount=0)
    Route::post('customer/service-requests', [ServiceRequestController::class, 'storeCustomerRequest'])
        ->middleware(['auth:customer']);
    
    // 2. TECHNICIAN: Route for setting the price/fee (Edit Details button)
    Route::patch('service-requests/{serviceRequest}/edit-details', [ServiceRequestController::class, 'editDetails'])
        ->middleware(['auth:technician']);
        
    // 3. CUSTOMER: Route for approving the quote (links to handleCustomerApproval frontend)
    Route::patch('service-requests/{serviceRequest}/approve', [ServiceRequestController::class, 'customerApproveQuote'])
        ->middleware(['auth:customer']);

    // -------------------------------------------------------------

    // Admin routes
    Route::prefix('admin')->middleware('auth:admin')->group(function () {
        Route::get('technicians', [\App\Http\Controllers\Admin\TechnicianController::class, 'index']);
        Route::get('technicians/{technician}', [\App\Http\Controllers\Admin\TechnicianController::class, 'show']);
        Route::patch('technicians/{technician}/verification', [\App\Http\Controllers\Admin\TechnicianController::class, 'updateVerification']);
        Route::delete('technicians/{technician}', [\App\Http\Controllers\Admin\TechnicianController::class, 'destroy']);
        Route::get('service-requests', [\App\Http\Controllers\ServiceRequestController::class, 'adminIndex']);
        // Admin marks booking fee as received (manual confirmation)
        Route::post('service-requests/{serviceRequest}/booking-fee/mark-received', [\App\Http\Controllers\ServiceRequestController::class, 'adminMarkBookingFeeReceived']);
        // Admin reviews listing (all)
        Route::get('reviews', [ReviewController::class, 'listAll']);
    });

    // Customer auth
    Route::prefix('customer')->group(function () {
        Route::post('register', [CustomerAuthController::class, 'register']);
        Route::post('login', [CustomerAuthController::class, 'login']);
        Route::post('logout', [CustomerAuthController::class, 'logout'])->middleware('auth:customer');
        Route::get('me', [CustomerAuthController::class, 'me'])->middleware('auth:customer');
    });

    // Technician auth
    Route::prefix('technician')->group(function () {
        Route::post('register', [TechnicianAuthController::class, 'register']);
        Route::post('login', [TechnicianAuthController::class, 'login']);
        Route::post('logout', [TechnicianAuthController::class, 'logout'])->middleware('auth:technician');
        Route::get('me', [TechnicianAuthController::class, 'me'])->middleware('auth:technician');

        // Technician profile and uploads (license/certificates)
        Route::middleware('auth:technician')->group(function () {
            Route::post('profile', [TechnicianProfileController::class, 'update']);
            Route::post('upload/license', [TechnicianProfileController::class, 'uploadLicense']);
            Route::post('upload/certificates', [TechnicianProfileController::class, 'uploadCertificates']);
        });
    });

    // Browse/view technicians (accessible to customer, technician, and admin for credibility)
    Route::middleware('auth:customer,technician,admin')->group(function () {
        Route::get('technicians', [TechnicianController::class, 'index']);
        Route::get('technicians/{technician}', [TechnicianController::class, 'show']);
        // Rating summary public to authenticated roles
        Route::get('technicians/{technician}/reviews/summary', [ReviewController::class, 'summary']);
        // Availability (weekly view) for customers/admin to see
        Route::get('technicians/{technician}/availability', [\App\Http\Controllers\TechnicianAvailabilityController::class, 'index']);
        // Availability (monthly view)
        Route::get('technicians/{technician}/availability/month', [\App\Http\Controllers\TechnicianAvailabilityController::class, 'monthIndex']);
    });

    // Conversations & messages block has been REMOVED from this file.

    // Service requests
    Route::middleware(['auth:customer'])->group(function () {
        // NOTE: The request-creation POST route below is the OLD one.
        Route::post('service-requests', [ServiceRequestController::class, 'create']); 
        // Customer reviews
        Route::post('technicians/{technician}/reviews', [ReviewController::class, 'upsert']);
        Route::get('technicians/{technician}/reviews/mine', [ReviewController::class, 'mine']);
        
        // --- FIX: ADD THIS ROUTE TO ALLOW RATING CHECK ---
        Route::get('technicians/{technician}/can-rate', [ReviewController::class, 'checkCanRate']);
    });
    
    Route::middleware(['auth:technician'])->group(function () {
        // Technician can create service requests (for receipt generation on dashboard)
        Route::post('service-requests', [ServiceRequestController::class, 'create']);
        Route::get('service-requests', [ServiceRequestController::class, 'index']);
        Route::patch('service-requests/{serviceRequest}/status', [ServiceRequestController::class, 'updateStatus']);
        // Technician marks service request as completed
        Route::patch('service-requests/{serviceRequest}/complete', [ServiceRequestController::class, 'complete']);
        // Technician sets customer payment (cash/gcash) status/method
        Route::patch('service-requests/{serviceRequest}/customer-payment', [ServiceRequestController::class, 'updateCustomerPayment']);
        // Technician pays booking fee (method/reference)
        Route::post('service-requests/{serviceRequest}/booking-fee/pay', [ServiceRequestController::class, 'payBookingFee']);
        // Technician edits receipt items/notes/total
        Route::patch('service-requests/{serviceRequest}/receipt', [ServiceRequestController::class, 'updateReceipt']);
        // Technician reviews listing (their own)
        Route::get('reviews', [ReviewController::class, 'listMine']);
        // Technician upserts weekly availability
        Route::post('technicians/me/availability', [\App\Http\Controllers\TechnicianAvailabilityController::class, 'upsert']);
        // Technician views weekly availability (self)
        Route::get('technicians/me/availability', [\App\Http\Controllers\TechnicianAvailabilityController::class, 'indexMe']);
        // Technician views monthly availability (self)
        Route::get('technicians/me/availability/month', [\App\Http\Controllers\TechnicianAvailabilityController::class, 'monthIndexMe']);
    });
    
    Route::middleware(['auth:customer,technician,admin'])->group(function () {
        // Backward-compat: keep generic payment update if used elsewhere
        Route::patch('service-requests/{serviceRequest}/payment', [ServiceRequestController::class, 'updatePayment']);
        // Upload receipt attachments (tech/customer/admin)
        Route::post('service-requests/{serviceRequest}/receipts', [ServiceRequestController::class, 'uploadReceipts']);
        // Remove a specific receipt attachment (tech/customer/admin)
        Route::delete('service-requests/{serviceRequest}/receipts', [ServiceRequestController::class, 'removeReceipt']);
    });
});