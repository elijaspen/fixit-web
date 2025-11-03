<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Technician;
use App\Models\Admin;
use App\Models\Conversation;
use App\Models\Message;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin account
        Admin::create([
            'name' => 'Admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('12345678'),
            'email_verified_at' => now(),
        ]);
    }
}
