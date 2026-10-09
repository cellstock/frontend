<?php
declare(strict_types=1);

// Same-origin PHP replacement for the former Next.js API routes.
// Laravel remains responsible for validation, authorization and rate limiting.
header('Cache-Control: no-store, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');

function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(string $message, int $status): never
{
    jsonResponse(['success' => false, 'message' => $message], $status);
}

function authCookie(string $token = ''): void
{
    setcookie('cellexa_token', $token, [
        'expires' => $token === '' ? time() - 3600 : time() + 28800,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($path) || !str_starts_with($path, '/api/')) fail('Not found.', 404);
$endpoint = rtrim(substr($path, 4), '/');

// Prevent encoded traversal, alternate separators, and header injection.
foreach (explode('/', ltrim($endpoint, '/')) as $segment) {
    $decoded = rawurldecode($segment);
    if ($decoded === '' || $decoded === '.' || $decoded === '..' ||
        preg_match('~[\\x00-\\x1f\\x7f/\\\\\\\\?#%]~', $decoded)) fail('Invalid API path.', 400);
}

// Cookie-authenticated mutations must originate on this frontend.
if (!in_array($method, ['GET', 'HEAD'], true)) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $scheme = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http';
    $expected = $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    if (($origin !== '' && !hash_equals($expected, $origin)) ||
        ($origin === '' && ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') !== 'same-origin')) {
        fail('Invalid request origin.', 403);
    }
}

$routes = [
    '~^/auth/(login|register)$~' => ['POST'],
    '~^/auth/(me|clear-session)$~' => ['GET'],
    '~^/auth/logout$~' => ['POST'],
    '~^/auth/profile$~' => ['PATCH'],
    '~^/auth/profile/avatar$~' => ['GET', 'POST', 'DELETE'],
    '~^/contact$~' => ['POST'],
    '~^/dashboard$~' => ['GET'],
    '~^/admin/(users|roles|plans|subscriptions)(/[0-9]+)?$~' => ['GET', 'POST', 'PATCH', 'DELETE'],
    '~^/subscription$~' => ['GET', 'PATCH'],
    '~^/subscription/plans$~' => ['GET'],
    '~^/marketplaces$~' => ['GET'],
    '~^/marketplaces/[^/]+$~' => ['GET'],
    '~^/marketplaces/[^/]+/connection$~' => ['POST', 'PATCH', 'DELETE'],
    '~^/marketplaces/[^/]+/connection/(options|test)$~' => ['POST'],
    '~^/marketplaces/[^/]+/connection/webhook$~' => ['GET', 'POST'],
    '~^/marketplaces/[^/]+/sync$~' => ['POST'],
    '~^/marketplaces/[^/]+/sync/[0-9]+$~' => ['GET'],
    '~^/orders(/returns|/[0-9]+)?$~' => ['GET'],
    '~^/orders/[0-9]+/(returns|merchant-addresses|invoice/custom)$~' => ['GET'],
    '~^/orders/[0-9]+/(status|edit-fields|address/(billing|shipping)|items/[0-9]+/shipping)$~' => ['PATCH'],
    '~^/orders/[0-9]+/(refresh|refund|refund/calculate|shipping-label|email)$~' => ['POST'],
    '~^/orders/[0-9]+/invoice$~' => ['GET', 'POST'],
    '~^/inventory(/diagnostics|/instance)?$~' => ['GET'],
    '~^/inventory/(sync|offers|import|bulk)$~' => ['POST'],
    '~^/inventory/offers/[^/]+$~' => ['GET', 'PATCH', 'DELETE'],
    '~^/refurbed-catalog(/items|/imports/[0-9]+)?$~' => ['GET'],
    '~^/refurbed-catalog/imports(/chunks)?$~' => ['POST'],
    '~^/shipping-profiles$~' => ['GET', 'POST'],
    '~^/shipping-profiles/carriers$~' => ['GET'],
    '~^/shipping-profiles/sync$~' => ['POST'],
    '~^/shipping-profiles/[^/]+$~' => ['PATCH', 'DELETE'],
    '~^/merchant-addresses$~' => ['GET', 'POST'],
    '~^/merchant-addresses/[0-9]+$~' => ['PATCH', 'DELETE'],
    '~^/synchronization-issues$~' => ['GET'],
    '~^/synchronization-issues/[0-9]+/retry$~' => ['POST'],
];
$allowed = null;
foreach ($routes as $pattern => $methods) {
    if (preg_match($pattern, $endpoint)) { $allowed = $methods; break; }
}
if ($allowed === null) fail('Not found.', 404);
if (!in_array($method, $allowed, true)) {
    header('Allow: ' . implode(', ', $allowed));
    fail('Method not allowed.', 405);
}
if ($endpoint === '/auth/clear-session') {
    authCookie();
    header('Location: /login/', true, 303);
    exit;
}

$public = in_array($endpoint, ['/auth/login', '/auth/register', '/contact'], true);
$token = $_COOKIE['cellexa_token'] ?? '';
if (!is_string($token) || preg_match('/[\\r\\n]/', $token)) fail('Invalid session.', 401);
if (!$public && $token === '' && $endpoint !== '/auth/logout') fail('Unauthenticated.', 401);

$config = is_file(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : [];
$base = rtrim(getenv('LARAVEL_API_URL') ?: ($config['api_url'] ?? ''), '/');
if (!filter_var($base, FILTER_VALIDATE_URL) || !in_array(parse_url($base, PHP_URL_SCHEME), ['https', 'http'], true))
    fail('The Cellexa API is not configured.', 503);
if (!extension_loaded('curl')) fail('PHP cURL is required by the API gateway.', 503);

$target = $endpoint;
if (str_starts_with($target, '/admin/')) $target = substr($target, 6);
if ($target === '/subscription') $target = '/my-subscription';
if ($target === '/subscription/plans') $target = '/available-plans';
$query = $_SERVER['QUERY_STRING'] ?? '';
$url = $base . $target . ($query !== '' ? '?' . $query : '');
$headers = ['Accept: application/json'];
if (!$public && $token !== '') $headers[] = 'Authorization: Bearer ' . $token;

$curl = curl_init($url);
$options = [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
];
if (!in_array($method, ['GET', 'HEAD'], true)) {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_starts_with(strtolower($contentType), 'multipart/form-data')) {
        // PHP parses multipart POST bodies; rebuild them with CURLFile.
        $body = $_POST;
        foreach ($_FILES as $name => $file) {
            if (is_array($file['error'])) fail('Nested uploads are not supported.', 422);
            if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']))
                fail('File upload failed. Check the PHP upload size limits.', 422);
            $body[$name] = new CURLFile($file['tmp_name'], $file['type'], basename($file['name']));
        }
        if (!$body && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0)
            fail('Upload exceeds the PHP request size limit.', 413);
        $options[CURLOPT_POSTFIELDS] = $body;
    } else {
        $body = file_get_contents('php://input');
        if ($body !== false && $body !== '') {
            $headers[] = 'Content-Type: application/json';
            $options[CURLOPT_POSTFIELDS] = $body;
        }
    }
}
$options[CURLOPT_HTTPHEADER] = $headers;
curl_setopt_array($curl, $options);
$body = curl_exec($curl);
$status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
$contentType = curl_getinfo($curl, CURLINFO_CONTENT_TYPE) ?: 'application/json';
$curlError = curl_errno($curl);
curl_close($curl);

if ($endpoint === '/auth/logout') {
    authCookie();
    if (!str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
        header('Location: /login/', true, 303);
        exit;
    }
    jsonResponse(['success' => true]);
}
if ($body === false) fail($curlError === CURLE_OPERATION_TIMEDOUT ? 'The API request timed out.' : 'Unable to connect to the Cellexa API.', $curlError === CURLE_OPERATION_TIMEDOUT ? 504 : 503);
if ($status === 401) authCookie();
$result = json_decode($body, true);
if (in_array($endpoint, ['/auth/login', '/auth/register'], true) && $status >= 200 && $status < 300) {
    $newToken = $result['data']['token'] ?? null;
    if (empty($result['success']) || !is_string($newToken) || $newToken === '')
        fail('The authentication server returned an invalid response.', 502);
    authCookie($newToken);
    // Never expose the bearer token to browser JavaScript.
    jsonResponse(['success' => true, 'message' => $result['message'] ?? 'Signed in.', 'user' => $result['data']['user'] ?? null], $status);
}
if ($endpoint === '/auth/me' && $status === 200 && !empty($result['success'])) {
    $user = $result['data']['user'] ?? null;
    if (!is_array($user) || !is_array($user['role'] ?? null)) fail('Invalid user response.', 502);
    if (($user['status'] ?? '') !== 'active') { authCookie(); fail('Your account is inactive.', 401); }
    $result['data']['user'] = [
        'id' => $user['id'], 'name' => $user['name'], 'email' => $user['email'],
        'role' => $user['role']['name'], 'roleSlug' => $user['role']['slug'],
        'status' => $user['status'], 'lastLoginAt' => $user['last_login_at'] ?? null,
        'hasAvatar' => (bool)($user['has_avatar'] ?? false),
    ];
    jsonResponse($result);
}
http_response_code($status ?: 502);
// Only the authenticated avatar route may return a binary response.
if ($endpoint === '/auth/profile/avatar' && $method === 'GET' && str_starts_with($contentType, 'image/')) {
    header('Content-Type: ' . $contentType);
    echo $body;
    exit;
}
if ($status === 204) exit;
if (!is_array($result)) fail('The Cellexa API returned an invalid response.', 502);
jsonResponse($result, $status ?: 502);
