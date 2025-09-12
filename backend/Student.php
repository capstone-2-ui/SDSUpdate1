<?php
// backend/Student.php

// Allow CORS (for React frontend)
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ✅ Database connection
$host = "localhost";
$user = "root"; // change if needed
$pass = "";     // change if needed
$db   = "student_db"; // change to your DB name

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed: " . $conn->connect_error]));
}

// ✅ Helper function to parse JSON body
function getJsonInput() {
    return json_decode(file_get_contents("php://input"), true);
}

// ✅ GET (fetch students)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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
    // If file uploaded -> Bulk Upload
    if (!empty($_FILES['file']['tmp_name'])) {
        $file = $_FILES['file']['tmp_name'];
        $handle = fopen($file, "r");
        $rowCount = 0;
        $inserted = 0;

        // Skip header row
        fgetcsv($handle);

        while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
            $rowCount++;
            $name       = $data[0] ?? "";
            $student_id = $data[1] ?? "";
            $department = $data[2] ?? "";
            $section    = $data[3] ?? "";
            $grade      = $data[4] ?? "";
            $strand     = $data[5] ?? "";
            $year       = $data[6] ?? "";
            $email      = $student_id . "@school.edu"; // dummy email if missing

            if (!empty($student_id) && !empty($name)) {
                $stmt = $conn->prepare("INSERT INTO students (name, email, student_id, department, year, grade, section, strand, status) 
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
                                        ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), department=VALUES(department), year=VALUES(year), grade=VALUES(grade), section=VALUES(section), strand=VALUES(strand)");
                $stmt->bind_param("ssssssss", $name, $email, $student_id, $department, $year, $grade, $section, $strand);

                if ($stmt->execute()) {
                    $inserted++;
                }
                $stmt->close();
            }
        }
        fclose($handle);

        echo json_encode(["success" => true, "message" => "Bulk upload complete", "rows_processed" => $rowCount, "inserted" => $inserted]);
        exit;
    }

    // Otherwise, normal Add Student
    $data = getJsonInput();

    $stmt = $conn->prepare("INSERT INTO students (name, email, student_id, department, year, grade, section, strand, status) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param(
        "sssssssss",
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

    // Normalize incoming fields with safe defaults
    $name   = isset($data['name']) ? $data['name'] : "";
    $email  = isset($data['email']) ? $data['email'] : "";
    $department = isset($data['department']) ? $data['department'] : "";
    $year   = isset($data['year']) ? $data['year'] : "";
    $grade  = isset($data['grade']) ? $data['grade'] : "";
    $section = isset($data['section']) ? $data['section'] : "";
    $strand = isset($data['strand']) ? $data['strand'] : "";
    $status = isset($data['status']) ? $data['status'] : "Active";
    $new_student_id = isset($data['student_id']) ? $data['student_id'] : null;
    $orig_student_id = isset($data['original_student_id']) ? $data['original_student_id'] : null;
    $numeric_id = isset($data['id']) ? intval($data['id']) : null;

    // Prefer original_student_id (string) to locate the record, then numeric id, then new_student_id fallback.
    if (!empty($orig_student_id)) {
        // Update by original student_id; allow changing student_id to new_student_id
        $stmt = $conn->prepare("UPDATE students
                                SET name=?, email=?, department=?, year=?, grade=?, section=?, strand=?, status=?, student_id=?
                                WHERE student_id=?");
        if (!$stmt) {
            echo json_encode(["success" => false, "error" => "Prepare failed (update by original_student_id): " . $conn->error]);
            exit;
        }
        $stmt->bind_param(
            "ssssssssss",
            $name,
            $email,
            $department,
            $year,
            $grade,
            $section,
            $strand,
            $status,
            $new_student_id,
            $orig_student_id
        );
    } elseif (!empty($numeric_id)) {
        // Update by numeric DB id
        $stmt = $conn->prepare("UPDATE students
                                SET name=?, email=?, department=?, year=?, grade=?, section=?, strand=?, status=?, student_id=?
                                WHERE id=?");
        if (!$stmt) {
            echo json_encode(["success" => false, "error" => "Prepare failed (update by id): " . $conn->error]);
            exit;
        }
        $stmt->bind_param(
            "ssssssssis",
            $name,
            $email,
            $department,
            $year,
            $grade,
            $section,
            $strand,
            $status,
            $new_student_id,
            $numeric_id
        );
    } elseif (!empty($new_student_id)) {
        // Fallback: update where student_id == new_student_id (i.e., no change to id)
        $stmt = $conn->prepare("UPDATE students
                                SET name=?, email=?, department=?, year=?, grade=?, section=?, strand=?, status=?
                                WHERE student_id=?");
        if (!$stmt) {
            echo json_encode(["success" => false, "error" => "Prepare failed (update by student_id fallback): " . $conn->error]);
            exit;
        }
        $stmt->bind_param(
            "sssssssss",
            $name,
            $email,
            $department,
            $year,
            $grade,
            $section,
            $strand,
            $status,
            $new_student_id
        );
    } else {
        echo json_encode(["success" => false, "error" => "No identifier supplied for update. Provide original_student_id or id or student_id."]);
        exit;
    }

    if ($stmt->execute()) {
        // Optionally, you can return affected_rows for frontend checks
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

    $rawId = $_GET['id'];
    $id = trim((string)$rawId);

    if ($id === '') {
        echo json_encode(["success" => false, "error" => "Empty student ID"]);
        exit;
    }

    // Try deleting by student_id (string). This will harmlessly affect 0 rows
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
    } else {
        // prepare failed — report error (rare)
        echo json_encode(["success" => false, "error" => "Prepare failed (student_id delete): " . $conn->error]);
        exit;
    }

    // If not deleted by student_id, and id looks numeric, try deleting by numeric DB id
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
            } else {
                // delete executed but no rows affected (should be rare)
                echo json_encode(["success" => false, "error" => "Delete executed but no rows affected (id)"]);
                $delById->close();
                exit;
            }
        } else {
            echo json_encode(["success" => false, "error" => "Prepare failed (id delete): " . $conn->error]);
            exit;
        }
    }

    // Nothing deleted
    echo json_encode(["success" => false, "error" => "Student not found"]);
    exit;
}

$conn->close();
?>
