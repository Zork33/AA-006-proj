<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/stores/auth';

  let dashboard = $state({
    partner: { name: '', rating: 0, approvalStatus: '' },
    stats: { total: 0, converted: 0, new_leads: 0, today: 0 },
  });

  onMount(async () => {
    try {
      const res = await authFetch('/api/partner/dashboard');
      const data = await res.json();
      dashboard = { ...dashboard, ...data };
    } catch {}
  });
</script>

<h2 class="text-xl font-semibold text-[#4A6B5D] mb-6">Дашборд</h2>

<div class="bg-white rounded-xl p-6 shadow-sm mb-6">
  <div class="flex items-center justify-between mb-4">
    <h3 class="font-semibold text-[#4A6B5D]">{dashboard.partner.name || 'Партнёр'}</h3>
    <span class="px-3 py-1 rounded-full text-sm {dashboard.partner.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
      {dashboard.partner.approvalStatus === 'approved' ? 'Одобрен' : 'На модерации'}
    </span>
  </div>
  <div class="text-3xl font-bold text-[#6B9B7A]">{dashboard.partner.rating}</div>
  <p class="text-sm text-[#999]">Рейтинг</p>
</div>

<div class="grid grid-cols-2 gap-4">
  <div class="bg-white rounded-xl p-4 shadow-sm">
    <p class="text-sm text-[#999]">Всего заявок</p>
    <p class="text-2xl font-bold text-[#4A6B5D]">{dashboard.stats.total}</p>
  </div>
  <div class="bg-white rounded-xl p-4 shadow-sm">
    <p class="text-sm text-[#999]">Новые</p>
    <p class="text-2xl font-bold text-[#6B9B7A]">{dashboard.stats.new_leads}</p>
  </div>
</div>
