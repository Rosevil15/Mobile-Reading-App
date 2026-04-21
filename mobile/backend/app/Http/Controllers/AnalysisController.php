<?php

namespace App\Http\Controllers;

use App\Services\SpeechAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalysisController extends Controller
{
    public function __construct(private SpeechAnalysisService $speechService)
    {
    }

    /**
     * Accept a multipart audio upload and return voice analysis results.
     *
     * POST /api/analysis
     * Protected by auth:sanctum (see routes/api.php)
     *
     * Required fields:
     *   - audio       (file)   — the recorded audio
     *   - material_id (string) — must exist in reading_materials table
     *
     * Returns AnalysisResult JSON on success (200).
     * Returns 422 on validation failure.
     * Returns 502 when the upstream Speech-to-Text API fails.
     */
    public function analyze(Request $request): JsonResponse
    {
        $request->validate([
            'audio'       => 'required|file|mimes:wav,mp3,m4a,ogg,webm',
            'material_id' => 'required|string|exists:reading_materials,id',
        ]);

        try {
            $result = $this->speechService->analyze(
                $request->file('audio'),
                $request->input('material_id')
            );

            return response()->json(['data' => $result]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Voice analysis failed: the Speech-to-Text service returned an error. Please try again.',
                'error'   => $e->getMessage(),
            ], 502);
        }
    }
}
