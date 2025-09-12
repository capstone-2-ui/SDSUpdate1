<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Database connection
$servername = "localhost";
$username = "root"; // change if you set a password
$password = "";     // change if you set a password
$dbname = "dashboard";

$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// Query 1: Sanctions count
$sanctions = [];
$sql1 = "SELECT st.name AS sanction_type, COUNT(s.id) AS total
         FROM sanctions s
         JOIN sanction_types st ON s.sanction_type_id = st.id
         GROUP BY st.name";
$result1 = $conn->query($sql1);
while ($row = $result1->fetch_assoc()) {
    $sanctions[] = [
        "name" => $row["sanction_type"],
        "value" => intval($row["total"])
    ];
}

// Query 2: Violations per department
$violationsByDept = [];
$sql2 = "SELECT d.name AS department, COUNT(v.id) AS violations
         FROM departments d
         LEFT JOIN students s ON s.department_id = d.id
         LEFT JOIN violations v ON v.student_id = s.id
         GROUP BY d.name";
$result2 = $conn->query($sql2);
while ($row = $result2->fetch_assoc()) {
    $violationsByDept[] = [
        "department" => $row["department"],
        "violations" => intval($row["violations"])
    ];
}

// Query 3: Monthly violations
$monthly = [];
$sql3 = "SELECT MONTHNAME(v.date_reported) AS month, COUNT(v.id) AS total
         FROM violations v
         GROUP BY MONTH(v.date_reported)
         ORDER BY MONTH(v.date_reported)";
$result3 = $conn->query($sql3);
$months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
$monthly = array_map(function($m) { return ["month"=>$m,"total"=>0]; }, $months);

while ($row = $result3->fetch_assoc()) {
    foreach ($monthly as &$m) {
        if ($m["month"] == substr($row["month"], 0, 3)) {
            $m["total"] = intval($row["total"]);
        }
    }
}

$conn->close();

// Send JSON response
echo json_encode([
    "sanctions" => $sanctions,
    "violationsByDept" => $violationsByDept,
    "monthlyViolations" => $monthly
]);
?>
