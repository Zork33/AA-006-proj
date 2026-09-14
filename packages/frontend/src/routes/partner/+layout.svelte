<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isAuthenticated, loadTokens, subscribeAuth } from '$lib/stores/auth';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
  let ready = $state(false);
  let currentPath = $state('');

  onMount(() => {
    loadTokens();

    const unsubPage = page.subscribe((p) => {
      currentPath = p.url.pathname;
    });

    const unsubAuth = subscribeAuth(() => {
      checkAuth();
    });

    checkAuth();

    return () => {
      unsubPage();
      unsubAuth();
    };
  });

  function checkAuth() {
    const isLoginPage = currentPath === '/partner/login';
    if (!isAuthenticated() && !isLoginPage && currentPath) {
      goto('/partner/login');
    } else if (isAuthenticated() || isLoginPage) {
      ready = true;
    }
  }
</script>

{#if ready}
  {#if currentPath === '/partner/login'}
    {@render children()}
  {:else}
    <div class="min-h-screen bg-[#F9F7F2]">
      <header class="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between">
        <a href="/partner" class="text-lg font-bold text-[#4A6B5D]">ВСЯК</a>
        <nav class="flex gap-4">
          <a href="/partner" class="text-sm text-[#666] hover:text-[#6B9B7A]">Дашборд</a>
          <a href="/partner/referral" class="text-sm text-[#666] hover:text-[#6B9B7A]">Реферал</a>
          <a href="/partner/invites" class="text-sm text-[#666] hover:text-[#6B9B7A]">Приглашённые</a>
        </nav>
      </header>

      <main class="max-w-4xl mx-auto p-6">
        {@render children()}
      </main>
    </div>
  {/if}
{/if}
