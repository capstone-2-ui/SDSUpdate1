<?php
// backend/Incident.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

// handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// DB connection
$host = "localhost";
$user = "root";
$pass = "";

// <-- changed DB name to incident_db so table includes grade/section columns
$db   = "incident_db";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Connection failed: " . $conn->connect_error]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

function readJsonInput() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    if (!is_array($data)) return [];
    return $data;
}

if ($method === "POST") {
    $data = readJsonInput();
    $studentId  = $data["id"] ?? ($data["student_id"] ?? "");
    $name       = $data["name"] ?? "";
    $department = $data["department"] ?? "";
    // new: read grade from payload
    $grade      = $data["grade"] ?? "";
    $year       = $data["year"] ?? "";
    $section    = $data["section"] ?? "";
    $type       = $data["type"] ?? "";
    $offense    = $data["offense"] ?? "";
    $violation  = $data["violation"] ?? "";
    $sanction   = $data["sanction"] ?? "";

    // include grade in the INSERT columns/placeholders and bind params
    $stmt = $conn->prepare("INSERT INTO incidents (student_id, name, department, grade, year, section, type, offense, violation, sanction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssssssss", $studentId, $name, $department, $grade, $year, $section, $type, $offense, $violation, $sanction);
    if ($stmt->execute()) {
        $insertedId = $stmt->insert_id;
        $stmt->close();
        echo json_encode(["success" => true, "message" => "Incident saved", "id" => $insertedId]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $stmt->error]);
        $stmt->close();
    }
}
elseif ($method === "GET") {
    // If client provides ?type=Minor (or Major) we return violations and/or sanctions.
    if (isset($_GET['type'])) {
        $type = $conn->real_escape_string($_GET['type']);
        $kind = $_GET['kind'] ?? ''; // optional: 'violations' or 'sanctions'
        $response = [];

        // Fetch violations when requested or when no specific kind provided
        if ($kind === '' || $kind === 'violations') {
            $response['violations'] = [];
            $sql = "SELECT id, violation AS name FROM violation_db.violations WHERE type='" . $type . "'";
            $result = $conn->query($sql);
            if ($result) {
                while ($row = $result->fetch_assoc()) {
                    $response['violations'][] = $row;
                }
            }
        }

        // Fetch sanctions when requested or when no specific kind provided
        if ($kind === '' || $kind === 'sanctions') {
            $response['sanctions'] = [];
            $sql2 = "SELECT id, sanction AS name FROM sanction_db.sanctions WHERE type='" . $type . "'";
            $result2 = $conn->query($sql2);
            if ($result2) {
                while ($row = $result2->fetch_assoc()) {
                    $response['sanctions'][] = $row;
                }
            }
        }

        // If client asked for a single kind, return that array directly for compatibility
        if ($kind === 'violations') {
            echo json_encode($response['violations']);
        } elseif ($kind === 'sanctions') {
            echo json_encode($response['sanctions']);
        } else {
            echo json_encode($response); // both lists
        }
        exit;
    } else {
        // Default: return incidents list
        $result = $conn->query("SELECT * FROM incidents ORDER BY created_at DESC");
        $incidents = [];
        while ($row = $result->fetch_assoc()) {
            $incidents[] = $row;
        }
        echo json_encode($incidents);
    }
}
elseif ($method === "PUT") {
    $data = readJsonInput();
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing incident id"]);
        exit;
    }
    $id = (int)$data['id'];
    $studentId  = $data["student_id"] ?? ($data["id"] ?? "");
    $name       = $data["name"] ?? "";
    $department = $data["department"] ?? "";
    // new: include grade when updating
    $grade      = $data["grade"] ?? "";
    $year       = $data["year"] ?? "";
    $section    = $data["section"] ?? "";
    $type       = $data["type"] ?? "";
    $offense    = $data["offense"] ?? "";
    $violation  = $data["violation"] ?? "";
    $sanction   = $data["sanction"] ?? "";

    // include grade in the update set and bind params accordingly
    $stmt = $conn->prepare("UPDATE incidents SET student_id=?, name=?, department=?, grade=?, year=?, section=?, type=?, offense=?, violation=?, sanction=?, updated_at=CURRENT_TIMESTAMP WHERE id=?");
    $stmt->bind_param("ssssssssssi", $studentId, $name, $department, $grade, $year, $section, $type, $offense, $violation, $sanction, $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Incident updated"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $stmt->error]);
    }
    $stmt->close();
}
elseif ($method === "DELETE") {
    $data = readJsonInput();
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing incident id"]);
        exit;
    }
    $id = (int)$data['id'];
    $stmt = $conn->prepare("DELETE FROM incidents WHERE id=?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Incident deleted"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => $stmt->error]);
    }
    $stmt->close();
}
else {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
}

$conn->close();
?>
