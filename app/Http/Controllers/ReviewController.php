<?php

namespace App\Http\Controllers;

use App\Models\Review;
use App\Models\Technician;
use App\Models\ServiceRequest;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ReviewController extends Controller
{
    /**
     * Helper function to check if a customer has a completed service with a technician.
     */
    private function customerHasCompletedService(Technician $technician, $customer)
    {
        if (!$customer) {
            return false;
        }

        return ServiceRequest::where('technician_id', $technician->id)
            ->where('customer_id', $customer->id)
            ->where('status', 'completed')
            ->exists();
    }

    /**
     * Check if the currently authenticated customer is allowed to rate this technician.
     */
    public function checkCanRate(Request $request, Technician $technician)
    {
        $customer = $request->user('customer');
        
        return response()->json([
            'canRate' => $this->customerHasCompletedService($technician, $customer)
        ]);
    }

    // Create or update a customer's review for a technician
    public function upsert(Request $request, Technician $technician)
    {
        $customer = $request->user('customer');
        abort_unless($customer, 401);

        // --- ADDED VALIDATION CHECK ---
        // Check if the customer has a completed service with this technician
        if (!$this->customerHasCompletedService($technician, $customer)) {
            // Throw a 403 Forbidden error if they haven't
            abort(403, 'You can only review a technician after completing a service with them.');
        }
        // --- END VALIDATION CHECK ---

        $data = $request->validate([
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:2000'],
        ]);

        $review = Review::updateOrCreate(
            ['technician_id' => $technician->id, 'customer_id' => $customer->id],
            ['rating' => $data['rating'], 'comment' => $data['comment'] ?? null]
        );

        return response()->json(['message' => 'Review saved', 'review' => $review]);
    }

    // Fetch current customer review for a technician
    public function mine(Request $request, Technician $technician)
    {
        $customer = $request->user('customer');
        abort_unless($customer, 401);
        $review = Review::where('technician_id', $technician->id)->where('customer_id', $customer->id)->first();
        return response()->json($review);
    }

    // Fetch rating summary for a technician
    public function summary(Technician $technician)
    {
        $avg = Review::where('technician_id', $technician->id)->avg('rating');
        $count = Review::where('technician_id', $technician->id)->count();
        return response()->json(['average' => $avg ? round($avg, 1) : 0, 'count' => $count]);
    }

    // Technician lists their received reviews
    public function listMine(Request $request)
    {
        $technician = $request->user('technician');
        abort_unless($technician, 401);
        $reviews = Review::where('technician_id', $technician->id)
            ->with(['customer:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'rating' => $r->rating,
                    'comment' => $r->comment,
                    'created_at' => $r->created_at?->toISOString(),
                    'customer' => [
                        'id' => $r->customer?->id,
                        'name' => trim(($r->customer?->first_name ?? '') . ' ' . ($r->customer?->last_name ?? '')),
                    ],
                ];
            });
        return response()->json($reviews);
    }

    // Admin lists reviews for a given technician
    public function listForTechnician(Request $request, Technician $technician)
    {
        $admin = $request->user('admin');
        abort_unless($admin, 401);
        $reviews = Review::where('technician_id', $technician->id)
            ->with(['customer:id,first_name,last_name'])
            ->orderByDesc('created_at')
            ->paginate(20);
        return response()->json($reviews);
    }

    // Admin lists all reviews
    public function listAll(Request $request)
    {
        $admin = $request->user('admin');
        abort_unless($admin, 401);
        $query = Review::query()
            ->with([
                'customer:id,first_name,last_name',
                'technician:id,first_name,last_name',
            ])
            ->orderByDesc('created_at');

        if ($request->has('technician_id')) {
            $query->where('technician_id', $request->integer('technician_id'));
        }

        if ($request->has('rating')) {
            $query->where('rating', $request->integer('rating'));
        }

        return response()->json($query->paginate(20));
    }
}