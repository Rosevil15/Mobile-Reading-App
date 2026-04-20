<?php

namespace App\Services;

use App\Models\ReadingMaterial;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class SpeechToTextService
{
    /**
     * Analyze an audio recording against a reading material.
     *
     * @throws \Exception on upstream failure
     */
    public function analyze(UploadedFile $audio, string $materialId): array
    {
        $material = ReadingMaterial::findOrFail($materialId);

        $apiKey      = config('services.speech_to_text.key');
        $endpoint    = config('services.speech_to_text.endpoint');

        $audioContent = base64_encode(file_get_contents($audio->getRealPath()));

        $response = Http::withHeaders(['Content-Type' => 'application/json'])
            ->post("{$endpoint}?key={$apiKey}", [
                'config' => [
                    'encoding'        => 'LINEAR16',
                    'sampleRateHertz' => 16000,
                    'languageCode'    => $material->language ?? 'en-US',
                ],
                'audio' => [
                    'content' => $audioContent,
                ],
            ]);

        if (! $response->successful()) {
            throw new \Exception('Speech-to-Text API returned status ' . $response->status());
        }

        return $this->parseResponse($response->json(), $material->text);
    }

    /**
     * Parse the Speech-to-Text API response into an AnalysisResult structure.
     */
    private function parseResponse(array $apiResponse, string $expectedText): array
    {
        $transcript = '';
        if (! empty($apiResponse['results'])) {
            foreach ($apiResponse['results'] as $result) {
                $transcript .= $result['alternatives'][0]['transcript'] ?? '';
            }
        }

        $expectedWords   = preg_split('/\s+/', strtolower(trim($expectedText)));
        $transcriptWords = preg_split('/\s+/', strtolower(trim($transcript)));

        $matchCount = 0;
        $mispronounced = [];

        foreach ($expectedWords as $index => $word) {
            $actual = $transcriptWords[$index] ?? '';
            if ($word === $actual) {
                $matchCount++;
            } else {
                $mispronounced[] = [
                    'word'     => $word,
                    'expected' => $word,
                    'actual'   => $actual,
                    'offsetMs' => 0,
                ];
            }
        }

        $wordAccuracy   = count($expectedWords) > 0
            ? round(($matchCount / count($expectedWords)) * 100, 2)
            : 0;
        $accuracyScore  = $wordAccuracy;
        $fluencyScore   = min(100, $wordAccuracy + 5);

        // Derive pace from word count ratio
        $ratio = count($expectedWords) > 0
            ? count($transcriptWords) / count($expectedWords)
            : 1;

        $pace = match (true) {
            $ratio < 0.7  => 'too_slow',
            $ratio > 1.3  => 'too_fast',
            default       => 'appropriate',
        };

        return [
            'mispronounced' => $mispronounced,
            'pace'          => $pace,
            'accuracyScore' => $accuracyScore,
            'wordAccuracy'  => $wordAccuracy,
            'fluencyScore'  => $fluencyScore,
        ];
    }
}
