<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Auth\CustomerAuthController;
use App\Http\Controllers\Auth\TechnicianAuthController;
use App\Http\Controllers\Settings\TechnicianProfileController;
use App\Http\Controllers\Chat\ConversationController;
use App\Http\Controllers\TechnicianController;

Route::middleware(['web'])->group(function () {
    // Admin routes
    Route::prefix('admin')->middleware('auth:admin')->group(function () {
        Route::get('technicians', [\App\Http\Controllers\Admin\TechnicianController::class, 'index']);
        Route::get('technicians/{technician}', [\App\Http\Controllers\Admin\TechnicianController::class, 'show']);
        Route::patch('technicians/{technician}/verification', [\App\Http\Controllers\Admin\TechnicianController::class, 'updateVerification']);
        Route::delete('technicians/{technician}', [\App\Http\Controllers\Admin\TechnicianController::class, 'destroy']);
        Route::get('service-requests', [\App\Http\Controllers\ServiceRequestController::class, 'adminIndex']);
        // Admin completes SR after fee paid and receipts verified
        Route::patch('service-requests/{serviceRequest}/complete', [\App\Http\Controllers\ServiceRequestController::class, 'complete']);
        // Admin marks booking fee as received (manual confirmation)
        Route::post('service-requests/{serviceRequest}/booking-fee/mark-received', [\App\Http\Controllers\ServiceRequestController::class, 'adminMarkBookingFeeReceived']);
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
    });

    // Conversations & messages
    Route::middleware(['auth:customer,technician'])->group(function () {
        Route::get('conversations', [ConversationController::class, 'index']);
        Route::post('conversations', [ConversationController::class, 'createOrFetch']);
        // More specific routes first (with /messages, /typing, /read)
        Route::get('conversations/{conversation}/messages', [ConversationController::class, 'messages']);
        Route::post('conversations/{conversation}/messages', [ConversationController::class, 'send']);
        Route::post('conversations/{conversation}/typing', [ConversationController::class, 'typing']);
        Route::post('conversations/{conversation}/read', [ConversationController::class, 'read']);
        Route::get('conversations/{conversation}/service-requests', [\App\Http\Controllers\ServiceRequestController::class, 'forConversation']);
        // Less specific route last (single conversation by ID)
        Route::get('conversations/{id}', [ConversationController::class, 'show']);
    });

        // Service requests
        Route::middleware(['auth:customer'])->group(function () {
            Route::post('service-requests', [\App\Http\Controllers\ServiceRequestController::class, 'create']);
        });
        
        Route::middleware(['auth:technician'])->group(function () {
            Route::get('service-requests', [\App\Http\Controllers\ServiceRequestController::class, 'index']);
            Route::patch('service-requests/{serviceRequest}/status', [\App\Http\Controllers\ServiceRequestController::class, 'updateStatus']);
            // Technician sets customer payment (cash/gcash) status/method
            Route::patch('service-requests/{serviceRequest}/customer-payment', [\App\Http\Controllers\ServiceRequestController::class, 'updateCustomerPayment']);
            // Technician pays booking fee (method/reference)
            Route::post('service-requests/{serviceRequest}/booking-fee/pay', [\App\Http\Controllers\ServiceRequestController::class, 'payBookingFee']);
        });
        
        Route::middleware(['auth:customer,technician'])->group(function () {
            // Backward-compat: keep generic payment update if used elsewhere
            Route::patch('service-requests/{serviceRequest}/payment', [\App\Http\Controllers\ServiceRequestController::class, 'updatePayment']);
            // Upload receipt attachments (tech/customer)
            Route::post('service-requests/{serviceRequest}/receipts', [\App\Http\Controllers\ServiceRequestController::class, 'uploadReceipts']);
            // Remove a specific receipt attachment (tech/customer)
            Route::delete('service-requests/{serviceRequest}/receipts', [\App\Http\Controllers\ServiceRequestController::class, 'removeReceipt']);
        });
});


