<?php

namespace ShibuJ\AiChatAssistant;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class AiAssistantServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/ai-assistant.php', 'ai-assistant');

        $this->app->singleton(AssistantManager::class, function ($app) {
            return new AssistantManager($app['config']['ai-assistant']);
        });
    }

    public function boot(): void
    {
        // Publishing
        $this->publishes([
            __DIR__ . '/../config/ai-assistant.php' => config_path('ai-assistant.php'),
        ], 'ai-assistant-config');

        $this->publishes([
            __DIR__ . '/../resources/views/widget.blade.php' => resource_path('views/vendor/ai-assistant/widget.blade.php'),
        ], 'ai-assistant-views');

        $this->publishes([
            __DIR__ . '/../resources/assets/assistant-chat.css' => public_path('vendor/ai-assistant/assistant-chat.css'),
            __DIR__ . '/../resources/assets/assistant-chat.js' => public_path('vendor/ai-assistant/assistant-chat.js'),
        ], 'ai-assistant-assets');

        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'ai-assistant');

        // Route
        $config = config('ai-assistant.route');
        Route::middleware($config['middleware'] ?? ['web'])
            ->post($config['path'] ?? '/assistant-chat', [Http\Controllers\AssistantChatController::class, 'handle'])
            ->name('ai-assistant.chat');

        if ($this->app->runningInConsole()) {
            $this->commands([
                Console\MakeAssistantCommand::class,
                Console\MakeToolCommand::class,
            ]);
        }
    }
}