<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/stores/auth';

  let services = $state<any[]>([]);
  let showForm = $state(false);
  let newName = $state('');
  let newDescription = $state('');
  let editingId = $state<number | null>(null);

  onMount(async () => {
    try {
      const res = await authFetch('/api/services');
      services = await res.json();
    } catch {}
  });

  async function createService() {
    if (!newName.trim()) return;
    const res = await authFetch('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify({ name: newName, description: newDescription || undefined }),
    });
    if (res.ok) {
      const service = await res.json();
      services = [...services, service];
      newName = '';
      newDescription = '';
      showForm = false;
    }
  }

  async function toggleStatus(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
    const res = await authFetch(`/api/admin/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      services = services.map(s => s.id === id ? { ...s, status: newStatus } : s);
    }
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-xl font-semibold text-[#4A6B5D]">Услуги</h2>
  <button onclick={() => showForm = !showForm} class="px-4 py-2 bg-[#6B9B7A] text-white rounded-lg text-sm hover:bg-[#5A8A69]">
    {showForm ? 'Отмена' : 'Добавить'}
  </button>
</div>

{#if showForm}
  <form onsubmit={(e) => { e.preventDefault(); createService(); }} class="bg-white rounded-xl p-6 shadow-sm mb-6 space-y-4">
    <div>
      <label for="svc-name" class="block text-sm font-medium text-[#666] mb-1">Название</label>
      <input id="svc-name" type="text" bind:value={newName} required class="w-full px-4 py-2 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none" />
    </div>
    <div>
      <label for="svc-desc" class="block text-sm font-medium text-[#666] mb-1">Описание</label>
      <input id="svc-desc" type="text" bind:value={newDescription} class="w-full px-4 py-2 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none" />
    </div>
    <button type="submit" class="px-4 py-2 bg-[#6B9B7A] text-white rounded-lg text-sm hover:bg-[#5A8A69]">Создать</button>
  </form>
{/if}

<div class="bg-white rounded-xl p-6 shadow-sm">
  <table class="w-full">
    <thead>
      <tr class="border-b border-[#E5E5E5]">
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Название</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Описание</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Статус</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Действия</th>
      </tr>
    </thead>
    <tbody>
      {#each services as service}
        <tr class="border-b border-[#E5E5E5]">
          <td class="py-3 px-4 font-medium">{service.name}</td>
          <td class="py-3 px-4 text-sm text-[#666]">{service.description || '—'}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded-full text-xs {service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
              {service.status === 'active' ? 'Активна' : 'Скрыта'}
            </span>
          </td>
          <td class="py-3 px-4">
            <button onclick={() => toggleStatus(service.id, service.status)} class="text-sm text-[#999] hover:underline">
              {service.status === 'active' ? 'Скрыть' : 'Показать'}
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
