function clone(source) {
  const t = type(source);
  if (t !== 'object' && t !== 'array') {
    return source;
  }

  let target;

  if (t === 'object') {
    target = {};
    for (const key in source) {
      // hasOwnProperty() 方法返回一个布尔值，表示对象自有属性（而不是继承来的属性）中是否具有指定的属性。
      // 如果指定的对象自身有指定的属性，则静态方法 Object.hasOwn() 返回 true。如果属性是继承的或者不存在，该方法返回 false。
      if (Object.hasOwn(source, key)) {
        target[key] = clone(source[key]);
      }
    }
  } else {
    target = [];
    for (let i = 0; i < source.length; i++) {
      target[i] = clone(source[i]);
    }
  }
}
