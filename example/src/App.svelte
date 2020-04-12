<script>
  import { onDestroy } from 'svelte'
  import routes from 'routix/routes'
  import tree from 'routix/tree'
  import navaid from 'navaid'
  import Menu from './Menu.svelte'

  const router = navaid('/', uri => {
    console.log('__fallback', uri)
  })

  let currentRoute
  let error
  let cmp

  const setRoute = route => async () => {
    if (!route.import) {
      console.log(route)
      return
    }
    currentRoute = route
    try {
      const _cmp = await route.import()
      if (currentRoute !== route) return
      error = null
      cmp = _cmp
    } catch (err) {
      if (currentRoute !== route) return
      error = err
    }
  }

  for (const route of routes) {
    router.on(route.path, setRoute(route))
  }

  router.listen()

  onDestroy(router.unlisten)
</script>

<!-- <pre>{JSON.stringify(routes, false, 2)}</pre> -->
<!-- <pre>{JSON.stringify(tree, false, 2)}</pre> -->

<Menu items={tree.children} format={router.format} />
<!-- <ul>
  {#each routes.sort((a, b) => a.sortKey.localeCompare(b.sortKey)) as route}
    <li>
      <a href={'/' + route.path}>{route.title}</a>
    </li>
  {/each}
</ul> -->

<main>
  {#if error}
    <pre>{error.stack || error}</pre>
  {:else}
    <svelte:component this={cmp} />
  {/if}
</main>

<style>
  ul {
    float: left;
  }

  main {
    border: 1px solid hotpink;
    padding: 1rem;
    overflow: auto;
    margin: 1rem;
  }
</style>
