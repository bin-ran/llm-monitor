<template>
  <img :src="logo" :alt="alt" class="h-5 w-5 shrink-0 object-contain" draggable="false" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { PROVIDER_META, type ProviderId } from '../shared/provider'
import { PROVIDER_LOGOS } from '../utils/provider-icons'

interface Props {
  providerId: ProviderId
}

const props = defineProps<Props>()

const logo = computed(() => PROVIDER_LOGOS[props.providerId])

const alt = computed(() => PROVIDER_META[props.providerId].label)
</script>
