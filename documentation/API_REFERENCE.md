# Ingestion Service REST API Reference

The Ingestion API service runs on `http://localhost:5000` and normalizes agent telemetry, test specs, execution results, bugs, and accessibility findings into DB records.

---

## 🚀 Pipeline Endpoints

### 1. Trigger Autonomous Agent Pipeline
- **Endpoint**: `POST /api/pipeline/run`
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "targetUrl": "http://localhost:4000"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Pipeline started successfully"
  }
  ```

### 2. Get Pipeline Execution Status
- **Endpoint**: `GET /api/pipeline/status`
- **Response**:
  ```json
  {
    "running": false,
    "progress": 100,
    "currentPhase": "Pipeline Execution Completed!",
    "logs": [
      "[10:00:00 AM] Pipeline started targeting http://localhost:4000",
      "[10:00:15 AM] Pipeline completed all 5 phases successfully."
    ],
    "lastRunTime": "2026-09-22T10:00:00.000Z"
  }
  ```

---

## 📊 Dashboard Aggregate Endpoints

### 3. Get Overview Statistics
- **Endpoint**: `GET /api/dashboard/stats`
- **Response**:
  ```json
  {
    "pagesDiscovered": 6,
    "flowsMapped": 3,
    "totalTestCases": 3,
    "testResults": {
      "total": 4,
      "pass": 2,
      "fail": 2,
      "flaky": 0
    },
    "bugs": {
      "total": 1,
      "bySeverity": { "critical": 1, "high": 0, "medium": 0, "low": 0 },
      "byRootCause": { "frontend": 0, "backend": 1, "investigate": 0 }
    },
    "accessibility": {
      "total": 15,
      "bySeverity": { "critical": 1, "serious": 13, "moderate": 1, "minor": 0 }
    }
  }
  ```

### 4. Get Chronological Activity Stream Timeline
- **Endpoint**: `GET /api/dashboard/timeline`
- **Response**: Array of timeline event objects.

---

## 🌐 Entity Endpoints

### 5. Pages
- **`GET /api/pages`**: Returns list of discovered pages with parsed element arrays.
- **`POST /api/pages`**: Ingests a new page record.

### 6. Flows
- **`GET /api/flows`**: Returns user flows and step sequences.
- **`POST /api/flows`**: Ingests a user flow record.

### 7. Test Cases
- **`GET /api/test-cases`**: Returns generated test cases including code contents.
- **`POST /api/test-cases`**: Registers a test case.
- **`POST /api/test-cases/rerun`**: Re-runs a specific test case file on demand.

### 8. Test Results
- **`GET /api/test-results`**: Returns execution status and evidence URLs.
- **`POST /api/test-results`**: Stores a test result record.

### 9. Bugs
- **`GET /api/bugs`**: Returns confirmed bugs with steps to reproduce and evidence references.
- **`POST /api/bugs`**: Ingests a confirmed bug record.

### 10. Accessibility Issues
- **`GET /api/accessibility-issues`**: Returns WCAG violation findings.
- **`POST /api/accessibility-issues`**: Ingests an accessibility issue.
