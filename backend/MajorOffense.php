<?php
// Simple endpoint to persist major-offense steps.
// - GET  => list all saved records, GET?student_id=... => single record (legacy) or add &all=1 to return all for student
// - GET?id=... => fetch specific record
// - POST => save a step or full data (payload: { student_id, step: <1..5>, data: { ... }, record_id?, create_new? })
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dbHost = 'localhost';
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

    // GET by student_id: if all=1 return all records, otherwise return latest (legacy behavior)
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
            // legacy: return a single (latest) record
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

    // If payload includes 'record_id' (or 'id'), update that specific record.
    if ($payload && (isset($payload['record_id']) || isset($payload['id'])) && isset($payload['data'])) {
        $rid = isset($payload['record_id']) ? $payload['record_id'] : $payload['id'];
        $fullData = $payload['data'];
        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($fullData['step' . $i])) $completed++;
        }
        $stmt = $pdo->prepare("UPDATE major_offenses SET data = ?, completed_steps = ? WHERE id = ?");
        $stmt->execute([json_encode($fullData), $completed, $rid]);
        echo json_encode(['success' => true, 'record_id' => $rid, 'data' => $fullData, 'completed_steps' => $completed]);
        exit;
    }

    // Full-data save w/o step (but allow create_new)
    if ($payload && isset($payload['student_id']) && isset($payload['data']) && !isset($payload['step'])) {
        $student_id = (string)$payload['student_id'];
        $fullData = $payload['data'];
        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($fullData['step' . $i])) $completed++;
        }

        if (!empty($payload['create_new'])) {
            // always insert a new record
            $ins = $pdo->prepare("INSERT INTO major_offenses (student_id, data, completed_steps) VALUES (?, ?, ?)");
            $ins->execute([$student_id, json_encode($fullData), $completed]);
            $newId = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'record_id' => $newId, 'student_id' => $student_id, 'data' => $fullData, 'completed_steps' => $completed]);
            exit;
        }

        // legacy upsert by latest record: update latest or insert new
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

    // Step-level save: payload contains student_id and step
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
        // Update specific record by id
        $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE id = ? LIMIT 1");
        $stmt->execute([$recordId]);
        $row = $stmt->fetch();
        if ($row) {
            $existing = json_decode($row['data'], true) ?: [];
            $existing['step' . $step] = $stepData;
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
        // Insert new record with this step as initial data
        $new = [];
        $new['step' . $step] = $stepData;
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

    // Default legacy behavior: update latest record for student, or insert if none
    $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE student_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1");
    $stmt->execute([$student_id]);
    $row = $stmt->fetch();

    if ($row) {
        $existing = json_decode($row['data'], true) ?: [];
        $existing['step' . $step] = $stepData;
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