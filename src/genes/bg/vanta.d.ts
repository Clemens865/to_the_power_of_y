// Vanta ships UMD bundles without types; each resolves to the effect factory (possibly wrapped in { default }).
declare module 'vanta/dist/*' {
  const effect: unknown;
  export default effect;
}
