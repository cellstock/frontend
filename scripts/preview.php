<?php
// Local PHP preview of the exported site; production uses public/.htaccess.
$root = realpath(__DIR__ . '/../out');
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (preg_match('~^/api(?:/|$)~', $path)) {
    require $root . '/api/index.php';
    return true;
}
if (preg_match('~(?:^|/)(?:\\.\\.?|\\.env[^/]*|config\\.php)(?:/|$)~', $path)) {
    http_response_code(404);
    return true;
}
$file = realpath($root . $path);
if ($file && str_starts_with($file, $root . DIRECTORY_SEPARATOR) && is_file($file)) return false;
$index = realpath($root . rtrim($path, '/') . '/index.html');
if ($index && str_starts_with($index, $root . DIRECTORY_SEPARATOR)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($index);
    return true;
}
http_response_code(404);
readfile($root . '/404.html');
return true;
