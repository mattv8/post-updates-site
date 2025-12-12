<?php

declare(strict_types=1);

use PostPortal\Page\AdminPage;

require_once __DIR__ . '/page_bootstrap.php';
require_once __DIR__ . '/Page/AdminPage.php';

$context = bootstrapPageContext(requireAuth: true, requireAdmin: true);
$page = new AdminPage(
    $context['container'],
    $context['db'],
    $context['config']['default_logo']
);

$data = $page->build();

$context['view']->assign($data);

// Don't call display() - framework index.tpl handles rendering
