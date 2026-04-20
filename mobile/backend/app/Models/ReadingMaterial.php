<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReadingMaterial extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'title',
        'text',
        'level',
        'default_tts_rate',
        'language',
        'bundled',
    ];

    protected $casts = [
        'bundled' => 'boolean',
        'default_tts_rate' => 'float',
    ];

    /**
     * Progress records for this material.
     */
    public function progressRecords()
    {
        return $this->hasMany(ProgressRecord::class);
    }
}
