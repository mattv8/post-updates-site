<?php
/**
 * config.local.php
 * Post Portal Application Configuration
 *
 * This file contains application defaults and structure.
 * Environment-specific values (DB credentials, API keys, etc.) are loaded from environment variables.
 * Configure these via .env file or container environment variables.
 */

#==============================================================================
# Application Configurations
#==============================================================================

require_once($_SERVER['DOCUMENT_ROOT'] . '/functions.php');

# Debug mode settings
$debug = filter_var(getenv('DEBUG') ?: 'false', FILTER_VALIDATE_BOOLEAN);
$smarty_debug = filter_var(getenv('SMARTY_DEBUG') ?: 'false', FILTER_VALIDATE_BOOLEAN);

# Default admin password (used for auto-fill in debug mode)
$default_admin_password = getenv('DEFAULT_ADMIN_PASSWORD') ?: '';

# Recaptcha for login (optional)
# Create your own here: https://www.google.com/recaptcha/admin/create
# For local dev, use 'localhost' for your domain
# NOTE: These are now loaded from environment variables
$recaptcha_key = getenv('RECAPTCHA_SITE_KEY') ?: ''; // reCAPTCHA public key
$recaptcha_secret = getenv('RECAPTCHA_SECRET_KEY') ?: ''; // reCAPTCHA secret key

# Authentication
$auth_type = 'sql'; // Choose from 'none', 'ldap', or 'sql'

# Public pages (no authentication required to view)
# The 'home' page is public by default (post updates timeline)
$public_pages = array("home", "post");

# SQL Database configuration
# NOTE: These are now loaded from environment variables
$db_servername = getenv('MYSQL_HOST') ?: 'localhost';
$db_name = getenv('MYSQL_DATABASE') ?: 'postportal';
$db_username = getenv('MYSQL_USER') ?: 'postportal';
$db_password = getenv('MYSQL_PASSWORD') ?: 'postportal';

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
# NOTE: This is now loaded from environment variables
$openai_api_key = getenv('OPENAI_API_KEY') ?: ''; // OpenAI API key (sk-...)

# SMTP Email Configuration
# For local development with Mailpit, use these defaults:
# Server: mailpit, Port: 1025, No auth required
# For production, configure your SMTP server details
# NOTE: These are now loaded from environment variables
$smtp_host = getenv('SMTP_HOST') ?: 'localhost'; // SMTP server hostname
$smtp_port = (int)(getenv('SMTP_PORT') ?: 25); // SMTP port
$smtp_secure = getenv('SMTP_SECURE') ?: ''; // Encryption: '', 'tls', or 'ssl'
$smtp_auth = filter_var(getenv('SMTP_AUTH') ?: 'false', FILTER_VALIDATE_BOOLEAN); // Enable SMTP auth
$smtp_username = getenv('SMTP_USERNAME') ?: ''; // SMTP username
$smtp_password = getenv('SMTP_PASSWORD') ?: ''; // SMTP password
$smtp_from_email = getenv('SMTP_FROM_EMAIL') ?: 'noreply@example.com'; // From email address
$smtp_from_name = 'Post Portal'; // From name

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

# Other configuration
