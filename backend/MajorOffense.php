<?php
// Simple endpoint to persist major-offense steps.
// - GET  => list all saved records, GET?student_id=... => single record (legacy) or add &all=1 to return all for student
// - GET?id=... => fetch specific record
// - POST => save a step or full data (payload: { student_id, step: <1..5>, data: { ... }, record_id?, create_new? })

header("Content-Type: application/json; charset=UTF-8");

// --- Dynamic CORS ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    'http://localhost:3000',
    'http://192.168.2.110:3000',
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// --- Database connection ---
$dbHost = 'localhost';  // keep localhost since MySQL is on the same machine
$dbName = 'MajorOffense_db';
$dbUser = 'root';
$dbPass = '';

try {
    $pdo = new PDO("mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4", $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

/**
 * Utility: recursively scan an array and replace any data:... base64 image values with files written to disk.
 * Returns the modified array.
 */
function saveDataUrlsRecursively($value, $student_id = '')
{
    // Only process arrays (associative) or strings. If value is scalar other than string, return as-is.
    if (is_array($value)) {
        foreach ($value as $k => $v) {
            $value[$k] = saveDataUrlsRecursively($v, $student_id);
        }
        return $value;
    }

    if (!is_string($value)) return $value;

    // Only attempt to process data URLs. e.g. data:image/png;base64,AAAA...
    if (stripos($value, 'data:') !== 0) return $value;

    // pattern match: data:<mime>;base64,<data>
    if (!preg_match('/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s', $value, $matches)) {
        // not a recognized data URL we can handle; return as-is
        return $value;
    }

    $mime = $matches[1];
    $b64 = $matches[2];

    $decoded = base64_decode($b64);
    if ($decoded === false) return $value;

    // safety: enforce a maximum bytes (50MB)
    $MAX_BYTES = 50 * 1024 * 1024;
    if (strlen($decoded) > $MAX_BYTES) {
        // too big -> keep original (frontend also limits) but we could also null it
        return $value;
    }

    // determine extension
    $ext = 'bin';
    $map = [
        'image/jpeg' => 'jpg',
        'image/jpg'  => 'jpg',
        'image/png'  => 'png',
        'image/gif'  => 'gif',
        'image/webp' => 'webp',
        'image/svg+xml' => 'svg',
    ];
    if (isset($map[strtolower($mime)])) $ext = $map[strtolower($mime)];
    else {
        $parts = explode('/', $mime);
        $ext = end($parts);
    }

    // prepare upload directory
    $uploadsDir = __DIR__ . '/uploads/major_offense';
    if (!is_dir($uploadsDir)) {
        @mkdir($uploadsDir, 0777, true);
    }

    // generate filename
    try {
        $rand = bin2hex(random_bytes(6));
    } catch (Exception $e) {
        $rand = substr(md5(uniqid('', true)), 0, 12);
    }
    $safeStudent = preg_replace('/[^a-zA-Z0-9_\-]/', '_', (string)$student_id);
    $filename = 'mo_' . ($safeStudent ?: 'anon') . '_' . time() . '_' . $rand . '.' . $ext;
    $filePath = $uploadsDir . '/' . $filename;

    $written = @file_put_contents($filePath, $decoded);
    if ($written === false) {
        // on failure, return original data URL (so nothing breaks)
        return $value;
    }

    // Build a HTTP-accessible URL to the newly saved file.
    // Determine base path of this script (e.g. /SDSUpdate1-main/backend)
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $url = $scheme . '://' . $host . $base . '/uploads/major_offense/' . $filename;

    return $url;
}

/**
 * Convenience: run saveDataUrlsRecursively on known step fields in $arr.
 * This is conservative but covers typical shape: ['step1'=>[..., 'screenshot'=> 'data:...'], ...]
 */
function processDataUrlsInSteps($arr, $student_id = '')
{
    if (!is_array($arr)) return $arr;
    foreach ($arr as $k => $v) {
        // process every value recursively -- lightweight enough
        $arr[$k] = saveDataUrlsRecursively($v, $student_id);
    }
    return $arr;
}

if ($method === 'GET') {
    // GET by record id
    if (isset($_GET['id']) && strlen($_GET['id']) > 0) {
        $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE id = ? LIMIT 1");
        $stmt->execute([$_GET['id']]);
        $row = $stmt->fetch();
        if ($row) {
            echo json_encode([
                'success' => true,
                'record' => [
                    'id' => $row['id'],
                    'student_id' => $row['student_id'],
                    'data' => json_decode($row['data'], true),
                    'completed_steps' => (int)$row['completed_steps'],
                    'created_at' => $row['created_at'],
                    'updated_at' => $row['updated_at'],
                ],
            ]);
            exit;
        } else {
            echo json_encode(['success' => true, 'record' => null]);
            exit;
        }
    }

    // GET by student_id
    if (isset($_GET['student_id']) && strlen($_GET['student_id']) > 0) {
        $student_id = (string)$_GET['student_id'];
        if (isset($_GET['all']) && ($_GET['all'] === '1' || $_GET['all'] === 'true')) {
            $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE student_id = ? ORDER BY updated_at DESC, id DESC");
            $stmt->execute([$student_id]);
            $rows = $stmt->fetchAll();
            $out = [];
            foreach ($rows as $r) {
                $out[] = [
                    'id' => $r['id'],
                    'student_id' => $r['student_id'],
                    'data' => json_decode($r['data'], true),
                    'completed_steps' => (int)$r['completed_steps'],
                    'created_at' => $r['created_at'],
                    'updated_at' => $r['updated_at'],
                ];
            }
            echo json_encode(['success' => true, 'records' => $out]);
            exit;
        } else {
            $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE student_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1");
            $stmt->execute([$student_id]);
            $row = $stmt->fetch();
            if ($row) {
                echo json_encode([
                    'success' => true,
                    'record' => [
                        'id' => $row['id'],
                        'student_id' => $row['student_id'],
                        'data' => json_decode($row['data'], true),
                        'completed_steps' => (int)$row['completed_steps'],
                        'created_at' => $row['created_at'],
                        'updated_at' => $row['updated_at'],
                    ],
                ]);
                exit;
            } else {
                echo json_encode(['success' => true, 'record' => null]);
                exit;
            }
        }
    }

    // list all records
    $stmt = $pdo->query("SELECT * FROM major_offenses ORDER BY updated_at DESC");
    $rows = $stmt->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'id' => $r['id'],
            'student_id' => $r['student_id'],
            'data' => json_decode($r['data'], true),
            'completed_steps' => (int)$r['completed_steps'],
            'created_at' => $r['created_at'],
            'updated_at' => $r['updated_at'],
        ];
    }
    echo json_encode(['success' => true, 'records' => $out]);
    exit;
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);

    // Update existing record by ID
    if ($payload && (isset($payload['record_id']) || isset($payload['id'])) && isset($payload['data'])) {
        $rid = isset($payload['record_id']) ? $payload['record_id'] : $payload['id'];
        $fullData = $payload['data'];

        // Save any embedded data URLs to disk and replace with URLs
        try {
            $fullData = processDataUrlsInSteps($fullData, $payload['student_id'] ?? '');
        } catch (Exception $e) {
            // ignore processing errors and proceed with original data
        }

        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($fullData['step' . $i])) $completed++;
        }
        $stmt = $pdo->prepare("UPDATE major_offenses SET data = ?, completed_steps = ? WHERE id = ?");
        $stmt->execute([json_encode($fullData), $completed, $rid]);
        echo json_encode(['success' => true, 'record_id' => $rid, 'data' => $fullData, 'completed_steps' => $completed]);
        exit;
    }

    // Save full data
    if ($payload && isset($payload['student_id']) && isset($payload['data']) && !isset($payload['step'])) {
        $student_id = (string)$payload['student_id'];
        $fullData = $payload['data'];

        // process data URLs
        try {
            $fullData = processDataUrlsInSteps($fullData, $student_id);
        } catch (Exception $e) {
            // ignore processing errors
        }

        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($fullData['step' . $i])) $completed++;
        }

        if (!empty($payload['create_new'])) {
            $ins = $pdo->prepare("INSERT INTO major_offenses (student_id, data, completed_steps) VALUES (?, ?, ?)");
            $ins->execute([$student_id, json_encode($fullData), $completed]);
            $newId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'record_id' => $newId, 'student_id' => $student_id, 'data' => $fullData, 'completed_steps' => $completed]);
            exit;
        }

        $stmt = $pdo->prepare("SELECT id FROM major_offenses WHERE student_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1");
        $stmt->execute([$student_id]);
        $row = $stmt->fetch();
        if ($row) {
            $upd = $pdo->prepare("UPDATE major_offenses SET data = ?, completed_steps = ? WHERE id = ?");
            $upd->execute([json_encode($fullData), $completed, $row['id']]);
            echo json_encode(['success' => true, 'record_id' => $row['id'], 'student_id' => $student_id, 'data' => $fullData, 'completed_steps' => $completed]);
            exit;
        } else {
            $ins = $pdo->prepare("INSERT INTO major_offenses (student_id, data, completed_steps) VALUES (?, ?, ?)");
            $ins->execute([$student_id, json_encode($fullData), $completed]);
            $newId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'record_id' => $newId, 'student_id' => $student_id, 'data' => $fullData, 'completed_steps' => $completed]);
            exit;
        }
    }

    // Step-level save
    if (!$payload || !isset($payload['student_id']) || !isset($payload['step'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing student_id or step']);
        exit;
    }

    $student_id = (string)$payload['student_id'];
    $step = (int)$payload['step'];
    $stepData = isset($payload['data']) ? $payload['data'] : null;
    $recordId = isset($payload['record_id']) ? $payload['record_id'] : (isset($payload['id']) ? $payload['id'] : null);
    $forceNew = !empty($payload['create_new']);

    if ($recordId) {
        $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE id = ? LIMIT 1");
        $stmt->execute([$recordId]);
        $row = $stmt->fetch();
        if ($row) {
            $existing = json_decode($row['data'], true) ?: [];
            $existing['step' . $step] = $stepData;

            // process any data URLs inside the new step before saving
            try {
                $existing = processDataUrlsInSteps($existing, $student_id);
            } catch (Exception $e) {
                // ignore
            }

            $completed = 0;
            for ($i = 1; $i <= 5; $i++) {
                if (!empty($existing['step' . $i])) $completed++;
            }
            $stmt = $pdo->prepare("UPDATE major_offenses SET data = ?, completed_steps = ? WHERE id = ?");
            $stmt->execute([json_encode($existing), $completed, $recordId]);
            echo json_encode(['success' => true, 'record_id' => $recordId, 'data' => $existing, 'completed_steps' => $completed]);
            exit;
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Record not found']);
            exit;
        }
    }

    if ($forceNew) {
        $new = [];
        $new['step' . $step] = $stepData;

        try {
            $new = processDataUrlsInSteps($new, $student_id);
        } catch (Exception $e) {
            // ignore
        }

        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($new['step' . $i])) $completed++;
        }
        $stmt = $pdo->prepare("INSERT INTO major_offenses (student_id, data, completed_steps) VALUES (?, ?, ?)");
        $stmt->execute([$student_id, json_encode($new), $completed]);
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'record_id' => $newId, 'student_id' => $student_id, 'data' => $new, 'completed_steps' => $completed]);
        exit;
    }

    // Update latest or insert new
    $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE student_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1");
    $stmt->execute([$student_id]);
    $row = $stmt->fetch();

    if ($row) {
        $existing = json_decode($row['data'], true) ?: [];
        $existing['step' . $step] = $stepData;

        try {
            $existing = processDataUrlsInSteps($existing, $student_id);
        } catch (Exception $e) {
            // ignore
        }

        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($existing['step' . $i])) $completed++;
        }
        $stmt = $pdo->prepare("UPDATE major_offenses SET data = ?, completed_steps = ? WHERE id = ?");
        $stmt->execute([json_encode($existing), $completed, $row['id']]);
        echo json_encode(['success' => true, 'record_id' => $row['id'], 'data' => $existing, 'completed_steps' => $completed]);
        exit;
    } else {
        $new = [];
        $new['step' . $step] = $stepData;

        try {
            $new = processDataUrlsInSteps($new, $student_id);
        } catch (Exception $e) {
            // ignore
        }

        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($new['step' . $i])) $completed++;
        }
        $stmt = $pdo->prepare("INSERT INTO major_offenses (student_id, data, completed_steps) VALUES (?, ?, ?)");
        $stmt->execute([$student_id, json_encode($new), $completed]);
        $newId = $pdo->lastInsertId();
        echo json_encode(['success' => true, 'record_id' => $newId, 'student_id' => $student_id, 'data' => $new, 'completed_steps' => $completed]);
        exit;
    }
}

// fallback
http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
exit;
?>
