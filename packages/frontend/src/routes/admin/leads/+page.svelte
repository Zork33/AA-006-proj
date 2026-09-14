<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/stores/auth';

  let leads = $state<any[]>([]);
  let loading = $state(true);
  let filterStatus = $state('');

  const statusLabels: Record<string, string> = {
    NEW: 'Новая', CONTACTED: 'Связались', QUALIFIED: 'Квалифицирована',
    CONVERTED: 'Конверсия', COMPLETED: 'Завершена', REJECTED: 'Отклонена',
    DUPLICATE: 'Дубликат', CANCELLED: 'Отменена',
  };

  onMount(async () => {
    try {
      const res = await authFetch('/api/admin/leads');
      leads = await res.json();
    } catch {} finally {
      loading = false;
    }
  });

  async function updateStatus(id: number, newStatus: string) {
    await authFetch(`/api/admin/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    leads = leads.map(l => l.id === id ? { ...l, status: newStatus } : l);
  }

  async function exportCsv() {
    const res = await authFetch('/api/admin/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads.csv';
    a.click();
  }

  $effect(() => {
    if (filterStatus) {
      leads = leads;
    }
  });
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-xl font-semibold text-[#4A6B5D]">Заявки</h2>
  <button onclick={exportCsv} class="px-4 py-2 bg-[#6B9B7A] text-white rounded-lg text-sm hover:bg-[#5A8A69]">
    Экспорт CSV
  </button>
</div>

<div class="mb-4">
  <select bind:value={filterStatus} class="px-4 py-2 border border-[#E5E5E5] rounded-lg text-sm">
    <option value="">Все статусы</option>
    {#each Object.entries(statusLabels) as [value, label]}
      <option value={value}>{label}</option>
    {/each}
  </select>
</div>

{#if loading}
  <p class="text-[#999]">Загрузка...</p>
{:else}
  {@const filtered = filterStatus ? leads.filter(l => l.status === filterStatus) : leads}
  <div class="bg-white rounded-xl shadow-sm overflow-hidden">
    <table class="w-full">
      <thead>
        <tr class="border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Номер</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Имя</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Телефон</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Город</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Статус</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Источник</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Дата</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as lead}
          <tr class="border-b border-[#E5E5E5] hover:bg-[#FAFAFA]">
            <td class="py-3 px-4 text-sm font-mono">{lead.leadNumber}</td>
            <td class="py-3 px-4">{lead.name}</td>
            <td class="py-3 px-4 text-sm">{lead.phone}</td>
            <td class="py-3 px-4 text-sm">{lead.city}</td>
            <td class="py-3 px-4">
              <select
                value={lead.status}
                onchange={(e) => updateStatus(lead.id, (e.target as HTMLSelectElement).value)}
                class="px-2 py-1 rounded text-xs bg-[#F5F5F5]"
              >
                {#each Object.entries(statusLabels) as [value, label]}
                  <option value={value}>{label}</option>
                {/each}
              </select>
            </td>
            <td class="py-3 px-4 text-sm">
              <span class="px-2 py-1 rounded text-xs {lead.source === 'QR' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}">
                {lead.source}
              </span>
            </td>
            <td class="py-3 px-4 text-sm text-[#999]">
              {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
