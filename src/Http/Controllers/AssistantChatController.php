<?php

namespace ShibuJ\AiChatAssistant\Http\Controllers;

use BotMan\BotMan\BotManFactory;
use BotMan\BotMan\Cache\ArrayCache;
use BotMan\BotMan\Drivers\DriverManager;
use BotMan\Drivers\Web\WebDriver;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use ShibuJ\AiChatAssistant\AssistantManager;

class AssistantChatController extends Controller
{
    public function handle(Request $request, AssistantManager $manager)
    {
        DriverManager::loadDriver(WebDriver::class);

        $botman = BotManFactory::create(
            ['web' => ['matchingData' => ['driver' => 'web']]],
            new ArrayCache()
        );

        $assistantName = $manager->resolveName();

        if (!$assistantName) {
            $botman->reply('Please log in to use the assistant.');
            $botman->listen();
            return;
        }

        $historyKey = "ai-assistant:{$assistantName}:{$request->getHost()}:" . session()->getId();
        $store = $manager->cacheStore();

        $botman->hears('__reset__', function ($bot) use ($store, $historyKey) {
            $store->forget($historyKey);
            $bot->reply('ok');
        });

        $botman->fallback(function ($bot) use ($manager, $assistantName, $store, $historyKey) {
            $assistant = $manager->make($assistantName);

            $text = mb_substr(trim($bot->getMessage()->getText()), 0, 500);
            $history = $store->get($historyKey, []);

            $answer = $assistant->reply($text, $history);

            $history = array_merge($history, [
                ['role' => 'user', 'content' => $text],
                ['role' => 'assistant', 'content' => $answer],
            ]);
            $store->put($historyKey, array_slice($history, -($manager->historyTurns() * 2)), now()->addMinutes($manager->historyTtlMinutes()));

            $bot->reply($answer);

            // A consuming app's Assistant can set $assistant->pendingAction = ['text' => ..., 'buttons' => [...]]
            if ($assistant->pendingAction) {
                $q = \BotMan\BotMan\Messages\Outgoing\Question::create($assistant->pendingAction['text']);
                foreach ($assistant->pendingAction['buttons'] as $b) {
                    $q->addButtons([\BotMan\BotMan\Messages\Outgoing\Actions\Button::create($b['text'])->value($b['value'])]);
                }
                $bot->reply($q);
            }
        });

        $botman->listen();
    }
}