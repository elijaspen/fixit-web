<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Technician;
use Illuminate\Http\Request;

class TechnicianController extends Controller
{
    /**
     * Get all technicians for admin management
     */
    public function index(Request $request)
    {
        $query = Technician::query();

        // Filter by verification status
        if ($request->has('is_verified')) {
            $query->where('is_verified', $request->boolean('is_verified'));
        }

        // Filter by has credentials
        if ($request->has('has_credentials')) {
            if ($request->boolean('has_credentials')) {
                $query->whereNotNull('license_image_path')
                    ->whereNotNull('certificates_image_path');
            } else {
                $query->where(function ($q) {
                    $q->whereNull('license_image_path')
                        ->orWhereNull('certificates_image_path');
                });
            }
        }

        // Search by name or email
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 50);
        $technicians = $query
            ->select('id', 'first_name', 'last_name', 'email', 'phone', 'address', 'expertise', 
                'is_verified', 'license_image_path', 'certificates_image_path', 'created_at')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        // Append name accessor and has_credentials for each technician
        $technicians->getCollection()->transform(function ($technician) {
            return array_merge($technician->toArray(), [
                'name' => $technician->name,
                'has_credentials' => !empty($technician->license_image_path) && !empty($technician->certificates_image_path),
            ]);
        });

        return response()->json($technicians);
    }

    /**
     * Get a single technician's details
     */
    public function show(Technician $technician)
    {
        return response()->json([
            'id' => $technician->id,
            'first_name' => $technician->first_name,
            'last_name' => $technician->last_name,
            'name' => $technician->name,
            'email' => $technician->email,
            'phone' => $technician->phone,
            'address' => $technician->address,
            'expertise' => $technician->expertise,
            'services' => $technician->services,
            'is_verified' => $technician->is_verified,
            'license_image_path' => $technician->license_image_path,
            'certificates_image_path' => $technician->certificates_image_path,
            'has_credentials' => !empty($technician->license_image_path) && !empty($technician->certificates_image_path),
            'created_at' => $technician->created_at,
            'updated_at' => $technician->updated_at,
        ]);
    }

    /**
     * Verify or unverify a technician
     */
    public function updateVerification(Request $request, Technician $technician)
    {
        $validated = $request->validate([
            'is_verified' => ['required', 'boolean'],
        ]);

        $technician->update([
            'is_verified' => $validated['is_verified'],
        ]);

        return response()->json([
            'message' => $validated['is_verified'] 
                ? 'Technician verified successfully' 
                : 'Technician verification removed',
            'technician' => $technician->fresh(),
        ]);
    }

    /**
     * Soft delete a technician (recommended over hard delete)
     */
    public function destroy(Request $request, Technician $technician)
    {
        // Instead of deleting, we can mark as inactive or delete
        // For now, let's do a soft approach: mark verification as false and log
        $technician->update([
            'is_verified' => false,
        ]);

        // Optional: Add a deleted_at timestamp if you add soft deletes to the model
        // $technician->delete(); // This requires SoftDeletes trait

        return response()->json([
            'message' => 'Technician disabled successfully',
            'technician' => $technician->fresh(),
        ]);
    }
}
