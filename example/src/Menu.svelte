<script>
  export let items
  export let format
</script>

<ul>
  {#each items as item}
    <li>
      <a href={format(item.path)}>{item.title}</a>
      {#if item.children}
        <svelte:self items={item.children} {format} />
      {/if}
    </li>
  {/each}
</ul>

<style>
  ul {
    padding: 0 0.9rem;
  }
</style>
