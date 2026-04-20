<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProgressRecord extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'user_id',
        'material_id',
        'session_score',
        'accuracy_score',
        'fluency_score',
        'pace',
        'feedback_summary',
        'recording_url',
        'completed_at',
    ];

    protected $casts = [
        'session_score'  => 'float',
        'accuracy_score' => 'float',
        'fluency_score'  => 'float',
        'completed_at'   => 'datetime',
    ];

    /**
     * The user who owns this record.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The reading material this record is for.
     */
    public function material()
    {
        return $this->belongsTo(ReadingMaterial::class);
    }
}
