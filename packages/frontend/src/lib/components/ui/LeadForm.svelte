<script lang="ts">
  let { services = [], onsubmit }: { services: Array<{id: number; name: string; description: string}>; onsubmit: (data: any) => void } = $props();

  let name = $state('');
  let phone = $state('');
  let email = $state('');
  let city = $state('');
  let serviceId = $state<number | null>(null);
  let messenger = $state('');
  let website = $state(''); // honeypot
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, email, city,
          serviceId: serviceId || undefined,
          messenger: messenger || undefined,
          website,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Ошибка отправки';
        return;
      }

      success = true;
      onsubmit(data);
    } catch (err) {
      error = 'Ошибка сети';
    } finally {
      loading = false;
    }
  }
</script>

{#if success}
  <div class="bg-white rounded-2xl p-8 shadow-sm text-center">
    <div class="text-4xl mb-4">✓</div>
    <h2 class="text-xl font-semibold text-[#4A6B5D] mb-2">Спасибо!</h2>
    <p class="text-[#666]">Ваша заявка принята. Мы свяжемся с вами в ближайшее время.</p>
  </div>
{:else}
  <form onsubmit={handleSubmit} class="bg-white rounded-2xl p-6 shadow-sm space-y-4">
    <h2 class="text-lg font-semibold text-[#4A6B5D] mb-4">Оставьте заявку</h2>

    <div>
      <label for="name" class="block text-sm font-medium text-[#666] mb-1">Имя *</label>
      <input
        id="name"
        type="text"
        bind:value={name}
        required
        class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
        placeholder="Ваше имя"
      />
    </div>

    <div>
      <label for="phone" class="block text-sm font-medium text-[#666] mb-1">Телефон *</label>
      <input
        id="phone"
        type="tel"
        bind:value={phone}
        required
        class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
        placeholder="+7 (999) 123-45-67"
      />
    </div>

    <div>
      <label for="email" class="block text-sm font-medium text-[#666] mb-1">Email *</label>
      <input
        id="email"
        type="email"
        bind:value={email}
        required
        class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
        placeholder="email@example.com"
      />
    </div>

    <div>
      <label for="city" class="block text-sm font-medium text-[#666] mb-1">Город *</label>
      <input
        id="city"
        type="text"
        bind:value={city}
        required
        class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
        placeholder="Ваш город"
      />
    </div>

    <div>
      <label for="service" class="block text-sm font-medium text-[#666] mb-1">Услуга</label>
      <select
        id="service"
        bind:value={serviceId}
        class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
      >
        <option value={null}>Выберите услугу</option>
        {#each services as service}
          <option value={service.id}>{service.name}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="messenger" class="block text-sm font-medium text-[#666] mb-1">Мессенджер (опционально)</label>
      <input
        id="messenger"
        type="text"
        bind:value={messenger}
        class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
        placeholder="Telegram, WhatsApp"
      />
    </div>

    <!-- Honeypot -->
    <div class="hidden" aria-hidden="true">
      <label for="website">Website</label>
      <input id="website" type="text" bind:value={website} tabindex="-1" autocomplete="off" />
    </div>

    {#if error}
      <p class="text-red-500 text-sm">{error}</p>
    {/if}

    <button
      type="submit"
      disabled={loading}
      class="w-full py-3 px-6 bg-[#6B9B7A] text-white rounded-xl font-medium hover:bg-[#5A8A69] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Отправка...' : 'Отправить заявку'}
    </button>
  </form>
{/if}
