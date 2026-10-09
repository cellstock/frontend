<?php
// Development-only gateway, bound to loopback by scripts/dev.mjs.
// Next forwards the browser host so the gateway can enforce its origin check.
if (!empty($_SERVER['HTTP_X_FORWARDED_HOST'])) {
    $_SERVER['HTTP_HOST'] = $_SERVER['HTTP_X_FORWARDED_HOST'];
}
require __DIR__ . '/../public/api/index.php';
