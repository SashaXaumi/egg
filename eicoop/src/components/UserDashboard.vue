<template>
  <!-- Contracts/coops are the hero up top; the personal "den" is demoted to the bottom. -->
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

  <!--
    Redesign: Variant C "Your den" from the claude.ai/design "Ferret coop" handoff.
    The profile card becomes a compact tile grid; scoped under .ferret. The season
    progress strip is dropped per the design (kept registered + commented above so it
    can be re-enabled). All <script> logic is preserved. The den now sits at the bottom.
  -->
  <div class="ferret my-4 shadow overflow-hidden ultrawide:rounded-lg mb-4">
    <!-- Your den — DenCard (claude.ai/design "Ferret coop" separate-den pass): identity is
         folded into a header band (ferret mark + name + role + Earning Bonus) over a compact
         6-cell stat strip (SE · PE · TE · Contracts · Seasons · Trophies). -->
    <div style="padding: 14px 18px 0">
      <div class="den-card">
        <div class="den-head">
          <div class="den-mark">
            <svg width="22" height="22" viewBox="0 0 40 40" style="display: block">
              <defs>
                <linearGradient id="ferretGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stop-color="#f3a37a" />
                  <stop offset="1" stop-color="#9c5128" />
                </linearGradient>
              </defs>
              <path
                d="M20 7c-6 0-11 4.5-11 11 0 7 5 14 11 14s11-7 11-14C31 11.5 26 7 20 7Z"
                fill="url(#ferretGrad)"
              />
              <path d="M20 22c-3 0-5 2-5 4.5 0 2 2 3.5 5 3.5s5-1.5 5-3.5C25 24 23 22 20 22Z" fill="#fde8d2" />
              <ellipse cx="12" cy="12.5" rx="3" ry="2.5" fill="#9c5128" transform="rotate(-22 12 12.5)" />
              <ellipse cx="28" cy="12.5" rx="3" ry="2.5" fill="#9c5128" transform="rotate(22 28 12.5)" />
              <ellipse cx="12.4" cy="12.7" rx="1.4" ry="1.2" fill="#f3a37a" transform="rotate(-22 12.4 12.7)" />
              <ellipse cx="27.6" cy="12.7" rx="1.4" ry="1.2" fill="#f3a37a" transform="rotate(22 27.6 12.7)" />
              <circle cx="15.5" cy="19.5" r="1.6" fill="#16110d" />
              <circle cx="24.5" cy="19.5" r="1.6" fill="#16110d" />
              <circle cx="15.9" cy="19" r="0.5" fill="#fbf3df" />
              <circle cx="24.9" cy="19" r="0.5" fill="#fbf3df" />
              <ellipse cx="20" cy="25" rx="1.2" ry="0.9" fill="#16110d" />
            </svg>
          </div>
          <div style="flex: 1; min-width: 0">
            <div class="den-name">{{ renderNonempty(nickname) }}</div>
            <div class="den-role" :style="{ color: role.color }"><span class="den-role-dot" />{{ role.name }}</div>
          </div>
          <div class="den-eb">
            <span class="den-eb-v"
              >{{ formatEIValue(earningBonus * 100) }}<span class="den-eb-unit">%</span></span
            >
            <span class="den-eb-k">Earning bonus</span>
          </div>
        </div>
        <div class="den-stats">
          <div class="den-stat">
            <base-icon icon-rel-path="egginc/egg_soul.png" :size="64" />
            <span class="den-stat-v">{{ formatEIValue(soulEggs) }}</span>
            <span class="den-stat-k">SE</span>
          </div>
          <div class="den-stat">
            <base-icon icon-rel-path="egginc/egg_of_prophecy.png" :size="64" />
            <span class="den-stat-v">{{ prophecyEggs }}</span>
            <span class="den-stat-k">PE</span>
          </div>
          <div class="den-stat">
            <base-icon icon-rel-path="egginc/egg_truth.png" :size="64" />
            <span class="den-stat-v">{{ formatEIValue(truthEggs) }}</span>
            <span class="den-stat-k">TE</span>
          </div>
          <div class="den-stat">
            <base-icon icon-rel-path="egginc/contract_grade_aaa_large.png" :size="64" />
            <span class="den-stat-v">{{ prophecyEggsProgress.fromContracts.completed }}</span>
            <span class="den-stat-k">Contracts</span>
          </div>
          <div class="den-stat">
            <base-icon icon-rel-path="egginc/icon_elite_contracts.png" :size="64" />
            <span class="den-stat-v">{{ prophecyEggsProgress.fromContractSeasons.completed }}</span>
            <span class="den-stat-k">Seasons</span>
          </div>
          <div class="den-stat">
            <base-icon icon-rel-path="egginc/icon_trophy_diamond.png" :size="64" />
            <span class="den-stat-v" style="color: var(--leaf)">{{ trophies }}/95</span>
            <span class="den-stat-k">Trophies</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Old identity row + den-tile grid, muted (v-if="false") so they can be re-enabled.
         (Kept as markup rather than an HTML comment because the var(--…) tokens can't live
         inside an HTML comment.) -->
    <template v-if="false">
      <div style="padding: 14px 18px 0; display: flex; align-items: center; gap: 8px">
        <base-icon
          :icon-rel-path="hasProPermit ? 'egginc/pro_permit.png' : 'egginc/free_permit.png'"
          :size="128"
          class="h-4 w-6 flex-shrink-0"
        />
        <span class="display" style="font-size: 18px; color: var(--text-0)">{{ renderNonempty(nickname) }}</span>
      </div>
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
    </template>

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
      coops.value
        .filter(coop => coop.contractIdentifier || coop.contract?.identifier)
        .map(coop => ({
          contractId: coop.contractIdentifier || coop.contract!.identifier!,
          coopCode: coop.coopIdentifier!,
          contract: coop.contract ?? undefined,
          league: (coop.league as ContractLeague) ?? undefined,
          grade: coop.grade ?? ei.Contract.PlayerGrade.GRADE_UNSET,
        }))
    );
    const soloStatuses = computed(() =>
      getUserActiveSoloContracts(backup.value)
        .filter(solo => solo.contract && (solo.contractIdentifier || solo.contract?.identifier))
        .map(solo => new SoloStatus(solo, backup.value))
    );
    const housekeeping = () => {
      coopParams.value.forEach(coop => {
        if (coop.contract) contractStore.addContract(coop.contract);
      });
      soloStatuses.value.forEach(solo => {
        if (solo.contract) contractStore.addContract(solo.contract);
      });
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
