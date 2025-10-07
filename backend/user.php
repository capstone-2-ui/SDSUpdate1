<?php
// Minimal, cleaned user.php with CORS and JSON outputs.
// Backup original before replacing.

session_start();

// CORS: allow localhost and LAN IP
$allowed_origins = [
    "http://localhost:3000",
    "http://192.168.0.134:3000"
];

if (isset($_SERVER['HTTP_ORIGIN']) && in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
} else {
    // fallback (for dev tools or direct API testing)
    header("Access-Control-Allow-Origin: http://localhost:3000");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Preflight
    http_response_code(200);
    exit;
}

// DB config
$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "login";

// Connect
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit;
}

// Ensure user_profiles table exists (simple schema)
$createProfiles = "
CREATE TABLE IF NOT EXISTS user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255),
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
$conn->query($createProfiles);

// Helper: current session user (from login.php)
$sessionUser = isset($_SESSION['current_user']) ? $_SESSION['current_user'] : null;

// GET: list users or current if ?current=1
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['current']) && $_GET['current']) {
        if ($sessionUser) {
            echo json_encode(["success" => true, "user" => $sessionUser]);
        } else {
            echo json_encode(["success" => false, "message" => "No active session"]);
        }
        $conn->close();
        exit;
    }

    $res = $conn->query("SELECT id, email, username, role FROM user_profiles ORDER BY id DESC");
    $rows = [];
    if ($res) {
        while ($r = $res->fetch_assoc()) {
            if ((empty($r['username']) || $r['username'] === null) && !empty($r['email'])) {
                $r['username'] = explode('@', $r['email'])[0];
            }
            $rows[] = $r;
        }
    }
    echo json_encode($rows);
    $conn->close();
    exit;
}

// POST: read JSON payload
$raw = file_get_contents("php://input");
$data = json_decode($raw, true);
if (!is_array($data)) {
    echo json_encode(["success" => false, "message" => "Invalid JSON"]);
    $conn->close();
    exit;
}

$action = isset($data['action']) ? $data['action'] : '';

// Protect modifying actions: require session
if (in_array($action, ['add', 'update', 'delete'])) {
    if (!$sessionUser) {
        echo json_encode(["success" => false, "message" => "Authentication required"]);
        $conn->close();
        exit;
    }
}

// ADD user (only ADMIN)
if ($action === 'add') {
    if (strtolower($sessionUser['role']) !== 'admin') {
        echo json_encode(["success" => false, "message" => "Only ADMIN can add users"]);
        $conn->close();
        exit;
    }

    $email = isset($data['email']) ? trim($data['email']) : '';
    $username = isset($data['username']) ? trim($data['username']) : '';
    $role = isset($data['role']) ? strtoupper(trim($data['role'])) : '';
    $passwordPlain = isset($data['password']) ? $data['password'] : '';

    if (!$email || !$passwordPlain) {
        echo json_encode(["success" => false, "message" => "Email and password required"]);
        $conn->close();
        exit;
    }

    $hashed = hash('sha256', $passwordPlain);

    // Insert into users (auth). Require that users table exists.
    $stmtUsers = $conn->prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)");
    if (!$stmtUsers) {
        echo json_encode(["success" => false, "message" => "DB prepare failed for users: " . $conn->error]);
        $conn->close();
        exit;
    }
    $stmtUsers->bind_param("sss", $email, $hashed, $role);
    if (!$stmtUsers->execute()) {
        $err = $stmtUsers->error;
        $stmtUsers->close();
        echo json_encode(["success" => false, "message" => "Failed to create auth user: " . $err]);
        $conn->close();
        exit;
    }
    $stmtUsers->close();

    if (!$username) $username = explode('@', $email)[0];
    $stmtP = $conn->prepare("INSERT INTO user_profiles (email, username, role) VALUES (?, ?, ?)");
    $stmtP->bind_param("sss", $email, $username, $role);
    $okP = $stmtP->execute();
    $insertId = $stmtP->insert_id;
    $stmtP->close();

    echo json_encode(["success" => (bool)$okP, "id" => $insertId]);
    $conn->close();
    exit;
}

// UPDATE
if ($action === 'update') {
    $id = isset($data['id']) ? intval($data['id']) : 0;
    $email = isset($data['email']) ? trim($data['email']) : '';
    $username = isset($data['username']) ? trim($data['username']) : '';
    $role = isset($data['role']) ? strtoupper(trim($data['role'])) : '';
    $passwordPlain = isset($data['password']) ? $data['password'] : '';

    if (!$id) {
        echo json_encode(["success" => false, "message" => "ID required"]);
        $conn->close();
        exit;
    }

    $r = $conn->query("SELECT email FROM user_profiles WHERE id = $id");
    $row = $r ? $r->fetch_assoc() : null;
    $targetEmail = $row ? $row['email'] : '';

    $isAdmin = strtolower($sessionUser['role']) === 'admin';
    if (!$isAdmin && $sessionUser['email'] !== $targetEmail) {
        echo json_encode(["success" => false, "message" => "Not authorized to update this user"]);
        $conn->close();
        exit;
    }

    $stmt = $conn->prepare("UPDATE user_profiles SET email = ?, username = ?, role = ? WHERE id = ?");
    $stmt->bind_param("sssi", $email, $username, $role, $id);
    $ok = $stmt->execute();
    $stmt->close();

    if ($email) {
        if ($isAdmin) {
            if ($passwordPlain) {
                $hashed = hash('sha256', $passwordPlain);
                $uStmt = $conn->prepare("UPDATE users SET password = ?, role = ? WHERE email = ?");
                $uStmt->bind_param("sss", $hashed, $role, $email);
                $uStmt->execute();
                $uStmt->close();
            } else {
                $uStmt = $conn->prepare("UPDATE users SET role = ? WHERE email = ?");
                $uStmt->bind_param("ss", $role, $email);
                $uStmt->execute();
                $uStmt->close();
            }
        } else {
            if ($sessionUser['email'] === $email && $passwordPlain) {
                $hashed = hash('sha256', $passwordPlain);
                $uStmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
                $uStmt->bind_param("ss", $hashed, $email);
                $uStmt->execute();
                $uStmt->close();
            }
        }
    }

    echo json_encode(["success" => (bool)$ok]);
    $conn->close();
    exit;
}

// DELETE
if ($action === 'delete') {
    if (strtolower($sessionUser['role']) !== 'admin') {
        echo json_encode(["success" => false, "message" => "Only ADMIN can delete users"]);
        $conn->close();
        exit;
    }

    $id = isset($data['id']) ? intval($data['id']) : 0;
    $email = isset($data['email']) ? trim($data['email']) : '';

    if ($id) {
        $r = $conn->query("SELECT email FROM user_profiles WHERE id = $id");
        $row = $r ? $r->fetch_assoc() : null;
        $emailToDelete = $row ? $row['email'] : '';
        $stmt = $conn->prepare("DELETE FROM user_profiles WHERE id = ?");
        $stmt->bind_param("i", $id);
        $ok = $stmt->execute();
        $stmt->close();

        if ($emailToDelete) {
            $d = $conn->prepare("DELETE FROM users WHERE email = ?");
            $d->bind_param("s", $emailToDelete);
            $d->execute();
            $d->close();
        }

        echo json_encode(["success" => (bool)$ok]);
        $conn->close();
        exit;
    } elseif ($email) {
        $stmt = $conn->prepare("DELETE FROM user_profiles WHERE email = ?");
        $stmt->bind_param("s", $email);
        $ok = $stmt->execute();
        $stmt->close();

        $d = $conn->prepare("DELETE FROM users WHERE email = ?");
        $d->bind_param("s", $email);
        $d->execute();
        $d->close();

        echo json_encode(["success" => (bool)$ok]);
        $conn->close();
        exit;
    } else {
        echo json_encode(["success" => false, "message" => "ID or email required"]);
        $conn->close();
        exit;
    }
}

echo json_encode(["success" => false, "message" => "Unknown action"]);
$conn->close();
exit;
?>
