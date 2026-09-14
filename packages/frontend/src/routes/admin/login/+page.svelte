<script lang="ts">
  import { setTokens } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');
  let needPasswordSetup = $state(false);
  let setupEmail = $state('');
  let resetToken = $state('');
  let newPassword = $state('');
  let setupLoading = $state(false);
  let setupError = $state('');
  let setupSuccess = $state(false);
  let resetSent = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';
    needPasswordSetup = false;

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
        needPasswordSetup = true;
        setupEmail = data.email;
        return;
      }

      setTokens(data.accessToken, data.refreshToken, data.admin?.role);
      goto('/admin');
    } catch {
      error = 'Ошибка сети';
    } finally {
      loading = false;
    }
  }

  async function handleRequestReset() {
    setupLoading = true;
    setupError = '';

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: setupEmail }),
      });

      if (res.ok) {
        resetSent = true;
      } else {
        setupError = 'Ошибка отправки';
      }
    } catch {
      setupError = 'Ошибка сети';
    } finally {
      setupLoading = false;
    }
  }

  async function handleSetupPassword(e: Event) {
    e.preventDefault();
    setupLoading = true;
    setupError = '';

    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setupError = data.error || 'Ошибка';
        return;
      }

      setTokens(data.accessToken, data.refreshToken, data.admin?.role);
      goto('/admin');
    } catch {
      setupError = 'Ошибка сети';
    } finally {
      setupLoading = false;
    }
  }
</script>

<div class="min-h-screen bg-[#F9F7F2] flex items-center justify-center px-4">
  <div class="w-full max-w-sm">
    <h1 class="text-2xl font-bold text-[#4A6B5D] text-center mb-6">Вход в админку</h1>

    {#if needPasswordSetup}
      {#if !resetSent}
        <div class="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <p class="text-sm text-[#666]">
            Это ваш первый вход. Мы отправим ссылку для сброса пароля на <b>{setupEmail}</b>.
          </p>

          {#if setupError}
            <p class="text-red-500 text-sm">{setupError}</p>
          {/if}

          <button
            type="button"
            onclick={handleRequestReset}
            disabled={setupLoading}
            class="w-full py-3 px-6 bg-[#6B9B7A] text-white rounded-xl font-medium hover:bg-[#5A8A69] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {setupLoading ? 'Отправка...' : 'Отправить ссылку для сброса'}
          </button>
        </div>
      {:else}
        <form onsubmit={handleSetupPassword} class="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <p class="text-sm text-[#666]">
            Ссылка отправлена на <b>{setupEmail}</b>. Вставьте токен из письма и задайте новый пароль.
          </p>

          <div>
            <label for="reset-token" class="block text-sm font-medium text-[#666] mb-1">Токен из письма</label>
            <input
              id="reset-token"
              type="text"
              bind:value={resetToken}
              required
              class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
              placeholder="Вставьте токен"
            />
          </div>

          <div>
            <label for="new-password" class="block text-sm font-medium text-[#666] mb-1">Новый пароль</label>
            <input
              id="new-password"
              type="password"
              bind:value={newPassword}
              required
              minlength="8"
              class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
              placeholder="Минимум 8 символов"
            />
          </div>

          {#if setupError}
            <p class="text-red-500 text-sm">{setupError}</p>
          {/if}

          <button
            type="submit"
            disabled={setupLoading}
            class="w-full py-3 px-6 bg-[#6B9B7A] text-white rounded-xl font-medium hover:bg-[#5A8A69] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {setupLoading ? 'Сохранение...' : 'Задать пароль'}
          </button>
        </form>
      {/if}
    {:else}
      <form onsubmit={handleLogin} class="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-[#666] mb-1">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            required
            class="w-full px-4 py-3 rounded-xl border border-[#E5E5E5] focus:border-[#6B9B7A] focus:outline-none"
            placeholder="admin@example.com"
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
    {/if}
  </div>
</div>
