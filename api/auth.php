<?php
require __DIR__ . '/common.php';
start_admin_session();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    $expected = getenv('ELITE_ADMIN_PASSWORD');
    if (!$expected && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
        $localEnv = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
        if (is_readable($localEnv)) {
            $settings = parse_ini_file($localEnv, false, INI_SCANNER_RAW);
            if (is_array($settings)) $expected = $settings['ELITE_ADMIN_PASSWORD'] ?? false;
        }
    }
    if (!$expected) respond(503, ['error' => 'يجب ضبط ELITE_ADMIN_PASSWORD في إعدادات الخادم.']);
    if (!is_array($body) || !isset($body['password']) || !hash_equals($expected, (string)$body['password'])) respond(401, ['error' => 'بيانات الدخول غير صحيحة.']);
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(200, ['csrf' => $_SESSION['csrf']]);
}
if ($method === 'DELETE') { $_SESSION = []; session_destroy(); respond(200, ['ok' => true]); }
if ($method === 'GET') respond(200, ['authenticated' => !empty($_SESSION['admin']), 'csrf' => $_SESSION['csrf'] ?? null]);
respond(405, ['error' => 'Method not allowed']);
