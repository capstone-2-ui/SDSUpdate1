<?php
// Simple endpoint to persist major-offense steps.
// - GET  => list all saved records, or GET?student_id=... => single record
// - POST => save a step (payload: { student_id, step: <1..5>, data: { ... } })
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // preflight
    http_response_code(200);
    exit;
}

// DB config - change to match your environment
$dbHost = 'localhost';
$dbName = 'MajorOffense_db';
$dbUser = 'root';
$dbPass = ''; // XAMPP default is empty password; change if needed

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
    if (isset($_GET['student_id']) && strlen($_GET['student_id']) > 0) {
        $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE student_id = ? LIMIT 1");
        $stmt->execute([$_GET['student_id']]);
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
    } else {
        // list all
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
}

if ($method === 'POST') {
    $payload = json_decode(file_get_contents('php://input'), true);

    // --- NEW: Accept a full-data save (no 'step') for convenience ---
    // If client posts { student_id: "...", data: { step1:..., step2:... } } save the whole object
    if ($payload && isset($payload['student_id']) && isset($payload['data']) && !isset($payload['step'])) {
        $student_id = (string)$payload['student_id'];
        $fullData = $payload['data'];
        // compute completed_steps automatically
        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($fullData['step' . $i])) $completed++;
        }

        // upsert row
        $stmt = $pdo->prepare("SELECT id FROM major_offenses WHERE student_id = ? LIMIT 1");
        $stmt->execute([$student_id]);
        $row = $stmt->fetch();

        if ($row) {
            $upd = $pdo->prepare("UPDATE major_offenses SET data = ?, completed_steps = ? WHERE student_id = ?");
            $upd->execute([json_encode($fullData), $completed, $student_id]);
        } else {
            $ins = $pdo->prepare("INSERT INTO major_offenses (student_id, data, completed_steps) VALUES (?, ?, ?)");
            $ins->execute([$student_id, json_encode($fullData), $completed]);
        }

        echo json_encode(['success' => true, 'student_id' => $student_id, 'data' => $fullData, 'completed_steps' => $completed]);
        exit;
    }

    if (!$payload || !isset($payload['student_id']) || !isset($payload['step'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Missing student_id or step']);
        exit;
    }

    $student_id = (string)$payload['student_id'];
    $step = (int)$payload['step'];
    $stepData = isset($payload['data']) ? $payload['data'] : null;

    // read existing row
    $stmt = $pdo->prepare("SELECT * FROM major_offenses WHERE student_id = ? LIMIT 1");
    $stmt->execute([$student_id]);
    $row = $stmt->fetch();

    if ($row) {
        $existing = json_decode($row['data'], true) ?: [];
        // set the specific step data
        $existing['step' . $step] = $stepData;
        // compute completed_steps
        $completed = 0;
        for ($i = 1; $i <= 5; $i++) {
            if (!empty($existing['step' . $i])) $completed++;
        }
        $stmt = $pdo->prepare("UPDATE major_offenses SET data = ?, completed_steps = ? WHERE student_id = ?");
        $stmt->execute([json_encode($existing), $completed, $student_id]);

        echo json_encode(['success' => true, 'student_id' => $student_id, 'data' => $existing, 'completed_steps' => $completed]);
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
        echo json_encode(['success' => true, 'student_id' => $student_id, 'data' => $new, 'completed_steps' => $completed]);
        exit;
    }
}

// fallback
http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
exit;
?>