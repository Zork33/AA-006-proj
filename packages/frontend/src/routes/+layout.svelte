<script lang="ts">
  import { onMount } from 'svelte';
  import '../uno';
  import '../app.css';

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      fetch(`/api/referral/track?ref=${encodeURIComponent(ref)}`, { credentials: 'same-origin' });
    }
  });
</script>

<slot />
