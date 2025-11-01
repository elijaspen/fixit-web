<?php

namespace App\Http\Controllers;

use App\Models\TechnicianAvailability;
use App\Models\Technician;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;

class TechnicianAvailabilityController extends Controller
{
    // GET /api/technicians/{technician}/availability?week_start=YYYY-MM-DD
    public function index(Request $request, Technician $technician)
    {
        $weekStart = Carbon::parse($request->query('week_start', Carbon::now()->startOfWeek()));
        $weekEnd = (clone $weekStart)->endOfWeek();

        $records = TechnicianAvailability::where('technician_id', $technician->id)
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get()
            ->keyBy(fn ($r) => Carbon::parse($r->date)->toDateString());

        $period = CarbonPeriod::create($weekStart, $weekEnd);
        $days = [];
        foreach ($period as $date) {
            $iso = $date->toDateString();
            $status = $records[$iso]->status ?? 'available';
            $days[] = [
                'date' => $iso,
                'status' => $status,
            ];
        }

        return response()->json([
            'technician_id' => $technician->id,
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'days' => $days,
        ]);
    }

    // GET /api/technicians/me/availability?week_start=YYYY-MM-DD
    public function indexMe(Request $request)
    {
        $technician = $request->user('technician');
        if (!$technician) {
            abort(403);
        }
        $weekStart = Carbon::parse($request->query('week_start', Carbon::now()->startOfWeek()));
        $weekEnd = (clone $weekStart)->endOfWeek();

        $records = TechnicianAvailability::where('technician_id', $technician->id)
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get()
            ->keyBy(fn ($r) => Carbon::parse($r->date)->toDateString());

        $period = CarbonPeriod::create($weekStart, $weekEnd);
        $days = [];
        foreach ($period as $date) {
            $iso = $date->toDateString();
            $status = $records[$iso]->status ?? 'available';
            $days[] = [
                'date' => $iso,
                'status' => $status,
            ];
        }

        return response()->json([
            'technician_id' => $technician->id,
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'days' => $days,
        ]);
    }

    // POST /api/technicians/me/availability
    // Body: { week_start: YYYY-MM-DD, days: [{ date: YYYY-MM-DD, status: 'available'|'unavailable' }] }
    public function upsert(Request $request)
    {
        $technician = $request->user('technician');
        if (!$technician) {
            abort(403);
        }

        $validated = $request->validate([
            // week_start is optional for monthly edits; we infer from dates
            'week_start' => ['nullable', 'date'],
            'days' => ['required', 'array', 'min:1'],
            'days.*.date' => ['required', 'date'],
            'days.*.status' => ['required', 'in:available,unavailable'],
        ]);

        foreach ($validated['days'] as $day) {
            TechnicianAvailability::updateOrCreate(
                [
                    'technician_id' => $technician->id,
                    'date' => $day['date'],
                ],
                [
                    'status' => $day['status'],
                ]
            );
        }

        return response()->json(['message' => 'Availability saved']);
    }

    // GET /api/technicians/{technician}/availability/month?month=YYYY-MM
    public function monthIndex(Request $request, Technician $technician)
    {
        $month = $request->query('month');
        $firstDay = $month ? Carbon::createFromFormat('Y-m', $month)->startOfMonth() : Carbon::now()->startOfMonth();
        $lastDay = (clone $firstDay)->endOfMonth();

        $records = TechnicianAvailability::where('technician_id', $technician->id)
            ->whereBetween('date', [$firstDay->toDateString(), $lastDay->toDateString()])
            ->get()
            ->keyBy(fn ($r) => Carbon::parse($r->date)->toDateString());

        $period = CarbonPeriod::create($firstDay, $lastDay);
        $days = [];
        foreach ($period as $date) {
            $iso = $date->toDateString();
            $days[] = [
                'date' => $iso,
                'status' => $records[$iso]->status ?? 'available',
            ];
        }

        return response()->json([
            'technician_id' => $technician->id,
            'month' => $firstDay->format('Y-m'),
            'days' => $days,
        ]);
    }

    // GET /api/technicians/me/availability/month?month=YYYY-MM
    public function monthIndexMe(Request $request)
    {
        $technician = $request->user('technician');
        if (!$technician) {
            abort(403);
        }
        $month = $request->query('month');
        $firstDay = $month ? Carbon::createFromFormat('Y-m', $month)->startOfMonth() : Carbon::now()->startOfMonth();
        $lastDay = (clone $firstDay)->endOfMonth();

        $records = TechnicianAvailability::where('technician_id', $technician->id)
            ->whereBetween('date', [$firstDay->toDateString(), $lastDay->toDateString()])
            ->get()
            ->keyBy(fn ($r) => Carbon::parse($r->date)->toDateString());

        $period = CarbonPeriod::create($firstDay, $lastDay);
        $days = [];
        foreach ($period as $date) {
            $iso = $date->toDateString();
            $days[] = [
                'date' => $iso,
                'status' => $records[$iso]->status ?? 'available',
            ];
        }

        return response()->json([
            'technician_id' => $technician->id,
            'month' => $firstDay->format('Y-m'),
            'days' => $days,
        ]);
    }
}


