<?php
// backend/Student.php

// ---------------- CORS (allow localhost & LAN IP) ----------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    "http://localhost:3000",
    "http://192.168.100.88:3000"
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ✅ Database connection
$host = "localhost";   // change to "192.168.100.88" if DB runs on that machine
$user = "root";        // change if needed
$pass = "";            // change if needed
$db   = "student_db";  // change to your DB name

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed: " . $conn->connect_error]));
}

// ✅ Helper function to parse JSON body
function getJsonInput() {
    return json_decode(file_get_contents("php://input"), true);
}

// ✅ GET (fetch students or single student by id/student_id)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id']) || isset($_GET['student_id'])) {
        if (isset($_GET['id']) && ctype_digit($_GET['id'])) {
            $intId = intval($_GET['id']);
            $stmt = $conn->prepare("SELECT * FROM students WHERE id = ? LIMIT 1");
            $stmt->bind_param("i", $intId);
        } else {
            $sid = $_GET['student_id'] ?? null;
            $stmt = $conn->prepare("SELECT * FROM students WHERE student_id = ? LIMIT 1");
            $stmt->bind_param("s", $sid);
        }

        if ($stmt && $stmt->execute()) {
            $res = $stmt->get_result();
            $row = $res->fetch_assoc();
            echo json_encode($row ? $row : (object)[]);
        } else {
            echo json_encode(["error" => "Query failed"]);
        }
        $stmt->close();
        exit;
    }

    $sql = "SELECT * FROM students";
    $result = $conn->query($sql);
    $students = [];
    while ($row = $result->fetch_assoc()) {
        $students[] = $row;
    }
    echo json_encode($students);
}

// ✅ POST (add student OR bulk upload CSV)
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!empty($_FILES['file']['tmp_name'])) {
        $file = $_FILES['file']['tmp_name'];
        $handle = fopen($file, "r");
        $rowCount = 0;
        $inserted = 0;
        fgetcsv($handle); // skip header

        while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
            if (is_array($data) && count($data) === 1 && trim($data[0]) === "") continue;
            $rowCount++;

            $name       = trim($data[0] ?? "");
            $student_id = trim($data[1] ?? "");
            $email      = "";
            $department = "";
            $section    = "";
            $grade      = "";
            $strand     = "";
            $year       = "";

            if (isset($data[2]) && filter_var(trim($data[2]), FILTER_VALIDATE_EMAIL)) {
                $email      = trim($data[2]);
                $department = trim($data[3] ?? "");
                $section    = trim($data[4] ?? "");
                $grade      = trim($data[5] ?? "");
                $strand     = trim($data[6] ?? "");
                $year       = trim($data[7] ?? "");
            } else {
                $department = trim($data[2] ?? "");
                $section    = trim($data[3] ?? "");
                $grade      = trim($data[4] ?? "");
                $strand     = trim($data[5] ?? "");
                $year       = trim($data[6] ?? "");
                $email      = !empty($student_id) ? ($student_id . "@school.edu") : "";
            }

            if (!empty($student_id) && !empty($name)) {
                $stmt = $conn->prepare("INSERT INTO students (name, email, student_id, department, year, grade, section, strand, status) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
                                        ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), department=VALUES(department), year=VALUES(year), grade=VALUES(grade), section=VALUES(section), strand=VALUES(strand)");
                $stmt->bind_param("ssssssss", $name, $email, $student_id, $department, $year, $grade, $section, $strand);
                if ($stmt->execute()) $inserted++;
                $stmt->close();
            }
        }
        fclose($handle);

        echo json_encode(["success" => true, "message" => "Bulk upload complete", "rows_processed" => $rowCount, "inserted" => $inserted]);
        exit;
    }

    $data = getJsonInput();
    $stmt = $conn->prepare("INSERT INTO students (name, email, student_id, department, year, grade, section, strand, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssssss",
        $data['name'],
        $data['email'],
        $data['student_id'],
        $data['department'],
        $data['year'],
        $data['grade'],
        $data['section'],
        $data['strand'],        
        $data['status']
    );

    if ($stmt->execute()) {
        $insertedId = $conn->insert_id;
        $result = $conn->query("SELECT * FROM students WHERE id = $insertedId");
        $newStudent = $result->fetch_assoc();
        echo json_encode(["success" => true, "student" => $newStudent]);
    } else {
        echo json_encode(["success" => false, "error" => $stmt->error]);
    }
    $stmt->close();
}

// ✅ PUT (update student)
elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = getJsonInput();
    $name   = $data['name'] ?? "";
    $email  = $data['email'] ?? "";
    $department = $data['department'] ?? "";
    $year   = $data['year'] ?? "";
    $grade  = $data['grade'] ?? "";
    $section = $data['section'] ?? "";
    $strand = $data['strand'] ?? "";
    $status = $data['status'] ?? "Active";
    $new_student_id = $data['student_id'] ?? null;
    $orig_student_id = $data['original_student_id'] ?? null;
    $numeric_id = isset($data['id']) ? intval($data['id']) : null;

    if (!empty($orig_student_id)) {
        $stmt = $conn->prepare("UPDATE students
                                SET name=?, email=?, department=?, year=?, grade=?, section=?, strand=?, status=?, student_id=?
                                WHERE student_id=?");
        $stmt->bind_param("ssssssssss", $name,$email,$department,$year,$grade,$section,$strand,$status,$new_student_id,$orig_student_id);
    } elseif (!empty($numeric_id)) {
        $stmt = $conn->prepare("UPDATE students
                                SET name=?, email=?, department=?, year=?, grade=?, section=?, strand=?, status=?, student_id=?
                                WHERE id=?");
        $stmt->bind_param("ssssssssis", $name,$email,$department,$year,$grade,$section,$strand,$status,$new_student_id,$numeric_id);
    } elseif (!empty($new_student_id)) {
        $stmt = $conn->prepare("UPDATE students
                                SET name=?, email=?, department=?, year=?, grade=?, section=?, strand=?, status=?
                                WHERE student_id=?");
        $stmt->bind_param("sssssssss", $name,$email,$department,$year,$grade,$section,$strand,$status,$new_student_id);
    } else {
        echo json_encode(["success" => false, "error" => "No identifier supplied for update"]);
        exit;
    }

    if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Student updated", "affected_rows" => $stmt->affected_rows]);
    } else {
        echo json_encode(["success" => false, "error" => $stmt->error]);
    }
    $stmt->close();
}

// ✅ DELETE (delete student)
elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if (!isset($_GET['id'])) {
        echo json_encode(["success" => false, "error" => "Missing student ID"]);
        exit;
    }

    $id = trim((string)$_GET['id']);
    if ($id === '') {
        echo json_encode(["success" => false, "error" => "Empty student ID"]);
        exit;
    }

    $delBySid = $conn->prepare("DELETE FROM students WHERE student_id = ?");
    if ($delBySid) {
        $delBySid->bind_param("s", $id);
        $delBySid->execute();
        if ($delBySid->affected_rows > 0) {
            echo json_encode(["success" => true, "message" => "Student deleted by student_id"]);
            $delBySid->close();
            exit;
        }
        $delBySid->close();
    } 

    if (ctype_digit($id)) {
        $intId = intval($id);
        $delById = $conn->prepare("DELETE FROM students WHERE id = ?");
        if ($delById) {
            $delById->bind_param("i", $intId);
            $delById->execute();
            if ($delById->affected_rows > 0) {
                echo json_encode(["success" => true, "message" => "Student deleted by id"]);
                $delById->close();
                exit;
            }
            $delById->close();
        }
    }

    echo json_encode(["success" => false, "error" => "Student not found"]);
    exit;
}

$conn->close();
?>
