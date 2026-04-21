<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MaterialController;
use App\Http\Controllers\AnalysisController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\TeacherController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public auth routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Authenticated routes (Sanctum token)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Reading materials
    Route::get('/materials', [MaterialController::class, 'index']);
    Route::get('/materials/{id}/download', [MaterialController::class, 'download']);

    // Voice analysis
    Route::post('/analysis', [AnalysisController::class, 'analyze']);

    // Progress sync
    Route::post('/progress', [ProgressController::class, 'store']);

    // Teacher / Admin dashboard
    Route::middleware('role:teacher,admin')->group(function () {
        Route::get('/teacher/students', [TeacherController::class, 'students']);
        Route::get('/teacher/students/{id}/progress', [TeacherController::class, 'studentProgress']);
    });
});
