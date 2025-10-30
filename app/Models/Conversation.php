<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'technician_id',
        'consultation_fee',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'consultation_fee' => 'decimal:2',
            'last_message_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function technician(): BelongsTo { return $this->belongsTo(Technician::class); }
    public function messages(): HasMany { return $this->hasMany(Message::class); }
}


