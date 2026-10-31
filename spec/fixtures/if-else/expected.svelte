{#if loading}
  <Spinner size="sm" />
{:else if users.length == 0}
  <p class="muted">No users</p>
{:else}
  <p>{users.length} users</p>
{/if}
