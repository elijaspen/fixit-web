<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->foreignId('technician_id')->constrained('technicians')->cascadeOnDelete();
            $table->decimal('consultation_fee', 10, 2)->nullable();
            $table->timestamp('last_message_at')->nullable();
            $table->timestamps();
            $table->unique(['customer_id', 'technician_id']);
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->string('sender_type');
            $table->unsignedBigInteger('sender_id');
            $table->text('body')->nullable();
            $table->json('attachments')->nullable();
            $table->timestamps();
            $table->index(['sender_type', 'sender_id']);
        });

        Schema::create('message_read_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->string('reader_type');
            $table->unsignedBigInteger('reader_id');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['reader_type', 'reader_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_read_receipts');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('conversations');
    }
};


