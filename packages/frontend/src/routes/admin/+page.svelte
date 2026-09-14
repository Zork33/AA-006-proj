<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/stores/auth';

  let stats = $state({ total: 0, new_leads: 0, converted: 0, today: 0 });
  let recentLeads = $state<any[]>([]);

  onMount(async () => {
    try {
      const res = await authFetch('/api/admin/leads');
      const leads = await res.json();
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      stats.total = leads.length;
      stats.new_leads = leads.filter((l: any) => l.status === 'NEW').length;
      stats.converted = leads.filter((l: any) => l.status === 'CONVERTED' || l.status === 'COMPLETED').length;
      stats.today = leads.filter((l: any) => new Date(l.createdAt) >= todayStart).length;
      recentLeads = leads.slice(0, 5);
    } catch {}
  });
</script>

<h2 class="text-xl font-semibold text-[#4A6B5D] mb-6">Дашборд</h2>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <div class="bg-white rounded-xl p-4 shadow-sm">
    <p class="text-sm text-[#999]">Всего заявок</p>
    <p class="text-2xl font-bold text-[#4A6B5D]">{stats.total}</p>
  </div>
  <div class="bg-white rounded-xl p-4 shadow-sm">
    <p class="text-sm text-[#999]">Новые</p>
    <p class="text-2xl font-bold text-[#6B9B7A]">{stats.new_leads}</p>
  </div>
  <div class="bg-white rounded-xl p-4 shadow-sm">
    <p class="text-sm text-[#999]">Конверсия</p>
    <p class="text-2xl font-bold text-[#4A6B5D]">{stats.converted}</p>
  </div>
  <div class="bg-white rounded-xl p-4 shadow-sm">
    <p class="text-sm text-[#999]">Сегодня</p>
    <p class="text-2xl font-bold text-[#6B9B7A]">{stats.today}</p>
  </div>
</div>

<div class="bg-white rounded-xl p-6 shadow-sm">
  <h3 class="font-semibold text-[#4A6B5D] mb-4">Последние заявки</h3>
  {#if recentLeads.length === 0}
    <p class="text-[#999]">Нет заявок</p>
  {:else}
    <div class="space-y-3">
      {#each recentLeads as lead}
        <div class="flex justify-between items-center py-2 border-b border-[#F5F5F5] last:border-0">
          <div>
            <span class="font-medium text-[#4A6B5D]">{lead.leadNumber}</span>
            <span class="text-[#999] ml-2">{lead.name}</span>
          </div>
          <span class="text-sm px-2 py-1 rounded bg-[#F5F5F5] text-[#666]">{lead.status}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
