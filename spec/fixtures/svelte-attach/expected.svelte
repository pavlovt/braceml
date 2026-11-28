<div>
  <p {@attach tooltip(text)}>Hover me</p>
  <canvas width="320" {@attach draw} {@attach resize({ min: 100 })}></canvas>
  <Card title="x" {@attach tooltip('card')} {...props}>
    <p>body</p>
  </Card>
</div>
