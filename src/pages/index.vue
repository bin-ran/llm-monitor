<template>
  <div relative w-full h-full box-border>
    <div
      position="absolute inset-4"
      border="1px solid gray-400/50 rounded-2"
      flex
      flex-col
    >
      <header flex justify-between items-center p-4>
        <span>{{ num }}</span>
        <button class="btn" @click="handleClick">Click</button>
      </header>
      <div
        flex
        flex-1
        justify-center
        items-center
        font="size-20 bold"
        @pointerdown="congrats"
      >
        Welcome !
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import confetti from 'canvas-confetti'
import { onMounted } from 'vue'
import { useTitle } from '@vueuse/core'
import { useCountState } from '../stores/count'
import { storeToRefs } from 'pinia'

useTitle('首页')

const countState = useCountState()

const { increment } = countState
const { num } = storeToRefs(countState)

onMounted(() => {
  setTimeout(congrats, 300)
})

function congrats() {
  const defaults = {
    colors: ['#5D8C7B', '#F2D091', '#F2A679', '#D9695F', '#8C4646'],
    shapes: ['square'],
    ticks: 500,
  } as confetti.Options
  confetti({
    ...defaults,
    particleCount: 80,
    spread: 100,
    origin: { y: 0 },
  })
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 50,
      angle: 60,
      spread: 80,
      origin: { x: 0 },
    })
  }, 250)
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 50,
      angle: 120,
      spread: 80,
      origin: { x: 1 },
    })
  }, 400)

  increment()
}

function handleClick() {
  window.binran.message('Hello from Vue!') // 输出在控制台
}
</script>
