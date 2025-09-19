<?php
// =============================
// Error Handling & Headers
// =============================

// Don't output raw HTML errors to frontend
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// Always return JSON
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

// =============================
// Dependencies
// =============================
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

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

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Connection failed"]);
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
    exit;
}

$studentId       = $data['student_id'] ?? null;
$incidentDetails = $data['incident'] ?? [];

if (!$studentId) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Student ID is required"]);
    exit;
}

// =============================
// Fetch Student Email
// =============================
$stmt = $conn->prepare("SELECT email FROM students WHERE student_id = ? LIMIT 1");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB error"]);
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
    echo json_encode(["success" => false, "message" => "Student email not found"]);
    exit;
}

// =============================
// Send Email via PHPMailer
// =============================
$mail = new PHPMailer(true);

try {
    // Debugging goes to error log (not frontend)
    $mail->SMTPDebug  = SMTP::DEBUG_OFF; 
    $mail->Debugoutput = function($str, $level) {
        error_log("PHPMailer [$level]: $str");
    };

    // SMTP config
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'studentdiscipline2@gmail.com';
    $mail->Password   = 'nmbu qare yivj mxjr'; // Gmail App Password
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Recipients
    $mail->setFrom('studentdiscipline2@gmail.com', 'Student Discipline Office');
    $mail->addAddress($student['email']);

    // Message
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

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error",
        "error"   => $mail->ErrorInfo // short error
        // "debug" => $e->getMessage() // uncomment only if you want full debug
    ]);
}
