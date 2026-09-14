<script lang="ts">
  import { onMount } from 'svelte';
  import { authFetch } from '$lib/stores/auth';

  let referral = $state({ referralToken: '', partnerCode: '', referralLink: '' });
  let copied = $state(false);

  onMount(async () => {
    try {
      const res = await authFetch('/api/partner/referral');
      const data = await res.json();
      referral = {
        referralToken: data.referralToken || '',
        partnerCode: data.partnerCode || '',
        referralLink: data.referralLink || `${window.location.origin}/?ref=${data.referralToken}`,
      };
    } catch {}
  });

  function copyLink() {
    navigator.clipboard.writeText(referral.referralLink);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function copyCode() {
    navigator.clipboard.writeText(referral.partnerCode);
  }
</script>

<h2 class="text-xl font-semibold text-[#4A6B5D] mb-6">Реферальная ссылка</h2>

<div class="bg-white rounded-xl p-6 shadow-sm mb-6">
  <h3 class="font-medium text-[#4A6B5D] mb-4">Ваша ссылка</h3>
  <div class="flex items-center gap-2 mb-4">
    <input type="text" value={referral.referralLink} readonly class="flex-1 px-4 py-3 bg-[#F5F5F5] rounded-xl text-sm font-mono" />
    <button onclick={copyLink} class="px-4 py-3 bg-[#6B9B7A] text-white rounded-xl text-sm hover:bg-[#5A8A69]">
      {copied ? '✓ Скопировано' : 'Копировать'}
    </button>
  </div>
  <p class="text-sm text-[#999]">Отправляйте эту ссылку клиентам. При переходе заявки будут привязаны к вам.</p>
</div>

<div class="bg-white rounded-xl p-6 shadow-sm">
  <h3 class="font-medium text-[#4A6B5D] mb-4">Ваш промо-код</h3>
  <div class="flex items-center gap-2">
    <input type="text" value={referral.partnerCode} readonly class="flex-1 px-4 py-3 bg-[#F5F5F5] rounded-xl text-sm font-mono" />
    <button onclick={copyCode} class="px-4 py-3 bg-[#6B9B7A] text-white rounded-xl text-sm hover:bg-[#5A8A69]">Копировать</button>
  </div>
  <p class="text-sm text-[#999] mt-2">Используйте этот код для приглашения других партнёров.</p>
</div>
