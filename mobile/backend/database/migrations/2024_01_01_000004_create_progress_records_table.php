<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('progress_records', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->char('user_id', 36);
            $table->char('material_id', 36);
            $table->decimal('session_score', 5, 2);
            $table->decimal('accuracy_score', 5, 2);
            $table->decimal('fluency_score', 5, 2);
            $table->string('pace', 20);
            $table->text('feedback_summary')->nullable();
            $table->string('recording_url', 2048)->nullable();
            $table->timestamp('completed_at');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users');
            $table->foreign('material_id')->references('id')->on('reading_materials');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('progress_records');
    }
};
