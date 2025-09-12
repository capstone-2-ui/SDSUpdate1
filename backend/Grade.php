<?php
// Grade.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database connection
$servername = "localhost";
$username   = "root";        // change if needed
$password   = "";            // change if needed
$dbname     = "grade_db";   // change if needed

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"), true);

// ---------------------- GET ALL GRADES ----------------------
if ($method === "GET") {
    $sql = "SELECT * FROM grades ORDER BY id ASC";
    $result = $conn->query($sql);
    $grades = [];
    while ($row = $result->fetch_assoc()) {
        $grades[] = $row;
    }
    echo json_encode($grades);
}

// ---------------------- ADD GRADE ----------------------
elseif ($method === "POST") {
    if (!empty($input['grade']) && !empty($input['type'])) {
        $stmt = $conn->prepare("INSERT INTO grades (grade, type) VALUES (?, ?)");
        $stmt->bind_param("ss", $input['grade'], $input['type']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Grade added successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
    }
}

// ---------------------- UPDATE GRADE ----------------------
elseif ($method === "PUT") {
    if (!empty($input['id']) && !empty($input['grade']) && !empty($input['type'])) {
        $stmt = $conn->prepare("UPDATE grades SET grade=?, type=? WHERE id=?");
        $stmt->bind_param("ssi", $input['grade'], $input['type'], $input['id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Grade updated successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
    }
}

// ---------------------- DELETE GRADE ----------------------
elseif ($method === "DELETE") {
    if (!empty($input['id'])) {
        $stmt = $conn->prepare("DELETE FROM grades WHERE id=?");
        $stmt->bind_param("i", $input['id']);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Grade deleted successfully"]);
        } else {
            echo json_encode(["success" => false, "message" => "Error: " . $stmt->error]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Missing grade ID"]);
    }
}

$conn->close();
