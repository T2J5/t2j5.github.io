const effectStack = [];

function subscribe(effect, subs) {
  // 建立订阅关系
  subs.add(effect);

  // 建立依赖关系
  effect.deps.add(subs);
}

function cleanup(effect) {
  // 从该effect订阅的state对应的subs中移除effect
  for (const subs of effect.deps) {
    subs.delete(effect);
  }

  // 将effect依赖的所有state对应的subs移除
  effect.deps.clear();
}

function useState(value) {
  const subs = new Set();

  const getter = () => {
    const effect = effectStack[effectStack.length - 1];

    if (effect) {
      subscribe(effect, subs);
    }

    return value;
  }

  const setter = (nextValue) => {
    value = nextValue;

    // 通知所有订阅state的effect执行
    for(const effect of [...subs]) {
      effect.execute();
    }

    return [getter, setter];
  }
}

function useEffect(callback) {
  const execute = () => {
    // 重置依赖
    cleanup(effect);

    // 将当前effect推至栈顶
    effectStack.push(effect);

    try {
      callback();
    } finally {
      effectStack.pop();
    }
  }

  const effect = {
    execute,
    deps: new Set(),
  }

  // 立即执行一次，建立订阅发布关系
  execute();
}

function useMemo(callback) {
  const [s, set] = useState();

  useEffect(() => set(callback()))

  return s;
}