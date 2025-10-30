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
        Schema::create('technician_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('technician_id')->constrained('technicians')->cascadeOnDelete();
            $table->string('component_name'); // e.g., "iPhone 14 Screen", "Samsung Galaxy Battery"
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('device_type')->nullable(); // e.g., "iPhone", "Samsung", "Generic"
            $table->string('compatibility')->nullable(); // e.g., "iPhone 13, iPhone 14"
            $table->boolean('in_stock')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('technician_components');
    }
};
