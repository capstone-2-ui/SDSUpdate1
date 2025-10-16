<?php
// backend/Incident.php

// --- Dynamic CORS Handling ---
$allowed_origins = [
    "http://localhost:3000",
    "http://192.168.0.111:3000"
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    header("Access-Control-Allow-Credentials: true");
}

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

    // Handle sending notifications
    if (isset($data['action']) && $data['action'] === 'send_notification') {
        $studentId = $data['student_id'] ?? null;
        $incidentDetails = $data['incident'] ?? [];

        if (!$studentId) { 
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Student ID is required."]);
            exit;
        }

        // -------------------------
        // Fetch student's email from the central student_db
        // -------------------------
        $studentDbName = "student_db";
        $sconn = new mysqli($host, $user, $pass, $studentDbName);
        if ($sconn->connect_error) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Failed to connect to student_db: " . $sconn->connect_error]);
            exit;
        }

        $stmt = $sconn->prepare("SELECT email FROM students WHERE student_id = ? LIMIT 1");
        if (!$stmt) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Prepare failed when fetching student email: " . $sconn->error]);
            $sconn->close();
            exit;
        }
        $stmt->bind_param("s", $studentId);
        if (!$stmt->execute()) {
            http_response_code(500);
            echo json_encode(["success" => false, "message" => "Query failed when fetching student email: " . $stmt->error]);
            $stmt->close();
            $sconn->close();
            exit;
        }
        $res = $stmt->get_result();
        $studentRow = $res->fetch_assoc();
        $stmt->close();
        $sconn->close();

        if (!$studentRow || empty($studentRow['email'])) {
            http_response_code(404);
            echo json_encode(["success" => false, "message" => "Student email not found for ID: " . htmlspecialchars($studentId)]);
            exit;
        }

        $to = $studentRow['email'];
        $subject = "Notification of Incident Report";

        $message = "Dear Student/Parents,\n\nThis is to inform you that an incident report has been filed concerning you.\n\n";
        if (!empty($incidentDetails)) {
            $message .= "Incident Details:\n";
            $message .= "Type: " . ($incidentDetails['type'] ?? 'N/A') . "\n";
            $message .= "Offense: " . ($incidentDetails['offense'] ?? 'N/A') . "\n";
            $message .= "Violation: " . ($incidentDetails['violation'] ?? 'N/A') . "\n";
            $message .= "Sanction: " . ($incidentDetails['sanction'] ?? 'N/A') . "\n";
        }
        $message .= "\nPlease visit the Student Affairs Office for more details.\n\nSincerely,\nOffice of Student Affairs";

        // ------------ PHPMailer Loader + Send ------------
        $phpmailerDir = __DIR__ . DIRECTORY_SEPARATOR . 'PHPMailer' . DIRECTORY_SEPARATOR;

        $triedFiles = [];
        if (file_exists($phpmailerDir . 'Exception.php')) {
            require_once $phpmailerDir . 'Exception.php';
            $triedFiles[] = 'Exception.php';
        }
        if (file_exists($phpmailerDir . 'SMTP.php')) {
            require_once $phpmailerDir . 'SMTP.php';
            $triedFiles[] = 'SMTP.php';
        }
        $possibleFiles = ['PHPMailer.php', 'PHPMailer.php.bak-20250918110801'];
        foreach ($possibleFiles as $f) {
            $full = $phpmailerDir . $f;
            if (file_exists($full)) {
                require_once $full;
                $triedFiles[] = $f;
                break;
            }
        }

        try {
            $mail = null;
            $isNamespaced = false;

            if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
                $mail = new PHPMailer\PHPMailer\PHPMailer(true);
                $isNamespaced = true;
            } elseif (class_exists('PHPMailer')) {
                $mail = new PHPMailer(true);
                $isNamespaced = false;
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'PHPMailer not found. Checked: ' . implode(', ', $triedFiles)
                ]);
                exit;
            }

            // SMTP configuration
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'studentdiscipline2@gmail.com';
            $mail->Password   = 'nmbu qare yivj mxjr'; // ⚠️ secure properly
            if ($isNamespaced && defined('PHPMailer\\PHPMailer\\PHPMailer::ENCRYPTION_STARTTLS')) {
                $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPSecure = 'tls';
            }
            $mail->Port       = 587;

            $mail->setFrom('studentdiscipline2@gmail.com', 'Student Discipline Office');
            $mail->addAddress($to);

            $mail->isHTML(false);
            $mail->Subject = $subject;
            $mail->Body = $message;

            $mail->send();

            echo json_encode(['success' => true, 'message' => 'Notification has been sent successfully to ' . $to]);
        } catch (Throwable $e) {
            http_response_code(500);
            $errorInfo = '';
            if (isset($mail) && is_object($mail) && property_exists($mail, 'ErrorInfo')) {
                $errorInfo = ' ' . ($mail->ErrorInfo ?? '');
            }
            echo json_encode([
                'success' => false,
                'message' => 'Mailer Error: ' . $e->getMessage() . $errorInfo,
            ]);
        }
        exit;
    }

    // Save incident
    $studentId  = $data["id"] ?? ($data["student_id"] ?? "");
    $name       = $data["name"] ?? "";
    $department = $data["department"] ?? "";
    $grade      = $data["grade"] ?? "";
    $year       = $data["year"] ?? "";
    $section    = $data["section"] ?? "";
    $type       = $data["type"] ?? "";
    $offense    = $data["offense"] ?? "";
    $violation  = $data["violation"] ?? "";
    $sanction   = $data["sanction"] ?? "";

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
    if (isset($_GET['type'])) {
        $type = $conn->real_escape_string($_GET['type']);
        $kind = $_GET['kind'] ?? '';
        $response = [];

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

        if ($kind === 'violations') {
            echo json_encode($response['violations']);
        } elseif ($kind === 'sanctions') {
            echo json_encode($response['sanctions']);
        } else {
            echo json_encode($response);
        }
        exit;
    } else {
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
    $grade      = $data["grade"] ?? "";
    $year       = $data["year"] ?? "";
    $section    = $data["section"] ?? "";
    $type       = $data["type"] ?? "";
    $offense    = $data["offense"] ?? "";
    $violation  = $data["violation"] ?? "";
    $sanction   = $data["sanction"] ?? "";

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
