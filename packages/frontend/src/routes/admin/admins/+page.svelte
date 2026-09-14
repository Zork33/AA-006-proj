<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/stores/auth';

  let admins = $state<any[]>([]);
  let showForm = $state(false);
  let newName = $state('');
  let newEmail = $state('');
  let newRegion = $state('');
  let error = $state('');

  onMount(async () => {
    try {
      const res = await authFetch('/api/admin/admins');
      if (res.ok) admins = await res.json();
    } catch {}
  });

  async function createAdmin(e: Event) {
    e.preventDefault();
    error = '';
    try {
      const res = await authFetch('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          region: newRegion || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        error = data.error || 'Ошибка';
        return;
      }
      const admin = await res.json();
      admins = [...admins, admin];
      newName = '';
      newEmail = '';
      newRegion = '';
      showForm = false;
    } catch {
      error = 'Ошибка сети';
    }
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-xl font-semibold text-[#4A6B5D]">Администраторы</h2>
  <button onclick={() => showForm = !showForm} class="px-4 py-2 bg-[#6B9B7A] text-white rounded-lg text-sm hover:bg-[#5A8A69]">
    {showForm ? 'Отмена' : 'Добавить'}
  </button>
</div>

{#if showForm}
  <form onsubmit={createAdmin} class="bg-white rounded-xl p-6 shadow-sm mb-6 space-y-4">
    <div>
      <label for="adm-name" class="block text-sm font-medium text-[#666] mb-1">Имя</label>
      <input id="adm-name" type="text" bind:value={newName} required class="w-full px-4 py-2 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none" />
    </div>
    <div>
      <label for="adm-email" class="block text-sm font-medium text-[#666] mb-1">Email</label>
      <input id="adm-email" type="email" bind:value={newEmail} required class="w-full px-4 py-2 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none" />
    </div>
    <div>
      <label for="adm-region" class="block text-sm font-medium text-[#666] mb-1">Регион (опционально)</label>
      <input id="adm-region" type="text" bind:value={newRegion} class="w-full px-4 py-2 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none" />
    </div>
    {#if error}
      <p class="text-red-500 text-sm">{error}</p>
    {/if}
    <button type="submit" class="px-4 py-2 bg-[#6B9B7A] text-white rounded-lg text-sm hover:bg-[#5A8A69]">Создать</button>
  </form>
{/if}

<div class="bg-white rounded-xl p-6 shadow-sm">
  <table class="w-full">
    <thead>
      <tr class="border-b border-[#E5E5E5]">
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Имя</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Email</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Роль</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Регион</th>
      </tr>
    </thead>
    <tbody>
      {#each admins as admin}
        <tr class="border-b border-[#E5E5E5]">
          <td class="py-3 px-4">{admin.name}</td>
          <td class="py-3 px-4 text-sm text-[#999]">{admin.email}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded-full text-xs {admin.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
              {admin.role === 'superadmin' ? 'Суперадмин' : 'Админ'}
            </span>
          </td>
          <td class="py-3 px-4 text-sm">{admin.region || 'Все регионы'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
