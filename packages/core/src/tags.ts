/** Known lower-case tag names (HTML, SVG, MathML root). Used to catch typos like `p {name}`. */
export const KNOWN_TAGS = new Set(
  (
    // HTML
    'a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption ' +
    'cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset ' +
    'figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins ' +
    'kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option ' +
    'output p param picture pre progress q rp rt ruby s samp script search section select slot small ' +
    'source span strong style sub summary sup table tbody td template textarea tfoot th thead time ' +
    'title tr track u ul var video wbr ' +
    // SVG
    'svg g defs symbol use path rect circle ellipse line polyline polygon text tspan textpath image ' +
    'clippath mask pattern marker lineargradient radialgradient stop filter foreignobject desc ' +
    'fegaussianblur feoffset feblend fecolormatrix fecomposite feflood femerge femergenode ' +
    'animate animatetransform animatemotion view switch ' +
    // MathML root
    'math'
  ).split(/\s+/),
);

/** true if `name` is acceptable as a lower-case element name */
export function isKnownTag(name: string): boolean {
  if (/^[A-Z]/.test(name)) return true; // component
  if (name.includes('-') || name.includes(':')) return true; // custom element, svelte:head
  return KNOWN_TAGS.has(name.toLowerCase());
}
