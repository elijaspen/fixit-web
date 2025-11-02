<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\ServiceRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ServiceRequestController extends Controller
{
    /**
     * Create a service request from conversation. Supports guided rate tier or fully negotiated receipt.
     */
    public function create(Request $request)
    {
        $validated = $request->validate([
            'conversation_id' => ['required', 'exists:conversations,id'],
            // rate_tier is optional now
            'rate_tier' => ['nullable', 'in:normal,standard,advanced,base'],
            // Negotiated receipt fields (tech-generated)
            'receipt_items' => ['required', 'array', 'min:1'],
            'receipt_items.*.desc' => ['required', 'string', 'max:255'],
            'receipt_items.*.qty' => ['required', 'numeric', 'min:0'],
            'receipt_items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'receipt_total' => ['required', 'numeric', 'min:0'],
            'receipt_notes' => ['nullable', 'string', 'max:2000'],
            'customer_notes' => ['nullable', 'string', 'max:1000'],
            // Booking fee complexity selector (simple/standard/complex)
            'booking_fee_complexity' => ['nullable', 'in:simple,standard,complex'],
        ]);

        $customer = $request->user('customer');
        $technician = $request->user('technician');
        
        if (!$customer && !$technician) {
            throw ValidationException::withMessages(['auth' => 'Must be logged in as customer or technician']);
        }

        $conversation = Conversation::with(['technician', 'customer'])->findOrFail($validated['conversation_id']);

        // Verify conversation belongs to customer OR technician
        if ($customer && $conversation->customer_id !== $customer->id) {
            abort(403, 'Unauthorized');
        }
        if ($technician && $conversation->technician_id !== $technician->id) {
            abort(403, 'Unauthorized');
        }

        // Determine amount
        $amount = 0;
        $rateTier = $validated['rate_tier'] ?? null;
        
        // If receipt_total is provided (technician generating receipt), use it directly
        if (isset($validated['receipt_total']) && $validated['receipt_total'] !== null) {
            $amount = (float) $validated['receipt_total'];
        } elseif ($rateTier) {
            // Otherwise, calculate from rate tier (customer selecting tier)
            if ($rateTier === 'normal' && $conversation->technician->standard_rate) {
                $amount = $conversation->technician->standard_rate;
            } elseif ($rateTier === 'standard' && $conversation->technician->professional_rate) {
                $amount = $conversation->technician->professional_rate;
            } elseif ($rateTier === 'advanced' && $conversation->technician->premium_rate) {
                $amount = $conversation->technician->premium_rate;
            } elseif ($rateTier === 'base' && $conversation->technician->base_pricing) {
                $amount = $conversation->technician->base_pricing;
            } else {
                throw ValidationException::withMessages(['rate_tier' => 'Selected rate tier is not available for this technician']);
            }
        }

        // Check if there's already a pending or active (non-completed) service request
        // Only block customers - technicians can create multiple new receipts (new service requests)
        if ($customer) {
            $existing = ServiceRequest::where('conversation_id', $conversation->id)
                ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                ->first();

            if ($existing) {
                return response()->json([
                    'message' => 'You already have an active service request for this conversation. Please complete or cancel it first.',
                    'service_request' => $existing,
                ], 422);
            }
        }
        // Technicians can always create new service requests (new receipts) even if active ones exist

        // Compute booking fee from complexity selection
        $complexity = $validated['booking_fee_complexity'] ?? 'standard';
        $fees = config('billing.booking_fee');
        $bookingFee = $fees[$complexity] ?? ($fees['standard'] ?? 20.0);

        $serviceRequest = ServiceRequest::create([
            'conversation_id' => $conversation->id,
            'customer_id' => $conversation->customer_id,
            'technician_id' => $conversation->technician_id,
            'rate_tier' => $rateTier,
            'amount' => $amount,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'customer_payment_status' => 'unpaid',
            'customer_payment_method' => null,
            'customer_notes' => $validated['customer_notes'] ?? null,
            // booking fee
            'booking_fee_net' => $bookingFee,
            'booking_fee_vat' => 0,
            'booking_fee_total' => $bookingFee,
            'booking_fee_complexity' => $complexity,
            'booking_fee_status' => 'unpaid',
            // receipt details (new receipt, no attachments)
            'receipt_items' => $validated['receipt_items'],
            'receipt_total' => $validated['receipt_total'],
            'receipt_notes' => $validated['receipt_notes'] ?? null,
            'receipt_attachments' => null, // New receipt has no attachments
        ]);

        // Update conversation consultation fee
        $conversation->update(['consultation_fee' => $amount]);

        return response()->json([
            'message' => 'Service request created successfully',
            'service_request' => $serviceRequest->load(['customer:id,first_name,last_name', 'technician:id,first_name,last_name']),
        ]);
    }

    /**
     * Technician updates what the customer paid (method/status)
     */
    public function updateCustomerPayment(Request $request, ServiceRequest $serviceRequest)
    {
        $technician = $request->user('technician');
        if (!$technician || $serviceRequest->technician_id !== $technician->id) {
            abort(403);
        }

        $validated = $request->validate([
            'customer_payment_method' => ['nullable', 'in:cash,gcash,other'],
            'customer_payment_status' => ['required', 'in:unpaid,paid,partial'],
        ]);

        $serviceRequest->update($validated);

        return response()->json([
            'message' => 'Customer payment updated',
            'service_request' => $serviceRequest->fresh(),
        ]);
    }

    /**
     * Technician pays booking fee (manual record)
     */
    public function payBookingFee(Request $request, ServiceRequest $serviceRequest)
    {
        $technician = $request->user('technician');
        if (!$technician || $serviceRequest->technician_id !== $technician->id) {
            abort(403);
        }

        $validated = $request->validate([
            'method' => ['required', 'in:gcash,bank_transfer,cash,manual'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $serviceRequest->update([
            'booking_fee_status' => 'paid',
            'booking_fee_paid_at' => now(),
            'booking_fee_payment_method' => $validated['method'],
            'booking_fee_reference' => $validated['reference'] ?? null,
        ]);

        return response()->json([
            'message' => 'Booking fee recorded as paid',
            'service_request' => $serviceRequest->fresh(),
        ]);
    }

    /**
     * Complete a service request (technicians can mark as completed)
     */
    public function complete(Request $request, ServiceRequest $serviceRequest)
    {
        $technician = $request->user('technician');
        if (!$technician || $serviceRequest->technician_id !== $technician->id) {
            abort(403, 'Only the assigned technician can mark as completed');
        }

        // Allow completion if status is in_progress, confirmed, or already completed (idempotent)
        $allowedStatuses = ['in_progress', 'confirmed', 'completed'];
        if (!in_array($serviceRequest->status, $allowedStatuses)) {
            throw ValidationException::withMessages([
                'status' => 'Service request must be in progress or confirmed before completion.',
            ]);
        }

        $serviceRequest->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json([
            'message' => 'Service request marked as completed',
            'service_request' => $serviceRequest->fresh(),
        ]);
    }

    /**
     * Technician updates the generated receipt (items, total, notes)
     */
    public function updateReceipt(Request $request, ServiceRequest $serviceRequest)
    {
        $technician = $request->user('technician');
        if (!$technician || $serviceRequest->technician_id !== $technician->id) {
            abort(403);
        }

        $validated = $request->validate([
            'receipt_items' => ['required', 'array', 'min:1'],
            'receipt_items.*.desc' => ['required', 'string', 'max:255'],
            'receipt_items.*.qty' => ['required', 'numeric', 'min:0'],
            'receipt_items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'receipt_total' => ['required', 'numeric', 'min:0'],
            'receipt_notes' => ['nullable', 'string', 'max:2000'],
            'booking_fee_complexity' => ['nullable', 'in:simple,standard,complex'],
        ]);

        // Update booking fee if complexity is provided
        $updateData = [
            'receipt_items' => $validated['receipt_items'],
            'receipt_total' => $validated['receipt_total'],
            'receipt_notes' => $validated['receipt_notes'] ?? null,
            // Keep main amount in sync with receipt total
            'amount' => $validated['receipt_total'],
        ];

        if (isset($validated['booking_fee_complexity'])) {
            $complexity = $validated['booking_fee_complexity'];
            $fees = config('billing.booking_fee');
            $bookingFee = $fees[$complexity] ?? ($fees['standard'] ?? 20.0);
            
            $updateData['booking_fee_complexity'] = $complexity;
            $updateData['booking_fee_net'] = $bookingFee;
            $updateData['booking_fee_vat'] = 0;
            $updateData['booking_fee_total'] = $bookingFee;
        }

        $serviceRequest->update($updateData);

        // Also reflect on conversation for consistency
        if ($serviceRequest->conversation_id) {
            $conversation = Conversation::find($serviceRequest->conversation_id);
            if ($conversation) {
                $conversation->update(['consultation_fee' => $validated['receipt_total']]);
            }
        }

        return response()->json([
            'message' => 'Receipt updated',
            'service_request' => $serviceRequest->fresh(['customer:id,first_name,last_name', 'technician:id,first_name,last_name']),
        ]);
    }

    /**
     * Upload receipt attachments (images/PDF) up to 5 files, 5MB each
     */
    public function uploadReceipts(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user('admin') ?? $request->user('technician') ?? $request->user('customer');
        if (!$user) {
            abort(401);
        }
        // Admin can upload to any service request
        if (!$request->user('admin')) {
            if ($request->user('technician') && $serviceRequest->technician_id !== $request->user('technician')->id) {
                abort(403);
            }
            if ($request->user('customer') && $serviceRequest->customer_id !== $request->user('customer')->id) {
                abort(403);
            }
        }

        $validated = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:5'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'], // 5MB
        ]);

        $attachments = $serviceRequest->receipt_attachments ?? [];
        
        // Determine uploader info
        $uploaderType = null;
        $uploaderId = null;
        if ($request->user('admin')) {
            $uploaderType = 'admin';
            $uploaderId = $request->user('admin')->id;
        } elseif ($request->user('technician')) {
            $uploaderType = 'technician';
            $uploaderId = $request->user('technician')->id;
        } elseif ($request->user('customer')) {
            $uploaderType = 'customer';
            $uploaderId = $request->user('customer')->id;
        }
        
        foreach ($request->file('files', []) as $file) {
            $filePath = $file->store('receipts', 'public');
            // Store as object with metadata for ownership tracking
            $attachments[] = [
                'path' => $filePath,
                'uploaded_by_type' => $uploaderType,
                'uploaded_by_id' => $uploaderId,
                'uploaded_at' => now()->toIso8601String(),
            ];
        }

        $serviceRequest->update([
            'receipt_attachments' => $attachments,
        ]);

        return response()->json([
            'message' => 'Receipts uploaded',
            'attachments' => $attachments,
        ]);
    }

    /**
     * Remove a specific receipt attachment by path
     */
    public function removeReceipt(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user('admin') ?? $request->user('technician') ?? $request->user('customer');
        if (!$user) {
            abort(401);
        }

        // Accept path from query parameter or request body (for DELETE requests)
        // Laravel validation automatically checks both query and body
        $path = $request->input('path') ?? $request->query('path');
        if (!$path) {
            abort(422, 'Path parameter is required');
        }
        $data = ['path' => $path];

        $attachments = $serviceRequest->receipt_attachments ?? [];
        $admin = $request->user('admin');
        $technician = $request->user('technician');
        $customer = $request->user('customer');
        
        // Find the attachment to remove (normalize path for comparison)
        $targetPath = urldecode($data['path']); // Decode in case it was URL encoded
        $attachmentToRemove = null;
        foreach ($attachments as $att) {
            // Handle both old format (string) and new format (object)
            $path = is_string($att) ? $att : ($att['path'] ?? null);
            // Compare paths (normalize both for comparison)
            $normalizedPath = urldecode(str_replace('\\', '/', $path));
            $normalizedTarget = urldecode(str_replace('\\', '/', $targetPath));
            if ($normalizedPath === $normalizedTarget || $path === $targetPath) {
                $attachmentToRemove = $att;
                break;
            }
        }
        
        if (!$attachmentToRemove) {
            abort(404, 'Attachment not found. Path: ' . $targetPath);
        }
        
        // Determine uploader info from attachment
        $uploadedByType = null;
        $uploadedById = null;
        if (is_array($attachmentToRemove)) {
            $uploadedByType = $attachmentToRemove['uploaded_by_type'] ?? null;
            $uploadedById = $attachmentToRemove['uploaded_by_id'] ?? null;
        }
        
        // If attachment has no metadata (old format), assume it was uploaded by technician
        if (!$uploadedByType) {
            $uploadedByType = 'technician';
        }
        
        // Authorization: Admin cannot remove technician uploads
        if ($admin && $uploadedByType === 'technician') {
            abort(403, 'Admin cannot remove technician uploads');
        }
        
        // Technicians and customers can only remove their own uploads
        if (!$admin) {
            if ($technician && $uploadedByType !== 'technician') {
                abort(403, 'You can only remove your own uploads');
            }
            if ($technician && $serviceRequest->technician_id !== $technician->id) {
                abort(403);
            }
            if ($customer && $uploadedByType !== 'customer') {
                abort(403, 'You can only remove your own uploads');
            }
            if ($customer && $serviceRequest->customer_id !== $customer->id) {
                abort(403);
            }
        }
        
        // Remove the attachment (use normalized path for comparison)
        $targetPath = urldecode($data['path']);
        $new = array_values(array_filter($attachments, function($att) use ($targetPath) {
            $path = is_string($att) ? $att : ($att['path'] ?? null);
            $normalizedPath = urldecode(str_replace('\\', '/', $path));
            $normalizedTarget = urldecode(str_replace('\\', '/', $targetPath));
            return $normalizedPath !== $normalizedTarget && $path !== $targetPath;
        }));
        
        $serviceRequest->update(['receipt_attachments' => $new]);

        return response()->json([
            'message' => 'Attachment removed',
            'attachments' => $new,
        ]);
    }

    /**
     * Update payment status (for now, manual confirmation)
     */
    public function updatePayment(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user() ?? $request->user('customer') ?? $request->user('technician');
        
        // Verify access
        $isCustomer = $request->user('customer');
        $isTechnician = $request->user('technician');
        
        if ($isCustomer && $serviceRequest->customer_id !== $isCustomer->id) {
            abort(403);
        }
        if ($isTechnician && $serviceRequest->technician_id !== $isTechnician->id) {
            abort(403);
        }

        $validated = $request->validate([
            'payment_status' => ['required', 'in:paid,unpaid,partially_paid'],
            'payment_method' => ['nullable', 'string', 'max:50'],
        ]);

        $serviceRequest->update([
            'payment_status' => $validated['payment_status'],
            'payment_method' => $validated['payment_method'] ?? null,
        ]);

        // Auto-confirm if payment is made
        if ($validated['payment_status'] === 'paid' && $serviceRequest->status === 'pending') {
            $serviceRequest->update(['status' => 'confirmed']);
        }

        return response()->json([
            'message' => 'Payment status updated',
            'service_request' => $serviceRequest->fresh(),
        ]);
    }

    /**
     * Get service requests for a conversation
     */
    public function forConversation(Request $request, Conversation $conversation)
    {
        $user = $this->authorizeConversationAccess($request, $conversation);
        
        $requests = ServiceRequest::where('conversation_id', $conversation->id)
            ->with(['customer:id,first_name,last_name', 'technician:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($requests);
    }

    /**
     * Get all service requests for logged-in technician
     */
    public function index(Request $request)
    {
        $technician = $request->user('technician');
        if (!$technician) {
            abort(401, 'Must be logged in as technician');
        }

        $query = ServiceRequest::where('technician_id', $technician->id)
            ->with(['customer:id,first_name,last_name,email,phone', 'conversation:id'])
            ->orderByDesc('created_at');

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Filter by payment status if provided
        if ($request->has('payment_status')) {
            $query->where('payment_status', $request->get('payment_status'));
        }

        return response()->json($query->get());
    }

    /**
     * Admin listing with optional outstanding booking fees filter
     */
    public function adminIndex(Request $request)
    {
        $admin = $request->user('admin');
        if (!$admin) {
            abort(401, 'Must be logged in as admin');
        }

        $query = ServiceRequest::with(['customer:id,first_name,last_name', 'technician:id,first_name,last_name'])
            ->orderByDesc('created_at');

        if ($request->boolean('outstanding_fees')) {
            $query->where('booking_fee_status', 'unpaid')->where('status', '!=', 'cancelled');
        }
        if ($request->has('technician_id')) {
            $query->where('technician_id', $request->integer('technician_id'));
        }
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }
        
        // Filter out fully completed requests (both completed AND booking fee paid) - these are done and don't need admin action
        // Only show if they're either not completed, or completed but booking fee still unpaid (needs admin action)
        if (!$request->has('status') && !$request->boolean('outstanding_fees')) {
            $query->where(function($q) {
                $q->where('status', '!=', 'completed')
                  ->orWhere(function($subQ) {
                      $subQ->where('status', 'completed')
                           ->where('booking_fee_status', 'unpaid');
                  });
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Update service request status (for technicians)
     */
    public function updateStatus(Request $request, ServiceRequest $serviceRequest)
    {
        $technician = $request->user('technician');
        if (!$technician || $serviceRequest->technician_id !== $technician->id) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'status' => ['required', 'in:pending,confirmed,in_progress,cancelled'],
            'technician_notes' => ['nullable', 'string', 'max:1000'],
            'service_date' => ['nullable', 'date'],
        ]);

        $updates = [
            'status' => $validated['status'],
        ];

        if (isset($validated['technician_notes'])) {
            $updates['technician_notes'] = $validated['technician_notes'];
        }

        if (isset($validated['service_date'])) {
            $updates['service_date'] = $validated['service_date'];
        }

        $serviceRequest->update($updates);

        return response()->json([
            'message' => 'Service request updated',
            'service_request' => $serviceRequest->fresh(['customer:id,first_name,last_name,email,phone']),
        ]);
    }

    /**
     * Admin manually marks the booking fee as received
     */
    public function adminMarkBookingFeeReceived(Request $request, ServiceRequest $serviceRequest)
    {
        $admin = $request->user('admin');
        if (!$admin) {
            abort(403);
        }

        $validated = $request->validate([
            'method' => ['nullable', 'in:gcash,bank_transfer,cash,manual,admin_manual'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $serviceRequest->update([
            'booking_fee_status' => 'paid',
            'booking_fee_paid_at' => now(),
            'booking_fee_payment_method' => $validated['method'] ?? 'admin_manual',
            'booking_fee_reference' => $validated['reference'] ?? null,
        ]);

        return response()->json([
            'message' => 'Booking fee marked as received by admin',
            'service_request' => $serviceRequest->fresh(),
        ]);
    }

    private function authorizeConversationAccess(Request $request, Conversation $conversation)
    {
        $customer = $request->user('customer');
        $technician = $request->user('technician');

        if ($customer && $conversation->customer_id !== $customer->id) {
            abort(403);
        }
        if ($technician && $conversation->technician_id !== $technician->id) {
            abort(403);
        }
        if (!$customer && !$technician) {
            abort(401);
        }

        return $customer ?? $technician;
    }
}
