<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            // FIX: Change status column from something small (e.g., VARCHAR(20)) 
            // to something large enough (e.g., 50) OR to a TEXT column.
            $table->string('status', 50)->change(); 
        });
    }

    public function down(): void
    {
        Schema::table('service_requests', function (Blueprint $table) {
            // Revert the column back if needed
            $table->string('status', 20)->change(); // Assuming original was 20
        });
    }
};