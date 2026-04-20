<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reading_materials', function (Blueprint $table) {
            $table->char('id', 36)->primary()->default(DB::raw('(UUID())'));
            $table->string('title', 255);
            $table->longText('text');
            $table->string('level', 50);
            $table->decimal('default_tts_rate', 4, 2);
            $table->string('language', 10)->default('en');
            $table->tinyInteger('bundled')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reading_materials');
    }
};
