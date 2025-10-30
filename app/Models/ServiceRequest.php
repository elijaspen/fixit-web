<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'customer_id',
        'technician_id',
        'rate_tier',
        'amount',
        'status',
        'payment_status',
        'payment_method',
        'customer_notes',
        'technician_notes',
        'service_date',
        'completed_at',
        // booking fee fields
        'booking_fee_net',
        'booking_fee_vat',
        'booking_fee_total',
        'booking_fee_complexity',
        'booking_fee_status',
        'booking_fee_paid_at',
        'booking_fee_payment_method',
        'booking_fee_reference',
        // receipt fields
        'receipt_number',
        'receipt_items',
        'receipt_total',
        'receipt_notes',
        'receipt_pdf_path',
        'receipt_attachments',
        // customer payment
        'customer_payment_method',
        'customer_payment_status',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'service_date' => 'datetime',
            'completed_at' => 'datetime',
            'booking_fee_net' => 'decimal:2',
            'booking_fee_vat' => 'decimal:2',
            'booking_fee_total' => 'decimal:2',
            'booking_fee_paid_at' => 'datetime',
            'receipt_items' => 'array',
            'receipt_total' => 'decimal:2',
            'receipt_attachments' => 'array',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(Technician::class);
    }
}
