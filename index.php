<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit();
}

$uri  = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$path = trim($path, "/");

// Визначаємо базовий шлях (папка проекту, наприклад "cinebase")
$scriptDir = trim(dirname($_SERVER['SCRIPT_NAME']), "/");

// Прибираємо базовий шлях з початку URI
if ($scriptDir && strpos($path, $scriptDir) === 0) {
    $path = trim(substr($path, strlen($scriptDir)), "/");
}

// Прибираємо index.php з шляху
if (strpos($path, "index.php") === 0) {
    $path = trim(substr($path, strlen("index.php")), "/");
}

// Якщо шлях порожній або це коренева сторінка — повертаємо HTML
if ($path === "" || $path === "index.html") {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . "/index.html");
    exit();
}

header('Content-Type: application/json; charset=utf-8');

$allowed = ["film", "director", "genre", "studio", "messages"];

$parts    = explode("/", $path);
$resource = $parts[0] ?? null;
$id       = $parts[1] ?? null;

// Якщо id числовий — все вірно, якщо ні — обнуляємо
if ($id !== null && !is_numeric($id)) {
    $id = null;
}

if (!$resource || !in_array($resource, $allowed)) {
    http_response_code(404);
    echo json_encode(["message" => "resource not found"]);
    exit();
}

// ---- Database connection ----
$dbHost = getenv("DB_HOST") ?: "localhost";
$dbUser = getenv("DB_USER") ?: "root";
$dbPass = getenv("DB_PASS") ?: "";
$dbName = getenv("DB_NAME") ?: "cinebase";

mysqli_report(MYSQLI_REPORT_OFF);
$conn = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
$useDatabase = !$conn->connect_error;
if ($useDatabase) {
    $conn->set_charset("utf8");
}

// ---- JSON file storage helpers ----
function demo_data() {
    return [
        "director" => [
            ["id" => "1", "name" => "Крістофер Нолан"],
            ["id" => "2", "name" => "Квентін Тарантіно"],
            ["id" => "3", "name" => "Мартін Скорсезе"],
            ["id" => "4", "name" => "Стівен Спілберг"]
        ],
        "genre" => [
            ["id" => "1", "name" => "Драма"],
            ["id" => "2", "name" => "Бойовик"],
            ["id" => "3", "name" => "Комедія"],
            ["id" => "4", "name" => "Жахи"],
            ["id" => "5", "name" => "Мелодрама"],
            ["id" => "6", "name" => "Детектив"],
            ["id" => "7", "name" => "Фантастика"],
            ["id" => "8", "name" => "Трилер"]
        ],
        "studio" => [
            ["id" => "1", "name" => "Warner Bros."],
            ["id" => "2", "name" => "Universal Pictures"],
            ["id" => "3", "name" => "Paramount Pictures"],
            ["id" => "4", "name" => "Sony Pictures"]
        ],
        "film" => [
            ["id" => "1", "title" => "Темний лицар", "year" => "2008", "rating" => "9.0", "duration" => "152", "description" => "Бетмен бореться з Джокером.", "genre_id" => "2", "director_id" => "1", "studio_id" => "1", "status" => "Переглянуто"],
            ["id" => "2", "title" => "Кримінальне чтиво", "year" => "1994", "rating" => "8.9", "duration" => "154", "description" => "Кримінальні історії у Лос-Анджелесі.", "genre_id" => "8", "director_id" => "2", "studio_id" => "4", "status" => "Переглянуто"],
            ["id" => "3", "title" => "Начало", "year" => "2010", "rating" => "8.8", "duration" => "148", "description" => "Крадіжка ідей із підсвідомості.", "genre_id" => "7", "director_id" => "1", "studio_id" => "1", "status" => "Переглянуто"],
            ["id" => "4", "title" => "Список Шиндлера", "year" => "1993", "rating" => "9.0", "duration" => "195", "description" => "Рятування євреїв під час Голокосту.", "genre_id" => "1", "director_id" => "4", "studio_id" => "3", "status" => "Переглянуто"],
            ["id" => "5", "title" => "Відступники", "year" => "2006", "rating" => "8.5", "duration" => "151", "description" => "Інфільтрація поліцейського в банду.", "genre_id" => "6", "director_id" => "3", "studio_id" => "1", "status" => "Планую"]
        ],
        "messages" => []
    ];
}

function storage_path() { return __DIR__ . "/data.json"; }

function read_storage() {
    $path = storage_path();
    if (!file_exists($path)) {
        file_put_contents($path, json_encode(demo_data(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
    $data = json_decode(file_get_contents($path), true);
    return $data ?: demo_data();
}

function write_storage($data) {
    file_put_contents(storage_path(), json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
}

function next_id($rows) {
    $max = 0;
    foreach ($rows as $row) { $max = max($max, (int)$row["id"]); }
    return (string)($max + 1);
}

function table_columns($conn, $table) {
    $columns = [];
    $res = $conn->query("SHOW COLUMNS FROM `$table`");
    while ($row = $res->fetch_assoc()) { $columns[] = $row["Field"]; }
    return $columns;
}

function clean_data($conn, $table, $data) {
    $columns = table_columns($conn, $table);
    $clean = [];
    foreach ($data as $key => $value) {
        if ($key !== "id" && in_array($key, $columns)) {
            $clean[$key] = $conn->real_escape_string($value);
        }
    }
    return $clean;
}

$method = $_SERVER['REQUEST_METHOD'];

// ---- JSON storage mode ----
if (!$useDatabase) {
    $data = read_storage();
    $rows = $data[$resource] ?? [];

    if ($method === "GET") {
        if ($id) {
            foreach ($rows as $row) {
                if ((string)$row["id"] === (string)$id) {
                    echo json_encode($row, JSON_UNESCAPED_UNICODE);
                    exit();
                }
            }
            echo json_encode(null);
            exit();
        }
        echo json_encode(array_values($rows), JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === "POST") {
        $body = json_decode(file_get_contents("php://input"), true) ?: [];
        $body["id"] = next_id($rows);
        $data[$resource][] = $body;
        write_storage($data);
        echo json_encode($body, JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === "PUT") {
        if (!$id) { http_response_code(400); echo json_encode(["message" => "id required"]); exit(); }
        $body    = json_decode(file_get_contents("php://input"), true) ?: [];
        $updated = null;
        foreach ($data[$resource] as $index => $row) {
            if ((string)$row["id"] === (string)$id) {
                $updated = array_merge($row, $body, ["id" => (string)$id]);
                $data[$resource][$index] = $updated;
                break;
            }
        }
        if (!$updated) { http_response_code(404); echo json_encode(["message" => "not found"]); exit(); }
        write_storage($data);
        echo json_encode($updated, JSON_UNESCAPED_UNICODE);
        exit();
    }

    if ($method === "DELETE") {
        $data[$resource] = array_values(array_filter($rows, function ($row) use ($id) {
            return (string)$row["id"] !== (string)$id;
        }));
        write_storage($data);
        http_response_code(204);
        exit();
    }
}

// ---- MySQL mode ----
if ($method === "GET") {
    if ($id) {
        $id  = (int)$id;
        $res = $conn->query("SELECT * FROM `$resource` WHERE id=$id");
        echo json_encode($res->fetch_assoc(), JSON_UNESCAPED_UNICODE);
        exit();
    }
    $res  = $conn->query("SELECT * FROM `$resource`");
    $data = [];
    while ($row = $res->fetch_assoc()) { $data[] = $row; }
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "POST") {
    $data  = json_decode(file_get_contents("php://input"), true);
    $clean = clean_data($conn, $resource, $data ?? []);
    if (count($clean) === 0) { http_response_code(400); echo json_encode(["message" => "no data"]); exit(); }
    $columns = "`" . implode("`, `", array_keys($clean)) . "`";
    $values  = "'" . implode("', '", array_values($clean)) . "'";
    $conn->query("INSERT INTO `$resource` ($columns) VALUES ($values)");
    $newId = $conn->insert_id;
    $res   = $conn->query("SELECT * FROM `$resource` WHERE id=$newId");
    echo json_encode($res->fetch_assoc(), JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "PUT") {
    if (!$id) { http_response_code(400); echo json_encode(["message" => "id required"]); exit(); }
    $id    = (int)$id;
    $data  = json_decode(file_get_contents("php://input"), true);
    $clean = clean_data($conn, $resource, $data ?? []);
    $sets  = [];
    foreach ($clean as $key => $value) { $sets[] = "`$key`='$value'"; }
    if (count($sets) === 0) { http_response_code(400); echo json_encode(["message" => "no data"]); exit(); }
    $conn->query("UPDATE `$resource` SET " . implode(", ", $sets) . " WHERE id=$id");
    $res = $conn->query("SELECT * FROM `$resource` WHERE id=$id");
    echo json_encode($res->fetch_assoc(), JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "DELETE") {
    if (!$id) { http_response_code(400); echo json_encode(["message" => "id required"]); exit(); }
    $id = (int)$id;
    $conn->query("DELETE FROM `$resource` WHERE id=$id");
    http_response_code(204);
    exit();
}

http_response_code(405);
echo json_encode(["message" => "method not allowed"]);
