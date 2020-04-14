<script>
  import { onDestroy } from 'svelte'
  import routes from 'routix/routes'
  import tree from 'routix/tree'
  import navaid from 'navaid'
  import Menu from './Menu.svelte'

  let fallback = null

  const router = navaid('/', uri => {
    cmp = null
    fallback = uri
  })

  let currentRoute
  let error
  let cmp

  const setRoute = route => async () => {
    if (!route.import) {
      cmp = null
      return
    }
    currentRoute = route
    try {
      const { default: _cmp } = await route.import()
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

<nav>
  <Menu items={[tree]} format={router.format} />
</nav>

<main>
  {#if error}
    <pre>{error.stack || error}</pre>
  {:else if cmp}
    <svelte:component this={cmp} />
  {:else}
    <h1>Fallback</h1>
    <pre>
      <code>{fallback}</code>
    </pre>
  {/if}
</main>

<style>
  nav {
    float: left;
  }

  main {
    border: 1px solid hotpink;
    padding: 1rem;
    overflow: auto;
    margin: 1rem;
  }
</style>
