<script lang="ts">
  import PublicLayout from '$lib/components/layout/PublicLayout.svelte';
  import LeadForm from '$lib/components/ui/LeadForm.svelte';

  let { data } = $props();
  let services = $derived(data.services);

  function handleLeadSubmit(leadData: any) {
    console.log('Lead submitted:', leadData);
  }
</script>

<PublicLayout>
  <section class="text-center mb-8">
    <h2 class="text-2xl font-bold text-[#4A6B5D] mb-3">
      Нужен мастер?
    </h2>
    <p class="text-[#666] text-lg">
      Оставьте заявку — мы найдём лучшего специалиста для ваших задач
    </p>
  </section>

  <section class="mb-8">
    <h3 class="text-lg font-semibold text-[#4A6B5D] mb-4">Наши услуги</h3>
    <div class="grid grid-cols-2 gap-3">
      {#each services as service}
        <div class="bg-white rounded-xl p-4 shadow-sm">
          <h4 class="font-medium text-[#4A6B5D]">{service.name}</h4>
          <p class="text-sm text-[#999] mt-1">{service.description}</p>
        </div>
      {/each}
    </div>
  </section>

  <section>
    <LeadForm {services} onsubmit={handleLeadSubmit} />
  </section>
</PublicLayout>
