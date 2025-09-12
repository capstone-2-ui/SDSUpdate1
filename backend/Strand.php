<?php
// Strand.php
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database connection
$servername = "localhost";
$username   = "root";   // change if needed
$password   = "";       // change if needed
$dbname     = "strand_db"; // change to your database name

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
  die(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

  // ---------------- GET (Fetch all strands) ----------------
  case "GET":
    $sql = "SELECT * FROM strands";
    $result = $conn->query($sql);

    $strands = [];
    while ($row = $result->fetch_assoc()) {
      $strands[] = $row;
    }

    echo json_encode($strands);
    break;

  // ---------------- POST (Add new strand) ----------------
  case "POST":
    $data = json_decode(file_get_contents("php://input"), true);
    $strand = $data['strand'] ?? '';
    $type   = $data['type'] ?? '';

    if (!empty($strand) && !empty($type)) {
      $stmt = $conn->prepare("INSERT INTO strands (strand, type) VALUES (?, ?)");
      $stmt->bind_param("ss", $strand, $type);

      if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Strand added successfully"]);
      } else {
        echo json_encode(["success" => false, "message" => "Failed to add strand"]);
      }
      $stmt->close();
    } else {
      echo json_encode(["success" => false, "message" => "Invalid input"]);
    }
    break;

  // ---------------- PUT (Update strand) ----------------
  case "PUT":
    $data = json_decode(file_get_contents("php://input"), true);
    $id     = $data['id'] ?? 0;
    $strand = $data['strand'] ?? '';
    $type   = $data['type'] ?? '';

    if ($id > 0 && !empty($strand) && !empty($type)) {
      $stmt = $conn->prepare("UPDATE strands SET strand=?, type=? WHERE id=?");
      $stmt->bind_param("ssi", $strand, $type, $id);

      if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Strand updated successfully"]);
      } else {
        echo json_encode(["success" => false, "message" => "Failed to update strand"]);
      }
      $stmt->close();
    } else {
      echo json_encode(["success" => false, "message" => "Invalid input"]);
    }
    break;

  // ---------------- DELETE (Remove strand) ----------------
  case "DELETE":
    parse_str($_SERVER["QUERY_STRING"], $query);
    $id = $query['id'] ?? 0;

    if ($id > 0) {
      $stmt = $conn->prepare("DELETE FROM strands WHERE id=?");
      $stmt->bind_param("i", $id);

      if ($stmt->execute()) {
        echo json_encode(["success" => true, "message" => "Strand deleted successfully"]);
      } else {
        echo json_encode(["success" => false, "message" => "Failed to delete strand"]);
      }
      $stmt->close();
    } else {
      echo json_encode(["success" => false, "message" => "Invalid ID"]);
    }
    break;

  default:
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    break;
}

$conn->close();
?>
