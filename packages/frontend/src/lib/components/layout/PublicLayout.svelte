<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen bg-[#F9F7F2] flex flex-col items-center px-5 py-8">
  <header class="w-full max-w-[480px] flex justify-center mb-8">
    <h1 class="text-2xl font-bold text-[#4A6B5D]">ВСЯК</h1>
  </header>

  <main class="w-full max-w-[480px] flex-1">
    {@render children()}
  </main>

  <footer class="w-full max-w-[480px] mt-8 pt-4 border-t border-[#E5E5E5] text-center text-sm text-[#999]">
    <a href="/privacy" class="hover:text-[#6B9B7A]">Политика конфиденциальности</a>
    <p class="mt-2">© 2026 ВСЯК</p>
  </footer>
</div>
