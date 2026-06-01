<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(); }

$uri  = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$path = trim($path, "/");

$scriptDir = trim(dirname($_SERVER['SCRIPT_NAME']), "/");
if ($scriptDir && strpos($path, $scriptDir) === 0) {
    $path = trim(substr($path, strlen($scriptDir)), "/");
}
if (strpos($path, "index.php") === 0) {
    $path = trim(substr($path, strlen("index.php")), "/");
}

if ($path === "" || $path === "index.html") {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . "/index.html");
    exit();
}

header('Content-Type: application/json; charset=utf-8');

$allowed = ["film", "director", "genre", "studio", "messages"];
$parts   = explode("/", $path);
$resource = $parts[0] ?? null;
$id       = $parts[1] ?? null;
if ($id !== null && !is_numeric($id)) { $id = null; }

if (!$resource || !in_array($resource, $allowed)) {
    http_response_code(404);
    echo json_encode(["message" => "resource not found"]);
    exit();
}

// ---- SQLite ----
$dbFile = '/tmp/cinebase.db';
$isNew  = !file_exists($dbFile);
$db     = new PDO("sqlite:$dbFile");
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec("PRAGMA journal_mode=WAL");

if ($isNew) {
    $db->exec("
        CREATE TABLE IF NOT EXISTS director (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
        CREATE TABLE IF NOT EXISTS genre    (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
        CREATE TABLE IF NOT EXISTS studio   (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
        CREATE TABLE IF NOT EXISTS film (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT, year TEXT, rating TEXT, duration TEXT,
            description TEXT, genre_id TEXT, director_id TEXT,
            studio_id TEXT, status TEXT
        );
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT);

        INSERT INTO director (name) VALUES
            ('Крістофер Нолан'),('Квентін Тарантіно'),('Мартін Скорсезе'),('Стівен Спілберг');
        INSERT INTO genre (name) VALUES
            ('Драма'),('Бойовик'),('Комедія'),('Жахи'),('Мелодрама'),('Детектив'),('Фантастика'),('Трилер');
        INSERT INTO studio (name) VALUES
            ('Warner Bros.'),('Universal Pictures'),('Paramount Pictures'),('Sony Pictures');
        INSERT INTO film (title,year,rating,duration,description,genre_id,director_id,studio_id,status) VALUES
            ('Темний лицар','2008','9.0','152','Бетмен бореться з Джокером.','2','1','1','Переглянуто'),
            ('Кримінальне чтиво','1994','8.9','154','Кримінальні історії у Лос-Анджелесі.','8','2','4','Переглянуто'),
            ('Начало','2010','8.8','148','Крадіжка ідей із підсвідомості.','7','1','1','Переглянуто'),
            ('Список Шиндлера','1993','9.0','195','Рятування євреїв під час Голокосту.','1','4','3','Переглянуто'),
            ('Відступники','2006','8.5','151','Інфільтрація поліцейського в банду.','6','3','1','Планую');
    ");
}

$method = $_SERVER['REQUEST_METHOD'];

function rows_to_array($stmt) {
    $rows = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) { $rows[] = $row; }
    return $rows;
}

if ($method === "GET") {
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM `$resource` WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode($stmt->fetch(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
    } else {
        $stmt = $db->query("SELECT * FROM `$resource`");
        echo json_encode(rows_to_array($stmt), JSON_UNESCAPED_UNICODE);
    }
    exit();
}

if ($method === "POST") {
    $body = json_decode(file_get_contents("php://input"), true) ?: [];
    unset($body['id']);
    if (empty($body)) { http_response_code(400); echo json_encode(["message" => "no data"]); exit(); }
    $cols = implode(", ", array_keys($body));
    $placeholders = implode(", ", array_fill(0, count($body), "?"));
    $stmt = $db->prepare("INSERT INTO `$resource` ($cols) VALUES ($placeholders)");
    $stmt->execute(array_values($body));
    $newId = $db->lastInsertId();
    $stmt2 = $db->prepare("SELECT * FROM `$resource` WHERE id = ?");
    $stmt2->execute([$newId]);
    echo json_encode($stmt2->fetch(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "PUT") {
    if (!$id) { http_response_code(400); echo json_encode(["message" => "id required"]); exit(); }
    $body = json_decode(file_get_contents("php://input"), true) ?: [];
    unset($body['id']);
    if (empty($body)) { http_response_code(400); echo json_encode(["message" => "no data"]); exit(); }
    $sets = implode(", ", array_map(fn($k) => "$k = ?", array_keys($body)));
    $vals = array_values($body);
    $vals[] = $id;
    $stmt = $db->prepare("UPDATE `$resource` SET $sets WHERE id = ?");
    $stmt->execute($vals);
    $stmt2 = $db->prepare("SELECT * FROM `$resource` WHERE id = ?");
    $stmt2->execute([$id]);
    echo json_encode($stmt2->fetch(PDO::FETCH_ASSOC), JSON_UNESCAPED_UNICODE);
    exit();
}

if ($method === "DELETE") {
    if (!$id) { http_response_code(400); echo json_encode(["message" => "id required"]); exit(); }
    $stmt = $db->prepare("DELETE FROM `$resource` WHERE id = ?");
    $stmt->execute([$id]);
    http_response_code(204);
    exit();
}

http_response_code(405);
echo json_encode(["message" => "method not allowed"]);
