<?php

namespace ShibuJ\AiChatAssistant;

use Illuminate\Support\Facades\Cache;
use ShibuJ\AiChatAssistant\Contracts\AiDriver;

class AssistantManager
{
    protected array $registered = []; // name => class|closure
    protected array $resolvers = [];  // closures: fn() => ?string assistant name

    public function __construct(protected array $config) {}

    public function register(string $name, string|\Closure $assistant): static
    {
        $this->registered[$name] = $assistant;
        return $this;
    }

    /** Register a resolver: given the current request/session, return an assistant name or null. */
    public function resolver(\Closure $resolver): static
    {
        $this->resolvers[] = $resolver;
        return $this;
    }

    public function resolveName(): ?string
    {
        foreach ($this->resolvers as $resolver) {
            if ($name = $resolver()) {
                return $name;
            }
        }
        return array_key_first($this->registered);
    }

    public function make(string $name): Assistant
    {
        $entry = $this->registered[$name]
            ?? $this->config['assistants'][$name]
            ?? null;

        if (!$entry) {
            throw new \InvalidArgumentException("AI assistant [{$name}] is not registered.");
        }

        return $entry instanceof \Closure ? $entry() : app($entry);
    }

    public function driver(?string $name = null): AiDriver
    {
        $name ??= $this->config['default_driver'];
        $driverConfig = $this->config['drivers'][$name]
            ?? throw new \InvalidArgumentException("AI driver [{$name}] is not configured.");

        $class = $driverConfig['driver'];
        return new $class($driverConfig);
    }

    public function cacheStore()
    {
        return Cache::store($this->config['cache_store'] ?? 'file');
    }

    public function historyTurns(): int
    {
        return $this->config['history_turns'] ?? 6;
    }

    public function historyTtlMinutes(): int
    {
        return $this->config['history_ttl_minutes'] ?? 30;
    }
}