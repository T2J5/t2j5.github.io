function fakerBind (fn, ...args) {
  return (...rest) => fn.call(this, ...rest, ...args);
}