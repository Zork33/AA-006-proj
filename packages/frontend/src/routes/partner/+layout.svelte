<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

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
