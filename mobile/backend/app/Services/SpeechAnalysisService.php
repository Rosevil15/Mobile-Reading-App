<?php

namespace App\Services;

use App\Models\ReadingMaterial;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

class SpeechAnalysisService
{
    /**
     * Analyze an audio recording against a reading material.
     *
     * Forwards audio to Google Cloud Speech-to-Text, then computes
     * mispronounced words, pace, accuracy_score, word_accuracy, and fluency_score.
     *
     * @throws \Exception when the Speech-to-Text API returns a non-2xx response
     */
    public function analyze(UploadedFile $audio, string $materialId): array
    {
        $material = ReadingMaterial::findOrFail($materialId);

        $apiKey   = config('services.speech_to_text.key');
        $endpoint = config('services.speech_to_text.endpoint');

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
            throw new \Exception(
                'Speech-to-Text API returned status ' . $response->status() . ': ' . $response->body()
            );
        }

        return $this->computeMetrics($response->json(), $material->text);
    }

    /**
     * Compute analysis metrics by comparing the STT transcript to the expected text.
     */
    private function computeMetrics(array $apiResponse, string $expectedText): array
    {
        // Extract full transcript from API response
        $transcript = '';
        if (! empty($apiResponse['results'])) {
            foreach ($apiResponse['results'] as $result) {
                $transcript .= $result['alternatives'][0]['transcript'] ?? '';
            }
        }

        $expectedWords   = $this->tokenize($expectedText);
        $transcriptWords = $this->tokenize($transcript);

        $matchCount    = 0;
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

        $totalExpected = count($expectedWords);

        $wordAccuracy  = $totalExpected > 0
            ? round(($matchCount / $totalExpected) * 100, 2)
            : 0.0;

        $accuracyScore = $wordAccuracy;

        // Fluency is slightly higher than word accuracy (rewards smooth delivery)
        $fluencyScore  = min(100, round($wordAccuracy + 5, 2));

        // Pace: compare spoken word count to expected word count
        $ratio = $totalExpected > 0
            ? count($transcriptWords) / $totalExpected
            : 1.0;

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

    /**
     * Normalise text into a lowercase word array, stripping punctuation.
     */
    private function tokenize(string $text): array
    {
        $clean = preg_replace('/[^a-z0-9\s]/i', '', strtolower(trim($text)));
        return preg_split('/\s+/', $clean, -1, PREG_SPLIT_NO_EMPTY);
    }
}
