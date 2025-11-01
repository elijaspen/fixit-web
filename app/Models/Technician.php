<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class Technician extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'technicians';

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'address',
        'latitude',
        'longitude',
        'expertise',
        'services',
        'base_pricing',
        'standard_rate',
        'professional_rate',
        'premium_rate',
        'availability_notes',
        'license_image_path',
        'certificates_image_path',
        'avatar_path',
        'is_verified',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'name',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'latitude' => 'float',
            'longitude' => 'float',
            'base_pricing' => 'decimal:2',
            'standard_rate' => 'decimal:2',
            'professional_rate' => 'decimal:2',
            'premium_rate' => 'decimal:2',
            'is_verified' => 'boolean',
        ];
    }

    public function isTechnician(): bool
    {
        return true;
    }

    /**
     * Get the user's full name.
     */
    public function getNameAttribute(): string
    {
        return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? ''));
    }

    /**
     * Get the components offered by this technician
     */
    public function components()
    {
        return $this->hasMany(TechnicianComponent::class);
    }
}


