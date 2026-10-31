{#snippet row(user)}
  <td>{user.name}</td>
{/snippet}
{@const total = rows.length}
<div class="list">
  <h2>Rows: {total}</h2>
  {#each rows as item}
    {@render row(item)}
  {/each}
  {#each rows as row, i (row.id)}
    <dt>{i}</dt>
    <dd>{row.name}</dd>
  {:else}
    <p>Empty</p>
  {/each}
  {#each rows.filter(Boolean) as [id, name] (id)}
    {@const label = name.trim()}
    <li>{label}</li>
  {/each}
  {#if open}
    Hello 
    <strong>{name}</strong>
     there
  {/if}
  {#key route}
    <Page />
  {/key}
  <article>
    {@html post.body}
  </article>
  <Table rows={rows}>
    {#snippet header(col)}
      <th>{col}</th>
    {/snippet}
    <p>Footer</p>
  </Table>
  {#await load()}
    <p>Loading</p>
  {:then data}
    {@const n = data.length}
    <p>{n}</p>
  {:catch err}
    <p>{err.message}</p>
  {/await}
  {@render children?.()}
  {@debug total}
  <!-- note -->
</div>
