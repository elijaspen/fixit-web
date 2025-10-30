<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TechnicianComponent extends Model
{
    use HasFactory;

    protected $fillable = [
        'technician_id',
        'component_name',
        'description',
        'price',
        'device_type',
        'compatibility',
        'in_stock',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'in_stock' => 'boolean',
        ];
    }

    /**
     * Get the technician that owns this component
     */
    public function technician()
    {
        return $this->belongsTo(Technician::class);
    }
}
