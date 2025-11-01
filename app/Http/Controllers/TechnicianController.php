<?php

namespace App\Http\Controllers;

use App\Models\Technician;
use Illuminate\Http\Request;

class TechnicianController extends Controller
{
    /**
     * List all technicians for customers to browse
     */
    public function index(Request $request)
    {
        $query = Technician::query();

        // Filter by location (if customer has location)
        if ($request->has('latitude') && $request->has('longitude')) {
            // TODO: Add distance calculation and sorting
            // For now, just return all technicians
        }

        // Filter by specialization/expertise
        if ($request->has('specialization')) {
            $query->where('expertise', 'like', '%' . $request->get('specialization') . '%');
        }

        // Filter by minimum rating (when ratings are implemented)
        // if ($request->has('min_rating')) {
        //     $query->having('avg_rating', '>=', $request->get('min_rating'));
        // }

        $technicians = $query
            ->where('is_verified', true) // Only show verified technicians
            ->select('id', 'first_name', 'last_name', 'email', 'phone', 'address', 'latitude', 'longitude', 'expertise', 'services', 'base_pricing', 'standard_rate', 'professional_rate', 'premium_rate', 'availability_notes', 'license_image_path', 'certificates_image_path', 'avatar_path', 'created_at')
            ->get()
            ->map(function ($t) {
                // Ensure accessor 'name' is present for frontend
                $arr = $t->toArray();
                $arr['name'] = $t->name;
                return $arr;
            });

        return response()->json($technicians);
    }

    /**
     * Get a single technician's details
     */
    public function show(Technician $technician)
    {
        if (!$technician->is_verified) {
            return response()->json(['message' => 'Technician not found'], 404);
        }

        $technicianData = $technician->only([
            'id', 'name', 'email', 'phone', 'address', 'latitude', 'longitude',
            'expertise', 'services', 'base_pricing', 'standard_rate', 'professional_rate', 'premium_rate',
            'availability_notes', 'license_image_path', 'certificates_image_path', 'avatar_path', 'created_at'
        ]);
        
        // Include components
        $technicianData['components'] = $technician->components()->get();
        
        return response()->json($technicianData);
    }
}

