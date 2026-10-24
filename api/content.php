<?php
require __DIR__ . '/common.php';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$file = storage_file();
if ($method === 'GET') {
    if (!is_file($file)) respond(200, ['content' => null]);
    $json = file_get_contents($file);
    if ($json === false) respond(500, ['error' => 'تعذر قراءة المحتوى.']);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, max-age=0');
    echo '{"content":' . $json . '}';
    exit;
}
if ($method !== 'PUT') respond(405, ['error' => 'Method not allowed']);
require_admin();
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data) || strlen($raw) > 2000000) respond(400, ['error' => 'محتوى غير صالح أو كبير جداً.']);
$dir = dirname($file);
if (!is_dir($dir) && !mkdir($dir, 0750, true)) respond(500, ['error' => 'تعذر إنشاء مجلد التخزين.']);
$lock = fopen($file . '.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) respond(500, ['error' => 'تعذر قفل ملف المحتوى.']);
$temp = tempnam($dir, 'content-');
$encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($temp === false || $encoded === false || file_put_contents($temp, $encoded, LOCK_EX) === false || !rename($temp, $file)) {
    if (is_string($temp) && is_file($temp)) unlink($temp);
    flock($lock, LOCK_UN); fclose($lock); respond(500, ['error' => 'تعذر حفظ المحتوى على الخادم.']);
}
flock($lock, LOCK_UN); fclose($lock);
respond(200, ['ok' => true]);
