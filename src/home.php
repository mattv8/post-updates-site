<?php

declare(strict_types=1);

use PostPortal\Page\HomePage;

require_once __DIR__ . '/page_bootstrap.php';
require_once __DIR__ . '/Page/HomePage.php';
require_once __DIR__ . '/lib/MediaProcessor.php';

$context = bootstrapPageContext();

$page = new HomePage(
    $context['container'],
    $context['db'],
    $context['config']['default_logo']
);

$data = $page->build();

// If user is authenticated, generate CSRF token for post creation
if (!empty($_SESSION['authenticated'])) {
    $data['csrf_token'] = generateCsrfToken();
}

$context['view']->assign($data);

// Don't call display() - let the framework's index.tpl handle rendering
