<?php

return [
    // Default AI driver used by any assistant that doesn't override it.
    'default_driver' => env('AI_ASSISTANT_DRIVER', 'gemini'),

    'drivers' => [
        'gemini' => [
            'driver' => \ShibuJ\AiChatAssistant\Drivers\GeminiDriver::class,
            'key' => env('GEMINI_API_KEY'),
            'model' => env('GEMINI_MODEL', 'gemini-flash-latest'), // e.g. Gemini 3.5 Flash Lite once available
            'fallback_model' => env('GEMINI_FALLBACK_MODEL'),
            'max_output_tokens' => 1024,
        ],
        'openai' => [
            'driver' => \ShibuJ\AiChatAssistant\Drivers\OpenAiDriver::class,
            'key' => env('OPENAI_API_KEY'),
            'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        ],
        // Add your own: 'anthropic' => [...] with a driver class implementing Contracts\AiDriver
    ],

    // Route + cache
    'route' => [
        'path' => env('AI_ASSISTANT_ROUTE', '/assistant-chat'),
        'middleware' => ['web'],
    ],
    'cache_store' => env('AI_ASSISTANT_CACHE_STORE', 'file'),
    'history_turns' => 6,
    'history_ttl_minutes' => 30,

    /*
    |--------------------------------------------------------------------
    | Assistants
    |--------------------------------------------------------------------
    | One entry per assistant. The consuming app can register as many as
    | it wants. "resolver" decides which assistant answers a given
    | request/user — return null to mean "not this assistant".
    */
    'assistants' => [
        // 'default' => \App\Assistants\OrderAssistant::class,
        // 'staff'   => \App\Assistants\StaffAssistant::class,
    ],

    // Called in order; first non-null [name, contextArray] wins.
    // Register your own resolvers from your AppServiceProvider via
    // AssistantManager::resolver(...) instead of editing this file,
    // if you prefer code over config.
    'resolvers' => [],

    'widget' => [
        'default_name' => 'assistant',
        'default_title' => 'Assistant',
        'default_welcome' => 'How can I help?',
        'default_placeholder' => 'Ask me anything',
        'default_footer' => 'Read-only. AI can make mistakes.',
    ],
];