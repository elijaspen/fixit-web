<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('technician_availabilities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('technician_id');
            $table->date('date');
            // status: 'available' or 'unavailable'
            $table->string('status', 16)->default('available');
            $table->timestamps();

            $table->unique(['technician_id', 'date']);
            $table->foreign('technician_id')->references('id')->on('technicians')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('technician_availabilities');
    }
};


