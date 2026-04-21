<?php

namespace App\Http\Controllers;

use App\Models\ReadingMaterial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialController extends Controller
{
    /**
     * List all available reading materials.
     *
     * GET /api/materials
     */
    public function index(Request $request): JsonResponse
    {
        $materials = ReadingMaterial::all([
            'id', 'title', 'level', 'default_tts_rate', 'language', 'bundled',
        ]);

        return response()->json(['data' => $materials]);
    }

    /**
     * Download a full reading material for offline use.
     *
     * GET /api/materials/{id}/download
     */
    public function download(string $id): JsonResponse
    {
        $material = ReadingMaterial::findOrFail($id);

        return response()->json(['data' => $material]);
    }
}
