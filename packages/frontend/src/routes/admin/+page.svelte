<script lang="ts">
  let stats = $state({ total: 0, new_leads: 0, converted: 0, today: 0 });
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
  <p class="text-[#999]">Загрузка...</p>
</div>
