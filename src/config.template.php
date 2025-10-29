<?php
/**
 * Config.local.template.php
 * Janssen Care Bridge Configuration Template
 *
 * Copy this file to config.local.php and update with your environment-specific values.
 * Never commit config.local.php to version control.
 */

#==============================================================================
# Application Configurations
#==============================================================================

require_once($_SERVER['DOCUMENT_ROOT'] . '/functions.php');

# Debug mode settings
$debug = false;
$smarty_debug = false;

# Recaptcha for login (optional)
# Create your own here: https://www.google.com/recaptcha/admin/create
# For local dev, use 'localhost' for your domain
$recaptcha_key = ''; // Insert your reCAPTCHA public key
$recaptcha_secret = ''; // Insert your reCAPTCHA secret key

# Authentication
$auth_type = 'sql'; // Choose from 'none', 'ldap', or 'sql'

# Public pages (no authentication required to view)
# The 'home' page is public by default (health updates timeline)
$public_pages = array("home", "post");

# SQL Database configuration
$db_servername = "mysql";
$db_name = "devdb"; // Replace with your database name
$db_username = "admin"; // Replace with your database username
$db_password = "admin"; // Replace with your database password

# Navigation menu button settings for admin panel
$nav_buttons = array(
    'users' => array(
        'title' => 'Users',
        'faclass' => 'user-plus',
        'btn_color' => 'secondary',
        'btn_type' => 'modal',
        'modalId' => 'UserMgmtModal',
        'modalclass' => 'modal-xl',
    ),
    'dashboard' => array(
        'title' => 'Dashboard',
        'faclass' => 'chart-line',
        'btn_color' => 'primary',
        'btn_type' => 'link',
        'url' => '?page=admin',
    ),
);

# Default Page
$default_page = 'home'; // Public homepage

# UI elements - logo, background, etc.
$logo = "images/default-logo.png"; // Replace with your logo path
$background_image = "images/default-background.jpg"; // Replace with your background image path
$custom_css = "css/custom.css";
$display_footer = false;
$page_bg_color_class = 'bg-blurred rounded-3';

# OpenAI Configuration
# Get your API key from: https://platform.openai.com/api-keys
$openai_api_key = ''; // Insert your OpenAI API key (sk-...)

# DEPRECATED: Stripe Configuration (No longer used - donations now use direct links)
# The donation system now supports Venmo, PayPal, Ko-fi, and other direct methods
# configured through the admin panel. These variables are kept for backward compatibility.
$stripe_mode = 'test'; // 'test' or 'live'
$stripe_test_public_key = ''; // Insert your Stripe test publishable key (pk_test_...)
$stripe_test_secret_key = ''; // Insert your Stripe test secret key (sk_test_...)
$stripe_live_public_key = ''; // Insert your Stripe live publishable key (pk_live_...)
$stripe_live_secret_key = ''; // Insert your Stripe live secret key (sk_live_...)

# Get active Stripe keys based on mode (deprecated, kept for compatibility)
$stripe_public_key = ($stripe_mode === 'live') ? $stripe_live_public_key : $stripe_test_public_key;
$stripe_secret_key = ($stripe_mode === 'live') ? $stripe_live_secret_key : $stripe_test_secret_key;

# Media Upload Configuration
$max_upload_size = 20971520; // 20MB in bytes
$allowed_image_formats = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];

# Image Optimization Settings
$image_quality = 85; // JPEG quality (1-100)
$webp_quality = 85; // WebP quality (1-100)
$responsive_widths = [1600, 800, 400]; // Responsive breakpoint widths

# Recaptcha trans PHP variables (do not edit)
$js_config['recaptcha_secret'] = $recaptcha_secret;
$js_config['recaptcha_key'] = $recaptcha_key;

# DEPRECATED: Stripe trans PHP variables (no longer used)
$js_config['stripe_mode'] = $stripe_mode;
$js_config['stripe_public_key'] = $stripe_public_key;

# Other configuration
