# Visitor Management System API Documentation

This document provides comprehensive information about the Visitor Management System (VMS) API, its endpoints, authentication methods, request/response formats, error handling, and integration with Laravel applications.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Get All Visitors](#get-all-visitors)
   - [Get Visitor by ID](#get-visitor-by-id)
   - [Get All Visits](#get-all-visits)
   - [Get Statistics](#get-statistics)
   - [API Documentation](#api-documentation)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)
6. [Pagination](#pagination)
7. [Rate Limiting](#rate-limiting)
8. [Laravel Integration](#laravel-integration)
   - [Environment Setup](#environment-setup)
   - [Service Class Implementation](#service-class-implementation)
   - [Controller Examples](#controller-examples)
   - [Blade Templates](#blade-templates)
9. [Best Practices](#best-practices)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)
12. [Changelog](#changelog)

## Overview

The VMS API allows external applications to access visitor data, visit records, and statistical information from the Visitor Management System. This API is designed with RESTful principles, using JSON for data exchange and standard HTTP methods and status codes.

**Base URL**: `https://your-visitor-system.replit.app`

## Authentication

All API requests require authentication using an API key. The API key must be included in the HTTP header of each request.

```
X-API-Key: your-api-key-here
```

### Obtaining an API Key

For development purposes, the default API key is: `vms-dev-api-key-2025`

For production environments, contact the system administrator to obtain a unique API key.

### API Key Security

- Store your API key securely
- Never expose your API key in client-side code
- Rotate keys periodically
- Use different keys for development and production environments

## API Endpoints

### Get All Visitors

Retrieves a paginated list of visitors with optional filtering.

**Endpoint:** `GET /api/external/visitors`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number for pagination (default: 1) |
| limit | integer | No | Number of records per page (default: 100) |
| name | string | No | Filter visitors by name (partial match) |
| verified | boolean | No | Filter by verification status (`true` or `false`) |
| sortBy | string | No | Field to sort by (`id`, `name`, `visits`) |
| sortOrder | string | No | Sort order (`asc` or `desc`) |

**Example Request:**

```bash
curl -X GET "https://your-visitor-system.replit.app/api/external/visitors?page=1&limit=10&name=John&verified=true&sortBy=name&sortOrder=asc" \
  -H "X-API-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Example Response:**

```json
{
  "data": [
    {
      "id": 123,
      "fullName": "John Smith",
      "yearOfBirth": 1985,
      "sex": "Masculin",
      "email": "john.smith@example.com",
      "phoneNumber": "243812345678",
      "municipality": "Kinshasa",
      "visitCount": 5,
      "verified": true,
      "deleted": false,
      "createdAt": "2025-04-10T14:30:45Z",
      "updatedAt": "2025-04-15T09:22:18Z"
    },
    // More visitors...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 243,
    "totalPages": 25
  }
}
```

### Get Visitor by ID

Retrieves a specific visitor by their ID.

**Endpoint:** `GET /api/external/visitors/{id}`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | integer | Yes | The unique ID of the visitor |

**Example Request:**

```bash
curl -X GET "https://your-visitor-system.replit.app/api/external/visitors/123" \
  -H "X-API-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Example Response:**

```json
{
  "id": 123,
  "fullName": "John Smith",
  "yearOfBirth": 1985,
  "sex": "Masculin",
  "email": "john.smith@example.com",
  "phoneNumber": "243812345678",
  "municipality": "Kinshasa",
  "visitCount": 5,
  "verified": true,
  "deleted": false,
  "createdAt": "2025-04-10T14:30:45Z",
  "updatedAt": "2025-04-15T09:22:18Z"
}
```

### Get All Visits

Retrieves a paginated list of visits with optional filtering.

**Endpoint:** `GET /api/external/visits`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number for pagination (default: 1) |
| limit | integer | No | Number of records per page (default: 100) |
| status | string | No | Filter by visit status (`active` or `completed`) |
| dateFrom | string | No | Filter visits after this date (ISO 8601 format) |
| dateTo | string | No | Filter visits before this date (ISO 8601 format) |
| visitorId | integer | No | Filter by visitor ID |

**Example Request:**

```bash
curl -X GET "https://your-visitor-system.replit.app/api/external/visits?page=1&limit=10&status=active&dateFrom=2025-04-01T00:00:00Z&dateTo=2025-04-30T23:59:59Z" \
  -H "X-API-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Example Response:**

```json
{
  "data": [
    {
      "visit": {
        "id": 456,
        "visitorId": 123,
        "purpose": "Business Meeting",
        "partnerId": null,
        "active": true,
        "checkInTime": "2025-04-17T09:15:30Z",
        "checkOutTime": null
      },
      "visitor": {
        "id": 123,
        "fullName": "John Smith",
        "yearOfBirth": 1985,
        "sex": "Masculin",
        "email": "john.smith@example.com",
        "phoneNumber": "243812345678",
        "municipality": "Kinshasa",
        "visitCount": 5,
        "verified": true,
        "deleted": false
      }
    },
    // More visits...
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 56
  }
}
```

### Get Statistics

Retrieves statistical information about visitors and visits within a specified date range.

**Endpoint:** `GET /api/external/statistics`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| dateFrom | string | No | Start date for statistics (ISO 8601 format, default: 30 days ago) |
| dateTo | string | No | End date for statistics (ISO 8601 format, default: current date) |

**Example Request:**

```bash
curl -X GET "https://your-visitor-system.replit.app/api/external/statistics?dateFrom=2025-03-18T00:00:00Z&dateTo=2025-04-17T23:59:59Z" \
  -H "X-API-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Example Response:**

```json
{
  "periodStart": "2025-03-18T00:00:00.000Z",
  "periodEnd": "2025-04-17T23:59:59.999Z",
  "totalVisits": 752,
  "uniqueVisitors": 483,
  "averageDuration": 45,
  "visitsByDay": [
    { "date": "2025-03-18", "count": 24 },
    { "date": "2025-03-19", "count": 31 },
    // More dates...
  ],
  "visitsByPurpose": [
    { "purpose": "Business Meeting", "count": 245 },
    { "purpose": "Interview", "count": 183 },
    // More purposes...
  ],
  "visitsByMunicipality": [
    { "municipality": "Kinshasa", "count": 352 },
    { "municipality": "Gombe", "count": 98 },
    // More municipalities...
  ],
  "visitsByGender": [
    { "gender": "Masculin", "count": 304 },
    { "gender": "Feminin", "count": 179 }
  ],
  "verifiedPercentage": 68
}
```

### API Documentation

Returns information about all available endpoints.

**Endpoint:** `GET /api/external`

**Example Request:**

```bash
curl -X GET "https://your-visitor-system.replit.app/api/external" \
  -H "X-API-Key: your-api-key-here" \
  -H "Accept: application/json"
```

**Example Response:**

```json
{
  "name": "Visitor Management System API",
  "version": "1.0",
  "description": "API for integrating with the Visitor Management System",
  "endpoints": [
    { 
      "path": "/api/external/visitors", 
      "method": "GET", 
      "description": "Get all visitors with pagination and filtering",
      "parameters": [
        { "name": "page", "type": "number", "description": "Page number for pagination" },
        // More parameters...
      ]
    },
    // More endpoints...
  ],
  "authentication": "API Key required in X-API-Key header"
}
```

## Data Models

### Visitor

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Unique identifier |
| fullName | string | Full name of the visitor |
| yearOfBirth | integer | Year of birth |
| sex | string | Sex/gender ("Masculin" or "Feminin") |
| email | string | Email address (optional) |
| phoneNumber | string | Phone number |
| municipality | string | Municipality/district |
| visitCount | integer | Number of visits by this visitor |
| verified | boolean | Verification status |
| deleted | boolean | Soft deletion status |
| createdAt | string | Creation timestamp (ISO 8601) |
| updatedAt | string | Last update timestamp (ISO 8601) |

### Visit

| Field | Type | Description |
|-------|------|-------------|
| id | integer | Unique identifier |
| visitorId | integer | Reference to the visitor |
| purpose | string | Purpose of the visit (optional) |
| partnerId | integer | Reference to a partner visitor (optional) |
| active | boolean | Whether the visit is currently active |
| checkInTime | string | Check-in timestamp (ISO 8601) |
| checkOutTime | string | Check-out timestamp (ISO 8601, null if still active) |

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request:

| Code | Description |
|------|-------------|
| 200 | OK - The request was successful |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Invalid or missing API key |
| 404 | Not Found - The requested resource does not exist |
| 429 | Too Many Requests - You have exceeded the rate limit |
| 500 | Internal Server Error - Something went wrong on the server |

**Error Response Format:**

```json
{
  "error": "Error message describing what went wrong"
}
```

## Pagination

All list endpoints (visitors, visits) support pagination through the following query parameters:

- `page`: The page number to retrieve (starting from 1)
- `limit`: The number of records per page

The response includes pagination metadata:

```json
"pagination": {
  "page": 1,      // Current page
  "limit": 10,    // Records per page
  "total": 243,   // Total number of records
  "totalPages": 25 // Total number of pages
}
```

## Rate Limiting

To ensure system stability, the API implements rate limiting:

- 100 requests per minute per API key
- 5,000 requests per day per API key

The API will return a `429 Too Many Requests` status code if you exceed these limits.

## Laravel Integration

### Environment Setup

1. Add the following variables to your Laravel `.env` file:

```
VMS_API_URL=https://your-visitor-system.replit.app
VMS_API_KEY=your-api-key-here
```

2. Create a configuration file for the VMS integration:

```php
// config/vms.php
<?php

return [
    'api_url' => env('VMS_API_URL', 'https://your-visitor-system.replit.app'),
    'api_key' => env('VMS_API_KEY', ''),
    'cache_time' => env('VMS_CACHE_TIME', 300), // Cache for 5 minutes
];
```

### Service Class Implementation

Here's a complete Laravel service class for interacting with the VMS API:

```php
<?php
// app/Services/VMSApiService.php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class VMSApiService
{
    protected $baseUrl;
    protected $apiKey;
    protected $cacheTime;
    
    public function __construct()
    {
        $this->baseUrl = config('vms.api_url');
        $this->apiKey = config('vms.api_key');
        $this->cacheTime = config('vms.cache_time', 300); // Default: 5 minutes
    }
    
    /**
     * Get the HTTP headers for API requests
     */
    protected function getHeaders()
    {
        return [
            'X-API-Key' => $this->apiKey,
            'Accept' => 'application/json',
        ];
    }
    
    /**
     * Get all visitors with optional filtering and pagination
     * 
     * @param int $page Page number
     * @param int $limit Results per page
     * @param array $filters Associative array of filters
     * @return array Response data
     */
    public function getVisitors($page = 1, $limit = 20, $filters = [])
    {
        $cacheKey = "vms_visitors_p{$page}_l{$limit}_" . md5(json_encode($filters));
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($page, $limit, $filters) {
            try {
                $params = array_merge([
                    'page' => $page,
                    'limit' => $limit
                ], $filters);
                
                $response = Http::withHeaders($this->getHeaders())
                    ->get("{$this->baseUrl}/api/external/visitors", $params);
                
                if ($response->successful()) {
                    return $response->json();
                }
                
                Log::error("VMS API Error: Failed to fetch visitors", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return ['data' => [], 'pagination' => ['total' => 0]];
            } catch (\Exception $e) {
                Log::error("VMS API Exception: {$e->getMessage()}");
                return ['data' => [], 'pagination' => ['total' => 0]];
            }
        });
    }
    
    /**
     * Get a specific visitor by ID
     * 
     * @param int $id Visitor ID
     * @return array|null Visitor data or null if not found
     */
    public function getVisitor($id)
    {
        $cacheKey = "vms_visitor_{$id}";
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($id) {
            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get("{$this->baseUrl}/api/external/visitors/{$id}");
                
                if ($response->successful()) {
                    return $response->json();
                }
                
                if ($response->status() === 404) {
                    return null;
                }
                
                Log::error("VMS API Error: Failed to fetch visitor {$id}", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return null;
            } catch (\Exception $e) {
                Log::error("VMS API Exception: {$e->getMessage()}");
                return null;
            }
        });
    }
    
    /**
     * Search visitors by name
     * 
     * @param string $name Name to search for
     * @param int $page Page number
     * @param int $limit Results per page
     * @return array Response data
     */
    public function searchVisitors($name, $page = 1, $limit = 20)
    {
        return $this->getVisitors($page, $limit, ['name' => $name]);
    }
    
    /**
     * Get verified visitors
     * 
     * @param int $page Page number
     * @param int $limit Results per page
     * @return array Response data
     */
    public function getVerifiedVisitors($page = 1, $limit = 20)
    {
        return $this->getVisitors($page, $limit, ['verified' => true]);
    }
    
    /**
     * Get visits with optional filtering and pagination
     * 
     * @param int $page Page number
     * @param int $limit Results per page
     * @param array $filters Associative array of filters
     * @return array Response data
     */
    public function getVisits($page = 1, $limit = 20, $filters = [])
    {
        $cacheKey = "vms_visits_p{$page}_l{$limit}_" . md5(json_encode($filters));
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($page, $limit, $filters) {
            try {
                $params = array_merge([
                    'page' => $page,
                    'limit' => $limit
                ], $filters);
                
                $response = Http::withHeaders($this->getHeaders())
                    ->get("{$this->baseUrl}/api/external/visits", $params);
                
                if ($response->successful()) {
                    return $response->json();
                }
                
                Log::error("VMS API Error: Failed to fetch visits", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return ['data' => [], 'pagination' => ['total' => 0]];
            } catch (\Exception $e) {
                Log::error("VMS API Exception: {$e->getMessage()}");
                return ['data' => [], 'pagination' => ['total' => 0]];
            }
        });
    }
    
    /**
     * Get active visits (visitors currently checked in)
     * 
     * @param int $page Page number
     * @param int $limit Results per page
     * @return array Response data
     */
    public function getActiveVisits($page = 1, $limit = 20)
    {
        return $this->getVisits($page, $limit, ['status' => 'active']);
    }
    
    /**
     * Get completed visits (visitors who have checked out)
     * 
     * @param int $page Page number
     * @param int $limit Results per page
     * @param string|null $dateFrom Start date (ISO 8601)
     * @param string|null $dateTo End date (ISO 8601)
     * @return array Response data
     */
    public function getCompletedVisits($page = 1, $limit = 20, $dateFrom = null, $dateTo = null)
    {
        $filters = ['status' => 'completed'];
        
        if ($dateFrom) {
            $filters['dateFrom'] = $dateFrom;
        }
        
        if ($dateTo) {
            $filters['dateTo'] = $dateTo;
        }
        
        return $this->getVisits($page, $limit, $filters);
    }
    
    /**
     * Get visits for a specific visitor
     * 
     * @param int $visitorId Visitor ID
     * @param int $page Page number
     * @param int $limit Results per page
     * @return array Response data
     */
    public function getVisitsForVisitor($visitorId, $page = 1, $limit = 20)
    {
        return $this->getVisits($page, $limit, ['visitorId' => $visitorId]);
    }
    
    /**
     * Get visitor statistics and analytics
     * 
     * @param Carbon|string|null $dateFrom Start date
     * @param Carbon|string|null $dateTo End date
     * @return array|null Statistics data
     */
    public function getStatistics($dateFrom = null, $dateTo = null)
    {
        // Convert Carbon instances to ISO 8601 strings
        if ($dateFrom instanceof Carbon) {
            $dateFrom = $dateFrom->toIso8601String();
        } else if (!$dateFrom) {
            $dateFrom = Carbon::now()->subMonth()->startOfDay()->toIso8601String();
        }
        
        if ($dateTo instanceof Carbon) {
            $dateTo = $dateTo->toIso8601String();
        } else if (!$dateTo) {
            $dateTo = Carbon::now()->toIso8601String();
        }
        
        $cacheKey = "vms_stats_" . md5($dateFrom . $dateTo);
        
        return Cache::remember($cacheKey, $this->cacheTime, function () use ($dateFrom, $dateTo) {
            try {
                $response = Http::withHeaders($this->getHeaders())
                    ->get("{$this->baseUrl}/api/external/statistics", [
                        'dateFrom' => $dateFrom,
                        'dateTo' => $dateTo
                    ]);
                
                if ($response->successful()) {
                    return $response->json();
                }
                
                Log::error("VMS API Error: Failed to fetch statistics", [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return null;
            } catch (\Exception $e) {
                Log::error("VMS API Exception: {$e->getMessage()}");
                return null;
            }
        });
    }
    
    /**
     * Clear API cache
     * 
     * @param string|null $key Specific cache key to clear (or null for all VMS cache)
     * @return bool Success
     */
    public function clearCache($key = null)
    {
        if ($key) {
            return Cache::forget($key);
        } else {
            // Clear all VMS-related cache
            $keys = Cache::getPayload()->keys();
            foreach ($keys as $cacheKey) {
                if (strpos($cacheKey, 'vms_') === 0) {
                    Cache::forget($cacheKey);
                }
            }
            return true;
        }
    }
    
    /**
     * Get API documentation
     * 
     * @return array|null API documentation
     */
    public function getApiDocumentation()
    {
        try {
            $response = Http::withHeaders($this->getHeaders())
                ->get("{$this->baseUrl}/api/external");
            
            if ($response->successful()) {
                return $response->json();
            }
            
            Log::error("VMS API Error: Failed to fetch API documentation", [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            
            return null;
        } catch (\Exception $e) {
            Log::error("VMS API Exception: {$e->getMessage()}");
            return null;
        }
    }
}
```

### Register in Laravel's Service Container

```php
<?php
// app/Providers/AppServiceProvider.php

namespace App\Providers;

use App\Services\VMSApiService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton(VMSApiService::class, function ($app) {
            return new VMSApiService();
        });
    }
}
```

### Controller Examples

#### Visitors Controller

```php
<?php
// app/Http/Controllers/VisitorController.php

namespace App\Http\Controllers;

use App\Services\VMSApiService;
use Illuminate\Http\Request;

class VisitorController extends Controller
{
    protected $vmsService;
    
    public function __construct(VMSApiService $vmsService)
    {
        $this->vmsService = $vmsService;
    }
    
    public function index(Request $request)
    {
        // Validate request parameters
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'limit' => 'nullable|integer|min:1|max:100',
            'name' => 'nullable|string|max:255',
            'verified' => 'nullable|in:true,false',
            'sortBy' => 'nullable|in:id,name,visits',
            'sortOrder' => 'nullable|in:asc,desc',
        ]);
        
        // Get the current page from request
        $page = $request->input('page', 1);
        $limit = $request->input('limit', 15);
        
        // Build filters from request parameters
        $filters = [];
        
        if ($request->has('name')) {
            $filters['name'] = $request->input('name');
        }
        
        if ($request->has('verified')) {
            $filters['verified'] = $request->input('verified') === 'true';
        }
        
        if ($request->has('sortBy')) {
            $filters['sortBy'] = $request->input('sortBy');
        }
        
        if ($request->has('sortOrder')) {
            $filters['sortOrder'] = $request->input('sortOrder');
        }
        
        // Get visitors from the VMS API
        $response = $this->vmsService->getVisitors($page, $limit, $filters);
        
        // Pass the data to your view
        return view('visitors.index', [
            'visitors' => $response['data'] ?? [],
            'pagination' => $response['pagination'] ?? [],
            'filters' => $filters,
        ]);
    }
    
    public function show($id)
    {
        $visitor = $this->vmsService->getVisitor($id);
        
        if (!$visitor) {
            return redirect()->route('visitors.index')
                ->with('error', 'Visitor not found');
        }
        
        // Get this visitor's visit history
        $visits = $this->vmsService->getVisitsForVisitor($id, 1, 10);
        
        return view('visitors.show', [
            'visitor' => $visitor,
            'visits' => $visits['data'] ?? [],
        ]);
    }
    
    public function search(Request $request)
    {
        $query = $request->input('query');
        
        if (empty($query)) {
            return redirect()->route('visitors.index');
        }
        
        $page = $request->input('page', 1);
        $response = $this->vmsService->searchVisitors($query, $page, 15);
        
        return view('visitors.index', [
            'visitors' => $response['data'] ?? [],
            'pagination' => $response['pagination'] ?? [],
            'filters' => ['name' => $query],
            'searchQuery' => $query,
        ]);
    }
}
```

#### Dashboard Controller

```php
<?php
// app/Http/Controllers/DashboardController.php

namespace App\Http\Controllers;

use App\Services\VMSApiService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    protected $vmsService;
    
    public function __construct(VMSApiService $vmsService)
    {
        $this->vmsService = $vmsService;
    }
    
    public function index(Request $request)
    {
        // Validate request parameters
        $validated = $request->validate([
            'dateFrom' => 'nullable|date',
            'dateTo' => 'nullable|date|after_or_equal:dateFrom',
        ]);
        
        // Get date range from request, default to last 30 days
        $dateFrom = $request->input('dateFrom') 
            ? Carbon::parse($request->input('dateFrom')) 
            : Carbon::now()->subDays(30)->startOfDay();
            
        $dateTo = $request->input('dateTo')
            ? Carbon::parse($request->input('dateTo'))->endOfDay()
            : Carbon::now()->endOfDay();
        
        // Get statistics from VMS
        $stats = $this->vmsService->getStatistics($dateFrom, $dateTo);
        
        // Also get active visits
        $activeVisits = $this->vmsService->getActiveVisits(1, 5);
        
        return view('dashboard', [
            'stats' => $stats,
            'activeVisits' => $activeVisits['data'] ?? [],
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
        ]);
    }
}
```

#### Visits Controller

```php
<?php
// app/Http/Controllers/VisitController.php

namespace App\Http\Controllers;

use App\Services\VMSApiService;
use Illuminate\Http\Request;
use Carbon\Carbon;

class VisitController extends Controller
{
    protected $vmsService;
    
    public function __construct(VMSApiService $vmsService)
    {
        $this->vmsService = $vmsService;
    }
    
    public function active(Request $request)
    {
        $page = $request->input('page', 1);
        $response = $this->vmsService->getActiveVisits($page, 15);
        
        return view('visits.active', [
            'visits' => $response['data'] ?? [],
            'pagination' => $response['pagination'] ?? [],
        ]);
    }
    
    public function history(Request $request)
    {
        // Validate request parameters
        $validated = $request->validate([
            'page' => 'nullable|integer|min:1',
            'dateFrom' => 'nullable|date',
            'dateTo' => 'nullable|date|after_or_equal:dateFrom',
        ]);
        
        $page = $request->input('page', 1);
        $dateFrom = $request->input('dateFrom') ? Carbon::parse($request->input('dateFrom'))->startOfDay() : null;
        $dateTo = $request->input('dateTo') ? Carbon::parse($request->input('dateTo'))->endOfDay() : null;
        
        $filters = [
            'status' => 'completed'
        ];
        
        if ($dateFrom) {
            $filters['dateFrom'] = $dateFrom->toIso8601String();
        }
        
        if ($dateTo) {
            $filters['dateTo'] = $dateTo->toIso8601String();
        }
        
        $response = $this->vmsService->getVisits($page, 15, $filters);
        
        return view('visits.history', [
            'visits' => $response['data'] ?? [],
            'pagination' => $response['pagination'] ?? [],
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
        ]);
    }
}
```

### Blade Templates

#### Visitors Index

```blade
<!-- resources/views/visitors/index.blade.php -->
@extends('layouts.app')

@section('content')
<div class="container">
    <h1 class="mb-4">Visitors</h1>
    
    <div class="card mb-4">
        <div class="card-header bg-white">
            <h5 class="card-title mb-0">Search & Filter</h5>
        </div>
        <div class="card-body">
            <form action="{{ route('visitors.index') }}" method="GET" class="row g-3">
                <div class="col-md-4">
                    <label for="name" class="form-label">Name</label>
                    <input type="text" class="form-control" id="name" name="name" value="{{ request('name') }}">
                </div>
                <div class="col-md-3">
                    <label for="verified" class="form-label">Verification Status</label>
                    <select class="form-select" id="verified" name="verified">
                        <option value="">All</option>
                        <option value="true" {{ request('verified') === 'true' ? 'selected' : '' }}>Verified</option>
                        <option value="false" {{ request('verified') === 'false' ? 'selected' : '' }}>Not Verified</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label for="sortBy" class="form-label">Sort By</label>
                    <select class="form-select" id="sortBy" name="sortBy">
                        <option value="id" {{ request('sortBy') === 'id' ? 'selected' : '' }}>ID</option>
                        <option value="name" {{ request('sortBy') === 'name' ? 'selected' : '' }}>Name</option>
                        <option value="visits" {{ request('sortBy') === 'visits' ? 'selected' : '' }}>Visit Count</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label for="sortOrder" class="form-label">Order</label>
                    <select class="form-select" id="sortOrder" name="sortOrder">
                        <option value="asc" {{ request('sortOrder') === 'asc' ? 'selected' : '' }}>Ascending</option>
                        <option value="desc" {{ request('sortOrder', 'desc') === 'desc' ? 'selected' : '' }}>Descending</option>
                    </select>
                </div>
                <div class="col-12">
                    <button type="submit" class="btn btn-primary me-2">Apply Filters</button>
                    <a href="{{ route('visitors.index') }}" class="btn btn-secondary">Reset</a>
                </div>
            </form>
        </div>
    </div>
    
    <div class="card">
        <div class="card-body">
            @if(count($visitors) > 0)
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Municipality</th>
                                <th>Status</th>
                                <th>Visit Count</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($visitors as $visitor)
                                <tr>
                                    <td>{{ $visitor['id'] }}</td>
                                    <td>{{ $visitor['fullName'] }}</td>
                                    <td>{{ $visitor['phoneNumber'] }}</td>
                                    <td>{{ $visitor['municipality'] }}</td>
                                    <td>
                                        @if($visitor['verified'])
                                            <span class="badge bg-success">Verified</span>
                                        @else
                                            <span class="badge bg-secondary">Not Verified</span>
                                        @endif
                                    </td>
                                    <td>{{ $visitor['visitCount'] }}</td>
                                    <td>
                                        <a href="{{ route('visitors.show', $visitor['id']) }}" class="btn btn-sm btn-primary">
                                            View Details
                                        </a>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
                
                @if(isset($pagination) && isset($pagination['totalPages']) && $pagination['totalPages'] > 1)
                    <div class="d-flex justify-content-center mt-4">
                        <nav aria-label="Page navigation">
                            <ul class="pagination">
                                @for($i = 1; $i <= $pagination['totalPages']; $i++)
                                    <li class="page-item {{ $pagination['page'] == $i ? 'active' : '' }}">
                                        <a class="page-link" href="{{ route('visitors.index', array_merge(request()->except('page'), ['page' => $i])) }}">
                                            {{ $i }}
                                        </a>
                                    </li>
                                @endfor
                            </ul>
                        </nav>
                    </div>
                @endif
            @else
                <div class="alert alert-info">
                    No visitors found matching your criteria.
                </div>
            @endif
        </div>
    </div>
</div>
@endsection
```

#### Visitor Detail

```blade
<!-- resources/views/visitors/show.blade.php -->
@extends('layouts.app')

@section('content')
<div class="container">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1>Visitor Details</h1>
        <a href="{{ route('visitors.index') }}" class="btn btn-secondary">Back to List</a>
    </div>
    
    <div class="row">
        <div class="col-md-6">
            <div class="card mb-4">
                <div class="card-header bg-white">
                    <h5 class="card-title mb-0">Personal Information</h5>
                </div>
                <div class="card-body">
                    <dl class="row">
                        <dt class="col-sm-4">Name</dt>
                        <dd class="col-sm-8">{{ $visitor['fullName'] }}</dd>
                        
                        <dt class="col-sm-4">Year of Birth</dt>
                        <dd class="col-sm-8">{{ $visitor['yearOfBirth'] }}</dd>
                        
                        <dt class="col-sm-4">Gender</dt>
                        <dd class="col-sm-8">{{ $visitor['sex'] }}</dd>
                        
                        <dt class="col-sm-4">Municipality</dt>
                        <dd class="col-sm-8">{{ $visitor['municipality'] }}</dd>
                        
                        <dt class="col-sm-4">Email</dt>
                        <dd class="col-sm-8">{{ $visitor['email'] ?? 'Not provided' }}</dd>
                        
                        <dt class="col-sm-4">Phone</dt>
                        <dd class="col-sm-8">
                            {{ $visitor['phoneNumber'] }}
                            <a href="https://wa.me/{{ $visitor['phoneNumber'] }}" class="ms-2 text-success" target="_blank">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        </dd>
                        
                        <dt class="col-sm-4">Status</dt>
                        <dd class="col-sm-8">
                            @if($visitor['verified'])
                                <span class="badge bg-success">Verified</span>
                            @else
                                <span class="badge bg-secondary">Not Verified</span>
                            @endif
                        </dd>
                        
                        <dt class="col-sm-4">Total Visits</dt>
                        <dd class="col-sm-8">{{ $visitor['visitCount'] }}</dd>
                    </dl>
                </div>
            </div>
        </div>
        
        <div class="col-md-6">
            <div class="card">
                <div class="card-header bg-white">
                    <h5 class="card-title mb-0">Recent Visits</h5>
                </div>
                <div class="card-body">
                    @if(count($visits) > 0)
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Purpose</th>
                                        <th>Status</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($visits as $visitData)
                                        <tr>
                                            <td>{{ \Carbon\Carbon::parse($visitData['visit']['checkInTime'])->format('M d, Y H:i') }}</td>
                                            <td>{{ $visitData['visit']['purpose'] ?? 'Not specified' }}</td>
                                            <td>
                                                @if($visitData['visit']['active'])
                                                    <span class="badge bg-primary">Active</span>
                                                @else
                                                    <span class="badge bg-secondary">Completed</span>
                                                @endif
                                            </td>
                                            <td>
                                                @if($visitData['visit']['active'])
                                                    Ongoing
                                                @else
                                                    @php
                                                        $checkIn = \Carbon\Carbon::parse($visitData['visit']['checkInTime']);
                                                        $checkOut = \Carbon\Carbon::parse($visitData['visit']['checkOutTime']);
                                                        $duration = $checkIn->diffForHumans($checkOut, ['parts' => 2, 'short' => true]);
                                                    @endphp
                                                    {{ $duration }}
                                                @endif
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @else
                        <div class="alert alert-info">
                            No visits recorded for this visitor.
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
```

#### Dashboard with Statistics

```blade
<!-- resources/views/dashboard.blade.php -->
@extends('layouts.app')

@section('content')
<div class="container">
    <h1 class="mb-4">Dashboard</h1>
    
    <div class="card mb-4">
        <div class="card-header bg-white">
            <h5 class="card-title mb-0">Date Range</h5>
        </div>
        <div class="card-body">
            <form action="{{ route('dashboard') }}" method="GET" class="row g-3">
                <div class="col-md-5">
                    <label for="dateFrom" class="form-label">From</label>
                    <input type="date" class="form-control" id="dateFrom" name="dateFrom" value="{{ $dateFrom->format('Y-m-d') }}">
                </div>
                <div class="col-md-5">
                    <label for="dateTo" class="form-label">To</label>
                    <input type="date" class="form-control" id="dateTo" name="dateTo" value="{{ $dateTo->format('Y-m-d') }}">
                </div>
                <div class="col-md-2 d-flex align-items-end">
                    <button type="submit" class="btn btn-primary w-100">Apply</button>
                </div>
            </form>
        </div>
    </div>
    
    @if($stats)
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h3 class="display-4">{{ $stats['totalVisits'] }}</h3>
                        <p class="card-text">Total Visits</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h3 class="display-4">{{ $stats['uniqueVisitors'] }}</h3>
                        <p class="card-text">Unique Visitors</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h3 class="display-4">{{ $stats['averageDuration'] }}</h3>
                        <p class="card-text">Avg Duration (mins)</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h3 class="display-4">{{ $stats['verifiedPercentage'] }}%</h3>
                        <p class="card-text">Verified Visitors</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-8">
                <div class="card mb-4">
                    <div class="card-header bg-white">
                        <h5 class="card-title mb-0">Visits by Day</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="visitsChart" height="300"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card mb-4">
                    <div class="card-header bg-white">
                        <h5 class="card-title mb-0">Visits by Purpose</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="purposeChart" height="300"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header bg-white">
                        <h5 class="card-title mb-0">Municipalities</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="municipalityChart" height="300"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card mb-4">
                    <div class="card-header bg-white">
                        <h5 class="card-title mb-0">Gender Distribution</h5>
                    </div>
                    <div class="card-body">
                        <canvas id="genderChart" height="300"></canvas>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header bg-white">
                <h5 class="card-title mb-0">Currently Active Visits</h5>
            </div>
            <div class="card-body">
                @if(count($activeVisits) > 0)
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Visitor</th>
                                    <th>Check-in Time</th>
                                    <th>Duration</th>
                                    <th>Purpose</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($activeVisits as $visitData)
                                    <tr>
                                        <td>
                                            <a href="{{ route('visitors.show', $visitData['visitor']['id']) }}">
                                                {{ $visitData['visitor']['fullName'] }}
                                            </a>
                                            @if($visitData['visitor']['verified'])
                                                <span class="badge bg-success ms-1">Verified</span>
                                            @endif
                                        </td>
                                        <td>{{ \Carbon\Carbon::parse($visitData['visit']['checkInTime'])->format('M d, Y H:i') }}</td>
                                        <td>{{ \Carbon\Carbon::parse($visitData['visit']['checkInTime'])->diffForHumans(null, true) }}</td>
                                        <td>{{ $visitData['visit']['purpose'] ?? 'Not specified' }}</td>
                                        <td><span class="badge bg-primary">Active</span></td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @else
                    <div class="alert alert-info">
                        No active visits at the moment.
                    </div>
                @endif
            </div>
        </div>
    @else
        <div class="alert alert-warning">
            Unable to load statistics. Please try again later.
        </div>
    @endif
</div>
@endsection

@section('scripts')
@if($stats)
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
    // Visits by Day Chart
    const visitDates = @json(array_column($stats['visitsByDay'], 'date'));
    const visitCounts = @json(array_column($stats['visitsByDay'], 'count'));
    
    new Chart(document.getElementById('visitsChart'), {
        type: 'bar',
        data: {
            labels: visitDates,
            datasets: [{
                label: 'Number of Visits',
                data: visitCounts,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Purpose Chart
    const purposes = @json(array_column($stats['visitsByPurpose'], 'purpose'));
    const purposeCounts = @json(array_column($stats['visitsByPurpose'], 'count'));
    
    new Chart(document.getElementById('purposeChart'), {
        type: 'pie',
        data: {
            labels: purposes,
            datasets: [{
                data: purposeCounts,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                    'rgba(255, 159, 64, 0.6)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true
        }
    });
    
    // Municipality Chart
    const municipalities = @json(array_column($stats['visitsByMunicipality'], 'municipality'));
    const municipalityCounts = @json(array_column($stats['visitsByMunicipality'], 'count'));
    
    new Chart(document.getElementById('municipalityChart'), {
        type: 'bar',
        data: {
            labels: municipalities,
            datasets: [{
                label: 'Visitors by Municipality',
                data: municipalityCounts,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true
        }
    });
    
    // Gender Chart
    const genders = @json(array_column($stats['visitsByGender'], 'gender'));
    const genderCounts = @json(array_column($stats['visitsByGender'], 'count'));
    
    new Chart(document.getElementById('genderChart'), {
        type: 'doughnut',
        data: {
            labels: genders,
            datasets: [{
                data: genderCounts,
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(75, 192, 192, 0.6)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true
        }
    });
</script>
@endif
@endsection
```

## Routes

```php
<?php
// routes/web.php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\VisitorController;
use App\Http\Controllers\VisitController;
use Illuminate\Support\Facades\Route;

// Dashboard with statistics
Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

// Visitor management
Route::get('/visitors', [VisitorController::class, 'index'])->name('visitors.index');
Route::get('/visitors/search', [VisitorController::class, 'search'])->name('visitors.search');
Route::get('/visitors/{id}', [VisitorController::class, 'show'])->name('visitors.show');

// Visit management
Route::get('/visits/active', [VisitController::class, 'active'])->name('visits.active');
Route::get('/visits/history', [VisitController::class, 'history'])->name('visits.history');
```

## Best Practices

1. **Caching**
   - Use caching to reduce API calls and improve performance
   - Implement cache keys that include all filter parameters
   - Clear cache when the underlying data might change

2. **Error Handling**
   - Always check for successful API responses
   - Log detailed information about API errors
   - Provide graceful fallbacks when API calls fail

3. **Rate Limiting**
   - Implement backoff strategies for API requests
   - Use queues for batch operations
   - Monitor API usage patterns

4. **Data Validation**
   - Validate all user input before passing to API
   - Handle empty states and edge cases gracefully

5. **Code Organization**
   - Use a dedicated service class for API interactions
   - Register the service in the service container
   - Keep controllers thin by delegating API logic to the service

## Security Considerations

1. **API Key Protection**
   - Store API keys in environment variables
   - Never commit API keys to your repository
   - Rotate API keys periodically

2. **HTTPS Enforcement**
   - Always use HTTPS for all API communications
   - Implement HSTS headers for added security

3. **Input Validation**
   - Validate and sanitize all user input
   - Use Laravel's validation system to prevent injection attacks

4. **Access Control**
   - Implement proper authentication and authorization in your Laravel app
   - Restrict access to sensitive data and operations

5. **Logging and Monitoring**
   - Monitor API usage patterns to detect anomalies
   - Implement alerts for suspicious activity
   - Maintain detailed logs of API interactions

## Troubleshooting

### Common Issues and Solutions

1. **API Key Issues**
   - **Problem**: 401 Unauthorized responses
   - **Solution**: Check that the API key is set correctly in your .env file and is being passed in the X-API-Key header

2. **Connection Timeouts**
   - **Problem**: Requests taking too long or timing out
   - **Solution**: Implement timeouts in your HTTP client and retry logic

3. **Rate Limiting**
   - **Problem**: Receiving 429 Too Many Requests errors
   - **Solution**: Implement backoff strategies and optimize the number of API calls by using caching

4. **Empty Responses**
   - **Problem**: API returns empty data arrays
   - **Solution**: Check your filter parameters, verify you're accessing the correct endpoint, and ensure the authentication is working

5. **Cache Issues**
   - **Problem**: Outdated data being displayed
   - **Solution**: Implement manual cache clearing functionality and set appropriate cache TTLs

### Debugging Tips

1. Enable debug mode in your Laravel app to see more detailed error information
2. Use Laravel Debugbar to monitor API requests
3. Check Laravel logs for detailed error messages
4. Test API endpoints directly with tools like Postman or cURL to isolate issues

## Changelog

### Version 1.0 (2025-05-07)
- Initial release of the VMS API
- Added four core endpoints: visitors, visitor by ID, visits, and statistics
- Implemented API key authentication
- Added comprehensive documentation

### Version 1.1 (Planned)
- Add search functionality across all visitor fields
- Implement webhook notifications for real-time updates
- Add bulk operations for visitor management
- Expand statistics capabilities