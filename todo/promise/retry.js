Promise.retry = function(fn, times = 3) {
  return new Promise(async function(resolve, reject) {
    while(times--) {
      try {
        const ret = await fn();
        resolve(ret);
        break;
      }
      catch(err) {
        if (!times) reject(err);
      }
    }
  })
}