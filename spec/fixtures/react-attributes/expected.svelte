<form id="signup" class="card wide" onsubmit={save} ondblclick={zoom}>
  <label class="muted {tone}" for="email">Email</label>
  <input id="email" tabindex="1" maxlength="40" readonly bind:this={field} class:error={failed} style="color: red; --gap: 2px" style:width="{width}px" data-kind="a" {...rest}>
  <a class="{linkClass}" href="/users/{user.id}">Profile</a>
  <svg viewBox="0 0 10 10">
    <path stroke-width="2" d="M0 0"></path>
  </svg>
  <my-chart some-option="1"></my-chart>
  <Card class="big" onclick={open} title="Hi" />
</form>
