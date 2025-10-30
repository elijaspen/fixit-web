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
        Schema::table('technicians', function (Blueprint $table) {
            // Pricing tiers based on fix complexity
            // Standard Rate: For simple fixes (e.g., screen protector, battery replacement)
            $table->decimal('standard_rate', 10, 2)->nullable()->after('base_pricing');
            // Professional Rate: For medium complexity fixes (e.g., screen replacement, software issues)
            $table->decimal('professional_rate', 10, 2)->nullable()->after('standard_rate');
            // Premium Rate: For complex/severe fixes (e.g., motherboard repair, water damage)
            $table->decimal('premium_rate', 10, 2)->nullable()->after('professional_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('technicians', function (Blueprint $table) {
            $table->dropColumn(['standard_rate', 'professional_rate', 'premium_rate']);
        });
    }
};
