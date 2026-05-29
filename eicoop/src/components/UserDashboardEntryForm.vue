<template>
  <div
    class="overflow-hidden"
    style="background: var(--bg-1); border: 1px solid var(--line); border-radius: var(--r-lg)"
  >
    <div
      class="px-4 sm:px-6 py-3 text-sm font-medium flex items-center justify-between"
      style="background: var(--bg-2); color: var(--text-0)"
    >
      <span style="font-family: var(--f-display); font-weight: 600">
        Access personal dashboard
        <sup
          v-if="onboarding"
          class="inline-flex items-center pl-0.5 animate-bounce"
          :style="{ fontSize: '0.625rem', lineHeight: '0.75rem', color: 'var(--leaf)' }"
        >
          NEW
        </sup>
      </span>
      <button
        type="button"
        class="focus:outline-none"
        style="color: var(--text-2)"
        :aria-label="collapsed ? 'Expand' : 'Collapse'"
        @click="toggleCollapse"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-180': !collapsed }"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>
    <div v-show="!collapsed" class="px-4 sm:px-6 py-3" style="border-top: 1px solid var(--line)">
      <p v-if="!isDashboard" class="text-xs mb-2" style="color: var(--text-1)">
        Enter your ID to access a personal dashboard where the status of all your contracts, including solos and
        not-yet-joined-coops, are shown in one place. Bookmark your dashboard page to check on all your contracts at any
        time.
      </p>

      <span class="flex">
        <form
          class="relative sm:max-w-xs flex items-stretch flex-grow focus-within:z-10"
          :class="onboarding ? 'rounded-md' : null"
          :style="
            onboarding ? { border: '1px solid var(--gold)', animation: 'glowing 2s ease-in-out infinite' } : undefined
          "
          @submit="
            $event.preventDefault();
            submit();
          "
        >
          <base-input
            id="user_id"
            v-model="userId"
            name="user_id"
            type="text"
            class="appearance-none block w-full px-3 py-2 text-base rounded-l-md shadow-sm focus:outline-none sm:text-sm"
            style="background: var(--bg-2); border: 1px solid var(--line); border-right: none; color: var(--text-0)"
            placeholder="User ID"
            spellcheck="false"
            autocapitalize="off"
          />
          <button
            type="submit"
            class="-ml-px relative inline-flex items-center space-x-2 px-3 py-2 rounded-r-md !duration-0 focus:outline-none disabled:opacity-50"
            style="background: var(--gold); color: #1a1208; border: 1px solid var(--gold)"
            :class="{ 'cursor-not-allowed': !submittable }"
            :disabled="!submittable"
          >
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <span
            v-tippy="{
              content: `The ID asked for here is the unique ID used by Egg, Inc.\'s server to identify your account. You can find it in <span class='text-blue-300'>game screen -> nine dots menu -> Settings -> Privacy & Data, at the very bottom</span>. It should look like EI1234567890123456. Your old game services ID prior to the Artifact Update does not work here. Also note that the ID is case-sensitive.`,
              allowHTML: true,
            }"
            class="flex items-center pl-2"
          >
          </span>
        </form>
        <base-info class="w-5 h-5 self-center" style="color: var(--text-2)" />
      </span>

      <div v-if="eids.size > 1" class="mt-3">
        <div class="text-xs mb-1" style="color: var(--text-1)">Recent IDs:</div>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="[eid, name] in eids"
            :key="eid"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs"
            style="background: var(--bg-2); border: 1px solid var(--line); color: var(--text-1)"
          >
            <button
              type="button"
              class="mr-1 focus:outline-none"
              style="color: var(--text-2)"
              aria-label="Edit name"
              @click="eidsStore.editName(eid, name)"
            >
              ✎
            </button>
            <button
              type="button"
              class="hover:underline mr-1"
              style="text-decoration-thickness: 1.5px"
              @click="
                userId = eid;
                submit();
              "
            >
              {{ name || eid }}
            </button>
            <button
              type="button"
              class="ml-1 focus:outline-none"
              style="color: var(--text-2)"
              aria-label="Remove"
              @click="eidsStore.removeEid(eid)"
            >
              &times;
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  checkIfShouldOnboardUserDashboardFeature,
  getSavedPlayerID,
  savePlayerID,
  useEidsStore,
  getLocalStorage,
  setLocalStorage,
} from '@/lib';
import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseInput from 'ui/components/BaseInput.vue';
import { PlayerIdSchema } from 'lib/schema';

const COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY = 'collapseRecentEids';

export default defineComponent({
  components: {
    BaseInfo,
    BaseInput,
  },
  emits: {
    submit: (_userId: string) => true,
  },
  setup(_, { emit }) {
    const router = useRouter();
    const onboarding = checkIfShouldOnboardUserDashboardFeature();
    const userId = ref(getSavedPlayerID() || '');
    const eidsStore = ref(useEidsStore());
    const eids = eidsStore.value.eids;
    const collapsed = ref(getLocalStorage(COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY) === 'true');

    const isDashboard = computed(() => {
      const name = router.currentRoute.value.name;
      return name === 'dashboard' || name === 'dashboard-legacy';
    });

    const submittable = computed(() => {
      return PlayerIdSchema.safeParse(userId.value.trim()).success;
    });

    const submit = () => {
      const trimmedUserId = userId.value.trim();
      savePlayerID(trimmedUserId);
      eidsStore.value.addEid(trimmedUserId);
      emit('submit', trimmedUserId);
      // Navigate to the dashboard with the id as a route param so an already-mounted
      // dashboard reloads for the new id (the dashboard then strips it from the URL).
      router.push({ name: 'dashboard', params: { userId: trimmedUserId } }).catch(() => {
        /* ignore redundant navigation */
      });
    };

    const toggleCollapse = () => {
      collapsed.value = !collapsed.value;
      setLocalStorage(COLLAPSE_RECENT_EIDS_LOCALSTORAGE_KEY, collapsed.value);
    };

    return {
      onboarding,
      isDashboard,
      userId,
      submittable,
      submit,
      eids,
      eidsStore,
      collapsed,
      toggleCollapse,
    };
  },
});
</script>

<style>
@keyframes glowing {
  50% {
    box-shadow: 0 0 0.4rem 0.1rem #10b981;
  }
}
</style>
