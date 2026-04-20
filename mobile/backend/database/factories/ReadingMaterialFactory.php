<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReadingMaterial>
 */
class ReadingMaterialFactory extends Factory
{
    public function definition(): array
    {
        $level = fake()->randomElement(['beginner', 'intermediate', 'advanced']);
        $rateMap = ['beginner' => 0.75, 'intermediate' => 1.00, 'advanced' => 1.25];

        return [
            'id'               => Str::uuid(),
            'title'            => fake()->sentence(4),
            'text'             => fake()->paragraphs(3, true),
            'level'            => $level,
            'default_tts_rate' => $rateMap[$level],
            'language'         => 'en',
            'bundled'          => false,
        ];
    }

    public function bundled(): static
    {
        return $this->state(fn (array $attributes) => ['bundled' => true]);
    }

    public function beginner(): static
    {
        return $this->state(fn (array $attributes) => [
            'level'            => 'beginner',
            'default_tts_rate' => 0.75,
        ]);
    }

    public function intermediate(): static
    {
        return $this->state(fn (array $attributes) => [
            'level'            => 'intermediate',
            'default_tts_rate' => 1.00,
        ]);
    }

    public function advanced(): static
    {
        return $this->state(fn (array $attributes) => [
            'level'            => 'advanced',
            'default_tts_rate' => 1.25,
        ]);
    }
}
