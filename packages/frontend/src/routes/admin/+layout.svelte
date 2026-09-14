<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { isAuthenticated, loadTokens, subscribeAuth } from '$lib/stores/auth';
  import AdminLayout from '$lib/components/layout/AdminLayout.svelte';
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
    const isLoginPage = currentPath === '/admin/login';
    if (!isAuthenticated() && !isLoginPage && currentPath) {
      goto('/admin/login');
    } else if (isAuthenticated() || isLoginPage) {
      ready = true;
    }
  }
</script>

{#if ready}
  {#if currentPath === '/admin/login'}
    {@render children()}
  {:else}
    <AdminLayout>
      {@render children()}
    </AdminLayout>
  {/if}
{/if}
