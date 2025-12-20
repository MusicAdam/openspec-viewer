<script lang="ts">
  export let message: string;
  export let type: 'info' | 'success' | 'error' = 'info';

  const colors = {
    info: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };
</script>

<div
  class="px-4 py-2 rounded-lg text-white shadow-lg animate-fade-in {colors[type]}"
  role="alert"
>
  {message}
</div>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.2s ease-out;
  }
</style>
