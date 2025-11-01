<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\Customer;
use App\Models\Technician;
use App\Models\ServiceRequest;

class AdminStatsController extends Controller
{
    // GET /api/admin/stats
    public function index()
    {
        $totalAdmins = Admin::count();
        $totalTechnicians = Technician::count();
        $totalCustomers = Customer::count();
        $totalUsers = $totalAdmins + $totalTechnicians + $totalCustomers;
        $pendingServiceRequests = ServiceRequest::where('status', 'pending')->count();

        return response()->json([
            'total_users' => $totalUsers,
            'total_technicians' => $totalTechnicians,
            'total_customers' => $totalCustomers,
            'pending_service_requests' => $pendingServiceRequests,
        ]);
    }
}


