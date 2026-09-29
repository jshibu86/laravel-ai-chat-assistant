<?php

namespace ShibuJ\AiChatAssistant;

use ShibuJ\AiChatAssistant\Contracts\AiDriver;
use ShibuJ\AiChatAssistant\Contracts\Tool;

abstract class Assistant
{
    /** Set by a tool implementation if it wants the controller to attach interactive buttons. */
    public ?array $pendingAction = null;

    protected AiDriver $driver;

    public function __construct(?AiDriver $driver = null)
    {
        $this->driver = $driver ?? app(AssistantManager::class)->driver($this->driverName());
    }

    /** Override to pin this assistant to a specific driver key from config('ai-assistant.drivers'). */
    protected function driverName(): ?string
    {
        return null; // null = use config('ai-assistant.default_driver')
    }

    /** @return Tool[] */
    abstract public function tools(): array;

    abstract public function systemPrompt(): string;

    /** Called before every message; return false to short-circuit with a message (e.g. "no access"). */
    public function hasAccess(): bool
    {
        return true;
    }

    public function noAccessMessage(): string
    {
        return "You don't have access to this assistant.";
    }

    public function reply(string $userText, array $history = []): string
    {
        if (!$this->hasAccess()) {
            return $this->noAccessMessage();
        }

        $tools = collect($this->tools())->map(fn (Tool $t) => [
            'name' => $t->name(),
            'description' => $t->description(),
            'input_schema' => $t->inputSchema(),
        ])->all();

        $toolsByName = collect($this->tools())->keyBy(fn (Tool $t) => $t->name());

        return $this->driver->converse(
            $this->systemPrompt(),
            $tools,
            $history,
            $userText,
            function (string $name, array $args) use ($toolsByName) {
                $tool = $toolsByName->get($name);
                if (!$tool) {
                    return ['error' => 'Unknown tool'];
                }
                try {
                    return $tool->handle($args);
                } catch (\Throwable $e) {
                    \Log::error("AiChatAssistant: tool {$name} failed: " . $e->getMessage());
                    return ['error' => 'Lookup failed'];
                }
            }
        );
    }
}