<?php
// Department.php
session_start();

// --- CORS setup (support localhost and LAN IP) ---
$allowed_origins = [
    "http://localhost:3000",
    "http://192.168.0.110:3000"
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    header("Access-Control-Allow-Credentials: true");
}

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database connection
$servername = "localhost";
$username   = "root";      // change if needed
$password   = "";          // change if needed
$dbname     = "department_db";  // change to your database name

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
  http_response_code(500);
  echo json_encode(["error" => "Database connection failed"]);
  exit();
}

// Handle HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Handle preflight (CORS)
if ($method === "OPTIONS") {
    http_response_code(200);
    exit();
}

// Read input if available
$data = json_decode(file_get_contents("php://input"), true);

// ---- GET (Read All) ----
if ($method === "GET") {
    $sql = "SELECT * FROM departments ORDER BY id DESC";
    $result = $conn->query($sql);

    $departments = [];
    while ($row = $result->fetch_assoc()) {
        $departments[] = $row;
    }
    echo json_encode($departments);
}

// ---- POST (Add) ----
elseif ($method === "POST") {
    if (!empty($data["department"]) && !empty($data["type"])) {
        $department = $conn->real_escape_string($data["department"]);
        $type       = $conn->real_escape_string($data["type"]);

        $sql = "INSERT INTO departments (department, type) VALUES ('$department', '$type')";
        if ($conn->query($sql) === TRUE) {
            echo json_encode(["success" => true, "message" => "Department added"]);
        } else {
            echo json_encode(["success" => false, "message" => $conn->error]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Missing fields"]);
    }
}

// ---- PUT (Edit/Update) ----
elseif ($method === "PUT") {
    if (!empty($data["id"]) && !empty($data["department"]) && !empty($data["type"])) {
        $id         = (int)$data["id"];
        $department = $conn->real_escape_string($data["department"]);
        $type       = $conn->real_escape_string($data["type"]);

        $sql = "UPDATE departments SET department='$department', type='$type' WHERE id=$id";
        if ($conn->query($sql) === TRUE) {
            echo json_encode(["success" => true, "message" => "Department updated"]);
        } else {
            echo json_encode(["success" => false, "message" => $conn->error]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Missing fields"]);
    }
}

// ---- DELETE ----
elseif ($method === "DELETE") {
    if (!empty($data["id"])) {
        $id = (int)$data["id"];
        $sql = "DELETE FROM departments WHERE id=$id";

        if ($conn->query($sql) === TRUE) {
            echo json_encode(["success" => true, "message" => "Department deleted"]);
        } else {
            echo json_encode(["success" => false, "message" => $conn->error]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Missing ID"]);
    }
}

$conn->close();
?>
