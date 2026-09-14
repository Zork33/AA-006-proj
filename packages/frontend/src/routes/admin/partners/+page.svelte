<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/stores/auth';

  let partners = $state<any[]>([]);

  onMount(async () => {
    try {
      const res = await authFetch('/api/admin/partners');
      partners = await res.json();
    } catch {}
  });

  async function approve(id: number, status: 'approved' | 'rejected') {
    await authFetch(`/api/admin/partners/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    partners = partners.map(p => p.id === id ? { ...p, approvalStatus: status } : p);
  }

  async function toggleBlock(id: number, currentStatus: string) {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    await authFetch(`/api/admin/partners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    partners = partners.map(p => p.id === id ? { ...p, status: newStatus } : p);
  }
</script>

<h2 class="text-xl font-semibold text-[#4A6B5D] mb-6">Партнёры</h2>

<div class="bg-white rounded-xl p-6 shadow-sm">
  <table class="w-full">
    <thead>
      <tr class="border-b border-[#E5E5E5]">
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Имя</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Email</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Регион</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Статус</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Рейтинг</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Действия</th>
      </tr>
    </thead>
    <tbody>
      {#each partners as partner}
        <tr class="border-b border-[#E5E5E5]">
          <td class="py-3 px-4">{partner.name}</td>
          <td class="py-3 px-4 text-sm text-[#999]">{partner.email}</td>
          <td class="py-3 px-4 text-sm">{partner.region}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded-full text-xs {partner.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' : partner.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">
              {partner.approvalStatus === 'approved' ? 'Одобрен' : partner.approvalStatus === 'pending' ? 'На модерации' : 'Отклонён'}
            </span>
          </td>
          <td class="py-3 px-4">
            <span class="font-medium {partner.rating >= 50 ? 'text-[#6B9B7A]' : 'text-red-500'}">
              {partner.rating}
            </span>
          </td>
          <td class="py-3 px-4 flex gap-2">
            {#if partner.approvalStatus === 'pending'}
              <button onclick={() => approve(partner.id, 'approved')} class="text-sm text-[#6B9B7A] hover:underline">Одобрить</button>
              <button onclick={() => approve(partner.id, 'rejected')} class="text-sm text-red-500 hover:underline">Отклонить</button>
            {/if}
            {#if partner.approvalStatus === 'approved'}
              <button onclick={() => toggleBlock(partner.id, partner.status)} class="text-sm text-[#999] hover:underline">
                {partner.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
              </button>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
