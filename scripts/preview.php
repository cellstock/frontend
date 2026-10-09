<?php
// Local preview with the same deployment prefix as the exported HTML.
$root = realpath(__DIR__ . '/../out');
$config = is_file($root . '/api/config.php') ? require $root . '/api/config.php' : [];
$basePath = $config['base_path'] ?? '';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
if ($path === '/' && $basePath !== '') {
    header('Location: ' . $basePath . '/', true, 302);
    return true;
}
if ($basePath !== '' && !str_starts_with($path, $basePath . '/')) {
    http_response_code(404);
    return true;
}
$path = rawurldecode(substr($path, strlen($basePath)));
if (preg_match('~^/api(?:/|$)~', $path)) {
    require $root . '/api/index.php';
    return true;
}
if (preg_match('~(?:^|/)(?:\\.\\.?|\\.env[^/]*|config\\.php)(?:/|$)~', $path)) {
    http_response_code(404);
    return true;
}
$file = realpath($root . $path);
if ($file && str_starts_with($file, $root . DIRECTORY_SEPARATOR) && is_file($file)) {
    $types = ['css' => 'text/css', 'js' => 'application/javascript', 'json' => 'application/json',
        'html' => 'text/html', 'txt' => 'text/plain', 'png' => 'image/png', 'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg', 'webp' => 'image/webp', 'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon', 'woff2' => 'font/woff2'];
    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    if (!isset($types[$extension])) { http_response_code(404); return true; }
    header('Content-Type: ' . $types[$extension]);
    readfile($file);
    return true;
}
$index = realpath($root . rtrim($path, '/') . '/index.html');
if ($index && str_starts_with($index, $root . DIRECTORY_SEPARATOR)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($index);
    return true;
}
http_response_code(404);
readfile($root . '/404.html');
return true;
