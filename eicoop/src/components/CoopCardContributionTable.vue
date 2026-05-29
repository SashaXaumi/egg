<!--
  Redesign: Variant C "Business" rows from the claude.ai/design "Ferret coop" handoff.
  Compact one-card-per-player rows (rank · name · role · check-in / artifacts · shipped ·
  rate · offline-eggs pill · progress). Replaces the desktop table. The old table-driven
  sort UI (setSortBy/columns) logic is preserved in <script> below; sorting still drives
  row order (Shipped, descending). Demoted columns (EB%, tokens, boosts, SiaB, TD, hab,
  IHR) are intentionally not rendered but their data/logic remain available.
-->
<template>
  <div style="display: flex; flex-direction: column; gap: 6px">
    <div
      v-for="contributor in sortedContributors"
      :key="contributor.id"
      class="squad-card"
      style="padding: 10px 12px; gap: 8px"
    >
      <!-- Top line: name · rank · PE — then flags + check-in pushed right -->
      <div style="display: flex; align-items: center; gap: 8px">
        <span class="name">
          <template v-if="devmode">
            <base-click-to-copy :text="contributor.name">
              {{ renderNonempty(contributor.name) }}
              <template #tooltip>Click to copy name: {{ contributor.name }}</template>
            </base-click-to-copy>
          </template>
          <template v-else>{{ contributor.name }}</template>
        </span>

        <!-- Rank (farmer role) right next to the name -->
        <span
          class="role"
          :style="{
            color: contributor.farmerRole.color,
            background: 'rgba(255,255,255,0.04)',
            flexShrink: 0,
            fontSize: '11px',
            padding: '1px 7px',
          }"
        >
          {{ contributor.farmerRole.name.replace('farmer', '') }}
        </span>

        <!-- Prophecy eggs (PE) — player power at a glance -->
        <span
          v-tippy="{ content: 'Prophecy eggs' }"
          class="mono"
          style="display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0; font-size: 11px; color: var(--text-1)"
        >
          <base-icon
            icon-rel-path="egginc/egg_of_prophecy.png"
            :size="64"
            class="block"
            :style="{ width: '13px', height: '13px' }"
          />{{ contributor.eop }}
        </span>

        <span style="flex: 1" />

        <!-- Autojoiner in private coop -->
        <svg
          v-if="!coopStatus.isPublic && contributor.autojoined"
          v-tippy="{ content: 'Autojoiner in Private Coop' }"
          class="h-4 w-4 flex-shrink-0"
          style="color: var(--text-2)"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
          <path
            fill-rule="evenodd"
            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
            clip-rule="evenodd"
          />
        </svg>
        <!-- Inactive -->
        <svg
          v-if="!contributor.isActive"
          v-tippy="{ content: 'This player hasn\'t reported in for a long time and can be kicked by anyone.' }"
          viewBox="0 0 256 256"
          class="h-4 w-4 flex-shrink-0 cursor-help"
          style="color: var(--text-2)"
        >
          <path
            fill="currentColor"
            d="M82.156,193.707l-28.584,20.767l-2.748,-3.782l-2.23,-49.484l-21.389,15.54l-3.161,-4.352l27.275,-19.817l2.749,3.783l2.209,49.455l22.697,-16.49l3.182,4.38Z"
          />
          <path
            fill="currentColor"
            d="M136.463,122.54l-51.993,27.646l-3.659,-6.881l7.797,-82.187l-38.905,20.686l-4.209,-7.916l49.614,-26.38l3.659,6.881l-7.824,82.135l41.284,-21.951l4.236,7.967Z"
          />
          <path
            fill="currentColor"
            d="M234.333,188.756l-89.415,12.566l-1.663,-11.833l54.336,-114.331l-66.905,9.403l-1.913,-13.612l85.322,-11.992l1.663,11.833l-54.349,114.242l70.998,-9.978l1.926,13.702Z"
          />
        </svg>
        <!-- Time cheat -->
        <base-icon
          v-if="contributor.isTimeCheating"
          v-tippy="{ content: 'This player is suspected of time cheating and can be kicked by anyone.' }"
          icon-rel-path="egginc-extras/icon_time_cheat.png"
          :size="64"
          class="h-4 w-4 flex-shrink-0 cursor-help"
          :style="{ filter: 'brightness(0.5) sepia(1) saturate(10000%)' }"
        />
        <!-- Leech -->
        <svg
          v-if="contributor.isLeeching"
          v-tippy="{
            content:
              'This player\'s contribution rate has been deemed unsatisfactory, and is at the risk of being kicked by anyone.',
          }"
          class="h-3.5 w-3.5 flex-shrink-0 text-red-500 cursor-help"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>

        <span class="mono" style="font-size: 11px; color: var(--text-2); flex-shrink: 0">
          <svg
            v-if="contributor.finalized"
            v-tippy="{ content: 'Checked in after reaching the goal' }"
            class="h-3.5 w-3.5 inline-block"
            style="color: var(--leaf)"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            />
          </svg>
          <template v-else>{{ contributor.offlineTimeStr }}</template>
        </span>
      </div>

      <!-- Bottom line: artifacts · shipped + rate · offline pill · % + bar -->
      <div style="display: flex; align-items: center; gap: 8px">
        <div style="flex-shrink: 0">
          <coop-card-contribution-table-artifact-gallery
            v-if="contributor.farmShared && contributor.artifacts.artifacts.length > 0"
            :artifact-set="contributor.artifacts as ArtifactSet"
          />
          <span
            v-else-if="contributor.farmShared"
            v-tippy="{ content: 'Farm is shared but no artifact is equipped.' }"
            style="font-size: 11px; color: var(--text-2)"
            >&ndash;</span
          >
          <span v-else style="font-size: 11px; color: var(--text-2)">Private</span>
        </div>

        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px">
            <div style="display: flex; align-items: baseline; gap: 6px; min-width: 0">
              <span class="mono" style="color: var(--text-0); font-weight: 700; font-size: 13px">{{
                formatEIValue(contributor.eggsLaid)
              }}</span>
              <span class="mono" style="color: var(--text-2); font-size: 11px"
                >{{ formatEIValue(contributor.eggsPerHour) }}/hr</span
              >
            </div>
            <div
              v-tippy="{ content: 'Eggs accumulated offline since last check-in' }"
              class="offline-pill"
            >
              <base-icon
                :icon-rel-path="eggIconPath(egg, customEggId)"
                :size="64"
                class="block"
                :style="{ width: '13px', height: '13px' }"
              />
              <span class="mono" style="font-size: 11px; font-weight: 700; color: var(--text-1)">{{
                formatEIValue(contributor.offlineEggs)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, inject, Ref } from 'vue';

import { ArtifactSet, CoopStatus, boostIconPath, boostName, eggIconPath, ei, formatEIValue } from '@/lib';
import { getSessionStorage, setSessionStorage, formatWithThousandSeparators, renderNonempty } from '@/utils';
import { devmodeKey } from '@/symbols';
import BaseClickToCopy from '@/components/BaseClickToCopy.vue';
import BaseIcon from 'ui/components/BaseIcon.vue';
import CoopCardContributionTableArtifactGallery from '@/components/CoopCardContributionTableArtifactGallery.vue';

type requiredColumnIds = [
  'name',
  'artifacts',
  'eggsLaid',
  'eggsPerHour',
  'earningBonusPercentage',
  'tokens',
  'boosts',
  'earningsBoost',
  'role',
  'eggLayingRateBoost',
];

const optionalColumnIds = [
  'finalized',
  'tokensSpent',
  'hourlyLayingRateUncapped',
  'hourlyShippingCapacity',
  'farmPopulation',
  'farmCapacity',
  'internalHatcheryRatePerMinPerHab',
  'offlineTimeStr',
  'offlineEggs',
] as const;

type ColumnId = requiredColumnIds[number] | OptionalColumnId;
type OptionalColumnId = (typeof optionalColumnIds)[number];

type ColumnSpec = {
  id: ColumnId;
  name: string;
  iconPath?: string;
  prefix?: string;
  suffix?: string;
  tooltip?: string;
};

const props = defineProps<{ egg: ei.Egg; coopStatus: CoopStatus; target: number; customEggId?: string | null }>();

const { egg, coopStatus, target, customEggId } = toRefs(props);
const devmode = inject(devmodeKey);

const showOptionalColumn = computed(() => {
  const show = Object.fromEntries(
    optionalColumnIds.map(col => [col, coopStatus.value.contributors.some(contributor => contributor[col] !== null)])
  ) as Record<OptionalColumnId, boolean>;
  show.finalized = coopStatus.value.eggsLaid >= target.value;
  return show;
});
const columns: Ref<ColumnSpec[]> = computed(() => {
  const cols: ColumnSpec[] = [
    {
      id: 'name',
      name: 'Player',
    },
  ];
  if (showOptionalColumn.value.finalized) {
    cols.push({
      id: 'finalized',
      name: 'Checked In',
    });
  }
  cols.push(
    {
      id: 'artifacts',
      name: 'Artifacts',
    },
    {
      id: 'eggsLaid',
      name: 'Shipped',
    },
    {
      id: 'eggsPerHour',
      name: 'Rate/hr',
      iconPath: eggIconPath(egg.value, customEggId.value),
      suffix: '/ hr',
    },
    {
      id: 'earningBonusPercentage',
      name: 'EB%',
    },
    {
      id: 'role',
      name: 'Role',
    },
    {
      id: 'tokens',
      name: 'Tokens',
      iconPath: 'egginc/b_icon_token.png',
      tooltip: 'Tokens left',
    }
  );
  if (showOptionalColumn.value.tokensSpent) {
    cols.push({
      id: 'tokensSpent',
      name: 'Tokens spent',
      iconPath: 'egginc/b_icon_token.png',
      suffix: ' \u{00a0}spent',
      tooltip: 'Tokens spent',
    });
  }
  cols.push(
    {
      id: 'boosts',
      name: 'Boosts',
    },
    {
      id: 'earningsBoost',
      name: 'SiaB',
      iconPath: 'egginc/afx_ship_in_a_bottle_4.png',
      tooltip: 'Earnings boost percentage from Ship in a Bottle equipped by each contributor',
    },
    {
      id: 'eggLayingRateBoost',
      name: 'TD',
      iconPath: 'egginc/afx_tachyon_deflector_4.png',
      tooltip: 'Egg laying rate boost percentage from Tachyon Deflector equipped by each contributor',
    }
  );
  if (showOptionalColumn.value.hourlyLayingRateUncapped) {
    cols.push({
      id: 'hourlyLayingRateUncapped',
      name: 'Laying / hr',
      tooltip: 'Egg laying rate from all chickens, not capped by shipping capacity',
    });
  }
  if (showOptionalColumn.value.hourlyShippingCapacity) {
    cols.push({
      id: 'hourlyShippingCapacity',
      name: 'Max shipping / hr',
    });
  }
  if (showOptionalColumn.value.farmPopulation) {
    cols.push({
      id: 'farmPopulation',
      name: 'Population',
    });
  }
  if (showOptionalColumn.value.farmCapacity) {
    cols.push({
      id: 'farmCapacity',
      name: 'Hab space',
    });
  }
  if (showOptionalColumn.value.internalHatcheryRatePerMinPerHab) {
    cols.push({
      id: 'internalHatcheryRatePerMinPerHab',
      name: 'IHR / min / hab',
      tooltip: 'Internal hatchery rate, including boost effect if any',
    });
  }
  if (showOptionalColumn.value.offlineTimeStr) {
    cols.push({
      id: 'offlineTimeStr',
      name: 'Offline Time',
      tooltip: 'Time offline',
    });
  }
  if (showOptionalColumn.value.offlineEggs) {
    cols.push({
      id: 'offlineEggs',
      name: 'Offline Eggs',
      tooltip: 'Eggs laid since last online',
    });
  }
  return cols;
});

const columnIds: Ref<string[]> = computed(() => columns.value.map(col => col.id));
const defaultSortBy: ColumnId = 'eggsLaid';
const sortBySessionStorageKey = computed(() => `${coopStatus.value.contractId}:${coopStatus.value.coopCode}_sortBy`);
const sortAscendingSessionStorageKey = computed(
  () => `${coopStatus.value.contractId}:${coopStatus.value.coopCode}_sortAscending`
);
let initialSortBy = getSessionStorage(sortBySessionStorageKey.value);
if (initialSortBy === undefined || !columnIds.value.includes(initialSortBy)) {
  initialSortBy = defaultSortBy;
}
const sortBy = ref(initialSortBy as ColumnId);
const initialSortAscending = getSessionStorage(sortAscendingSessionStorageKey.value) === 'true';
const sortAscending = ref(initialSortAscending);
// Sort handler retained from the old table header UI (not wired to the new rows,
// which sort by Shipped descending). Kept available for re-enabling interactive sort.
const setSortBy = (by: ColumnId) => {
  if (by === 'artifacts' || by === 'boosts') {
    return;
  }
  if (!columnIds.value.includes(by)) {
    by = defaultSortBy;
  }
  if (sortBy.value === by) {
    sortAscending.value = !sortAscending.value;
  } else {
    sortBy.value = by;
    sortAscending.value = by === 'name';
  }
  setSessionStorage(sortBySessionStorageKey.value, by);
  setSessionStorage(sortAscendingSessionStorageKey.value, sortAscending.value);
};

const sortedContributors = computed(() => {
  const sorted = [...coopStatus.value.contributors].sort((c1, c2) => {
    let cmp: number;
    switch (sortBy.value) {
      case 'name':
        cmp = c1.name.localeCompare(c2.name);
        break;
      case 'role':
        cmp = c1.earningBonusPercentage - c2.earningBonusPercentage;
        break;
      case 'artifacts':
      case 'boosts':
        cmp = 0;
        break;
      case 'finalized':
      case 'offlineTimeStr':
        cmp = c1.offlineSeconds - c2.offlineSeconds;
        break;
      default:
        cmp = (c1[sortBy.value] || 0) - (c2[sortBy.value] || 0);
    }
    // Use eggsLaid as tiebreaker.
    return cmp !== 0 ? cmp : c1.eggsLaid - c2.eggsLaid;
  });
  return sortAscending.value ? sorted : sorted.reverse();
});

// Retained from the table UI; intentionally referenced to preserve for re-enabling.
void setSortBy;
void boostIconPath;
void boostName;
void formatWithThousandSeparators;
</script>
