<?php

namespace Database\Seeders;

use App\Models\ReadingMaterial;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ReadingMaterialSeeder extends Seeder
{
    public function run(): void
    {
        $materials = [
            [
                'id'               => Str::uuid(),
                'title'            => 'The Little Red Hen',
                'text'             => 'Once upon a time, there was a little red hen who lived on a farm. She found some wheat seeds and decided to plant them. She asked her friends for help, but no one wanted to help her. So she planted the seeds herself. When the wheat grew tall, she asked for help to cut it. Again, no one helped. She cut it herself. She ground the wheat into flour and baked a loaf of bread. When the bread was ready, everyone wanted to eat it. But the little red hen said she would eat it herself, because she had done all the work.',
                'level'            => 'beginner',
                'default_tts_rate' => 0.75,
                'language'         => 'en',
                'bundled'          => true,
            ],
            [
                'id'               => Str::uuid(),
                'title'            => 'The Water Cycle',
                'text'             => 'Water is constantly moving around the Earth in a process called the water cycle. The sun heats water in oceans, lakes, and rivers, causing it to evaporate and rise into the atmosphere as water vapor. As the vapor rises, it cools and condenses into tiny water droplets, forming clouds. When enough droplets collect, they fall back to Earth as precipitation — rain, snow, sleet, or hail. This water flows into rivers and streams, soaks into the ground, or collects in lakes and oceans, where the cycle begins again.',
                'level'            => 'intermediate',
                'default_tts_rate' => 1.00,
                'language'         => 'en',
                'bundled'          => true,
            ],
            [
                'id'               => Str::uuid(),
                'title'            => 'The Theory of Relativity',
                'text'             => 'Albert Einstein\'s theory of relativity, published in two parts in 1905 and 1915, fundamentally changed our understanding of space, time, and gravity. The special theory of relativity introduced the concept that the laws of physics are the same for all observers moving at constant velocities, and that the speed of light in a vacuum is constant regardless of the motion of the source or observer. One of its most famous consequences is the equivalence of mass and energy, expressed in the equation E equals mc squared. The general theory of relativity extended these ideas to include acceleration and gravity, describing gravity not as a force but as a curvature of spacetime caused by mass and energy.',
                'level'            => 'advanced',
                'default_tts_rate' => 1.25,
                'language'         => 'en',
                'bundled'          => true,
            ],
        ];

        foreach ($materials as $material) {
            ReadingMaterial::updateOrCreate(['id' => $material['id']], $material);
        }
    }
}
