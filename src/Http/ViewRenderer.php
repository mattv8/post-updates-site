<?php

declare(strict_types=1);

namespace PostPortal\Http;

use Smarty\Smarty;

/**
 * Lightweight wrapper around Smarty to avoid relying on globals.
 */
class ViewRenderer
{
    private Smarty $smarty;

    public function __construct(Smarty $smarty)
    {
        $this->smarty = $smarty;
    }

    public static function fromSmarty(?Smarty $smarty, bool $debug = false): self
    {
        if ($smarty instanceof Smarty) {
            $smarty->debugging = $debug;
            return new self($smarty);
        }
        // Fall back to a new Composer-managed Smarty instance when none was provided.
        $instance = new Smarty();
        $instance->setTemplateDir(__DIR__ . '/../templates');
        $instance->setCompileDir(__DIR__ . '/../cache');
        $instance->setCacheDir(__DIR__ . '/../cache');
        $instance->escape_html = false;
        $instance->debugging = $debug;

        // Register PHP functions needed by templates (Smarty 5.x compatibility)
        $instance->registerPlugin('modifier', 'file_exists', 'file_exists');
        $instance->registerPlugin('modifier', 'in_array', 'in_array');
        $instance->registerPlugin('modifier', 'empty', function($val) { return empty($val); });
        $instance->registerPlugin('modifier', 'ucfirst', 'ucfirst');

        return new self($instance);
    }

    /**
     * Assign an associative array of template variables.
     *
     * @param array<string, mixed> $data
     */
    public function assign(array $data): void
    {
        foreach ($data as $key => $value) {
            $this->smarty->assign($key, $value);
        }
    }

    public function getSmarty(): Smarty
    {
        return $this->smarty;
    }
}
