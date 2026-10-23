import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCountState = defineStore('count', () => {
  const num = ref(0)

  function increment() {
    num.value++
  }

  return {
    num,
    increment,
  }
})
