<?php

namespace App\Http\Controllers;

use App\Models\ProgressRecord;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    /**
     * List all students who have synced ProgressRecords.
     *
     * GET /api/teacher/students
     */
    public function students(Request $request): JsonResponse
    {
        $students = User::where('role', 'student')
            ->whereHas('progressRecords')
            ->get(['id', 'email']);

        return response()->json(['data' => $students]);
    }

    /**
     * Get all ProgressRecords for a specific student.
     *
     * GET /api/teacher/students/{id}/progress
     */
    public function studentProgress(string $id): JsonResponse
    {
        $student = User::where('role', 'student')->findOrFail($id);

        $records = ProgressRecord::where('user_id', $id)
            ->orderBy('completed_at', 'desc')
            ->get();

        return response()->json([
            'student' => [
                'id'    => $student->id,
                'email' => $student->email,
            ],
            'data' => $records,
        ]);
    }
}
