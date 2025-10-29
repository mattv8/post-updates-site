<?php
// DEPRECATED: This Stripe-based donation endpoint is no longer used.
// Donations are now handled via direct links (Venmo, PayPal, Ko-fi, etc.)
// configured in the admin panel.
//
// This file is kept for backward compatibility but should not be used.

header('Content-Type: application/json');
http_response_code(410); // Gone
echo json_encode([
    'success' => false,
    'error' => 'This donation method is no longer supported. Please use the donation button on the site.'
]);
exit;
