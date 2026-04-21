# Mobile Reading App — Laravel Backend

PHP 8.1+ / Laravel 10 REST API backend for the Mobile Reading App.

## Requirements

- PHP 8.1+
- Composer
- MySQL 8.0+

## Setup

```bash
# Install dependencies
composer install

# Copy environment file and configure
cp .env.example .env
# Edit .env: set DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# Seed bundled reading materials
php artisan db:seed

# Start development server
php artisan serve
```

## Authentication

Uses [Laravel Sanctum](https://laravel.com/docs/sanctum) for token-based API authentication.

All API routes (except `POST /api/auth/login`) require a `Bearer` token in the `Authorization` header.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | none | Authenticate, returns token |
| POST | `/api/auth/logout` | JWT | Revoke current token |
| GET | `/api/materials` | JWT | List reading materials |
| GET | `/api/materials/{id}/download` | JWT | Download material for offline use |
| POST | `/api/analysis` | JWT | Submit audio for voice analysis |
| POST | `/api/progress` | JWT | Sync ProgressRecords |
| GET | `/api/teacher/students` | Teacher/Admin JWT | List students |
| GET | `/api/teacher/students/{id}/progress` | Teacher/Admin JWT | Student progress records |

## Testing

```bash
php artisan test
```

Tests use an in-memory SQLite database (configured in `phpunit.xml`).
