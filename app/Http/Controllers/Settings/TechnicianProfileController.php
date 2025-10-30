<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TechnicianProfileController extends Controller
{
    public function update(Request $request)
    {
        $technician = $request->user('technician');
        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:32'],
            'address' => ['sometimes', 'string', 'max:500'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'expertise' => ['sometimes', 'string', 'max:255'],
            'services' => ['sometimes', 'string'],
            'base_pricing' => ['sometimes', 'numeric', 'min:0'],
            'standard_rate' => ['sometimes', 'numeric', 'min:0'],
            'professional_rate' => ['sometimes', 'numeric', 'min:0'],
            'premium_rate' => ['sometimes', 'numeric', 'min:0'],
            'availability_notes' => ['sometimes', 'string', 'max:1000'],
        ]);

        $technician->fill($validated)->save();

        return response()->json(['message' => 'Profile updated', 'technician' => $technician]);
    }

    public function uploadLicense(Request $request)
    {
        $technician = $request->user('technician');
        $request->validate([
            'license' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $path = $request->file('license')->store('technician_docs/licenses', 'public');
        $technician->license_image_path = $path;
        $technician->save();

        return response()->json(['message' => 'License uploaded', 'path' => $path]);
    }

    public function uploadCertificates(Request $request)
    {
        $technician = $request->user('technician');
        $request->validate([
            'certificates' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        $path = $request->file('certificates')->store('technician_docs/certificates', 'public');
        $technician->certificates_image_path = $path;
        $technician->save();

        return response()->json(['message' => 'Certificates uploaded', 'path' => $path]);
    }
}


