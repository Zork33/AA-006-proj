<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  let sidebarOpen = $state(false);
</script>

<div class="min-h-screen bg-[#F9F7F2]">
  <!-- Top Bar -->
  <header class="bg-white border-b border-[#E5E5E5] px-4 py-3 flex items-center justify-between sticky top-0 z-10">
    <button
      onclick={() => sidebarOpen = !sidebarOpen}
      class="md:hidden p-2 rounded-lg hover:bg-[#F5F5F5]"
    >
      ☰
    </button>
    <h1 class="text-lg font-bold text-[#4A6B5D]">ВСЯК</h1>
    <span class="text-sm text-[#999]">Админ</span>
  </header>

  <div class="flex">
    <!-- Sidebar -->
    <aside class="w-60 bg-white border-r border-[#E5E5E5] min-h-[calc(100vh-56px)] p-4 {sidebarOpen ? 'block' : 'hidden'} md:block">
      <nav class="space-y-2">
        <a href="/admin" class="block px-4 py-2 rounded-lg hover:bg-[#F5F5F5] text-[#4A6B5D]">Дашборд</a>
        <a href="/admin/leads" class="block px-4 py-2 rounded-lg hover:bg-[#F5F5F5] text-[#4A6B5D]">Заявки</a>
        <a href="/admin/services" class="block px-4 py-2 rounded-lg hover:bg-[#F5F5F5] text-[#4A6B5D]">Услуги</a>
        <a href="/admin/partners" class="block px-4 py-2 rounded-lg hover:bg-[#F5F5F5] text-[#4A6B5D]">Партнёры</a>
        <a href="/admin/admins" class="block px-4 py-2 rounded-lg hover:bg-[#F5F5F5] text-[#4A6B5D]">Админы</a>
      </nav>
    </aside>

    <!-- Content -->
    <main class="flex-1 p-6">
      {@render children()}
    </main>
  </div>
</div>
