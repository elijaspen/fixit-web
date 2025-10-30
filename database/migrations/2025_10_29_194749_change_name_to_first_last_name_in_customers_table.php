<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Add new columns
            $table->string('first_name')->nullable()->after('id');
            $table->string('last_name')->nullable()->after('first_name');
        });

        // Migrate existing data: split 'name' into first_name and last_name
        DB::table('customers')->get()->each(function ($customer) {
            $nameParts = explode(' ', $customer->name, 2);
            DB::table('customers')
                ->where('id', $customer->id)
                ->update([
                    'first_name' => $nameParts[0] ?? $customer->name,
                    'last_name' => $nameParts[1] ?? '',
                ]);
        });

        Schema::table('customers', function (Blueprint $table) {
            // Make first_name and last_name required
            $table->string('first_name')->nullable(false)->change();
            $table->string('last_name')->nullable(false)->change();
            // Drop old name column
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
        });

        // Combine first_name and last_name back to name
        DB::table('customers')->get()->each(function ($customer) {
            $fullName = trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? ''));
            DB::table('customers')
                ->where('id', $customer->id)
                ->update(['name' => $fullName]);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->string('name')->nullable(false)->change();
            $table->dropColumn(['first_name', 'last_name']);
        });
    }
};
