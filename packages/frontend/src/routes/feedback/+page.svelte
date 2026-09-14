<script lang="ts">
  import { page } from '$app/stores';

  let leadNumber = $state('');
  let rating = $state(0);
  let comment = $state('');
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  // Получаем leadNumber из URL
  $effect(() => {
    leadNumber = $page.url.searchParams.get('lead') || '';
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (rating === 0) {
      error = 'Поставьте оценку';
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadNumber, rating, comment }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Ошибка отправки';
        return;
      }

      success = true;
    } catch (err) {
      error = 'Ошибка сети';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-5">
  <div class="w-full max-w-[480px]">
    <h1 class="text-2xl font-bold text-[#4A6B5D] text-center mb-8">ВСЯК</h1>

    {#if success}
      <div class="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div class="text-4xl mb-4">✓</div>
        <h2 class="text-xl font-semibold text-[#4A6B5D] mb-2">Спасибо за отзыв!</h2>
        <p class="text-[#666]">Ваша оценка поможет нам стать лучше.</p>
      </div>
    {:else}
      <form onsubmit={handleSubmit} class="bg-white rounded-2xl p-6 shadow-sm">
        <h2 class="text-lg font-semibold text-[#4A6B5D] mb-6">Оцените качество услуг</h2>

        {#if !leadNumber}
          <p class="text-red-500 text-sm mb-4">Не указан номер заявки</p>
        {/if}

        <div class="mb-6">
          <label class="block text-sm font-medium text-[#666] mb-3">Ваша оценка</label>
          <div class="flex gap-2 justify-center">
            {#each [1, 2, 3, 4, 5] as star}
              <button
                type="button"
                onclick={() => rating = star}
                class="text-3xl transition-colors {star <= rating ? 'text-yellow-400' : 'text-gray-300'}"
              >
                ★
              </button>
            {/each}
          </div>
          <p class="text-center text-sm text-[#999] mt-2">
            {rating === 0 ? 'Выберите оценку' : rating <= 2 ? 'Плохо' : rating === 3 ? 'Нормально' : 'Хорошо'}
          </p>
        </div>

        <div class="mb-6">
          <label for="comment" class="block text-sm font-medium text-[#666] mb-1">Комментарий (опционально)</label>
          <textarea
            id="comment"
            bind:value={comment}
            rows="3"
            class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none resize-none"
            placeholder="Расскажите о вашем опыте..."
          ></textarea>
        </div>

        {#if error}
          <p class="text-red-500 text-sm mb-4">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading || !leadNumber}
          class="w-full py-3 px-6 bg-[#6B9B7A] text-white rounded-xl font-medium hover:bg-[#5A8A69] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Отправка...' : 'Отправить отзыв'}
        </button>
      </form>
    {/if}
  </div>
</div>
