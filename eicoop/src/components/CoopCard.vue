<!-- eslint-disable vue/first-attribute-linebreak -->
<template>
  <!--
    Redesign: Variant C ("Combo") from the claude.ai/design "Ferret coop" handoff.
    Hero contract card (from A) + compact "Business" rows (from B), scoped under .ferret.
    The previous markup lives in git history; all <script> logic below is preserved
    (unused computeds are kept intentionally so features can be re-enabled later).
  -->
  <div class="ferret my-4 overflow-hidden shadow ultrawide:rounded-lg">
    <!-- ─── Hero contract ─── -->
    <div style="padding: 14px 18px 0">
      <div class="hero">
        <base-icon
          v-tippy="{ content: eggTooltip(egg, contract.customEggId) }"
          :icon-rel-path="eggIconPath(egg, contract.customEggId)"
          :size="128"
          class="hero-egg"
        />

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
          <span v-if="!leagueStatus.hasEnded" class="chip chip-live">Live</span>
          <template v-if="grade">
            <contract-grade-label :grade="grade" class="inline-block relative h-7" />
          </template>
          <template v-else-if="league !== null">
            <contract-league-label :league="league" />
          </template>
          <span
            v-if="contract.maxCoopSize && !leagueStatus.hasEnded"
            class="chip"
            :style="{
              color: openings > 0 ? 'var(--leaf)' : 'var(--text-2)',
              borderColor: openings > 0 ? 'rgba(74,222,128,0.28)' : 'var(--line)',
            }"
          >
            <template v-if="openings > 0">{{ openings }} open</template>
            <template v-else>Full</template>
          </span>
        </div>

        <h1 class="display hero-title">
          <base-click-to-copy :text="status.contractId" style="color: var(--text-0)">
            {{ contract.name }}
            <template #tooltip> Copy contract ID &lsquo;{{ status.contractId }}&rsquo; to clipboard </template>
          </base-click-to-copy>
        </h1>

        <!-- Expected check-in time (most important number) -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px; max-width: 80%">
          <tippy class="expected-pill">
            <span style="color: var(--gold); display: inline-flex; align-self: center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <span
              style="
                font-size: 10px;
                color: var(--text-2);
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.06em;
              "
            >
              expected
            </span>
            <span class="mono display" style="font-size: 14px; color: var(--gold)">{{ expectedClock }}</span>
            <template #content>
              <p>
                Expected to complete at
                {{ leagueStatus.expectedFinalCompletionDateOfflineAdjusted.format('YYYY-MM-DD HH:mm') }}. Assumes that
                all players will check-in right before completion.
              </p>
            </template>
          </tippy>
          <span style="font-size: 11px; color: var(--text-2); font-weight: 600; white-space: nowrap">
            in
            <span class="mono" style="color: var(--text-1); font-weight: 700">{{
              formatDuration(leagueStatus.expectedTimeToCompleteOfflineAdjusted)
            }}</span>
          </span>
        </div>

        <!-- Progress -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: baseline; gap: 8px">
          <div style="display: flex; gap: 6px; align-items: baseline; white-space: nowrap">
            <span class="display" style="font-size: 18px; color: var(--leaf)">{{ teamProgressPct }}%</span>
            <span style="font-size: 11px; color: var(--text-2); font-weight: 700">business</span>
          </div>
          <span
            style="
              font-size: 10px;
              color: var(--text-3);
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              white-space: nowrap;
            "
          >
            Ends in
            <span class="mono" style="color: var(--text-1)">{{ formatDuration(max(status.secondsRemaining, 0)) }}</span>
          </span>
        </div>
        <div class="bar" style="height: 12px">
          <div v-if="barProjected > barConfirmed" class="strip" :style="{ width: barProjected + '%' }" />
          <div v-if="barEstimated > barConfirmed" class="fill" :style="{ width: barEstimated + '%', opacity: 0.55 }" />
          <div class="fill" :style="{ width: barConfirmed + '%' }" />
        </div>

        <!-- Two stat pills -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px">
          <div class="stat-tile">
            <div class="k">Eggs shipped</div>
            <div
              class="display"
              style="font-size: 17px; color: var(--gold); display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap"
            >
              <span>{{ formatEIValue(status.eggsLaid) }}</span>
              <span style="font-size: 11px; color: var(--text-2); font-weight: 600"
                >/ {{ formatEIValue(leagueStatus.finalTarget, { trim: true }) }}</span
              >
            </div>
          </div>
          <div class="stat-tile">
            <div class="k">Production rate</div>
            <div
              class="display"
              style="font-size: 17px; color: var(--leaf); display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap"
            >
              <span>{{ formatEIValue(status.eggsPerHour) }}</span>
              <span v-if="leagueStatus.requiredEggsPerHour !== null" style="font-size: 11px; color: var(--text-2); font-weight: 600"
                >/ {{ formatEIValue(leagueStatus.requiredEggsPerHour) }} req</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Meta row (coop code · tokens · visibility · share · refresh) ─── -->
    <div
      style="
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding: 10px 22px 0;
        color: var(--text-2);
        font-size: 12px;
      "
    >
      <base-click-to-copy :text="status.coopCode" class="mono" style="color: var(--text-1); max-width: 50vw" />
      <template v-if="contract.minutesPerToken">
        <span style="display: inline-flex; align-items: center; gap: 3px">
          <base-icon icon-rel-path="egginc/b_icon_token.png" :size="64" class="block h-4 w-4" />
          {{ contract.minutesPerToken }}m
        </span>
      </template>
      <svg
        v-tippy="{ content: status.isPublic ? 'Public coop' : 'Private coop' }"
        class="h-4 w-4"
        style="color: var(--text-2)"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <template v-if="status.isPublic">
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path
            fill-rule="evenodd"
            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
            clip-rule="evenodd"
          />
        </template>
        <template v-else>
          <path
            fill-rule="evenodd"
            d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
            clip-rule="evenodd"
          />
          <path
            d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"
          />
        </template>
      </svg>
      <coop-card-share-sheet
        :contract-id="status.contractId"
        :coop-code="status.coopCode"
        :end-time="leagueStatus.expectedFinalCompletionDateOfflineAdjusted.unix()"
      />
      <span style="flex: 1" />
      <auto-refreshed-relative-time :reference-time="status.refreshTime">
        <template #default="{ relativeTime, referenceTimeFormatted, triggerRefresh }">
          <span class="flex items-center space-x-1" style="color: var(--text-2)">
            <span v-tippy="{ content: `Last refreshed ${referenceTimeFormatted}` }" class="cursor-help truncate">
              Refreshed {{ relativeTime }}
            </span>
            <svg
              v-tippy="{ content: 'Refresh' }"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              class="h-3.5 w-3.5 cursor-pointer select-none"
              @click="triggerRefresh"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </span>
        </template>
      </auto-refreshed-relative-time>
    </div>

    <!-- ─── Business list ─── -->
    <div style="padding: 16px 18px 4px">
      <div class="section-h">
        <h2>Business <small>{{ status.contributors.length }}/{{ contract.maxCoopSize }}</small></h2>
        <div
          style="
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--text-2);
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          "
        >
          Shipped
        </div>
      </div>
      <coop-card-contribution-table
        :egg="egg"
        :coop-status="status"
        :target="leagueStatus.finalTarget"
        :custom-egg-id="contract.customEggId"
      />
    </div>

    <div class="footer-note"><span class="paw">⌒</span> burrowed by ferrets</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, PropType, ref, toRefs } from 'vue';
import { Tippy } from 'vue-tippy';

import { CoopStatus, eggIconPath, formatEIValue, formatDuration, getModifiers } from '@/lib';
import { getLocalStorageNoPrefix, setLocalStorageNoPrefix } from 'lib';
import { completionStatusFgColorClass, completionStatusBgColorClass } from '@/styles';
import { devmodeKey } from '@/symbols';
import { eggTooltip } from '@/utils';
import BaseIcon from 'ui/components/BaseIcon.vue';
import BaseWarning from 'ui/components/BaseWarning.vue';
import ContractLeagueLabel from '@/components/ContractLeagueLabel.vue';
import ContractGradeLabel from '@/components/ContractGradeLabel.vue';
import ContractStatusLabel from '@/components/ContractStatusLabel.vue';
import CoopCardShareSheet from '@/components/CoopCardShareSheet.vue';
import ContractProgressBar from '@/components/ContractProgressBar.vue';
import CoopCardContributionTable from '@/components/CoopCardContributionTable.vue';
import BaseClickToCopy from '@/components/BaseClickToCopy.vue';
import AutoRefreshedRelativeTime from '@/components/AutoRefreshedRelativeTime.vue';
import dayjs from 'dayjs';

const RECENT_WINDOW_KEY = 'recentCheckinWindow';

const RECENT_WINDOW_OPTIONS = [
  { label: '15m', seconds: 15 * 60 },
  { label: '30m', seconds: 30 * 60 },
  { label: '1h', seconds: 3600 },
  { label: '2h', seconds: 2 * 3600 },
  { label: '4h', seconds: 4 * 3600 },
  { label: '8h', seconds: 8 * 3600 },
  { label: '12h', seconds: 12 * 3600 },
  { label: '1d', seconds: 86400 },
];

const DEFAULT_SECONDS = 86400;

function findClosestOption(seconds: number) {
  return (
    RECENT_WINDOW_OPTIONS.find(o => o.seconds === seconds) ??
    RECENT_WINDOW_OPTIONS.reduce((best, o) =>
      Math.abs(o.seconds - seconds) < Math.abs(best.seconds - seconds) ? o : best
    )
  );
}

const storedStr = getLocalStorageNoPrefix(RECENT_WINDOW_KEY);
const storedSeconds = storedStr ? parseInt(storedStr) || DEFAULT_SECONDS : DEFAULT_SECONDS;
const recentWindowSeconds = ref(findClosestOption(storedSeconds).seconds);

export default defineComponent({
  components: {
    BaseIcon,
    BaseWarning,
    ContractLeagueLabel,
    ContractGradeLabel,
    ContractStatusLabel,
    CoopCardShareSheet,
    ContractProgressBar,
    CoopCardContributionTable,
    BaseClickToCopy,
    AutoRefreshedRelativeTime,
    Tippy,
  },
  props: {
    status: {
      type: Object as PropType<CoopStatus>,
      required: true,
    },
  },
  setup(props) {
    const devmode = inject(devmodeKey);
    const { status } = toRefs(props);

    const grades = computed(() => ['GRADE_C', 'GRADE_B', 'GRADE_A', 'GRADE_AA', 'GRADE_AAA'] as const);
    const contract = computed(() => status.value.contract!);
    const egg = computed(() => contract.value.egg!);
    const league = computed(() => status.value.league);
    const grade = computed(() => status.value.grade || 5);
    const gradeSpec = computed(() => contract.value.gradeSpecs?.[grade.value - 1]);
    const leagueStatus = computed(() => status.value.leagueStatus!);
    const anyPlayerPrivate = computed(() => status.value.contributors.find(c => !c.farmShared) != null);
    const openings = computed(() => Math.max((contract.value.maxCoopSize || 0) - status.value.contributors.length, 0));
    const startDate = computed(
      () => Date.now() / 1000 + status.value.secondsRemaining - (gradeSpec.value?.lengthSeconds || 0)
    );
    const onlineDuration = computed(() => leagueStatus.value.expectedFinalCompletionDate.unix() - startDate.value);
    const offlineDuration = computed(
      () => leagueStatus.value.expectedFinalCompletionDateOfflineAdjusted.unix() - startDate.value
    );
    const modifiers = computed(() => (gradeSpec.value ? getModifiers(gradeSpec.value) : ['']));
    const contractlength = computed(
      () => contract.value.gradeSpecs?.[grade.value - 1].lengthSeconds ?? contract.value.lengthSeconds ?? 0
    );
    const completionTime = computed(() => {
      if (status.value.secondsSinceAllGoalsAchieved && contract.value.startTime) {
        return contractlength.value - status.value.secondsRemaining - status.value.secondsSinceAllGoalsAchieved;
      }
      return 0;
    });

    // ── Hero-specific derived values (Variant C) ──
    const pct = (n: number) => Math.max(0, Math.min(Math.round((n / leagueStatus.value.finalTarget) * 100), 100));
    const teamProgressPct = computed(() => pct(status.value.eggsLaid));
    const barConfirmed = computed(() => pct(status.value.eggsLaid));
    const barEstimated = computed(() => pct(status.value.eggsLaidOfflineAdjusted));
    const barProjected = computed(() => pct(status.value.projectedEggsLaid));
    const expectedClock = computed(() =>
      leagueStatus.value.expectedTimeToCompleteOfflineAdjusted > 0
        ? leagueStatus.value.expectedFinalCompletionDateOfflineAdjusted.format('h:mm A')
        : '—'
    );

    function applyRecentWindow() {
      setLocalStorageNoPrefix(RECENT_WINDOW_KEY, String(recentWindowSeconds.value));
    }

    function onRecentWindowChange() {
      applyRecentWindow();
    }

    const recentWindowLabel = computed(
      () =>
        RECENT_WINDOW_OPTIONS.find(o => o.seconds === recentWindowSeconds.value)?.label ??
        `${recentWindowSeconds.value / 60}m`
    );

    const eggsLaidRecentOfflineAdjusted = computed(() => {
      const window = recentWindowSeconds.value;
      let eggs = status.value.eggsLaid;
      for (const c of status.value.contributors) {
        if (c.offlineSeconds <= window) {
          eggs += c.offlineEggs;
        }
      }
      return leagueStatus.value ? Math.min(eggs, leagueStatus.value.finalTarget) : eggs;
    });

    const recentContributors = computed(() =>
      status.value.contributors.filter(c => c.offlineSeconds <= recentWindowSeconds.value)
    );

    const recentEggsPerHour = computed(() => recentContributors.value.reduce((sum, c) => sum + c.eggsPerHour, 0));

    const expectedTimeToCompleteRecentOfflineAdjusted = computed(() => {
      if (!leagueStatus.value) return 0;
      const eggs = eggsLaidRecentOfflineAdjusted.value;
      const target = leagueStatus.value.finalTarget;
      if (eggs >= target) return 0;
      if (recentEggsPerHour.value <= 0) return Infinity;
      return ((target - eggs) / recentEggsPerHour.value) * 3600;
    });

    const expectedFinalCompletionDateRecentOfflineAdjusted = computed(() =>
      dayjs().add(expectedTimeToCompleteRecentOfflineAdjusted.value, 's')
    );

    const recentDuration = computed(
      () => expectedFinalCompletionDateRecentOfflineAdjusted.value.unix() - startDate.value
    );

    return {
      devmode,
      contract,
      egg,
      league,
      grade,
      leagueStatus,
      anyPlayerPrivate,
      openings,
      offlineDuration,
      onlineDuration,
      modifiers,
      dayjs,
      formatEIValue,
      formatDuration,
      completionStatusFgColorClass,
      completionStatusBgColorClass,
      eggIconPath,
      eggTooltip,
      max: Math.max,
      grades,
      completionTime,
      // Hero (Variant C)
      teamProgressPct,
      barConfirmed,
      barEstimated,
      barProjected,
      expectedClock,
      recentWindowSeconds,
      recentWindowLabel,
      recentWindowOptions: RECENT_WINDOW_OPTIONS,
      onRecentWindowChange,
      expectedTimeToCompleteRecentOfflineAdjusted,
      expectedFinalCompletionDateRecentOfflineAdjusted,
      recentDuration,
      recentContributors,
      recentEggsPerHour,
    };
  },
});
</script>
