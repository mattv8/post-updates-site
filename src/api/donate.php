<?php
header('Content-Type: application/json');
require_once(__DIR__ . '/../functions.php');
require_once(__DIR__ . '/../vendor/autoload.php');
ensureSession();

require(__DIR__ . '/../config.local.php');

use Stripe\StripeClient;

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'Method not allowed']); exit; }

$payload = $_POST;
if (empty($payload)) { $payload = json_decode(file_get_contents('php://input'), true) ?: []; }

$amount = isset($payload['amount']) ? (int)$payload['amount'] : 0;
if ($amount <= 0) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'Invalid amount']); exit; }

// Choose keys based on mode
$secret = ($stripe_mode === 'live') ? ($stripe_live_secret_key ?? '') : ($stripe_test_secret_key ?? '');
$public = ($stripe_mode === 'live') ? ($stripe_live_public_key ?? '') : ($stripe_test_public_key ?? '');

if (empty($secret) || empty($public)) { http_response_code(500); echo json_encode(['success'=>false,'error'=>'Stripe keys not configured']); exit; }

try {
    $stripe = new StripeClient($secret);

    // Build success/cancel URLs
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $base = $scheme . '://' . $host;

    $session = $stripe->checkout->sessions->create([
        'mode' => 'payment',
        'payment_method_types' => ['card'],
        'line_items' => [[
            'price_data' => [
                'currency' => 'usd',
                'unit_amount' => $amount * 100,
                'product_data' => [
                    'name' => 'Donation',
                    'description' => 'Support the family',
                ],
            ],
            'quantity' => 1,
        ]],
        'success_url' => $base . '/?page=home#donate-success',
        'cancel_url' => $base . '/?page=home#donate-cancel',
    ]);

    echo json_encode(['success'=>true,'id'=>$session->id,'public_key'=>$public]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
}
