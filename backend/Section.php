<?php
// section.php

// === CORS HEADERS ===
$allowed_origins = [
    "http://localhost:3000",
    "http://192.168.0.111:3000"
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost:3000"); // fallback
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// === Database connection ===
$servername = "localhost"; 
$username   = "root"; 
$password   = ""; 
$dbname     = "section_db";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"), true);

// === GET all ===
if ($method === "GET") {
    $sql = "SELECT * FROM sections ORDER BY id ASC";
    $result = $conn->query($sql);
    $sections = [];
    while ($row = $result->fetch_assoc()) {
        $sections[] = $row;
    }
    echo json_encode($sections);
    exit;
}

// === CREATE ===
if ($method === "POST") {
    if (!empty($input['section']) && !empty($input['type'])) {
        $stmt = $conn->prepare("INSERT INTO sections (section, type) VALUES (?, ?)");
        $stmt->bind_param("ss", $input['section'], $input['type']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Section added successfully", "id" => $conn->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $stmt->error]);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
    }
    exit;
}

// === UPDATE ===
if ($method === "PUT") {
    if (!empty($input['id']) && !empty($input['section']) && !empty($input['type'])) {
        $stmt = $conn->prepare("UPDATE sections SET section=?, type=? WHERE id=?");
        $stmt->bind_param("ssi", $input['section'], $input['type'], $input['id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Section updated successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $stmt->error]);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
    }
    exit;
}

// === DELETE ===
if ($method === "DELETE") {
    if (!empty($input['id'])) {
        $stmt = $conn->prepare("DELETE FROM sections WHERE id=?");
        $stmt->bind_param("i", $input['id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Section deleted successfully"]);
        } else {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => $stmt->error]);
        }
        $stmt->close();
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing section ID"]);
    }
    exit;
}

$conn->close();
?>
