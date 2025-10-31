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
            'receipt_items' => ['nullable', 'array'],
            'receipt_items.*.desc' => ['required_with:receipt_items', 'string', 'max:255'],
            'receipt_items.*.qty' => ['required_with:receipt_items', 'numeric', 'min:0'],
            'receipt_items.*.unit_price' => ['required_with:receipt_items', 'numeric', 'min:0'],
            'receipt_total' => ['nullable', 'numeric', 'min:0'],
            'receipt_notes' => ['nullable', 'string', 'max:2000'],
            'customer_notes' => ['nullable', 'string', 'max:1000'],
            // Booking fee complexity selector (simple/standard/complex)
            'booking_fee_complexity' => ['nullable', 'in:simple,standard,complex'],
        ]);

        $customer = $request->user('customer');
        if (!$customer) {
            throw ValidationException::withMessages(['auth' => 'Must be logged in as customer']);
        }

        $conversation = Conversation::with('technician')->findOrFail($validated['conversation_id']);

        // Verify conversation belongs to customer
        if ($conversation->customer_id !== $customer->id) {
            abort(403, 'Unauthorized');
        }

        // Determine amount
        $amount = 0;
        $rateTier = $validated['rate_tier'] ?? null;
        if ($rateTier) {
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

        // If a negotiated receipt is provided, trust the receipt_total (validated)
        if (array_key_exists('receipt_total', $validated) && $validated['receipt_total'] !== null) {
            $amount = (float) $validated['receipt_total'];
        }

        // Check if there's already a pending service request
        $existing = ServiceRequest::where('conversation_id', $conversation->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending service request for this conversation',
                'service_request' => $existing,
            ], 422);
        }

        // Compute booking fee from complexity selection
        $complexity = $validated['booking_fee_complexity'] ?? 'standard';
        $fees = config('billing.booking_fee');
        $bookingFee = $fees[$complexity] ?? ($fees['standard'] ?? 20.0);

        $serviceRequest = ServiceRequest::create([
            'conversation_id' => $conversation->id,
            'customer_id' => $customer->id,
            'technician_id' => $conversation->technician_id,
            'rate_tier' => $rateTier,
            'amount' => $amount,
            'status' => 'pending',
            'payment_status' => 'unpaid',
            'customer_notes' => $validated['customer_notes'] ?? null,
            // booking fee
            'booking_fee_net' => $bookingFee,
            'booking_fee_vat' => 0,
            'booking_fee_total' => $bookingFee,
            'booking_fee_complexity' => $complexity,
            'booking_fee_status' => 'unpaid',
            // receipt details
            'receipt_items' => $validated['receipt_items'] ?? null,
            'receipt_total' => array_key_exists('receipt_total', $validated) ? $validated['receipt_total'] : null,
            'receipt_notes' => $validated['receipt_notes'] ?? null,
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
     * Complete a service request (requires booking fee paid)
     */
    public function complete(Request $request, ServiceRequest $serviceRequest)
    {
        $admin = $request->user('admin');
        if (!$admin) {
            abort(403);
        }

        if ($serviceRequest->booking_fee_status !== 'paid') {
            throw ValidationException::withMessages([
                'booking_fee' => 'Booking fee must be paid before completing the job.',
            ]);
        }

        // Require at least one receipt attachment for admin verification
        $attachments = $serviceRequest->receipt_attachments ?? [];
        if (empty($attachments) || count($attachments) === 0) {
            throw ValidationException::withMessages([
                'receipts' => 'Please ensure a receipt/screenshot is uploaded before completion.',
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
        ]);

        $serviceRequest->update([
            'receipt_items' => $validated['receipt_items'],
            'receipt_total' => $validated['receipt_total'],
            'receipt_notes' => $validated['receipt_notes'] ?? null,
            // Keep main amount in sync with receipt total
            'amount' => $validated['receipt_total'],
        ]);

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
        $user = $request->user('technician') ?? $request->user('customer');
        if (!$user) {
            abort(401);
        }
        if ($request->user('technician') && $serviceRequest->technician_id !== $request->user('technician')->id) {
            abort(403);
        }
        if ($request->user('customer') && $serviceRequest->customer_id !== $request->user('customer')->id) {
            abort(403);
        }

        $validated = $request->validate([
            'files' => ['required', 'array', 'min:1', 'max:5'],
            'files.*' => ['file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'], // 5MB
        ]);

        $paths = $serviceRequest->receipt_attachments ?? [];
        foreach ($request->file('files', []) as $file) {
            $paths[] = $file->store('receipts', 'public');
        }

        $serviceRequest->update([
            'receipt_attachments' => $paths,
        ]);

        return response()->json([
            'message' => 'Receipts uploaded',
            'attachments' => $paths,
        ]);
    }

    /**
     * Remove a specific receipt attachment by path
     */
    public function removeReceipt(Request $request, ServiceRequest $serviceRequest)
    {
        $user = $request->user('technician') ?? $request->user('customer');
        if (!$user) {
            abort(401);
        }
        if ($request->user('technician') && $serviceRequest->technician_id !== $request->user('technician')->id) {
            abort(403);
        }
        if ($request->user('customer') && $serviceRequest->customer_id !== $request->user('customer')->id) {
            abort(403);
        }

        $data = $request->validate([
            'path' => ['required', 'string'],
        ]);

        $paths = $serviceRequest->receipt_attachments ?? [];
        $new = array_values(array_filter($paths, fn($p) => $p !== $data['path']));
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

        // Technicians cannot mark completed; admins do via separate endpoint

        $serviceRequest->update($updates);

        return response()->json([
            'message' => 'Service request updated',
            'service_request' => $serviceRequest->fresh(['customer:id,first_name,last_name,name']),
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
