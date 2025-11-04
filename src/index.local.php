<?php

#==============================================================================
# Script loaded here is loaded /after/ index.php
#==============================================================================

// Initialize Composer Libraries
require_once(__DIR__ . '/vendor/autoload.php');

// Assign default admin password to Smarty for debug auto-fill
$smarty->assign('default_admin_password', $default_admin_password);

// Load settings if not already loaded (for consistent site title across all pages)
if (!isset($settings)) {
    $settings = getSettings($db_conn);
    $smarty->assign('settings', $settings);
}

$logoPath = __DIR__.'/images/RR_Black_Logo.png';
