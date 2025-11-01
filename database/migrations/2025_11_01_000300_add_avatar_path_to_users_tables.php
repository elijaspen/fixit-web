<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('address');
        });
        Schema::table('technicians', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('certificates_image_path');
        });
        Schema::table('admins', function (Blueprint $table) {
            $table->string('avatar_path')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
        Schema::table('technicians', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
        Schema::table('admins', function (Blueprint $table) {
            $table->dropColumn('avatar_path');
        });
    }
};


