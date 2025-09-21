<?php
// =============================
// Error Handling & Headers
// =============================

// Register a shutdown function to catch fatal errors and ensure JSON is always returned
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR])) {
        if (!headers_sent()) {
            http_response_code(500);
            header("Access-Control-Allow-Origin: http://localhost:3000");
            header("Access-Control-Allow-Credentials: true");
            header("Access-Control-Allow-Headers: Content-Type, Authorization");
            header("Access-Control-Allow-Methods: POST, OPTIONS");
            header("Content-Type: application/json; charset=UTF-8");
        }
        if (ob_get_level() > 0) {
            ob_get_clean();
        }
        echo json_encode([
            "success" => false,
            "message" => "A fatal server error occurred. See 'error' for details.",
            "error"   => [
                "type"    => $error['type'],
                "message" => $error['message'],
                "file"    => $error['file'],
                "line"    => $error['line'],
            ],
        ]);
        exit;
    }
});

// Start output buffering to prevent any stray output from breaking JSON
ob_start();

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_flush();
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    ob_end_flush();
    exit;
}

// =============================
// Dependencies
// =============================
// NOTE: The 'use' statements are removed. We will use fully qualified class names.
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

// =============================
// Database Connection
// =============================
$host = "localhost";
$user = "root";
$pass = "";
$db   = "student_db";

// Check if mysqli class exists. If not, it's a fatal error the shutdown handler will catch.
if (!class_exists('mysqli')) {
    // This will trigger the shutdown function to report the error.
    trigger_error("The mysqli extension is not installed or enabled.", E_USER_ERROR);
}

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Connection failed: " . $conn->connect_error]);
    ob_end_flush();
    exit;
}

// =============================
// Parse JSON Input
// =============================
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON input"]);
    ob_end_flush();
    exit;
}

$studentId       = $data['student_id'] ?? null;
$incidentDetails = $data['incident'] ?? [];

if (!$studentId) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Student ID is required"]);
    ob_end_flush();
    exit;
}

// =============================
// Fetch Student Email
// =============================
$stmt = $conn->prepare("SELECT email FROM students WHERE student_id = ? LIMIT 1");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB prepare statement failed: " . $conn->error]);
    ob_end_flush();
    exit;
}

$stmt->bind_param("s", $studentId);
$stmt->execute();
$result  = $stmt->get_result();
$student = $result->fetch_assoc();
$stmt->close();
$conn->close();

if (!$student || empty($student['email'])) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Student email not found for ID: " . htmlspecialchars($studentId)]);
    ob_end_flush();
    exit;
}

// =============================
// Send Email via PHPMailer
// =============================
$mail = new PHPMailer\PHPMailer\PHPMailer(true);

try {
    $mail->SMTPDebug  = PHPMailer\PHPMailer\SMTP::DEBUG_OFF; 
    $mail->Debugoutput = function($str, $level) {
        error_log("PHPMailer [$level]: $str");
    };

    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'studentdiscipline2@gmail.com';
    $mail->Password   = 'nmbu qare yivj mxjr';
    $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom('studentdiscipline2@gmail.com', 'Student Discipline Office');
    $mail->addAddress($student['email']);

    $mail->isHTML(false);
    $mail->Subject = 'Notification of Incident Report';

    $message  = "Dear Student,\n\nThis is to inform you that an incident report has been filed concerning you.\n\n";
    if (!empty($incidentDetails)) {
        $message .= "Incident Details:\n";
        $message .= "Type: " . ($incidentDetails['type'] ?? 'N/A') . "\n";
        $message .= "Offense: " . ($incidentDetails['offense'] ?? 'N/A') . "\n";
        $message .= "Violation: " . ($incidentDetails['violation'] ?? 'N/A') . "\n";
        $message .= "Sanction: " . ($incidentDetails['sanction'] ?? 'N/A') . "\n";
    }
    $message .= "\nPlease visit the student affairs office for more details.\n\nSincerely,\nStudent Discipline Office";

    $mail->Body = $message;

    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Notification sent successfully to " . $student['email']
    ]);

} catch (PHPMailer\PHPMailer\Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error: " . $mail->ErrorInfo,
        "debug_info" => $e->getMessage()
    ]);
}

ob_end_flush();
