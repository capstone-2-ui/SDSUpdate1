<?php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Database connection - change these if your MySQL user/pass/db differ
$servername = "localhost";
$username = "root";
$password = "";
// Use the incidents DB we created earlier (change if you prefer a different DB)
$dbname = "incident_db";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . $conn->connect_error]);
    exit;
}

/**
 * 1) Active Sanction (top 3 by count)
 * We aggregate incidents.sanction text.
 */
$sanctions = [];
$sqlSanctions = "SELECT IFNULL(NULLIF(TRIM(sanction),''),'(Unspecified)') AS sanction_type, COUNT(*) AS total
                 FROM incidents
                 GROUP BY sanction_type
                 ORDER BY total DESC
                 LIMIT 3";
$resS = $conn->query($sqlSanctions);
if ($resS) {
    while ($r = $resS->fetch_assoc()) {
        $sanctions[] = [
            "name" => $r["sanction_type"],
            "value" => intval($r["total"])
        ];
    }
}

/**
 * 2) Violations per Department/Grade
 * We group by department if present, otherwise by grade; fallback 'Unknown'
 */
$violationsByDept = [];
$sqlDept = "SELECT COALESCE(NULLIF(TRIM(department),''), NULLIF(TRIM(grade),''), '(Unknown)') AS label, COUNT(*) AS violations
            FROM incidents
            GROUP BY label
            ORDER BY violations DESC";
$resD = $conn->query($sqlDept);
if ($resD) {
    while ($r = $resD->fetch_assoc()) {
        $violationsByDept[] = [
            "department" => $r["label"],
            "violations" => intval($r["violations"])
        ];
    }
}

/**
 * 3) Monthly violations (Jan..Dec)
 * We build full 12-month array and fill in counts from incidents.created_at
 */
$months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
$monthly = array_map(function($m) { return ["month"=>$m,"total"=>0]; }, $months);

$sqlMonthly = "SELECT MONTH(created_at) AS m, COUNT(*) AS total FROM incidents GROUP BY MONTH(created_at)";
$resM = $conn->query($sqlMonthly);
if ($resM) {
    while ($r = $resM->fetch_assoc()) {
        $m = intval($r["m"]);
        if ($m >= 1 && $m <= 12) {
            // map 1-based month to our months array (0-based index)
            $monthly[$m-1]["total"] = intval($r["total"]);
        }
    }
}

$conn->close();

echo json_encode([
    "sanctions" => $sanctions,
    "violationsByDept" => $violationsByDept,
    "monthlyViolations" => $monthly
]);
?>
