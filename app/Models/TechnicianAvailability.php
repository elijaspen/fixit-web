<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TechnicianAvailability extends Model
{
    use HasFactory;

    protected $fillable = [
        'technician_id',
        'date',
        'status',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function technician()
    {
        return $this->belongsTo(Technician::class);
    }
}


