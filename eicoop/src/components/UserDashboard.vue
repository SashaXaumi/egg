<template>
  <!--
    Redesign: Variant C "Your den" from the claude.ai/design "Ferret coop" handoff.
    The profile card becomes a compact tile grid; scoped under .ferret. The season
    progress strip is dropped per the design (kept registered + commented below so it
    can be re-enabled). All <script> logic is preserved.
  -->
  <div class="ferret my-4 shadow overflow-hidden ultrawide:rounded-lg mb-4">
    <!-- Identity -->
    <div style="padding: 14px 18px 0; display: flex; align-items: center; gap: 8px">
      <base-icon
        :icon-rel-path="hasProPermit ? 'egginc/pro_permit.png' : 'egginc/free_permit.png'"
        :size="128"
        class="h-4 w-6 flex-shrink-0"
      />
      <span class="display" style="font-size: 18px; color: var(--text-0)">{{ renderNonempty(nickname) }}</span>
    </div>

    <!-- Your den -->
    <div style="padding: 10px 18px 0">
      <div class="section-h">
        <h2>Your den</h2>
        <div class="meta" style="white-space: nowrap">
          <span class="mono" :style="{ color: role.color }">{{ role.name }}</span>
        </div>
      </div>
      <div class="den-grid">
        <div class="den-tile">
          <base-icon icon-rel-path="egginc/egg_soul.png" :size="64" />
          <div class="v">{{ formatEIValue(soulEggs) }}</div>
          <div class="k">Soul</div>
        </div>
        <div class="den-tile">
          <base-icon icon-rel-path="egginc/egg_of_prophecy.png" :size="64" />
          <div class="v">{{ prophecyEggs }}</div>
          <div class="k">Prophecy</div>
        </div>
        <div class="den-tile">
          <base-icon icon-rel-path="egginc-extras/icon_golden_egg.png" :size="64" />
          <div class="v" style="color: var(--gold)">{{ formatEIValue(earningBonus * 100) }}%</div>
          <div class="k">EB</div>
        </div>
        <div class="den-tile">
          <base-icon icon-rel-path="egginc/icon_shell_script_colored.png" :size="64" />
          <div class="v">{{ prophecyEggsProgress.fromContracts.completed }}</div>
          <div class="k">Contracts</div>
        </div>
        <div class="den-tile">
          <base-icon icon-rel-path="egginc/icon_chick.png" :size="64" />
          <div class="v">{{ prophecyEggsProgress.fromContractSeasons.completed }}</div>
          <div class="k">Seasons</div>
        </div>
        <div class="den-tile">
          <base-icon icon-rel-path="egginc/pro_permit.png" :size="64" />
          <div class="v" style="color: var(--leaf)">{{ trophies }}/95</div>
          <div class="k">Trophies</div>
        </div>
      </div>
    </div>

    <!-- Save age + refresh + bookmark links -->
    <div
      style="
        padding: 14px 18px 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px 14px;
        font-size: 12px;
        color: var(--text-2);
      "
    >
      <span style="display: inline-flex; align-items: center; gap: 4px">
        Synced
        <auto-refreshed-relative-time :reference-time="backupTime" :without-suffix="true">
          <template #default="{ relativeTime, referenceTimeFormatted }">
            <span class="mono" style="color: var(--text-1); display: inline-flex; align-items: center">
              {{ relativeTime }} ago
              <base-info
                v-tippy="{
                  content: `<p>Save last synced to server at <span class='text-blue-300'>${referenceTimeFormatted}</span>.</p><p class='mt-2'>Force close then reopen the game to trigger a sync, then refresh here until the fresh save shows up. Please do not refresh too fast.</p>`,
                  allowHTML: true,
                }"
                class="ml-0.5"
              />
            </span>
          </template>
        </auto-refreshed-relative-time>
      </span>
      <button
        type="button"
        style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 999px;
          background: var(--gold-tint);
          border: 1px solid var(--gold-tint-border);
          color: var(--gold);
          font-weight: 700;
          cursor: pointer;
        "
        @click="triggerRefresh"
      >
        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh
      </button>
    </div>

    <div
      v-if="soloStatuses.length === 0 && coopParams.length === 0"
      style="padding: 14px 18px 0; font-size: 13px; color: var(--text-1)"
    >
      No active contract found in your save. Check back when you have one!
    </div>

    <div class="footer-note"><span class="paw">⌒</span> burrowed by ferrets</div>
  </div>

  <!--
    Season progress strip — dropped per Variant C design. Component kept registered so
    it can be restored later.
    <div class="my-4 bg-white dark:bg-gray-800 shadow overflow-hidden ultrawide:rounded-lg mb-4">
      <season-progress-bar
        v-if="backup.contracts?.lastCpi?.seasonProgress != null"
        :backup="backup"
        :refresh-key="coopRefreshKey"
      />
    </div>
  -->

  <template v-for="status in soloStatuses" :key="`${status.userId}:${status.contractId}`">
    <solo-card :status="status" />
  </template>

  <template v-for="params in coopParams" :key="`${params.contractId}:${params.coopCode}`">
    <coop-card-loader
      :contract-id="params.contractId"
      :coop-code="params.coopCode"
      :known-contract="params.contract"
      :known-league="params.league"
      :known-grade="params.grade"
      :refresh-key="coopRefreshKey"
      :user-id="userId"
      :from-dashboard="true"
    />
  </template>
</template>

<script lang="ts">
import { computed, defineComponent, inject, PropType, ref, toRefs, watch } from 'vue';

import {
  earningBonusToFarmerRole,
  ei,
  formatEIValue,
  getNakedEarningBonus,
  getNumSoulEggs,
  getProphecyEggsProgress,
  getUserActiveSoloContracts,
  getUserBackupTime,
  setLocalStorage,
  SoloStatus,
  useEidsStore,
} from '@/lib';
import { ContractLeague, getNumTruthEggs } from 'lib';
import { refreshCallbackKey } from '@/symbols';
import { renderNonempty } from '@/utils';
import AutoRefreshedRelativeTime from '@/components/AutoRefreshedRelativeTime.vue';
import BaseInfo from 'ui/components/BaseInfo.vue';
import BaseIcon from 'ui/components/BaseIcon.vue';
import CoopCardLoader from '@/components/CoopCardLoader.vue';
import SoloCard from '@/components/SoloCard.vue';
import { getUserActiveCoopContractsSorted } from '../lib/userdata';
import useContractsStore from '@/stores/contracts';
import SeasonProgressBar from '@/components/SeasonProgressBar.vue';

const USER_ID_LOCALSTORAGE_KEY = 'userId';

export default defineComponent({
  components: {
    AutoRefreshedRelativeTime,
    BaseInfo,
    BaseIcon,
    CoopCardLoader,
    SeasonProgressBar,
    SoloCard,
  },
  props: {
    backup: {
      type: Object as PropType<ei.IBackup>,
      required: true,
    },
  },
  setup(props) {
    const contractStore = useContractsStore();
    const eidsStore = ref(useEidsStore());
    const eids = eidsStore.value.eids;
    const { backup } = toRefs(props);
    const triggerRefresh = inject(refreshCallbackKey, () => {
      window.location.reload();
    });

    const coopRefreshKey = ref(Date.now());
    watch(backup, () => {
      coopRefreshKey.value = Date.now();
    });

    const backupTime = computed(() => getUserBackupTime(backup.value));
    const progress = computed(() => backup.value.game!);
    const userId = computed(() => backup.value.eiUserId!);
    const nickname = computed(() => backup.value.userName!);
    const hasProPermit = computed(() => progress.value.permitLevel === 1);
    const prophecyEggsProgress = computed(() => getProphecyEggsProgress(backup.value));
    const truthEggs = computed(() => getNumTruthEggs(backup.value));
    const prophecyEggs = computed(() => prophecyEggsProgress.value.completed);
    const soulEggs = computed(() => getNumSoulEggs(backup.value));
    const earningBonus = computed(() => getNakedEarningBonus(backup.value));
    const role = computed(() => earningBonusToFarmerRole(earningBonus.value));
    const trophies = computed(() =>
      prophecyEggsProgress.value.fromTrophies.eggs.reduce((sum, egg) => sum + egg.level, 0)
    );
    const dailyGifts = computed(() => prophecyEggsProgress.value.fromDailyGifts);

    const coops = computed(() => getUserActiveCoopContractsSorted(backup.value));
    const coopParams = computed(() =>
      coops.value.map(coop => ({
        contractId: coop.contract!.identifier!,
        coopCode: coop.coopIdentifier!,
        contract: coop.contract!,
        league: (coop.league as ContractLeague) ?? undefined,
        grade: coop.grade ?? ei.Contract.PlayerGrade.GRADE_UNSET,
      }))
    );
    const soloStatuses = computed(() =>
      getUserActiveSoloContracts(backup.value).map(solo => new SoloStatus(solo, backup.value))
    );
    const housekeeping = () => {
      coopParams.value.forEach(coop => contractStore.addContract(coop.contract));
      soloStatuses.value.forEach(solo => contractStore.addContract(solo.contract));
    };
    housekeeping();
    watch(backup, () => {
      housekeeping();
    });

    return {
      coopRefreshKey,
      backupTime,
      userId,
      nickname,
      hasProPermit,
      prophecyEggsProgress,
      prophecyEggs,
      truthEggs,
      soulEggs,
      earningBonus,
      role,
      trophies,
      dailyGifts,
      coopParams,
      soloStatuses,
      renderNonempty,
      formatEIValue,
      triggerRefresh,
      eids,
      eidsStore,
      setLocalStorage,
      USER_ID_LOCALSTORAGE_KEY,
    };
  },
});
</script>
