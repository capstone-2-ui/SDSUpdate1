<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Load PHPMailer classes
require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

// --- Headers (CORS + JSON) ---
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");

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

// --- DB Connection ---
$host = "localhost";
$user = "root";
$pass = "";
$db   = "student_db";

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Connection failed: " . $conn->connect_error]);
    exit;
}

// --- Read JSON Input ---
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) $data = [];

$studentId       = $data['student_id'] ?? null;
$incidentDetails = $data['incident'] ?? [];

if (!$studentId) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Student ID is required."]);
    exit;
}

// --- Fetch Student Email ---
$stmt = $conn->prepare("SELECT email FROM students WHERE student_id = ? LIMIT 1");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB statement failed: " . $conn->error]);
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
    echo json_encode(["success" => false, "message" => "Student email not found for the provided ID."]);
    exit;
}

// --- PHPMailer ---
$mail = new PHPMailer(true);

try {
    // Debugging (set to 0 in production)
    $mail->SMTPDebug = SMTP::DEBUG_SERVER; // shows detailed connection log
    $mail->Debugoutput = 'error_log'; // log to PHP error log

    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;

    // Use Gmail App Password (not your Gmail login password)
    $mail->Username   = 'studentdiscipline2@gmail.com';
    $mail->Password   = 'nmbu qare yivj mxjr';

    // Encryption & Port
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // or ENCRYPTION_SMTPS
    $mail->Port       = 587; // 587 for TLS, 465 for SSL

    // Recipients
    $mail->setFrom('studentdiscipline2@gmail.com', 'Student Discipline Office');
    $mail->addAddress($student['email']);

    // Content
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
    echo json_encode(['success' => true, 'message' => 'Notification sent successfully to ' . $student['email']]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error: " . $mail->ErrorInfo,
        "debug"   => $e->getMessage()
    ]);
}
