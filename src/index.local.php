<?php

#==============================================================================
# Script loaded here is loaded /after/ index.php
#==============================================================================

// Initialize Composer Libraries
require_once(__DIR__ . '/vendor/autoload.php');

// Assign default admin password to Smarty for debug auto-fill
$smarty->assign('default_admin_password', $default_admin_password);

$logoPath = __DIR__.'/images/RR_Black_Logo.png';
