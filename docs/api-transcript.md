# API transcript

Captured from the Docker Compose stack (`docker compose up --build`, PostgreSQL
16, `SEED_ON_BOOT=true`, so 34 fictional demo users) by replaying
[`capture-api.sh`](capture-api.sh). Every response below is literal output;
only the repetitive `curl -D -` header noise is trimmed to the status line,
`Content-Type` and `Location`.

Reproduce it against a freshly seeded stack with:

```bash
sh docs/capture-api.sh
```

```text
### 1. Health check
$ curl -i -s -X GET 'http://localhost:8700/api/health'
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{
    "status": "ok",
    "database": "up"
}

### 2. A bounded, paginated list (limit is capped server-side)
$ curl -i -s -X GET 'http://localhost:8700/api/users?page=1&limit=3'
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
{
    "success": true,
    "data": [
        {
            "id": 1,
            "firstName": "Amelia",
            "lastName": "Hartley",
            "email": "amelia.hartley@roster.example",
            "createdAt": "2026-11-09T05:40:57.801Z",
            "updatedAt": "2026-11-09T05:40:57.801Z"
        },
        {
            "id": 2,
            "firstName": "Rajesh",
            "lastName": "Iyer",
            "email": "rajesh.iyer@roster.example",
            "createdAt": "2026-11-09T05:40:57.809Z",
            "updatedAt": "2026-11-09T05:40:57.809Z"
        },
        {
            "id": 3,
            "firstName": "Sofia",
            "lastName": "Marchetti",
            "email": "sofia.marchetti@roster.example",
            "createdAt": "2026-11-09T05:40:57.812Z",
            "updatedAt": "2026-11-09T05:40:57.812Z"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 3,
        "total": 34,
        "totalPages": 12
    }
}

### 3. Create a user -- 201 with a Location header, no password in the body
$ curl -i -s -X POST 'http://localhost:8700/api/users' \
     -H 'Content-Type: application/json' \
     -d '{"firstName":"Nina","lastName":"Petrov","email":"Nina.Petrov@Roster.Example","password":"Passw0rd!123"}'
HTTP/1.1 201 Created
Location: /api/users/35
Content-Type: application/json; charset=utf-8
{
    "success": true,
    "data": {
        "id": 35,
        "firstName": "Nina",
        "lastName": "Petrov",
        "email": "nina.petrov@roster.example",
        "createdAt": "2026-11-09T05:41:26.318Z",
        "updatedAt": "2026-11-09T05:41:26.318Z"
    }
}

### 4. The same email again -- 409, not a 500 stack trace
$ curl -i -s -X POST 'http://localhost:8700/api/users' \
     -H 'Content-Type: application/json' \
     -d '{"firstName":"Nina","lastName":"Petrov","email":"nina.petrov@roster.example","password":"Passw0rd!123"}'
HTTP/1.1 409 Conflict
Content-Type: application/json; charset=utf-8
{
    "success": false,
    "error": {
        "code": "conflict",
        "message": "A user with that email already exists",
        "details": {
            "email": "nina.petrov@roster.example"
        }
    }
}

### 5. Validation failure -- 400 with per-field detail
$ curl -i -s -X POST 'http://localhost:8700/api/users' \
     -H 'Content-Type: application/json' \
     -d '{"firstName":"","lastName":"Petrov","email":"not-an-email","password":"short"}'
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8
{
    "success": false,
    "error": {
        "code": "bad_request",
        "message": "Request validation failed",
        "details": [
            {
                "field": "firstName",
                "message": "firstName must not be empty"
            },
            {
                "field": "email",
                "message": "email must be a valid email address"
            },
            {
                "field": "password",
                "message": "password must be at least 8 characters"
            }
        ]
    }
}

### 6. Update a user that does not exist -- 404
###    (the original controller answered 200 "User updated successfully" here)
$ curl -i -s -X PUT 'http://localhost:8700/api/users/999999' \
     -H 'Content-Type: application/json' \
     -d '{"firstName":"Ghost"}'
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
{
    "success": false,
    "error": {
        "code": "not_found",
        "message": "User 999999 not found"
    }
}

### 7. Delete a user that does not exist -- 404
###    (the original controller answered 500 "Couldn't delete user" here)
$ curl -i -s -X DELETE 'http://localhost:8700/api/users/999999'
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
{
    "success": false,
    "error": {
        "code": "not_found",
        "message": "User 999999 not found"
    }
}

### 8. Unknown route -- JSON 404, not Express's HTML page
$ curl -i -s -X GET 'http://localhost:8700/api/nope'
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8
{
    "success": false,
    "error": {
        "code": "not_found",
        "message": "No route matches GET /api/nope"
    }
}

```
