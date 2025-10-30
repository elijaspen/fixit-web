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

            // Create sample customer
            $customer = Customer::factory()->create([
                'first_name' => 'John',
                'last_name' => 'Customer',
                'email' => 'customer@gmail.com',
                'password' => Hash::make('12345678'),
                'address' => '123 Main Street, City, Province',
                'email_verified_at' => now(),
            ]);

            // Create sample technician
            $technician = Technician::factory()->create([
                'first_name' => 'Jane',
                'last_name' => 'Technician',
                'email' => 'technician@gmail.com',
                'password' => Hash::make('12345678'),
                'address' => '456 Tech Avenue, City, Province',
                'email_verified_at' => now(),
                'expertise' => 'Mobile Repair',
                'is_verified' => true, // Verify the technician so they appear in customer search
            ]);

        // Create sample conversation and messages
        $conversation = Conversation::create([
            'customer_id' => $customer->id,
            'technician_id' => $technician->id,
            'last_message_at' => now(),
        ]);

        Message::create([
            'conversation_id' => $conversation->id,
            'sender_type' => Customer::class,
            'sender_id' => $customer->id,
            'body' => 'Hello, my phone screen is cracked.',
        ]);
        Message::create([
            'conversation_id' => $conversation->id,
            'sender_type' => Technician::class,
            'sender_id' => $technician->id,
            'body' => 'I can help. What model is it?',
        ]);
    }
}
