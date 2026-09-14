<script lang="ts">
  let services = $state<Array<{
    id: number;
    name: string;
    description: string;
    status: string;
  }>>([]);
</script>

<h2 class="text-xl font-semibold text-[#4A6B5D] mb-6">Услуги</h2>

<div class="bg-white rounded-xl p-6 shadow-sm">
  <table class="w-full">
    <thead>
      <tr class="border-b border-[#E5E5E5]">
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">ID</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Название</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Описание</th>
        <th class="text-left py-3 px-4 text-sm font-medium text-[#999]">Статус</th>
      </tr>
    </thead>
    <tbody>
      {#each services as service}
        <tr class="border-b border-[#E5E5E5]">
          <td class="py-3 px-4 text-sm text-[#999]">{service.id}</td>
          <td class="py-3 px-4 font-medium">{service.name}</td>
          <td class="py-3 px-4 text-sm text-[#666]">{service.description}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded-full text-xs {service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
              {service.status === 'active' ? 'Активна' : 'Скрыта'}
            </span>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
