<?php
// Violation.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database connection
$servername = "localhost";
$username   = "root";      // change if needed
$password   = "";          // change if needed
$dbname     = "violation_db"; // change if needed

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

// Handle request method
$method = $_SERVER['REQUEST_METHOD'];

// Parse input (for POST/PUT/DELETE)
$input = json_decode(file_get_contents("php://input"), true);

// ---------------------- GET ALL VIOLATIONS ----------------------
if ($method === "GET") {
    $sql = "SELECT * FROM violations ORDER BY id DESC";
    $result = $conn->query($sql);
    $violations = [];
    while ($row = $result->fetch_assoc()) {
        $violations[] = $row;
    }
    echo json_encode($violations);
}

// ---------------------- ADD VIOLATION ----------------------
elseif ($method === "POST") {
    if (!empty($input['violation']) && !empty($input['type']) && !empty($input['severity'])) {
        $stmt = $conn->prepare("INSERT INTO violations (violation, type, severity) VALUES (?, ?, ?)");
        $stmt->bind_param("sss", $input['violation'], $input['type'], $input['severity']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Violation added successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
    }
}

// ---------------------- UPDATE VIOLATION ----------------------
elseif ($method === "PUT") {
    if (!empty($input['id']) && !empty($input['violation']) && !empty($input['type']) && !empty($input['severity'])) {
        $stmt = $conn->prepare("UPDATE violations SET violation=?, type=?, severity=? WHERE id=?");
        $stmt->bind_param("sssi", $input['violation'], $input['type'], $input['severity'], $input['id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Violation updated successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
    }
}

// ---------------------- DELETE VIOLATION ----------------------
elseif ($method === "DELETE") {
    if (!empty($input['id'])) {
        $stmt = $conn->prepare("DELETE FROM violations WHERE id=?");
        $stmt->bind_param("i", $input['id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Violation deleted successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Missing violation ID"]);
    }
}

$conn->close();
