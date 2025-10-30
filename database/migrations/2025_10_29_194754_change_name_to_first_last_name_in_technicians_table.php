<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('technicians', function (Blueprint $table) {
            // Add new columns
            $table->string('first_name')->nullable()->after('id');
            $table->string('last_name')->nullable()->after('first_name');
        });

        // Migrate existing data: split 'name' into first_name and last_name
        DB::table('technicians')->get()->each(function ($technician) {
            $nameParts = explode(' ', $technician->name, 2);
            DB::table('technicians')
                ->where('id', $technician->id)
                ->update([
                    'first_name' => $nameParts[0] ?? $technician->name,
                    'last_name' => $nameParts[1] ?? '',
                ]);
        });

        Schema::table('technicians', function (Blueprint $table) {
            // Make first_name and last_name required
            $table->string('first_name')->nullable(false)->change();
            $table->string('last_name')->nullable(false)->change();
            // Drop old name column
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('technicians', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
        });

        // Combine first_name and last_name back to name
        DB::table('technicians')->get()->each(function ($technician) {
            $fullName = trim(($technician->first_name ?? '') . ' ' . ($technician->last_name ?? ''));
            DB::table('technicians')
                ->where('id', $technician->id)
                ->update(['name' => $fullName]);
        });

        Schema::table('technicians', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            $table->dropColumn(['first_name', 'last_name']);
        });
    }
};
