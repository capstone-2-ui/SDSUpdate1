<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "login";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit;
}

$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (!is_array($data) || empty($data["email"]) || empty($data["password"])) {
    echo json_encode(["success" => false, "message" => "Missing email or password"]);
    exit;
}

$email    = $conn->real_escape_string($data["email"]);
$password = $data["password"];

$stmt = $conn->prepare("SELECT id, email, password, role FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result && $result->num_rows > 0) {
    $user = $result->fetch_assoc();

    if (hash_equals($user['password'], hash('sha256', $password))) {
        // produce a username default from email if not present
        $usernameFromEmail = explode('@', $user['email'])[0];

        // Ensure user_profiles table exists (lightweight)
        $createTableSql = "
        CREATE TABLE IF NOT EXISTS user_profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(255),
            role VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $conn->query($createTableSql);

        // Upsert profile into user_profiles (check exist then insert/update)
        $pStmt = $conn->prepare("SELECT id FROM user_profiles WHERE email = ?");
        $pStmt->bind_param("s", $user['email']);
        $pStmt->execute();
        $pRes = $pStmt->get_result();

        $usernameToStore = $usernameFromEmail;
        if ($pRes && $pRes->num_rows > 0) {
            $uStmt = $conn->prepare("UPDATE user_profiles SET username = ?, role = ? WHERE email = ?");
            $uStmt->bind_param("sss", $usernameToStore, $user['role'], $user['email']);
            $uStmt->execute();
            $uStmt->close();
        } else {
            $iStmt = $conn->prepare("INSERT INTO user_profiles (email, username, role) VALUES (?, ?, ?)");
            $iStmt->bind_param("sss", $user['email'], $usernameToStore, $user['role']);
            $iStmt->execute();
            $iStmt->close();
        }
        $pStmt->close();

        // set session current user
        $_SESSION['current_user'] = [
            "email" => $user['email'],
            "role"  => $user['role'],
            "username" => $usernameToStore
        ];

        unset($user['password']);
        echo json_encode([
            "success" => true,
            "message" => "Login successful",
            "user" => [
                "id"    => $user['id'],
                "email" => $user['email'],
                "role"  => $user['role'],
                "username" => $usernameToStore
            ]
        ]);
    } else {
        echo json_encode(["success" => false, "message" => "Invalid credentials"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Invalid credentials"]);
}

$stmt->close();
$conn->close();
?>
