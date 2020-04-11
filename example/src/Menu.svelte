<script>
  export let items
  export let format
</script>

<ul>
  {#each items.sort((a, b) => a.sortKey.localeCompare(b.sortKey)) as item}
    <li>
      <a href={format(item.path)}>{item.title}</a>
      {#if item.children}
        <svelte:self items={item.children} {format} />
      {/if}
    </li>
  {/each}
</ul>
