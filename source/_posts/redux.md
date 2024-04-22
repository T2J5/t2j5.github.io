---
title: redux
date: 2023-09-12 08:32:39
tags: ["redux", "review"]
index_img:
banner_img:
---

## redux 有什么缺点

- 一个组件所需要的数据，必须由父组件传过来，而不能像 flux 直接从 store 中取
- 当一个组件相关数据更新时，即使父组件不需要用到这个组件，父组件还是会重新 render，可能会影响效率，或者需要写复杂的 shouldComponentUpdate 进行判断

## redux 设计理念

redux 是将整个应用状态存储到 store，里面存储着一个状态树 store tree，组件可以派发 dispatch 行为（action）给 store，而不是直接通知其他组件，组件内部通过订阅 store 中状态 state 来刷新自己视图

## redux 三大原则

- 唯一数据源
  整个应用的 state 都被存储到唯一的 store 中

- 保持只读状态
  state 是只读的，唯一改变 state 的方法是触发 action，action 是一个用于描述已发生事件的对象

- 数据改变只能通过纯函数来执行

通过 reducers 来实现 state 变更

## redux 源码

```js
let createStore = (reducer) => {
  let state;
  // 获取状态对象
  // 存放所有的监听函数
  let listeners = [];
  let getState = () => state;
  // 提供一个方法供外部调用派发action
  let dispatch = (action) => {
    // 调用管理员reducer得到新的state
    state = reducer(state, action);
    // 执行所有的监听函数
    listeners.forEach(l => l());
  }
  // 订阅状态变化事件，当状态改变发生之后执行监听函数
  let subscribe = (listener) => {
    listeners.push(listener)
  }

  dispatch()

  return {
    getState,
    dispatch
    subscribe
  }
}

let combineReducers = (reducers) => {
  // 传入一个reducers管理组，返回的是reducer
  return function (state = {}, action = {}) {
    let newState = {};
    for(let attr in reducers) {
      newState[attr] = reducers[attr](state[attr], action)
    }

    return newState
  }
}

export { createStore, combineReducers }
```

## connect 高级组件原理

首先 connect 之所以会成功，是因为 provider 组件
