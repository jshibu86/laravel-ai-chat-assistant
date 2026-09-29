{{--
    Usage from the host app's layout:
    @include('ai-assistant::widget', [
        'name'        => 'Order assistant',
        'welcome'     => 'I can look up your orders, invoices and products.',
        'placeholder' => 'Ask about orders, invoices or products',
        'footer'      => 'Read-only. To change an order, use Orders.',
        'scope'       => 'customer-' . auth('customer')->id(),
        'quick'       => [
            ['icon' => 'fa-history', 'label' => 'Recent orders', 'send' => 'Show my recent orders'],
        ],
    ])
--}}
@php
    $name        = $name ?? config('ai-assistant.widget.default_name');
    $welcome     = $welcome ?? config('ai-assistant.widget.default_welcome');
    $placeholder = $placeholder ?? config('ai-assistant.widget.default_placeholder');
    $footer      = $footer ?? config('ai-assistant.widget.default_footer');
    $scope       = $scope ?? 'guest';
    $quick       = $quick ?? [];
@endphp

<div id="assistantChat" class="asst"
     data-endpoint="{{ route('ai-assistant.chat') }}"
     data-name="{{ $name }}"
     data-welcome="{{ $welcome }}"
     data-scope="{{ $scope }}"
     data-quick="{{ json_encode($quick) }}">
    <button type="button" class="asst-launcher" id="assistantChatToggle"
            aria-label="Open {{ $name }}" aria-expanded="false" aria-controls="assistantChatPanel">
        <i class="fas fa-comments" aria-hidden="true"></i>
    </button>

    <section class="asst-panel" id="assistantChatPanel" role="dialog" aria-label="{{ $name }}" hidden>
        <header class="asst-head">
            <div class="asst-head-text">
                <strong>{{ $name }}</strong>
            </div>
            <button type="button" class="asst-icon-btn" id="assistantChatNew" title="New chat"><i class="fas fa-plus"></i></button>
            <button type="button" class="asst-icon-btn" id="assistantChatClose" aria-label="Close"><i class="fas fa-times"></i></button>
        </header>
        <div class="asst-log" id="assistantChatLog" role="log" aria-live="polite"></div>
        <form class="asst-form" id="assistantChatForm" autocomplete="off">
            <input type="text" id="assistantChatInput" maxlength="500" placeholder="{{ $placeholder }}">
            <button type="submit" class="asst-send" id="assistantChatSend"><i class="fas fa-paper-plane"></i></button>
        </form>
        <p class="asst-foot">{{ $footer }}</p>
    </section>
</div>

<link rel="stylesheet" href="{{ asset('vendor/ai-assistant/assistant-chat.css') }}">
<script type="module" src="{{ asset('vendor/ai-assistant/assistant-chat.js') }}"></script>