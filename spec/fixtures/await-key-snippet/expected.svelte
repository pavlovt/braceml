{#await load()}
  <p>Loading…</p>
{:then data}
  {@const total = data.items.length}
  <p>{total} items</p>
{:catch err}
  <p class="error">{err.message}</p>
{/await}
{#key route}
  <Page />
{/key}
{#snippet row(user)}
  <td>
    <a href="/users/{user.id}">{user.name}</a>
  </td>
{/snippet}
<table>
  <tbody>
    <tr>
      {@render row(me)}
    </tr>
  </tbody>
</table>
