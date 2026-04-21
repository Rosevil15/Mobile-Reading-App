<?php

namespace Database\Factories;

use App\Models\ReadingMaterial;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProgressRecord>
 */
class ProgressRecordFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id'               => Str::uuid(),
            'user_id'          => User::factory(),
            'material_id'      => ReadingMaterial::factory(),
            'session_score'    => fake()->randomFloat(2, 0, 100),
            'accuracy_score'   => fake()->randomFloat(2, 0, 100),
            'fluency_score'    => fake()->randomFloat(2, 0, 100),
            'pace'             => fake()->randomElement(['too_slow', 'appropriate', 'too_fast']),
            'feedback_summary' => fake()->sentence(),
            'recording_url'    => null,
            'completed_at'     => now(),
        ];
    }
}
