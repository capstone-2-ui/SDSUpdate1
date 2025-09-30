<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

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
            "error"   => $error,
        ]);
        exit;
    }
});

ob_start();

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

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/PHPMailer/Exception.php';
require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';

// ========== DB CONNECTION ==========
$servername = "localhost";   // change if DB is remote (e.g. 192.168.100.88)
$username   = "root";
$password   = "";
$dbname     = "incident_db";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed: " . $conn->connect_error]);
    ob_end_flush();
    exit;
}
// ==================================

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON input"]);
    ob_end_flush();
    exit;
}

// We expect at least student_id
$studentId = $data['student_id'] ?? null;
if (!$studentId) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing student_id"]);
    ob_end_flush();
    exit;
}

// Fetch incident + student details from DB
$sql = "SELECT i.type, i.violation, i.sanction, i.offense,
               s.name, s.student_id, s.email, s.parent_email, s.guardian_email
        FROM incidents i
        JOIN students s ON i.student_id = s.student_id
        WHERE s.student_id = ? 
        ORDER BY i.created_at DESC LIMIT 1";

$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $studentId);
$stmt->execute();
$result = $stmt->get_result();
$incidentDetails = $result->fetch_assoc();
$stmt->close();
$conn->close();

if (!$incidentDetails) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "No incident found for student_id: $studentId"]);
    ob_end_flush();
    exit;
}

// Determine recipient email
$recipientEmail = null;
$emailKeys = ["email", "parent_email", "guardian_email"];
foreach ($emailKeys as $key) {
    if (!empty($incidentDetails[$key]) && filter_var($incidentDetails[$key], FILTER_VALIDATE_EMAIL)) {
        $recipientEmail = $incidentDetails[$key];
        break;
    }
}

if (!$recipientEmail) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "No valid email found for this student"]);
    ob_end_flush();
    exit;
}

// =============================
// Send Email via PHPMailer
// =============================
$mail = new PHPMailer(true);

try {
    $mail->SMTPDebug  = SMTP::DEBUG_SERVER; 
    $mail->Debugoutput = 'html';

    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'studentdiscipline2@gmail.com';
    $mail->Password   = 'nmbu qare yivj mxjr'; 
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom('studentdiscipline2@gmail.com', 'Student Discipline Office');
    $mail->addAddress($recipientEmail);

    $mail->isHTML(true);
    $mail->Subject = 'Notification of Incident Report';

    $studentName  = htmlspecialchars($incidentDetails['name'] ?? 'Student');
    $studentIdNum = htmlspecialchars($incidentDetails['student_id'] ?? 'N/A');
    $dateStr      = date('F j, Y');

    $body  = "<p>Dear Parent/Guardian,</p>";
    $body .= "<p>This is to inform you that an incident involving your child, <b>{$studentName}</b> (Student ID: {$studentIdNum}), was recorded on {$dateStr}.</p>";
    $body .= "<p>Details:</p><ul>";
    $body .= "<li><b>Type:</b> " . htmlspecialchars($incidentDetails['type'] ?? 'N/A') . "</li>";
    $body .= "<li><b>Violation:</b> " . htmlspecialchars($incidentDetails['violation'] ?? 'N/A') . "</li>";
    $body .= "<li><b>Sanction:</b> " . htmlspecialchars($incidentDetails['sanction'] ?? 'N/A') . "</li>";
    $body .= "<li><b>Offense:</b> " . htmlspecialchars($incidentDetails['offense'] ?? 'N/A') . "</li>";
    $body .= "</ul>";
    $body .= "<p>Please contact the school office or guidance counselor for further discussion.</p>";
    $body .= "<p>Sincerely,Student Discipline Office</p>";

    $mail->Body = $body;
    $mail->AltBody = strip_tags(str_replace(["<br>", "<li>", "</li>"], ["\n", "- ", ""], $body));
    var_dump($body);
    ob_clean();
    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Notification sent successfully to " . htmlspecialchars($recipientEmail),
        "incident" => $incidentDetails
    ]);

} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    error_log("Mailer Error: " . $mail->ErrorInfo);
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error: Could not send email.",
        "debug_info" => $e->getMessage()
    ]);
}

ob_end_flush();
?>
