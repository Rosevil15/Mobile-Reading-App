<?php

namespace App\Http\Controllers;

use App\Models\ProgressRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProgressController extends Controller
{
    /**
     * Sync one or more ProgressRecords from the mobile client.
     *
     * POST /api/progress
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'records'                    => 'required|array|min:1',
            'records.*.id'               => 'required|string',
            'records.*.material_id'      => 'required|string|exists:reading_materials,id',
            'records.*.session_score'    => 'required|numeric|min:0|max:100',
            'records.*.accuracy_score'   => 'required|numeric|min:0|max:100',
            'records.*.fluency_score'    => 'required|numeric|min:0|max:100',
            'records.*.pace'             => 'required|in:too_slow,appropriate,too_fast',
            'records.*.feedback_summary' => 'nullable|string',
            'records.*.recording_url'    => 'nullable|string',
            'records.*.completed_at'     => 'required|date',
        ]);

        $userId = $request->user()->id;
        $results = [];

        foreach ($request->input('records') as $data) {
            try {
                ProgressRecord::updateOrCreate(
                    ['id' => $data['id']],
                    [
                        'user_id'          => $userId,
                        'material_id'      => $data['material_id'],
                        'session_score'    => $data['session_score'],
                        'accuracy_score'   => $data['accuracy_score'],
                        'fluency_score'    => $data['fluency_score'],
                        'pace'             => $data['pace'],
                        'feedback_summary' => $data['feedback_summary'] ?? null,
                        'recording_url'    => $data['recording_url'] ?? null,
                        'completed_at'     => $data['completed_at'],
                    ]
                );
                $results[] = ['id' => $data['id'], 'status' => 'synced'];
            } catch (\Exception $e) {
                $results[] = ['id' => $data['id'], 'status' => 'failed', 'error' => $e->getMessage()];
            }
        }

        return response()->json(['results' => $results]);
    }
}
