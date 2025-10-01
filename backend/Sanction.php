<?php
// Sanction.php

// === CORS HEADERS ===
$allowed_origins = [
    "http://localhost:3000",
    "http://192.168.0.110:3000"
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost:3000"); // fallback
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// === Database connection ===
$host = "localhost";     // change if needed
$user = "root";          // your DB username
$pass = "";              // your DB password
$dbname = "sanction_db"; // your DB name

$conn = new mysqli($host, $user, $pass, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $conn->connect_error]);
    exit;
}

// === Handle request ===
$action = $_GET['action'] ?? '';

switch ($action) {
    // GET ALL SANCTIONS
    case "read":
        $result = $conn->query("SELECT * FROM sanctions ORDER BY id DESC");
        $sanctions = [];
        while ($row = $result->fetch_assoc()) {
            $sanctions[] = $row;
        }
        echo json_encode($sanctions);
        break;

    // ADD SANCTION
    case "create":
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("INSERT INTO sanctions (sanction, type, offense, severity) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $data['sanction'], $data['type'], $data['offense'], $data['severity']);
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Sanction added successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $stmt->error]);
        }
        $stmt->close();
        break;

    // UPDATE SANCTION
    case "update":
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("UPDATE sanctions SET sanction=?, type=?, offense=?, severity=? WHERE id=?");
        $stmt->bind_param("ssssi", $data['sanction'], $data['type'], $data['offense'], $data['severity'], $data['id']);
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Sanction updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $stmt->error]);
        }
        $stmt->close();
        break;

    // DELETE SANCTION
    case "delete":
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("DELETE FROM sanctions WHERE id=?");
        $stmt->bind_param("i", $data['id']);
        if ($stmt->execute()) {
            echo json_encode(["status" => "success", "message" => "Sanction deleted successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => $stmt->error]);
        }
        $stmt->close();
        break;

    // BULK UPLOAD
    case "bulkUpload":
        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || !is_array($data)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Invalid bulk data"]);
            exit;
        }

        $stmt = $conn->prepare("INSERT INTO sanctions (sanction, type, offense, severity) VALUES (?, ?, ?, ?)");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Prepare failed: " . $conn->error]);
            exit;
        }

        $successCount = 0;
        foreach ($data as $row) {
            if (!isset($row['sanction'], $row['type'], $row['offense'], $row['severity'])) {
                continue; // skip incomplete rows
            }
            $stmt->bind_param("ssss", $row['sanction'], $row['type'], $row['offense'], $row['severity']);
            if ($stmt->execute()) {
                $successCount++;
            }
        }

        echo json_encode(["status" => "success", "inserted" => $successCount]);
        $stmt->close();
        break;

    default:
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid action"]);
        break;
}

$conn->close();
?>
