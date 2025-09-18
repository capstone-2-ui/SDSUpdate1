<?php
// backend/send_notif.php
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

// Only allow POST method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

// DB connection
$host = "localhost";
$user = "root";
$pass = "";
$db   = "incident_db"; // Connect to a default DB, the query will specify student_db

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "DB Connection failed: " . $conn->connect_error]);
    exit;
}

// Helper to read JSON input
function readJsonInput() {
    $raw = file_get_contents("php://input");
    $data = json_decode($raw, true);
    if (!is_array($data)) return [];
    return $data;
}

$data = readJsonInput();
$studentId = $data['student_id'] ?? null;
$incidentDetails = $data['incident'] ?? [];

if (!$studentId) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Student ID is required."]);
    exit;
}

// Fetch student's email from student_db
$stmt = $conn->prepare("SELECT email FROM student_db.students WHERE student_id = ? LIMIT 1");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to prepare statement to get email: " . $conn->error]);
    exit;
}
$stmt->bind_param("s", $studentId);
$stmt->execute();
$result = $stmt->get_result();
$student = $result->fetch_assoc();
$stmt->close();

if (!$student || empty($student['email'])) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Student email not found or is empty for the provided ID."]);
    exit;
}

$to = $student['email'];
$subject = "Notification of Incident Report";

// Construct a detailed message from incident details passed from frontend
$message = "Dear Student,\n\nThis is to inform you that an incident report has been filed concerning you.\n\n";
if (!empty($incidentDetails)) {
    $message .= "Incident Details:\n";
    $message .= "Type: " . ($incidentDetails['type'] ?? 'N/A') . "\n";
    $message .= "Offense: " . ($incidentDetails['offense'] ?? 'N/A') . "\n";
    $message .= "Violation: " . ($incidentDetails['violation'] ?? 'N/A') . "\n";
    $message .= "Sanction: " . ($incidentDetails['sanction'] ?? 'N/A') . "\n";
}
$message .= "\nPlease visit the student affairs office for more details.\n\nSincerely,\nStudent Discipline Office";

// Use a generic From address. Ensure your server is configured to send mail.
$headers = "From: no-reply@sds-school-system.com";

if (mail($to, $subject, $message, $headers)) {
    echo json_encode(["success" => true, "message" => "Notification sent successfully to " . $to]);
} else {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to send email. Please check server mail configuration."]);
}

$conn->close();
?>
