<template>
  <!-- Top bar reduced to a single settings gear (the old nav bar with logo + theme
       switch was removed per request). The gear toggles the player-ID entry form. -->
  <header class="ferret app-gear-bar">
    <button
      class="iconbtn"
      :aria-label="settingsOpen ? 'Close settings' : 'Settings'"
      @click="settingsOpen = !settingsOpen"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  </header>

  <div v-if="settingsOpen" class="max-w-ultrawide w-full mx-auto px-3 sm:px-5 ultrawide:px-4 mb-2">
    <user-dashboard-entry-form @submit="settingsOpen = false" />
  </div>

  <div class="flex flex-col flex-1">
    <router-view />
  </div>
  <the-footer />
  <!-- Coop selector modal removed per request (kept registered to re-enable):
  <the-coop-selector /> -->
  <the-notification-tray />
</template>

<script lang="ts">
import { computed, defineComponent, provide, ref } from 'vue';

import { devmodeKey } from './symbols';
import { getSavedPlayerID } from '@/lib';
// import TheNavBar from '@/components/TheNavBar.vue'; // removed: top bar dropped per request
import TheFooter from '@/components/TheFooter.vue';
import TheCoopSelector from '@/components/TheCoopSelector.vue';
import TheNotificationTray from '@/components/TheNotificationTray.vue';
import UserDashboardEntryForm from '@/components/UserDashboardEntryForm.vue';
import useDevmodeStore from './stores/devmode';

export default defineComponent({
  name: 'App',
  components: {
    TheFooter,
    TheCoopSelector,
    TheNotificationTray,
    UserDashboardEntryForm,
  },
  setup() {
    const devmodeStore = useDevmodeStore();
    const devmode = computed(() => devmodeStore.on);
    provide(devmodeKey, devmode);

    // Open the settings panel by default for first-time visitors (no saved ID),
    // so the entry form is front-and-centre; returning visitors see their coops.
    const settingsOpen = ref(!getSavedPlayerID());

    return {
      settingsOpen,
    };
  },
});
</script>

<style scoped>
.app-gear-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-0);
}
</style>
