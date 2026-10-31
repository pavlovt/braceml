<ul>
  {#each users as user, i (user.id)}
    <li class:active={user.selected}>{i + 1}. {user.name}</li>
  {:else}
    <li>Empty</li>
  {/each}
</ul>
