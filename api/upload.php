<?php
require __DIR__ . '/common.php';
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') respond(405, ['error' => 'Method not allowed']);
require_admin();
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) respond(400, ['error' => 'لم يتم استلام صورة صالحة.']);
$file = $_FILES['image'];
if ($file['size'] > 5 * 1024 * 1024) respond(413, ['error' => 'الحد الأقصى لحجم الصورة هو 5 ميغابايت.']);
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
if (!isset($extensions[$mime])) respond(415, ['error' => 'الصيغ المدعومة: JPG وPNG وWEBP وGIF.']);
$directory = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($directory) && !mkdir($directory, 0755, true)) respond(500, ['error' => 'تعذر إنشاء مجلد الصور.']);
$name = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
$destination = $directory . DIRECTORY_SEPARATOR . $name;
if (!move_uploaded_file($file['tmp_name'], $destination)) respond(500, ['error' => 'تعذر حفظ الصورة.']);
respond(201, ['url' => 'uploads/' . $name]);
