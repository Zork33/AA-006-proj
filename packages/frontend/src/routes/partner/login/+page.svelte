<script lang="ts">
  import { setTokens } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleLogin(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.error || 'Ошибка авторизации';
        return;
      }

      if (data.needPasswordSetup) {
        error = 'Обратитесь к администратору для настройки пароля';
        return;
      }

      setTokens(data.accessToken, data.refreshToken, data.admin?.role);
      goto('/partner');
    } catch {
      error = 'Ошибка сети';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <h1 class="text-2xl font-bold text-[#4A6B5D] text-center mb-6">Личный кабинет</h1>

    <form onsubmit={handleLogin} class="bg-white rounded-2xl p-6 shadow-sm space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-[#666] mb-1">Email</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
          placeholder="partner@example.com"
        />
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-[#666] mb-1">Пароль</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
          placeholder="Ваш пароль"
        />
      </div>

      {#if error}
        <p class="text-red-500 text-sm">{error}</p>
      {/if}

      <button
        type="submit"
        disabled={loading}
        class="w-full py-3 px-6 bg-[#6B9B7A] text-white rounded-xl font-medium hover:bg-[#5A8A69] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Вход...' : 'Войти'}
      </button>
    </form>
  </div>
</div>
