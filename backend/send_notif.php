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

$raw = file_get_contents("php://input");
$data = json_decode($raw, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid JSON input"]);
    ob_end_flush();
    exit;
}

$incidentDetails = $data['incident'] ?? [];


$recipientEmail = null;
$emailKeys = [
    "email", "parent_email", "guardian_email", "parentEmail", "guardianEmail",
    "email_address", "guardianEmailAddress", "contact_email", "contact", "student_email"
];
foreach ($emailKeys as $key) {
    if (!empty($incidentDetails[$key]) && filter_var($incidentDetails[$key], FILTER_VALIDATE_EMAIL)) {
        $recipientEmail = $incidentDetails[$key];
        break;
    }
}

if (!$recipientEmail) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "A valid recipient email address was not found in the provided data. Please ensure the student record has an email.",
        "debug_data" => $incidentDetails // for debugging on the client
    ]);
    ob_end_flush();
    exit;
}

// =============================
// Send Email via PHPMailer
// =============================
$mail = new PHPMailer(true);

try {
    // Server settings
    $mail->SMTPDebug  = SMTP::DEBUG_SERVER; // Enable verbose debug output
    $mail->Debugoutput = 'html'; // Display output as HTML

    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'studentdiscipline2@gmail.com';
    $mail->Password   = 'nmbu qare yivj mxjr'; // IMPORTANT: Use a Gmail App Password here
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Recipients
    $mail->setFrom('studentdiscipline2@gmail.com', 'Student Discipline Office');
    $mail->addAddress($recipientEmail);

    // Content
    $mail->isHTML(true);
    $mail->Subject = 'Notification of Incident Report';

    $studentName = htmlspecialchars($incidentDetails['name'] ?? 'Student');
    $studentIdNum = htmlspecialchars($incidentDetails['student_id'] ?? ($incidentDetails['id'] ?? 'N/A'));
    $dateStr = date('F j, Y');

    $body  = "<p>Dear Parent/Guardian,</p>";
    $body .= "<p>This is to inform you that an incident involving your child, <b>{$studentName}</b> (Student ID: {$studentIdNum}), was recorded on {$dateStr}.</p>";
    $body .= "<p>Below are the details:</p>";
    $body .= "<ul style='list-style-type: none; padding: 0;'>";
    $body .= "<li style='margin-bottom: 5px;'><b>Type of Violation:</b> " . htmlspecialchars($incidentDetails['type'] ?? 'N/A') . "</li>";
    $body .= "<li style='margin-bottom: 5px;'><b>Violation:</b> " . htmlspecialchars($incidentDetails['violation'] ?? 'N/A') . "</li>";
    $body .= "<li style='margin-bottom: 5px;'><b>Sanction:</b> " . htmlspecialchars($incidentDetails['sanction'] ?? 'N/A') . "</li>";
    $body .= "<li style='margin-bottom: 5px;'><b>Number of Offense:</b> " . htmlspecialchars($incidentDetails['offense'] ?? 'N/A') . "</li>";
    $body .= "</ul>";
    $body .= "<p>We request your cooperation in addressing this matter. Please contact the school office or the guidance counselor to discuss the incident or to schedule a meeting if needed.</p>";
    $body .= "<p>Sincerely,<br>Student Discipline Office</p>";

    $mail->Body = $body;

    $altBody  = "Dear Parent/Guardian,\n\n";
    $altBody .= "This is to inform you that an incident involving your child, {$studentName} (Student ID: {$studentIdNum}), was recorded on {$dateStr}.\n\n";
    $altBody .= "Incident Details:\n";
    $altBody .= "- Type of Violation: " . ($incidentDetails['type'] ?? 'N/A') . "\n";
    $altBody .= "- Violation: " . ($incidentDetails['violation'] ?? 'N/A') . "\n";
    $altBody .= "- Sanction: " . ($incidentDetails['sanction'] ?? 'N/A') . "\n";
    $altBody .= "- Number of Offense: " . ($incidentDetails['offense'] ?? 'N/A') . "\n\n";
    $altBody .= "We request your cooperation in addressing this matter. Please contact the school office or the guidance counselor to discuss the incident or to schedule a meeting if needed.\n\n";
    $altBody .= "Sincerely,\nStudent Discipline Office";

    $mail->AltBody = $altBody;

    // Clear the output buffer before sending, to make sure debug output is visible
    ob_clean();

    $mail->send();

    echo json_encode([
        "success" => true,
        "message" => "Notification sent successfully to " . htmlspecialchars($recipientEmail)
    ]);

} catch (Exception $e) {
    // Clear the output buffer to ensure our JSON error is the only output
    ob_clean();
    http_response_code(500);
    error_log("Mailer Error: " . $mail->ErrorInfo); // Log the detailed error
    echo json_encode([
        "success" => false,
        "message" => "Mailer Error: Could not send email. " . $mail->ErrorInfo,
        "debug_info" => $e->getMessage()
    ]);
}

ob_end_flush();
?>
