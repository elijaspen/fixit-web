<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            // Booking fee fields (no VAT, but keep split for future flexibility)
            $table->decimal('booking_fee_net', 10, 2)->nullable()->after('amount');
            $table->decimal('booking_fee_vat', 10, 2)->default(0)->after('booking_fee_net');
            $table->decimal('booking_fee_total', 10, 2)->nullable()->after('booking_fee_vat');
            $table->string('booking_fee_complexity')->nullable()->after('booking_fee_total'); // simple | standard | complex
            $table->enum('booking_fee_status', ['unpaid', 'paid'])->default('unpaid')->after('booking_fee_total');
            $table->timestamp('booking_fee_paid_at')->nullable()->after('booking_fee_status');
            $table->string('booking_fee_payment_method')->nullable()->after('booking_fee_paid_at'); // gcash, bank_transfer, cash, manual
            $table->string('booking_fee_reference')->nullable()->after('booking_fee_payment_method');

            // Receipt metadata (for generated receipt)
            $table->string('receipt_number')->nullable()->after('booking_fee_reference');
            $table->json('receipt_items')->nullable()->after('receipt_number'); // [{ desc, qty, unit_price, amount }]
            $table->decimal('receipt_total', 10, 2)->nullable()->after('receipt_items');
            $table->text('receipt_notes')->nullable()->after('receipt_total');
            $table->string('receipt_pdf_path')->nullable()->after('receipt_notes');

            // Receipt attachments (screenshots / proofs) - store as JSON list of file paths
            $table->json('receipt_attachments')->nullable()->after('receipt_pdf_path');

            // Customer payment tracking (what customer paid to technician)
            $table->enum('customer_payment_method', ['cash', 'gcash', 'other'])->nullable()->after('receipt_attachments');
            $table->enum('customer_payment_status', ['unpaid', 'paid', 'partial'])->default('unpaid')->after('customer_payment_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            $table->dropColumn([
                'booking_fee_net',
                'booking_fee_vat',
                'booking_fee_total',
                'booking_fee_status',
                'booking_fee_paid_at',
                'booking_fee_payment_method',
                'booking_fee_reference',
                'receipt_number',
                'receipt_items',
                'receipt_total',
                'receipt_notes',
                'receipt_pdf_path',
                'receipt_attachments',
                'customer_payment_method',
                'customer_payment_status',
            ]);
        });
    }
};
