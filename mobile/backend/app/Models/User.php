<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The primary key type.
     */
    protected $keyType = 'string';

    /**
     * Disable auto-incrementing since we use UUIDs.
     */
    public $incrementing = false;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'id',
        'email',
        'password',
        'role',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Valid roles for a user.
     */
    const ROLES = ['student', 'teacher', 'admin'];

    /**
     * Check if the user has a teacher or admin role.
     */
    public function isTeacherOrAdmin(): bool
    {
        return in_array($this->role, ['teacher', 'admin']);
    }

    /**
     * Progress records belonging to this user.
     */
    public function progressRecords()
    {
        return $this->hasMany(ProgressRecord::class);
    }
}
