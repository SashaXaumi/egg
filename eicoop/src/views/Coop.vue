<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <main class="flex-1 max-w-ultrawide w-full mx-auto mt-2 ultrawide:px-4">
    <!-- Entry form removed per request (component kept registered to re-enable):
    <user-dashboard-entry-form class="block my-4" /> -->
    <coop-card-loader :contract-id="contractId" :coop-code="coopCode" :gradearg="grade" @success="onSuccess" />
    <!-- FAQ dropped per Variant C redesign (component kept registered to re-enable):
    <frequently-asked-questions /> -->
  </main>
</template>

<script lang="ts">
import { defineComponent, toRefs } from 'vue';

import { CoopStatus } from '@/lib';
import useHistoryStore, { HistoryCoopEntry } from '@/stores/history';
import CoopCardLoader from '@/components/CoopCardLoader.vue';
import FrequentlyAskedQuestions from '@/components/FrequentlyAskedQuestions.vue';
import UserDashboardEntryForm from '@/components/UserDashboardEntryForm.vue';

export default defineComponent({
  components: {
    CoopCardLoader,
    FrequentlyAskedQuestions,
    UserDashboardEntryForm,
  },
  props: {
    contractId: {
      type: String,
      required: true,
    },
    coopCode: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const historyStore = useHistoryStore();
    const { grade } = toRefs(props);
    const onSuccess = (coopStatus: CoopStatus) => {
      const entry: HistoryCoopEntry = {
        contractId: coopStatus.contractId,
        contractName: coopStatus.contract!.name!,
        contractEgg: coopStatus.contract!.egg!,
        coopCode: coopStatus.coopCode,
        grade: grade.value,
      };
      historyStore.addCoop(entry);
    };
    return {
      onSuccess,
    };
  },
});
</script>
