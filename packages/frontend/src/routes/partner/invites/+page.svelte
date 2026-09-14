<script lang="ts">
  let invites = $state<Array<{
    id: number;
    name: string;
    createdAt: string;
    approvalStatus: string;
  }>>([]);

  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    approved: 'Одобрен',
    pending: 'На модерации',
    rejected: 'Отклонён',
  };
</script>

<h2 class="text-xl font-semibold text-[#4A6B5D] mb-6">Приглашённые</h2>

{#if invites.length === 0}
  <div class="bg-white rounded-xl p-8 shadow-sm text-center">
    <p class="text-[#999]">Вы ещё не пригласили ни одного партнёра</p>
    <p class="text-sm text-[#999] mt-2">Поделитесь своим промо-кодом с коллегами</p>
  </div>
{:else}
  <div class="bg-white rounded-xl shadow-sm overflow-hidden">
    <table class="w-full">
      <thead>
        <tr class="border-b border-[#E5E5E5] bg-[#FAFAFA]">
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Имя</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Дата регистрации</th>
          <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Статус</th>
        </tr>
      </thead>
      <tbody>
        {#each invites as invite}
          <tr class="border-b border-[#E5E5E5]">
            <td class="py-3 px-4">{invite.name}</td>
            <td class="py-3 px-4 text-sm text-[#999]">
              {new Date(invite.createdAt).toLocaleDateString('ru-RU')}
            </td>
            <td class="py-3 px-4">
              <span class="px-2 py-1 rounded-full text-xs {statusColors[invite.approvalStatus] || 'bg-gray-100'}">
                {statusLabels[invite.approvalStatus] || invite.approvalStatus}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
